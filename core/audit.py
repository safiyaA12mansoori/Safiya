def log_action(actor, action, message, entity="", entity_id=""):
    from core.models import ActivityLog

    ActivityLog.objects.create(
        actor=actor if getattr(actor, "pk", None) else None,
        action=action,
        entity=str(entity or ""),
        entity_id=str(entity_id or ""),
        message=message,
    )
