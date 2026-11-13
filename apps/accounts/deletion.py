from django.contrib import messages
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.shortcuts import redirect

from apps.audit.models import AuditLog
from apps.audit.utils import record_audit


def delete_record(request, instance, *, success_url, blocked_url, success_message, blocked_message):
    try:
        with transaction.atomic():
            record_audit(request, AuditLog.Action.DELETE, instance, {'repr': str(instance)})
            instance.delete()
    except ProtectedError:
        messages.error(request, blocked_message)
        return redirect(blocked_url)
    messages.success(request, success_message)
    return redirect(success_url)
