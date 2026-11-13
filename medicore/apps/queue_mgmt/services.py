from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.queue_mgmt.models import QueueSession, QueueToken
from apps.queue_mgmt.serializers import QueueTokenSerializer, TVTokenSerializer


def get_or_create_session(clinic, doctor, date=None):
    date = date or timezone.localdate()
    session, _ = QueueSession.objects.get_or_create(
        doctor=doctor, date=date, defaults={"clinic": clinic}
    )
    return session


def next_token_number(session):
    current = session.tokens.aggregate(m=Max("token_number"))["m"] or 0
    return current + 1


@transaction.atomic
def issue_token(*, clinic, doctor, patient, appointment=None, is_emergency=False, user=None):
    session = get_or_create_session(clinic, doctor)
    if session.is_paused and not is_emergency:
        raise ValueError("Queue is paused. Only emergency tokens can be issued.")
    num = next_token_number(session)
    token = QueueToken.objects.create(
        session=session,
        clinic=clinic,
        doctor=doctor,
        patient=patient,
        appointment=appointment,
        token_number=num,
        display_label=f"T-{num}",
        is_emergency=is_emergency,
        priority=100 if is_emergency else 0,
        created_by=user,
    )
    broadcast_queue(doctor.id, session.date)
    return token


def broadcast_queue(doctor_id, date=None):
    date = date or timezone.localdate()
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    tokens = QueueToken.objects.filter(doctor_id=doctor_id, session__date=date).exclude(
        status__in=[QueueToken.Status.COMPLETED, QueueToken.Status.CANCELLED]
    )
    staff_payload = QueueTokenSerializer(tokens, many=True).data
    tv_payload = TVTokenSerializer(tokens, many=True).data
    now_serving = tokens.filter(status=QueueToken.Status.CALLED).first()
    async_to_sync(channel_layer.group_send)(
        f"queue_doctor_{doctor_id}",
        {"type": "queue.update", "tokens": staff_payload},
    )
    async_to_sync(channel_layer.group_send)(
        f"queue_tv_{doctor_id}",
        {
            "type": "queue.update",
            "tokens": tv_payload,
            "now_serving": TVTokenSerializer(now_serving).data if now_serving else None,
        },
    )


def call_next(session):
    if session.is_paused:
        raise ValueError("Queue is paused.")
    waiting = (
        session.tokens.filter(status=QueueToken.Status.WAITING)
        .order_by("-is_emergency", "-priority", "token_number")
        .first()
    )
    if not waiting:
        raise ValueError("No waiting tokens.")
    # Complete previous called/serving
    session.tokens.filter(status__in=[QueueToken.Status.CALLED, QueueToken.Status.SERVING]).update(
        status=QueueToken.Status.COMPLETED, completed_at=timezone.now()
    )
    waiting.mark_called()
    broadcast_queue(session.doctor_id, session.date)
    return waiting


def skip_token(token):
    token.status = QueueToken.Status.SKIPPED
    token.save(update_fields=["status", "updated_at"])
    broadcast_queue(token.doctor_id, token.session.date)
    return token


def recall_token(token):
    token.status = QueueToken.Status.CALLED
    token.called_at = timezone.now()
    token.save(update_fields=["status", "called_at", "updated_at"])
    broadcast_queue(token.doctor_id, token.session.date)
    return token
