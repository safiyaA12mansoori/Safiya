from django.db import transaction

from apps.accounts.identifiers import TEACHER_PREFIX, generate_identifier, generate_temporary_password
from apps.accounts.models import CustomUser
from apps.accounts.validators import validate_joined_on, validate_phone
from apps.audit.models import AuditLog
from apps.audit.utils import record_audit

from .models import Teacher


def teacher_snapshot(teacher):
    return {
        'first_name': teacher.user.first_name,
        'last_name': teacher.user.last_name,
        'email': teacher.user.email,
        'phone': teacher.phone,
        'qualification': teacher.qualification,
        'joined_on': teacher.joined_on.isoformat(),
        'is_active': teacher.user.is_active,
    }


def _diff(before, after):
    return {
        key: {'from': before.get(key), 'to': value}
        for key, value in after.items()
        if before.get(key) != value
    }


def create_teacher(*, first_name, last_name, email, phone, qualification, joined_on, request):
    validate_phone(phone)
    validate_joined_on(joined_on)
    password = generate_temporary_password()
    with transaction.atomic():
        teacher_id = generate_identifier(TEACHER_PREFIX)
        user = CustomUser.objects.create_user(
            username=teacher_id,
            password=password,
            first_name=first_name,
            last_name=last_name,
            email=email or '',
            role=CustomUser.Role.TEACHER,
        )
        teacher = Teacher.objects.create(
            user=user,
            teacher_id=teacher_id,
            phone=phone,
            qualification=qualification or '',
            joined_on=joined_on,
        )
        record_audit(
            request,
            AuditLog.Action.CREATE,
            teacher,
            {'teacher_id': teacher_id, 'name': user.get_full_name(), 'phone': phone},
        )
    return teacher, password


def update_teacher(
    teacher,
    *,
    first_name,
    last_name,
    email,
    phone,
    qualification,
    joined_on,
    is_active,
    request,
):
    validate_phone(phone)
    validate_joined_on(joined_on)
    before = teacher_snapshot(teacher)
    with transaction.atomic():
        user = teacher.user
        user.first_name = first_name
        user.last_name = last_name
        user.email = email or ''
        user.is_active = is_active
        user.save(update_fields=['first_name', 'last_name', 'email', 'is_active'])
        teacher.phone = phone
        teacher.qualification = qualification or ''
        teacher.joined_on = joined_on
        teacher.save()
        changes = _diff(before, teacher_snapshot(teacher))
        if changes:
            record_audit(request, AuditLog.Action.UPDATE, teacher, changes)
    return teacher
