from django.core.exceptions import ValidationError
from django.db import transaction

from apps.accounts.identifiers import (
    ADMISSION_PREFIX,
    STUDENT_PREFIX,
    generate_identifier,
    generate_temporary_password,
)
from apps.accounts.models import CustomUser
from apps.accounts.validators import validate_date_of_birth, validate_phone
from apps.audit.models import AuditLog
from apps.audit.utils import record_audit

from .models import Student, StudentEnrollment


def _iso(value):
    return value.isoformat() if value else ''


def student_snapshot(student):
    enrollment = student.current_enrollment()
    return {
        'first_name': student.user.first_name,
        'last_name': student.user.last_name,
        'date_of_birth': _iso(student.date_of_birth),
        'gender': student.gender,
        'address': student.address,
        'parent_name': student.parent_name,
        'parent_phone': student.parent_phone,
        'is_active': student.user.is_active,
        'academic_year': enrollment.academic_year.name if enrollment else '',
        'classroom': enrollment.classroom.label if enrollment else '',
    }


def _diff(before, after):
    changes = {}
    for key, value in after.items():
        if before.get(key) != value:
            changes[key] = {'from': before.get(key), 'to': value}
    return changes


def create_student(
    *,
    first_name,
    last_name,
    date_of_birth,
    gender,
    address,
    parent_name,
    parent_phone,
    academic_year,
    classroom,
    request,
):
    if classroom.academic_year_id != academic_year.id:
        raise ValidationError('Classroom does not belong to the selected academic year.')
    validate_date_of_birth(date_of_birth)
    validate_phone(parent_phone)
    password = generate_temporary_password()
    with transaction.atomic():
        student_id = generate_identifier(STUDENT_PREFIX)
        admission_number = generate_identifier(ADMISSION_PREFIX)
        user = CustomUser.objects.create_user(
            username=student_id,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=CustomUser.Role.STUDENT,
        )
        student = Student.objects.create(
            user=user,
            student_id=student_id,
            admission_number=admission_number,
            date_of_birth=date_of_birth,
            gender=gender,
            address=address or '',
            parent_name=parent_name,
            parent_phone=parent_phone,
        )
        StudentEnrollment.objects.create(
            student=student,
            academic_year=academic_year,
            classroom=classroom,
        )
        record_audit(
            request,
            AuditLog.Action.CREATE,
            student,
            {
                'student_id': student_id,
                'admission_number': admission_number,
                'name': user.get_full_name(),
                'classroom': classroom.label,
                'academic_year': academic_year.name,
            },
        )
    return student, password


def update_student(
    student,
    *,
    first_name,
    last_name,
    date_of_birth,
    gender,
    address,
    parent_name,
    parent_phone,
    academic_year,
    classroom,
    is_active,
    request,
):
    if classroom.academic_year_id != academic_year.id:
        raise ValidationError('Classroom does not belong to the selected academic year.')
    validate_date_of_birth(date_of_birth)
    validate_phone(parent_phone)
    before = student_snapshot(student)
    with transaction.atomic():
        user = student.user
        user.first_name = first_name
        user.last_name = last_name
        user.is_active = is_active
        user.save(update_fields=['first_name', 'last_name', 'is_active'])
        student.date_of_birth = date_of_birth
        student.gender = gender
        student.address = address or ''
        student.parent_name = parent_name
        student.parent_phone = parent_phone
        student.save()
        enrollment, _created = StudentEnrollment.objects.get_or_create(
            student=student,
            academic_year=academic_year,
            defaults={'classroom': classroom},
        )
        if enrollment.classroom_id != classroom.id:
            enrollment.classroom = classroom
            enrollment.save(update_fields=['classroom', 'updated_at'])
        student.refresh_from_db()
        changes = _diff(before, student_snapshot(student))
        if changes:
            record_audit(request, AuditLog.Action.UPDATE, student, changes)
    return student
