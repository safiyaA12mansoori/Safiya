from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.accounts.models import Role
from apps.clinics.models import ClinicMembership


def user_clinic_ids(user):
    if not user or not user.is_authenticated:
        return []
    if user.is_super_admin:
        from apps.clinics.models import Clinic

        return list(Clinic.objects.filter(is_active=True).values_list("id", flat=True))
    return list(
        ClinicMembership.objects.filter(user=user, is_active=True).values_list(
            "clinic_id", flat=True
        )
    )


def user_roles_in_clinic(user, clinic_id):
    if user.is_super_admin:
        return [Role.SUPER_ADMIN]
    return list(
        ClinicMembership.objects.filter(
            user=user, clinic_id=clinic_id, is_active=True
        ).values_list("role", flat=True)
    )


def resolve_clinic_id(request):
    raw = request.headers.get("X-Clinic-Id") or request.query_params.get("clinic")
    if raw and str(raw).isdigit():
        return int(raw)
    ids = user_clinic_ids(request.user)
    return ids[0] if ids else None


class IsAuthenticatedRole(BasePermission):
    allowed_roles = None  # subclass sets this

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_super_admin:
            return True
        roles = self.allowed_roles or []
        if request.user.role in roles:
            return True
        clinic_id = resolve_clinic_id(request)
        if clinic_id:
            return bool(set(user_roles_in_clinic(request.user, clinic_id)) & set(roles))
        return ClinicMembership.objects.filter(
            user=request.user, is_active=True, role__in=roles
        ).exists()


class IsClinicStaff(IsAuthenticatedRole):
    allowed_roles = [
        Role.SUPER_ADMIN,
        Role.CLINIC_OWNER,
        Role.RECEPTIONIST,
        Role.DOCTOR,
        Role.ACCOUNTANT,
        Role.NURSE,
    ]


class IsClinicalStaff(IsAuthenticatedRole):
    allowed_roles = [
        Role.SUPER_ADMIN,
        Role.CLINIC_OWNER,
        Role.RECEPTIONIST,
        Role.DOCTOR,
        Role.NURSE,
    ]


class IsFinanceStaff(IsAuthenticatedRole):
    allowed_roles = [Role.SUPER_ADMIN, Role.CLINIC_OWNER, Role.ACCOUNTANT]


class IsDoctorOrAbove(IsAuthenticatedRole):
    allowed_roles = [Role.SUPER_ADMIN, Role.CLINIC_OWNER, Role.DOCTOR]


class ClinicIsolationMixin:
    """Filter querysets to the active clinic for non–super-admins."""

    clinic_field = "clinic_id"

    def get_clinic_id(self):
        return resolve_clinic_id(self.request)

    def filter_clinic(self, qs):
        user = self.request.user
        clinic_id = self.get_clinic_id()
        if user.is_super_admin and not clinic_id:
            return qs
        allowed = user_clinic_ids(user)
        if clinic_id:
            if clinic_id not in allowed and not user.is_super_admin:
                return qs.none()
            return qs.filter(**{self.clinic_field: clinic_id})
        return qs.filter(**{f"{self.clinic_field}__in": allowed})
