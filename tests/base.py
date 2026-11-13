from datetime import date

from django.test import TestCase, override_settings

from apps.academics.models import AcademicYear, ClassRoom, GradeLevel, Subject
from apps.accounts.identifiers import ADMISSION_PREFIX, STUDENT_PREFIX, TEACHER_PREFIX, generate_identifier
from apps.accounts.models import CustomUser
from apps.students.models import Student, StudentEnrollment
from apps.teachers.models import Teacher

PASSWORD = 'Safiya-Test-19'


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class ERPTestCase(TestCase):
    password = PASSWORD

    @classmethod
    def make_user(cls, username, role, first='Test', last='User', password=None):
        return CustomUser.objects.create_user(
            username=username,
            password=password or cls.password,
            first_name=first,
            last_name=last,
            role=role,
        )

    @classmethod
    def make_year(cls, name='2026-2027', current=True, start=None, end=None):
        return AcademicYear.objects.create(
            name=name,
            start_date=start or date(2026, 4, 1),
            end_date=end or date(2027, 3, 31),
            is_current=current,
        )

    @classmethod
    def make_room(cls, year, number=1, division='A'):
        grade = GradeLevel.objects.get(number=number)
        return ClassRoom.objects.create(academic_year=year, grade_level=grade, division=division)

    @classmethod
    def make_subject(cls, name='Mathematics', code='MATH'):
        return Subject.objects.create(name=name, code=code)

    @classmethod
    def make_teacher(cls, username='teacher.one', first='Rahul', last='Das'):
        user = cls.make_user(username, CustomUser.Role.TEACHER, first, last)
        teacher = Teacher.objects.create(
            user=user,
            teacher_id=generate_identifier(TEACHER_PREFIX, 2026),
            phone='2025550101',
            qualification='B.Ed.',
            joined_on=date(2026, 4, 1),
        )
        return teacher

    @classmethod
    def make_student(cls, year, room, username='student.one', first='Meera', last='Nair', parent_phone='2025550199'):
        user = cls.make_user(username, CustomUser.Role.STUDENT, first, last)
        student = Student.objects.create(
            user=user,
            student_id=generate_identifier(STUDENT_PREFIX, 2026),
            admission_number=generate_identifier(ADMISSION_PREFIX, 2026),
            date_of_birth=date(2015, 6, 15),
            gender=Student.Gender.FEMALE,
            address='12 Lake Road',
            parent_name='Anita Nair',
            parent_phone=parent_phone,
        )
        StudentEnrollment.objects.create(student=student, academic_year=year, classroom=room)
        return student
