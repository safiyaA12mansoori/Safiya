from django.core.exceptions import ValidationError
from django.core.validators import validate_ipv46_address

from .models import AuditLog


def _client_ip(request):
    if request is None:
        return None
    value = request.META.get('REMOTE_ADDR') or ''
    try:
        validate_ipv46_address(value)
    except ValidationError:
        return None
    return value


def _plain(value):
    if hasattr(value, 'pk'):
        return str(value)
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return value


def record_audit(request, action, instance, changes=None, actor=None):
    if actor is None and request is not None:
        user = getattr(request, 'user', None)
        if user is not None and getattr(user, 'is_authenticated', False):
            actor = user
    AuditLog.objects.create(
        actor=actor,
        action=action,
        app_label=instance._meta.app_label,
        model_name=instance._meta.model_name,
        object_id='' if instance.pk is None else str(instance.pk),
        object_repr=str(instance)[:255],
        changes=changes or {},
        ip_address=_client_ip(request),
    )


def audit_saved_form(request, form, instance, created):
    if created:
        record_audit(request, AuditLog.Action.CREATE, instance, {'repr': str(instance)})
        return
    changes = {}
    for name in form.changed_data:
        changes[name] = _plain(form.cleaned_data.get(name))
    if changes:
        record_audit(request, AuditLog.Action.UPDATE, instance, changes)
