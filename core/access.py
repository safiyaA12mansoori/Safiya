from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from functools import wraps


def related(user, name):
    try:
        return getattr(user, name)
    except ObjectDoesNotExist:
        return None


def teacher_profile(user):
    return related(user, "teacher_profile")


def student_profile(user):
    return related(user, "student_profile")


class RoleRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    allowed_roles = ()

    def test_func(self):
        user = self.request.user
        return user.is_authenticated and user.role in self.allowed_roles

    def handle_no_permission(self):
        if not self.request.user.is_authenticated:
            return super().handle_no_permission()
        raise PermissionDenied("You do not have access to this module.")


def role_required(*roles):
    def decorator(view):
        @login_required
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            if request.user.role not in roles:
                raise PermissionDenied("You do not have access to this module.")
            return view(request, *args, **kwargs)

        return wrapper

    return decorator


def assigned_pairs(user):
    profile = teacher_profile(user)
    if not profile:
        return []
    return list(profile.assignments.values_list("classroom_id", "subject_id"))


def teacher_classroom_ids(user):
    return list({pair[0] for pair in assigned_pairs(user)})


def teacher_subject_ids(user):
    return list({pair[1] for pair in assigned_pairs(user)})


def teacher_owns(user, classroom_id, subject_id):
    if user.role == "ADMIN":
        return True
    return (classroom_id, subject_id) in set(assigned_pairs(user))
