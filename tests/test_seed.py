from django.core.management import call_command

from apps.academics.models import ClassRoom
from apps.students.models import StudentEnrollment

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
        from io import StringIO
        return StringIO()
