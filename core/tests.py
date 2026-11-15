from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from academics.models import AcademicSession, Chapter, ClassRoom, Course, Department, Subject, Topic, Unit
from ai_quiz.services import AIServiceError, extractive_questions, generate_questions, sample_questions
from assignments.models import Assignment
from attendance.models import Attendance
from examinations.models import Examination, ExaminationQuestion, ProgrammingProblem, ProgrammingTestCase, Question, QuestionOption
from examinations.runner import evaluate
from students.models import StudentProfile
from teachers.models import TeacherAssignment, TeacherProfile
from timetable.models import Timetable

User = get_user_model()
SOURCE = " ".join(
    [
        "A variable in Python names a value, and that name can later point at a different value.",
        "A function groups statements so they can be called with arguments from another place.",
        "A list stores ordered items, and those items remain changeable after creation.",
        "A dictionary maps each unique key to one value for quick lookup by an identifier.",
        "A loop repeats its block until the controlling condition is no longer true.",
        "An exception object describes a failure that try and except can handle in the caller.",
    ]
)


class CampusFlowTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(name="Computer Applications", code="MCA")
        self.session = AcademicSession.objects.create(
            name="2025-26", start_date=timezone.datetime(2025, 7, 1).date(), end_date=timezone.datetime(2026, 6, 30).date(), is_current=True
        )
        self.course = Course.objects.create(department=self.department, name="MCA", code="MCA", duration_years=2)
        self.classroom = ClassRoom.objects.create(course=self.course, session=self.session, name="MCA-I", division="A", year=1)
        self.subject = Subject.objects.create(course=self.course, code="MCA101", name="Python", semester=1, credits=4)
        unit = Unit.objects.create(subject=self.subject, number=1, title="Basics")
        chapter = Chapter.objects.create(unit=unit, number=1, title="Basics")
        self.topic = Topic.objects.create(chapter=chapter, number=1, title="Functions")
        self.admin = self._user("admin", "Admin@12345", User.Role.ADMIN)
        self.teacher_user = self._user("anita.sharma", "Teacher@12345", User.Role.TEACHER)
        self.student_user = self._user("rahul.verma", "Student@12345", User.Role.STUDENT)
        self.teacher = TeacherProfile.objects.create(user=self.teacher_user, employee_id="T-1001", department=self.department)
        TeacherAssignment.objects.create(teacher=self.teacher, subject=self.subject, classroom=self.classroom)
        self.student = StudentProfile.objects.create(
            user=self.student_user, admission_number="ADM1", student_id="MCA1", department=self.department,
            course=self.course, classroom=self.classroom, academic_year=1,
        )

    def _user(self, username, password, role):
        user = User(username=username, email=f"{username}@safiya.college", role=role, first_name=username.split(".")[0].title())
        user.set_password(password)
        user.save()
        return user

    def test_database_is_mysql(self):
        self.assertEqual(connection.vendor, "mysql")

    def test_role_dashboards_and_denied_modules(self):
        self.client.login(username="admin", password="Admin@12345")
        self.assertEqual(self.client.get(reverse("core:dashboard")).status_code, 200)
        self.client.logout()
        self.client.login(username="anita.sharma", password="Teacher@12345")
        self.assertContains(self.client.get(reverse("core:dashboard")), "Anita")
        self.assertEqual(self.client.get(reverse("students:create")).status_code, 403)
        self.client.logout()
        self.client.login(username="rahul.verma", password="Student@12345")
        self.assertEqual(self.client.get(reverse("core:dashboard")).status_code, 200)
        self.assertEqual(self.client.get(reverse("fees:pay")).status_code, 403)

    def test_attendance_assignment_and_student_cannot_grade(self):
        self.client.login(username="anita.sharma", password="Teacher@12345")
        response = self.client.post(
            reverse("attendance:mark"),
            {
                "classroom": self.classroom.pk,
                "subject": self.subject.pk,
                "date": str(timezone.localdate()),
                f"status_{self.student.pk}": "PRESENT",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Attendance.objects.get(student=self.student).status, "PRESENT")
        assignment = Assignment.objects.create(
            title="Notes", subject=self.subject, classroom=self.classroom, teacher=self.teacher,
            deadline=timezone.now() + timedelta(days=2), max_marks=10,
        )
        self.client.logout()
        self.client.login(username="rahul.verma", password="Student@12345")
        uploaded = SimpleUploadedFile("notes.txt", b"Library members borrow books.")
        saved = self.client.post(reverse("assignments:submit", args=[assignment.pk]), {"text": "My answer", "file": uploaded})
        self.assertEqual(saved.status_code, 302)
        self.assertEqual(assignment.submissions.count(), 1)
        grade = self.client.post(reverse("assignments:grade", args=[assignment.pk, assignment.submissions.first().pk]), {"marks": 9})
        self.assertEqual(grade.status_code, 403)
        self.assertIsNone(assignment.submissions.first().marks)

    def test_exam_attempt_is_scored_on_the_server(self):
        exam = Examination.objects.create(
            title="Basics", subject=self.subject, classroom=self.classroom, teacher=self.teacher,
            exam_date=timezone.now() + timedelta(days=1), duration_minutes=20, is_published=True,
        )
        question = Question.objects.create(subject=self.subject, teacher=self.teacher, text="Pick the list.", marks=2, source="manual")
        correct = QuestionOption.objects.create(question=question, text="List", is_correct=True, order=1)
        QuestionOption.objects.create(question=question, text="Other", is_correct=False, order=2)
        QuestionOption.objects.create(question=question, text="Third", is_correct=False, order=3)
        QuestionOption.objects.create(question=question, text="Fourth", is_correct=False, order=4)
        ExaminationQuestion.objects.create(examination=exam, question=question, order=1)
        self.client.login(username="rahul.verma", password="Student@12345")
        response = self.client.post(reverse("examinations:take", args=[exam.pk]), {f"q_{question.pk}": correct.pk, "action": "submit"})
        self.assertEqual(response.status_code, 302)
        attempt = exam.attempts.get(student=self.student)
        self.assertEqual(attempt.status, "SUBMITTED")
        self.assertEqual(attempt.score, Decimal("2"))

    def test_demo_quiz_stays_inside_the_source_or_is_labeled(self):
        grounded = extractive_questions(SOURCE, 2, "mixed", "Functions", "en")
        self.assertEqual(len(grounded), 2)
        for item in grounded:
            self.assertIn(item["options"][item["correct_index"]], SOURCE)
            for option in item["options"]:
                self.assertIn(option, SOURCE)
        with self.assertRaises(AIServiceError):
            extractive_questions("Too short.", 2, "easy", "Functions", "en")
        samples = sample_questions("Functions", 2, "easy", "en")
        self.assertTrue(all(row["question"].startswith("[SAMPLE]") for row in samples))
        generated, provider, demo = generate_questions(
            source_text=SOURCE, topic="Functions", count=2, difficulty="mixed", language="en", source_based=True
        )
        self.assertTrue(demo)
        self.assertEqual(provider, "demo")
        self.assertEqual(len(generated), 2)

    def test_python_runner_scores_a_sum_and_skips_other_languages(self):
        passed = evaluate("python", "a, b = map(int, input().split())\nprint(a + b)\n", [{"stdin": "2 3\n", "expected": "5", "marks": 5, "sample": True}])
        self.assertEqual(passed["status"], "passed")
        self.assertEqual(passed["score"], 5)
        self.assertTrue(passed["executed"])
        stored = evaluate("java", "class Main {}", [{"stdin": "", "expected": "", "marks": 1, "sample": True}])
        self.assertEqual(stored["status"], "demo")
        self.assertFalse(stored["executed"])
        problem = ProgrammingProblem.objects.create(
            title="Sum", statement="Add two integers.", subject=self.subject, classroom=self.classroom, teacher=self.teacher
        )
        ProgrammingTestCase.objects.create(problem=problem, stdin="2 3\n", expected_stdout="5\n", is_sample=True, marks=5)
        self.client.login(username="rahul.verma", password="Student@12345")
        response = self.client.post(
            reverse("examinations:programming_detail", args=[problem.pk]),
            {"language": "python", "code": "a, b = map(int, input().split())\nprint(a + b)\n"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(problem.submissions.get().status, "passed")

    def test_timetable_conflict_and_report_export(self):
        common = dict(
            classroom=self.classroom, subject=self.subject, teacher=self.teacher, session=self.session,
            day_of_week=0, period=1, start_time="09:00", end_time="09:50",
        )
        Timetable.objects.create(room="Lab-1", **common)
        clash = Timetable(room="Lab-2", **common)
        with self.assertRaises(Exception):
            clash.full_clean()
        self.client.login(username="admin", password="Admin@12345")
        exported = self.client.get(reverse("reports:report", args=["students"]) + "?export=xlsx")
        self.assertEqual(exported.status_code, 200)
        self.assertIn("spreadsheet", exported["Content-Type"])
        pdf = self.client.get(reverse("reports:report", args=["students"]) + "?export=pdf")
        self.assertEqual(pdf["Content-Type"], "application/pdf")
        self.client.logout()
        self.client.login(username="rahul.verma", password="Student@12345")
        self.assertEqual(self.client.get(reverse("reports:report", args=["teachers"])).status_code, 403)
