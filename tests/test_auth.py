import re
from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import CustomUser, LoginAttempt

from .base import ERPTestCase


class LoginTests(ERPTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.principal = cls.make_user('principal.login', CustomUser.Role.PRINCIPAL, 'Asha', 'Iyer')

    def test_login_page_and_role_redirect(self):
        response = self.client.get(reverse('login'))
        self.assertContains(response, 'Log in')
        response = self.client.post(
            reverse('login'),
            {'username': self.principal.username, 'password': self.password},
        )
        self.assertRedirects(response, reverse('principal-dashboard'), fetch_redirect_response=False)

    def test_logout_requires_post(self):
        self.client.force_login(self.principal)
        self.assertEqual(self.client.get(reverse('logout')).status_code, 405)
        response = self.client.post(reverse('logout'))
        self.assertRedirects(response, reverse('login'), fetch_redirect_response=False)

    def test_login_rate_limit_blocks_the_correct_password(self):
        for _ in range(4):
            response = self.client.post(
                reverse('login'),
                {'username': self.principal.username, 'password': 'wrong-password'},
            )
            self.assertEqual(response.status_code, 200)
        response = self.client.post(
            reverse('login'),
            {'username': self.principal.username, 'password': 'wrong-password'},
        )
        self.assertEqual(response.status_code, 429)
        self.assertContains(response, 'Too many login attempts', status_code=429)
        response = self.client.post(
            reverse('login'),
            {'username': self.principal.username, 'password': self.password},
        )
        self.assertEqual(response.status_code, 429)
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_rate_limit_expires_and_does_not_block_another_username(self):
        other = self.make_user('other.login', CustomUser.Role.TEACHER, 'Other', 'Teacher')
        for _ in range(5):
            self.client.post(
                reverse('login'),
                {'username': self.principal.username, 'password': 'wrong-password'},
            )
        response = self.client.post(
            reverse('login'),
            {'username': other.username, 'password': self.password},
        )
        self.assertRedirects(response, reverse('teacher-dashboard'), fetch_redirect_response=False)
        self.client.logout()
        LoginAttempt.objects.filter(username_key=self.principal.username.lower()).update(
            attempted_at=timezone.now() - timedelta(minutes=16)
        )
        response = self.client.post(
            reverse('login'),
            {'username': self.principal.username, 'password': self.password},
        )
        self.assertRedirects(response, reverse('principal-dashboard'), fetch_redirect_response=False)

    def test_login_post_without_csrf_token_is_rejected(self):
        client = Client(enforce_csrf_checks=True)
        response = client.get(reverse('login'))
        self.assertContains(response, 'csrfmiddlewaretoken')
        response = client.post(reverse('login'), {'username': 'x', 'password': 'y'})
        self.assertEqual(response.status_code, 403)

    def test_password_change_keeps_the_session(self):
        self.client.force_login(self.principal)
        response = self.client.post(
            reverse('account'),
            {
                'form': 'password',
                'old_password': self.password,
                'new_password1': 'Changed-Pass-19',
                'new_password2': 'Changed-Pass-19',
            },
        )
        self.assertRedirects(response, reverse('account'))
        self.client.logout()
        logged_in = self.client.login(username=self.principal.username, password='Changed-Pass-19')
        self.assertTrue(logged_in)
        self.assertFalse(self.client.login(username=self.principal.username, password=self.password))


class DevUserCommandTests(ERPTestCase):
    @override_settings(DEBUG=True)
    def test_command_creates_one_user_per_role_and_does_not_repeat_passwords(self):
        output = StringIO()
        call_command('create_dev_users', stdout=output)
        text = output.getvalue()
        self.assertIn('created role=principal username=principal password=', text)
        self.assertIn('created role=teacher username=teacher password=', text)
        self.assertIn('created role=student username=student password=', text)
        self.assertRegex(text, r'teacher_id=TCH\d{8}')
        self.assertRegex(text, r'student_id=STD\d{8}')
        self.assertEqual(get_user_model().objects.count(), 3)

        again = StringIO()
        call_command('create_dev_users', stdout=again)
        self.assertIn('No passwords changed', again.getvalue())
        self.assertNotRegex(again.getvalue(), r'password=[A-Za-z0-9]')
        self.assertEqual(get_user_model().objects.count(), 3)

    @override_settings(DEBUG=True)
    def test_dev_users_can_open_their_dashboards(self):
        output = StringIO()
        call_command('create_dev_users', stdout=output)
        text = output.getvalue()
        teacher_password = re.search(r'username=teacher password=(\S+)', text).group(1)
        student_password = re.search(r'username=student password=(\S+)', text).group(1)
        student_id = re.search(r'student_id=(\S+)', text).group(1)

        self.client.login(username='teacher', password=teacher_password)
        response = self.client.get(reverse('teacher-dashboard'))
        self.assertContains(response, 'Mathematics')
        self.assertContains(response, 'Primary 1')
        self.client.logout()

        self.client.login(username='student', password=student_password)
        response = self.client.get(reverse('student-dashboard'))
        self.assertContains(response, student_id)
        self.assertContains(response, 'Primary 1')
        self.assertNotContains(response, 'Add student')

    @override_settings(DEBUG=False)
    def test_command_refuses_when_debug_is_off(self):
        with self.assertRaises(CommandError):
            call_command('create_dev_users')
