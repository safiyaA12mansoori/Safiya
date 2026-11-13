from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.models import AcademicYear, ClassRoom, ClassSubject, GradeLevel, Subject
from apps.accounts.identifiers import TEACHER_PREFIX, generate_identifier
from apps.accounts.models import CustomUser
from apps.audit.models import AuditLog
from apps.audit.utils import record_audit
from apps.teachers.models import Teacher, TeacherAssignment

SUBJECTS = (
    ('ENG', 'English', 'Language and reading'),
    ('HIN', 'Hindi', 'Hindi language'),
    ('MATH', 'Mathematics', 'Number and problem solving'),
    ('SCI', 'Science', 'General science'),
    ('SST', 'Social Science', 'History, geography, and civics'),
    ('CSC', 'Computer', 'Computer studies'),
)

CLASS_TEACHERS = (
    (1, 'Lakshmi', 'Nair', 'B.Ed.', '9701001001'),
    (2, 'Rohan', 'Iyer', 'B.Ed.', '9702001001'),
    (3, 'Fatima', 'Khan', 'B.Ed.', '9703001001'),
    (4, 'Arjun', 'Sharma', 'M.A., B.Ed.', '9704001001'),
    (5, 'Priya', 'Patel', 'B.Ed.', '9705001001'),
    (6, 'Kabir', 'Reddy', 'M.Sc., B.Ed.', '9706001001'),
    (7, 'Ananya', 'Menon', 'M.Sc., B.Ed.', '9707001001'),
    (8, 'Dev', 'Joshi', 'M.A., B.Ed.', '9708001001'),
    (9, 'Sara', 'Kapoor', 'M.Sc., B.Ed.', '9709001001'),
    (10, 'Imran', 'Das', 'M.A., B.Ed.', '9710001001'),
)


class Command(BaseCommand):
    help = 'Add 10 class teachers and assign each one to every subject in their class.'

    def handle(self, *args, **options):
        year = AcademicYear.objects.filter(is_current=True).first()
        if year is None:
            raise CommandError('Create a current academic year before seeding teachers.')
        grades = {grade.number: grade for grade in GradeLevel.objects.all()}
        if set(grades) != set(range(1, 11)):
            raise CommandError('Grade levels 1 to 10 must exist. Run migrations first.')
        actor = CustomUser.objects.filter(username='principal').first()
        subjects = [self._subject(code, name, description, actor) for code, name, description in SUBJECTS]
        for grade_number, first_name, last_name, qualification, phone in CLASS_TEACHERS:
            classroom = self._classroom(year, grades[grade_number], actor)
            teacher = self._teacher(first_name, last_name, qualification, phone, actor)
            if classroom.class_teacher_id != teacher.id:
                classroom.class_teacher = teacher
                classroom.save(update_fields=['class_teacher', 'updated_at'])
                record_audit(
                    None,
                    AuditLog.Action.UPDATE,
                    classroom,
                    {'class_teacher': teacher.teacher_id},
                    actor=actor,
                )
            for subject in subjects:
                self._offer(classroom, subject, actor)
                self._assign(teacher, classroom, subject, year, actor)
            self.stdout.write(
                f'{classroom.label}: class teacher {teacher.user.get_full_name()} · {len(subjects)} subjects'
            )
        self.stdout.write(self.style.SUCCESS('Class teachers and subjects are in place for classes 1 to 10.'))

    def _subject(self, code, name, description, actor):
        subject, created = Subject.objects.get_or_create(
            code=code,
            defaults={'name': name, 'description': description},
        )
        if created:
            record_audit(None, AuditLog.Action.CREATE, subject, {'code': code, 'name': name}, actor=actor)
        return subject

    def _classroom(self, year, grade, actor):
        classroom, created = ClassRoom.objects.get_or_create(
            academic_year=year,
            grade_level=grade,
            division='A',
        )
        if created:
            record_audit(
                None,
                AuditLog.Action.CREATE,
                classroom,
                {'label': classroom.label, 'academic_year': year.name},
                actor=actor,
            )
        return classroom

    def _teacher(self, first_name, last_name, qualification, phone, actor):
        existing = Teacher.objects.filter(
            user__first_name=first_name,
            user__last_name=last_name,
            user__role=CustomUser.Role.TEACHER,
        ).select_related('user').first()
        if existing is not None:
            return existing
        with transaction.atomic():
            teacher_id = generate_identifier(TEACHER_PREFIX)
            user = CustomUser(
                username=teacher_id,
                first_name=first_name,
                last_name=last_name,
                role=CustomUser.Role.TEACHER,
            )
            user.set_unusable_password()
            user.save()
            teacher = Teacher.objects.create(
                user=user,
                teacher_id=teacher_id,
                phone=phone,
                qualification=qualification,
                joined_on=date(2026, 4, 1),
            )
            record_audit(
                None,
                AuditLog.Action.CREATE,
                teacher,
                {'teacher_id': teacher_id, 'name': user.get_full_name(), 'phone': phone},
                actor=actor,
            )
        return teacher

    def _offer(self, classroom, subject, actor):
        link, created = ClassSubject.objects.get_or_create(classroom=classroom, subject=subject)
        if created:
            record_audit(
                None,
                AuditLog.Action.CREATE,
                link,
                {'classroom': classroom.label, 'subject': subject.code},
                actor=actor,
            )

    def _assign(self, teacher, classroom, subject, year, actor):
        assignment, created = TeacherAssignment.objects.get_or_create(
            teacher=teacher,
            classroom=classroom,
            subject=subject,
            academic_year=year,
        )
        if created:
            record_audit(
                None,
                AuditLog.Action.CREATE,
                assignment,
                {
                    'teacher': teacher.teacher_id,
                    'classroom': classroom.label,
                    'subject': subject.code,
                    'academic_year': year.name,
                },
                actor=actor,
            )
