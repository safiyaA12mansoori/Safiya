from django.urls import reverse

from apps.accounts.models import CustomUser

from .base import ERPTestCase


class RolePermissionTests(ERPTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.year = cls.make_year()
        cls.room = cls.make_room(cls.year)
        cls.subject = cls.make_subject()
        cls.principal = cls.make_user('perm.principal', CustomUser.Role.PRINCIPAL, 'Asha', 'Iyer')
        cls.teacher = cls.make_teacher('perm.teacher')
        cls.student = cls.make_student(cls.year, cls.room, username='perm.student')
        cls.other_student = cls.make_student(
            cls.year,
            cls.room,
            username='perm.other',
            first='Zara',
            last='Khan',
            parent_phone='2025550188',
        )

    def principal_urls(self):
        return [
            reverse('principal-dashboard'),
            reverse('student-list'),
            reverse('student-create'),
            reverse('student-detail', args=[self.student.pk]),
            reverse('teacher-list'),
            reverse('teacher-create'),
            reverse('class-list'),
            reverse('class-create'),
            reverse('subject-list'),
            reverse('allocation-list'),
            reverse('allocation-create'),
            reverse('year-list'),
            reverse('year-create'),
        ]

    def test_anonymous_users_are_sent_to_login(self):
        response = self.client.get(reverse('principal-dashboard'))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('principal-dashboard')}")

    def test_principal_can_open_management_pages(self):
        self.client.force_login(self.principal)
        for url in self.principal_urls():
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200, url)

    def test_teacher_and_student_cannot_manage_school_records(self):
        for user in (self.teacher.user, self.student.user):
            self.client.force_login(user)
            for url in self.principal_urls():
                response = self.client.get(url)
                self.assertEqual(response.status_code, 403, f'{user.username} {url}')
            response = self.client.post(reverse('student-create'), {'first_name': 'Nope'})
            self.assertEqual(response.status_code, 403)

    def test_teacher_and_student_see_only_their_own_dashboard(self):
        self.client.force_login(self.teacher.user)
        self.assertEqual(self.client.get(reverse('teacher-dashboard')).status_code, 200)
        self.assertEqual(self.client.get(reverse('teacher-profile')).status_code, 200)
        self.assertEqual(self.client.get(reverse('student-dashboard')).status_code, 403)
        self.client.force_login(self.student.user)
        response = self.client.get(reverse('student-dashboard'))
        self.assertContains(response, self.student.student_id)
        self.assertNotContains(response, self.other_student.student_id)
        profile = self.client.get(reverse('student-profile'))
        self.assertContains(profile, self.student.admission_number)
        self.assertNotContains(profile, self.other_student.admission_number)
        self.assertEqual(self.client.get(reverse('teacher-dashboard')).status_code, 403)
