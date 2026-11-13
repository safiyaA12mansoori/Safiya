import re
from datetime import date

from django.test import RequestFactory
from django.urls import reverse

from apps.accounts.models import CustomUser
from apps.academics.models import AcademicYear, ClassRoom, ClassSubject, GradeLevel, Subject
from apps.audit.models import AuditLog
from apps.students.models import Student
from apps.students.services import create_student
from apps.teachers.models import Teacher, TeacherAssignment

from .base import ERPTestCase


class StudentCrudTests(ERPTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.year = cls.make_year()
        cls.other_year = cls.make_year(
            '2025-2026',
            current=False,
            start=date(2025, 4, 1),
            end=date(2026, 3, 31),
        )
        cls.room = cls.make_room(cls.year)
        cls.other_room = cls.make_room(cls.other_year, division='B')
        cls.principal = cls.make_user('crud.principal', CustomUser.Role.PRINCIPAL, 'Asha', 'Iyer')

    def setUp(self):
        self.client.force_login(self.principal)

    def payload(self, **overrides):
        data = {
            'first_name': 'Amina',
            'last_name': 'Khan',
            'date_of_birth': '2015-04-02',
            'gender': 'female',
            'address': '12 Lake Road',
            'parent_name': 'Yusuf Khan',
            'parent_phone': '2025550143',
            'academic_year': self.year.pk,
            'classroom': self.room.pk,
        }
        data.update(overrides)
        return data

    def create_via_form(self):
        response = self.client.post(reverse('student-create'), self.payload(), follow=True)
        self.assertEqual(response.status_code, 200)
        match = re.search(r'id="temporary-password"[^>]*value="([^"]+)"', response.content.decode())
        self.assertIsNotNone(match)
        student = Student.objects.get(user__first_name='Amina')
        return student, match.group(1), response

    def test_create_form_lists_classrooms_for_the_year(self):
        response = self.client.get(reverse('student-create'))
        self.assertContains(response, 'Primary 1 - A (2026-2027)')
        self.assertContains(response, f'data-year="{self.year.pk}"')

    def test_principal_creates_student_with_ids_and_one_time_password(self):
        student, password, response = self.create_via_form()
        self.assertRegex(student.student_id, r'^STD\d{8}$')
        self.assertRegex(student.admission_number, r'^ADM\d{8}$')
        self.assertEqual(student.user.username, student.student_id)
        self.assertEqual(student.user.role, CustomUser.Role.STUDENT)
        self.assertContains(response, student.student_id)
        self.assertContains(response, 'Yusuf Khan')
        log = AuditLog.objects.get(model_name='student', action=AuditLog.Action.CREATE, object_id=str(student.pk))
        self.assertNotIn(password, str(log.changes))
        self.client.logout()
        self.assertTrue(self.client.login(username=student.user.username, password=password))
        again = self.client.get(reverse('student-detail', args=[student.pk]))
        self.assertEqual(again.status_code, 403)
        self.client.force_login(self.principal)
        repeat = self.client.get(reverse('student-detail', args=[student.pk]))
        self.assertNotContains(repeat, password)

    def test_invalid_phone_and_wrong_class_year_are_rejected(self):
        bad_phone = self.client.post(reverse('student-create'), self.payload(parent_phone='abc'))
        self.assertContains(bad_phone, 'valid phone number')
        mismatch = self.client.post(
            reverse('student-create'),
            self.payload(classroom=self.other_room.pk),
        )
        self.assertContains(mismatch, 'selected academic year')
        self.assertEqual(Student.objects.count(), 0)

    def test_edit_search_deactivate_and_delete(self):
        student, password, _response = self.create_via_form()
        updated = self.client.post(
            reverse('student-edit', args=[student.pk]),
            self.payload(parent_phone='2025550199', is_active='on'),
            follow=True,
        )
        self.assertContains(updated, '2025550199')
        log = AuditLog.objects.filter(model_name='student', action=AuditLog.Action.UPDATE).latest('created_at')
        self.assertEqual(log.changes['parent_phone']['to'], '2025550199')
        self.assertNotIn('password', log.changes)

        listed = self.client.get(reverse('student-list'), {'q': 'Amina'})
        self.assertContains(listed, 'Amina')
        empty = self.client.get(reverse('student-list'), {'q': 'zzzz-not-a-student'})
        self.assertNotContains(empty, 'Amina')

        self.client.post(reverse('student-edit', args=[student.pk]), self.payload(parent_phone='2025550199'))
        student.user.refresh_from_db()
        self.assertFalse(student.user.is_active)
        self.client.logout()
        self.assertFalse(self.client.login(username=student.user.username, password=password))

        self.client.force_login(self.principal)
        self.client.post(reverse('student-delete', args=[student.pk]))
        self.assertFalse(Student.objects.filter(pk=student.pk).exists())
        self.assertFalse(CustomUser.objects.filter(username=student.student_id).exists())
        self.assertTrue(
            AuditLog.objects.filter(model_name='student', action=AuditLog.Action.DELETE).exists()
        )

    def test_student_list_paginates(self):
        request = RequestFactory().post('/')
        request.user = self.principal
        request.META['REMOTE_ADDR'] = '127.0.0.1'
        for index in range(11):
            create_student(
                first_name=f'Student{index:02d}',
                last_name='Page',
                date_of_birth=date(2015, 4, 2),
                gender=Student.Gender.MALE,
                address='',
                parent_name='Parent Page',
                parent_phone='2025550177',
                academic_year=self.year,
                classroom=self.room,
                request=request,
            )
        first = self.client.get(reverse('student-list'))
        second = self.client.get(reverse('student-list'), {'page': 2})
        self.assertContains(first, 'Student00')
        self.assertNotContains(first, 'Student10')
        self.assertContains(second, 'Student10')
        self.assertContains(second, 'of 11')

    def test_class_with_students_cannot_be_deleted(self):
        self.create_via_form()
        response = self.client.post(reverse('class-delete', args=[self.room.pk]), follow=True)
        self.assertContains(response, 'cannot be deleted')
        self.assertTrue(ClassRoom.objects.filter(pk=self.room.pk).exists())


class SchoolStructureTests(ERPTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.year = cls.make_year()
        cls.principal = cls.make_user('structure.principal', CustomUser.Role.PRINCIPAL)

    def setUp(self):
        self.client.force_login(self.principal)

    def test_class_subject_allocation_and_teacher_dashboard(self):
        primary = GradeLevel.objects.get(number=1)
        created = self.client.post(
            reverse('class-create'),
            {'academic_year': self.year.pk, 'grade_level': primary.pk, 'division': 'b'},
            follow=True,
        )
        room = ClassRoom.objects.get(division='B')
        self.assertContains(created, 'Primary 1 - B')
        duplicate = self.client.post(
            reverse('class-create'),
            {'academic_year': self.year.pk, 'grade_level': primary.pk, 'division': 'b'},
        )
        self.assertContains(duplicate, 'already exists')

        subject_response = self.client.post(
            reverse('subject-create'),
            {'name': 'Science', 'code': 'sci', 'description': 'General science'},
            follow=True,
        )
        subject = Subject.objects.get(code='SCI')
        self.assertContains(subject_response, 'Science')
        self.client.post(reverse('class-add-subject', args=[room.pk]), {'subject': subject.pk})
        self.assertTrue(ClassSubject.objects.filter(classroom=room, subject=subject).exists())

        teacher_response = self.client.post(
            reverse('teacher-create'),
            {
                'first_name': 'Leela',
                'last_name': 'Menon',
                'email': 'leela@example.com',
                'phone': '2025550108',
                'qualification': 'M.Sc.',
                'joined_on': '2026-04-01',
            },
            follow=True,
        )
        self.assertEqual(teacher_response.status_code, 200)
        password = re.search(
            r'id="temporary-password"[^>]*value="([^"]+)"',
            teacher_response.content.decode(),
        ).group(1)
        teacher = Teacher.objects.get(user__first_name='Leela')
        self.assertRegex(teacher.teacher_id, r'^TCH\d{8}$')
        self.assertNotContains(self.client.get(reverse('teacher-detail', args=[teacher.pk])), password)

        allocation = self.client.post(
            reverse('allocation-create'),
            {
                'academic_year': self.year.pk,
                'classroom': room.pk,
                'subject': subject.pk,
                'teacher': teacher.pk,
            },
            follow=True,
        )
        self.assertContains(allocation, 'Teacher allocation saved')
        again = self.client.post(
            reverse('allocation-create'),
            {
                'academic_year': self.year.pk,
                'classroom': room.pk,
                'subject': subject.pk,
                'teacher': teacher.pk,
            },
        )
        self.assertContains(again, 'already allocated')
        self.assertEqual(TeacherAssignment.objects.filter(teacher=teacher).count(), 1)

        self.client.logout()
        self.assertTrue(self.client.login(username=teacher.user.username, password=password))
        dashboard = self.client.get(reverse('teacher-dashboard'))
        self.assertContains(dashboard, 'Science')
        self.assertContains(dashboard, 'Primary 1 - B')
        self.assertContains(dashboard, teacher.teacher_id)

    def test_current_year_switch_and_protected_delete(self):
        self.client.post(
            reverse('year-create'),
            {
                'name': '2027-2028',
                'start_date': '2027-04-01',
                'end_date': '2028-03-31',
                'is_current': 'on',
            },
        )
        self.year.refresh_from_db()
        later = AcademicYear.objects.get(name='2027-2028')
        self.assertFalse(self.year.is_current)
        self.assertTrue(later.is_current)
        self.client.post(reverse('year-set-current', args=[self.year.pk]))
        self.year.refresh_from_db()
        later.refresh_from_db()
        self.assertTrue(self.year.is_current)
        self.assertFalse(later.is_current)

        secondary = GradeLevel.objects.get(number=6)
        self.client.post(
            reverse('class-create'),
            {'academic_year': self.year.pk, 'grade_level': secondary.pk, 'division': 'A'},
        )
        blocked = self.client.post(reverse('year-delete', args=[self.year.pk]), follow=True)
        self.assertContains(blocked, 'cannot be deleted')
        self.assertTrue(AcademicYear.objects.filter(pk=self.year.pk).exists())

    def test_subject_in_use_cannot_be_deleted(self):
        room = self.make_room(self.year, number=2, division='A')
        response = self.client.post(
            reverse('subject-create'),
            {'name': 'English', 'code': 'ENG', 'description': ''},
            follow=True,
        )
        subject = Subject.objects.get(code='ENG')
        self.assertContains(response, 'ENG')
        self.client.post(reverse('class-add-subject', args=[room.pk]), {'subject': subject.pk})
        blocked = self.client.post(reverse('subject-delete', args=[subject.pk]), follow=True)
        self.assertContains(blocked, 'cannot be deleted')
        self.assertTrue(Subject.objects.filter(pk=subject.pk).exists())
