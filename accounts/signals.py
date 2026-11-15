from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver

from core.audit import log_action


@receiver(user_logged_in)
def on_login(sender, request, user, **kwargs):
    log_action(user, "login", f"{user.username} signed in", entity="user", entity_id=user.pk)


@receiver(user_logged_out)
def on_logout(sender, request, user, **kwargs):
    if user is not None:
        log_action(user, "logout", f"{user.username} signed out", entity="user", entity_id=user.pk)
