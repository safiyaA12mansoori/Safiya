from datetime import date

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.models import AcademicYear, ClassRoom, ClassSubject, GradeLevel, Subject
from apps.accounts.identifiers import (
    ADMISSION_PREFIX,
    STUDENT_PREFIX,
    TEACHER_PREFIX,
    generate_identifier,
    generate_temporary_password,
)
from apps.accounts.models import CustomUser
from apps.audit.models import AuditLog
from apps.audit.utils import record_audit
from apps.students.models import Student, StudentEnrollment
from apps.teachers.models import Teacher, TeacherAssignment


class Command(BaseCommand):
    help = (
        'Create one development user for each role and print generated passwords once. '
        'Refuses to run when DJANGO_DEBUG is off.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Rotate passwords for the existing development users and print the new passwords.',
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                'Refusing to create development users while DJANGO_DEBUG is off. '
                'This command is for local development only.'
            )
        lines = []
        with transaction.atomic():
            principal = self._ensure_user(
                'principal',
                CustomUser.Role.PRINCIPAL,
                'Asha',
                'Iyer',
                options['reset'],
                lines,
            )
            teacher_user = self._ensure_user(
                'teacher',
                CustomUser.Role.TEACHER,
                'Rahul',
                'Das',
                options['reset'],
                lines,
            )
            student_user = self._ensure_user(
                'student',
                CustomUser.Role.STUDENT,
                'Meera',
                'Nair',
                options['reset'],
                lines,
            )
            year = self._current_year(principal)
            try:
                grade = GradeLevel.objects.get(number=1)
            except GradeLevel.DoesNotExist as exc:
                raise CommandError('Grade levels are missing. Run migrations first.') from exc
            classroom, room_created = ClassRoom.objects.get_or_create(
                academic_year=year,
                grade_level=grade,
                division='A',
            )
            if room_created:
                record_audit(None, AuditLog.Action.CREATE, classroom, {'repr': str(classroom)}, actor=principal)
            subject, subject_created = Subject.objects.get_or_create(
                code='MATH',
                defaults={'name': 'Mathematics', 'description': 'Core mathematics'},
            )
            if subject_created:
                record_audit(None, AuditLog.Action.CREATE, subject, {'code': subject.code}, actor=principal)
            ClassSubject.objects.get_or_create(classroom=classroom, subject=subject)
            teacher = self._ensure_teacher(teacher_user, principal)
            student = self._ensure_student(student_user, year, classroom, principal)
            _assignment, assignment_created = TeacherAssignment.objects.get_or_create(
                teacher=teacher,
                classroom=classroom,
                subject=subject,
                academic_year=year,
            )
            if assignment_created:
                record_audit(
                    None,
                    AuditLog.Action.CREATE,
                    _assignment,
                    {'repr': str(_assignment)},
                    actor=principal,
                )
        if not any(line.startswith('created ') or line.startswith('reset ') for line in lines):
            self.stdout.write('No passwords changed. Re-run with --reset to rotate them.')
        for line in lines:
            self.stdout.write(line)
        self.stdout.write(f'teacher_id={teacher.teacher_id}')
        self.stdout.write(f'student_id={student.student_id}')
        self.stdout.write(f'admission_number={student.admission_number}')
        self.stdout.write('Dashboards: /principal/  /teacher/  /student/')

    def _ensure_user(self, username, role, first_name, last_name, reset, lines):
        user = CustomUser.objects.filter(username=username).first()
        if user and user.role != role:
            raise CommandError(f'{username} already exists with role {user.role}.')
        if user and not reset:
            lines.append(f'unchanged role={role} username={username}')
            return user
        password = generate_temporary_password()
        if user is None:
            user = CustomUser.objects.create_user(
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=role,
            )
            action = 'created'
        else:
            user.set_password(password)
            user.first_name = user.first_name or first_name
            user.last_name = user.last_name or last_name
            user.is_active = True
            user.save()
            action = 'reset'
        lines.append(f'{action} role={role} username={username} password={password}')
        return user

    def _current_year(self, actor):
        current = AcademicYear.objects.filter(is_current=True).first()
        if current:
            return current
        year, created = AcademicYear.objects.get_or_create(
            name='2026-2027',
            defaults={
                'start_date': date(2026, 4, 1),
                'end_date': date(2027, 3, 31),
                'is_current': True,
            },
        )
        if not year.is_current:
            year.is_current = True
            year.save(update_fields=['is_current', 'updated_at'])
        elif created:
            record_audit(None, AuditLog.Action.CREATE, year, {'name': year.name}, actor=actor)
        return year

    def _ensure_teacher(self, user, actor):
        try:
            return user.teacher
        except Teacher.DoesNotExist:
            teacher_id = generate_identifier(TEACHER_PREFIX)
            teacher = Teacher.objects.create(
                user=user,
                teacher_id=teacher_id,
                phone='2025550101',
                qualification='B.Ed.',
                joined_on=date(2026, 4, 1),
            )
            record_audit(None, AuditLog.Action.CREATE, teacher, {'teacher_id': teacher_id}, actor=actor)
            return teacher

    def _ensure_student(self, user, year, classroom, actor):
        try:
            student = user.student
        except Student.DoesNotExist:
            student_id = generate_identifier(STUDENT_PREFIX)
            admission_number = generate_identifier(ADMISSION_PREFIX)
            student = Student.objects.create(
                user=user,
                student_id=student_id,
                admission_number=admission_number,
                date_of_birth=date(2015, 6, 15),
                gender=Student.Gender.FEMALE,
                address='12 Lake Road',
                parent_name='Anita Nair',
                parent_phone='2025550199',
            )
            record_audit(
                None,
                AuditLog.Action.CREATE,
                student,
                {'student_id': student_id, 'admission_number': admission_number},
                actor=actor,
            )
        StudentEnrollment.objects.get_or_create(
            student=student,
            academic_year=year,
            defaults={'classroom': classroom},
        )
        return student
