from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.models import AcademicYear, ClassRoom, GradeLevel
from apps.accounts.identifiers import ADMISSION_PREFIX, STUDENT_PREFIX, generate_identifier
from apps.accounts.models import CustomUser
from apps.audit.models import AuditLog
from apps.audit.utils import record_audit
from apps.students.models import Student, StudentEnrollment

STUDENTS_PER_CLASS = 20

SURNAMES = (
    'Nair', 'Iyer', 'Das', 'Khan', 'Sharma',
    'Patel', 'Reddy', 'Menon', 'Joshi', 'Kapoor',
)
FEMALE_NAMES = (
    'Amina', 'Meera', 'Ananya', 'Diya', 'Sara',
    'Fatima', 'Lakshmi', 'Priya', 'Zara', 'Nora',
)
MALE_NAMES = (
    'Arjun', 'Rahul', 'Kabir', 'Dev', 'Omar',
    'Vivaan', 'Aditya', 'Rohan', 'Imran', 'Neil',
)
PARENT_NAMES = (
    'Anita', 'Ravi', 'Sunita', 'Imran', 'Leela',
    'Harish', 'Farida', 'Joseph', 'Kavita', 'Sameer',
)


def roster_for(grade_number):
    surname = SURNAMES[grade_number - 1]
    rows = []
    for roll, first_name in enumerate(FEMALE_NAMES, start=1):
        rows.append((roll, first_name, surname, Student.Gender.FEMALE))
    for offset, first_name in enumerate(MALE_NAMES, start=1):
        rows.append((10 + offset, first_name, surname, Student.Gender.MALE))
    return rows


class Command(BaseCommand):
    help = 'Add 20 students in each class from Primary 1 through Secondary 10.'

    def handle(self, *args, **options):
        year = AcademicYear.objects.filter(is_current=True).first()
        if year is None:
            raise CommandError('Create a current academic year before seeding students.')
        grades = list(GradeLevel.objects.order_by('number'))
        if len(grades) != 10:
            raise CommandError('Grade levels 1 to 10 must exist. Run migrations first.')
        actor = CustomUser.objects.filter(username='principal').first()
        created = 0
        for grade in grades:
            classroom, room_created = ClassRoom.objects.get_or_create(
                academic_year=year,
                grade_level=grade,
                division='A',
            )
            if room_created:
                record_audit(
                    None,
                    AuditLog.Action.CREATE,
                    classroom,
                    {'label': classroom.label, 'academic_year': year.name},
                    actor=actor,
                )
            created += self._fill_class(year, classroom, grade.number, actor)
            total = StudentEnrollment.objects.filter(academic_year=year, classroom=classroom).count()
            self.stdout.write(f'{classroom.label}: {total} students')
        self.stdout.write(self.style.SUCCESS(f'Added {created} students across classes 1 to 10.'))

    def _fill_class(self, year, classroom, grade_number, actor):
        enrolled = StudentEnrollment.objects.filter(academic_year=year, classroom=classroom).count()
        missing = STUDENTS_PER_CLASS - enrolled
        if missing <= 0:
            return 0
        existing_names = set(
            Student.objects.filter(enrollments__academic_year=year, enrollments__classroom=classroom)
            .values_list('user__first_name', 'user__last_name')
        )
        added = 0
        for roll, first_name, last_name, gender in roster_for(grade_number):
            if added >= missing:
                break
            if (first_name, last_name) in existing_names:
                continue
            self._create_student(
                year=year,
                classroom=classroom,
                grade_number=grade_number,
                roll=roll,
                first_name=first_name,
                last_name=last_name,
                gender=gender,
                actor=actor,
            )
            added += 1
        if added < missing:
            raise CommandError(f'{classroom.label} still needs {missing - added} more students.')
        return added

    def _create_student(self, *, year, classroom, grade_number, roll, first_name, last_name, gender, actor):
        birth_year = date.today().year - (5 + grade_number)
        parent = f'{PARENT_NAMES[(roll - 1) % len(PARENT_NAMES)]} {last_name}'
        phone = f'98{grade_number:02d}{roll:02d}1001'
        with transaction.atomic():
            student_id = generate_identifier(STUDENT_PREFIX)
            admission_number = generate_identifier(ADMISSION_PREFIX)
            user = CustomUser(
                username=student_id,
                first_name=first_name,
                last_name=last_name,
                role=CustomUser.Role.STUDENT,
            )
            user.set_unusable_password()
            user.save()
            student = Student.objects.create(
                user=user,
                student_id=student_id,
                admission_number=admission_number,
                date_of_birth=date(birth_year, 6, min(roll, 28)),
                gender=gender,
                address=f'{roll} Lake Road, Ward {grade_number}',
                parent_name=parent,
                parent_phone=phone,
            )
            StudentEnrollment.objects.create(
                student=student,
                academic_year=year,
                classroom=classroom,
            )
            record_audit(
                None,
                AuditLog.Action.CREATE,
                student,
                {
                    'student_id': student_id,
                    'admission_number': admission_number,
                    'name': user.get_full_name(),
                    'classroom': classroom.label,
                    'academic_year': year.name,
                },
                actor=actor,
            )
