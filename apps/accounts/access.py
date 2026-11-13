from functools import wraps

from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied

from .models import CustomUser


def home_url_name(user):
    homes = {
        CustomUser.Role.PRINCIPAL: 'principal-dashboard',
        CustomUser.Role.TEACHER: 'teacher-dashboard',
        CustomUser.Role.STUDENT: 'student-dashboard',
    }
    try:
        return homes[user.role]
    except KeyError as exc:
        raise PermissionDenied('This account does not have a dashboard.') from exc


def role_required(*roles):
    def decorator(view):
        @login_required
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            if request.user.role not in roles:
                raise PermissionDenied
            return view(request, *args, **kwargs)

        return wrapped

    return decorator
