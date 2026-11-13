from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import LoginAttempt


def _username_key(username):
    return (username or '').strip().lower()[:150]


def _ip_address(request):
    return request.META.get('REMOTE_ADDR') or '0.0.0.0'


def _cutoff():
    return timezone.now() - timedelta(seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS)


def is_rate_limited(request, username):
    return (
        LoginAttempt.objects.filter(
            username_key=_username_key(username),
            ip_address=_ip_address(request),
            attempted_at__gte=_cutoff(),
        ).count()
        >= settings.LOGIN_RATE_LIMIT_ATTEMPTS
    )


def register_failure(request, username):
    LoginAttempt.objects.filter(attempted_at__lt=_cutoff()).delete()
    LoginAttempt.objects.create(
        username_key=_username_key(username),
        ip_address=_ip_address(request),
    )


def clear_failures(request, username):
    LoginAttempt.objects.filter(
        username_key=_username_key(username),
        ip_address=_ip_address(request),
    ).delete()
