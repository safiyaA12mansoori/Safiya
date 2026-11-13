from datetime import date

from django.utils import timezone

from apps.academics.models import AcademicYear, GradeLevel
from apps.accounts.identifiers import ADMISSION_PREFIX, STUDENT_PREFIX, TEACHER_PREFIX, generate_identifier

from .base import ERPTestCase


class IdentifierTests(ERPTestCase):
    def test_sequences_are_padded_and_independent(self):
        year = timezone.now().year
        first_student = generate_identifier(STUDENT_PREFIX, year)
        second_student = generate_identifier(STUDENT_PREFIX, year)
        admission = generate_identifier(ADMISSION_PREFIX, year)
        teacher = generate_identifier(TEACHER_PREFIX, year)
        self.assertEqual(first_student, f'{STUDENT_PREFIX}{year}0001')
        self.assertEqual(second_student, f'{STUDENT_PREFIX}{year}0002')
        self.assertEqual(admission, f'{ADMISSION_PREFIX}{year}0001')
        self.assertEqual(teacher, f'{TEACHER_PREFIX}{year}0001')

    def test_grade_levels_cover_primary_and_secondary(self):
        self.assertEqual(GradeLevel.objects.count(), 10)
        self.assertEqual(GradeLevel.objects.get(number=1).name, 'Primary 1')
        self.assertEqual(GradeLevel.objects.get(number=5).stage, GradeLevel.Stage.PRIMARY)
        self.assertEqual(GradeLevel.objects.get(number=6).name, 'Secondary 6')
        self.assertEqual(GradeLevel.objects.get(number=10).stage, GradeLevel.Stage.SECONDARY)

    def test_only_one_academic_year_stays_current(self):
        first = self.make_year('2026-2027', current=True)
        second = self.make_year(
            '2027-2028',
            current=True,
            start=date(2027, 4, 1),
            end=date(2028, 3, 31),
        )
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(first.is_current)
        self.assertTrue(second.is_current)
        self.assertEqual(AcademicYear.objects.filter(is_current=True).count(), 1)
