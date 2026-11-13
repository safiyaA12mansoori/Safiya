from io import StringIO

from django.core.management import call_command
from django.urls import reverse

from apps.academics.models import ClassRoom, ClassSubject, Subject
from apps.accounts.models import CustomUser
from apps.students.models import StudentEnrollment
from apps.teachers.models import Teacher, TeacherAssignment

from .base import ERPTestCase


class ClassRosterSeedTests(ERPTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.year = cls.make_year()
        cls.make_room(cls.year, number=1, division='A')
        cls.make_student(cls.year, ClassRoom.objects.get(grade_level__number=1))

    def test_each_class_from_1_to_10_ends_with_20_students(self):
        call_command('seed_class_students', stdout=self._buffer())
        rooms = ClassRoom.objects.filter(academic_year=self.year, division='A').order_by('grade_level__number')
        self.assertEqual([room.grade_level.number for room in rooms], list(range(1, 11)))
        for room in rooms:
            self.assertEqual(
                StudentEnrollment.objects.filter(academic_year=self.year, classroom=room).count(),
                20,
            )
        self.assertEqual(StudentEnrollment.objects.filter(academic_year=self.year).count(), 200)

    def test_running_the_seed_again_does_not_add_more_students(self):
        call_command('seed_class_students', stdout=self._buffer())
        call_command('seed_class_students', stdout=self._buffer())
        self.assertEqual(StudentEnrollment.objects.filter(academic_year=self.year).count(), 200)

    def _buffer(self):
        return StringIO()


class ClassTeacherSeedTests(ERPTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.year = cls.make_year()
        cls.principal = cls.make_user('seed.principal', CustomUser.Role.PRINCIPAL, 'Asha', 'Iyer')

    def test_each_class_has_one_class_teacher_for_every_subject(self):
        call_command('seed_class_teachers', stdout=StringIO())
        rooms = list(
            ClassRoom.objects.filter(academic_year=self.year, division='A').order_by('grade_level__number')
        )
        self.assertEqual([room.grade_level.number for room in rooms], list(range(1, 11)))
        self.assertEqual(Subject.objects.count(), 6)
        class_teachers = []
        for room in rooms:
            self.assertIsNotNone(room.class_teacher_id)
            class_teachers.append(room.class_teacher_id)
            self.assertEqual(ClassSubject.objects.filter(classroom=room).count(), 6)
            self.assertEqual(
                TeacherAssignment.objects.filter(
                    teacher=room.class_teacher,
                    classroom=room,
                    academic_year=self.year,
                ).count(),
                6,
            )
        self.assertEqual(len(set(class_teachers)), 10)
        self.assertEqual(Teacher.objects.count(), 10)

    def test_running_the_seed_again_does_not_add_teachers(self):
        call_command('seed_class_teachers', stdout=StringIO())
        call_command('seed_class_teachers', stdout=StringIO())
        self.assertEqual(Teacher.objects.count(), 10)
        self.assertEqual(TeacherAssignment.objects.filter(academic_year=self.year).count(), 60)

    def test_class_list_names_the_class_teacher(self):
        call_command('seed_class_teachers', stdout=StringIO())
        self.client.force_login(self.principal)
        response = self.client.get(reverse('class-list'))
        self.assertContains(response, 'Class teacher')
        self.assertContains(response, 'Lakshmi Nair')
        self.assertContains(response, 'Imran Das')
