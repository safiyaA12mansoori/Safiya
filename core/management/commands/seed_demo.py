from datetime import timedelta
from decimal import Decimal
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone
from docx import Document
from reportlab.pdfgen import canvas

from academics.models import AcademicSession, Chapter, ClassRoom, Course, Department, Subject, Topic, Unit
from accounts.models import AdminProfile, User
from ai_quiz.models import Quiz
from ai_quiz.services import publish_quiz, sample_questions, write_questions
from analytics.services import refresh_recommendations
from assignments.models import Assignment, AssignmentSubmission
from attendance.models import Attendance
from core.models import CollegeProfile
from examinations.models import Examination, ExaminationQuestion, ProgrammingProblem, ProgrammingTestCase, Question, QuestionOption
from examinations.services import score_attempt, start_attempt
from fees.models import FeeStructure
from fees.services import generate_dues, record_payment
from learning.models import StudyMaterial
from library.models import BookCategory, LibraryBook
from library.services import issue_book
from notifications.models import Announcement
from notifications.services import fanout_announcement
from placements.models import Company, Placement, PlacementApplication
from students.models import StudentProfile
from teachers.models import TeacherAssignment, TeacherProfile
from timetable.models import Timetable


NOTES = [
    "A variable in Python names a value, and the name can be rebound to a new value later in the program.",
    "A function groups statements under a name and returns a value when it is called with arguments.",
    "A list keeps items in order, and those items can be changed after the list is created.",
    "A dictionary maps a unique key to a value, which is useful for looking up a record by its identifier.",
    "A loop repeats a block of statements until its condition is no longer true.",
    "An exception signals that something unexpected happened, and it can be handled with try and except.",
    "A module is a file of Python definitions that another file can import by its name.",
    "A class bundles data and the functions that operate on that data into one definition.",
]


class Command(BaseCommand):
    help = "Load demo college data for the MCA walkthrough."

    def handle(self, *args, **options):
        if User.objects.filter(username="admin").exists():
            self.stdout.write("Demo data already exists.")
            return
        college = CollegeProfile.objects.create(
            name="Safiya College of Computer Applications",
            code="SCCA",
            address="FC Road",
            city="Pune",
            phone="02040001234",
            email="office@safiya.college",
            established_year=2008,
        )
        department = Department.objects.create(name="Computer Applications", code="MCA")
        session = AcademicSession.objects.create(
            name="2025-26",
            start_date=timezone.datetime(2025, 7, 1).date(),
            end_date=timezone.datetime(2026, 6, 30).date(),
            is_current=True,
        )
        course = Course.objects.create(department=department, name="Master of Computer Applications", code="MCA", duration_years=2)
        classroom = ClassRoom.objects.create(course=course, session=session, name="MCA-I", division="A", year=1)
        ClassRoom.objects.create(course=course, session=session, name="MCA-II", division="A", year=2)
        subjects = {}
        for code, name, semester in [
            ("MCA101", "Python Programming", 1),
            ("MCA102", "Database Management Systems", 1),
            ("MCA103", "Operating Systems", 1),
            ("MCA104", "Computer Networks", 2),
        ]:
            subjects[code] = Subject.objects.create(course=course, code=code, name=name, semester=semester, credits=4)
        python = subjects["MCA101"]
        dbms = subjects["MCA102"]
        for subject, units in {
            python: [("Getting started", ["Names and values", "Functions"]), ("Collections", ["Lists", "Dictionaries"])],
            dbms: [("Relational model", ["Tables", "Keys"]), ("Queries", ["SELECT", "Joins"])],
        }.items():
            for index, (title, topics) in enumerate(units, start=1):
                unit = Unit.objects.create(subject=subject, number=index, title=title)
                chapter = Chapter.objects.create(unit=unit, number=1, title=title)
                for topic_index, topic_title in enumerate(topics, start=1):
                    Topic.objects.create(
                        chapter=chapter,
                        number=topic_index,
                        title=topic_title,
                        is_completed=subject == python and topic_title == "Names and values",
                    )
        admin = self._user("admin", "Admin@12345", "Asha", "Kulkarni", User.Role.ADMIN, "9000000001", staff=True)
        AdminProfile.objects.create(user=admin, designation="Principal")
        anita_user = self._user("anita.sharma", "Teacher@12345", "Anita", "Sharma", User.Role.TEACHER, "9000000002")
        vikram_user = self._user("vikram.rao", "Teacher@12345", "Vikram", "Rao", User.Role.TEACHER, "9000000003")
        anita = TeacherProfile.objects.create(
            user=anita_user, employee_id="T-1001", department=department, designation="Assistant Professor", qualification="M.Tech"
        )
        vikram = TeacherProfile.objects.create(
            user=vikram_user, employee_id="T-1002", department=department, designation="Assistant Professor", qualification="MCA"
        )
        TeacherAssignment.objects.create(teacher=anita, subject=python, classroom=classroom)
        TeacherAssignment.objects.create(teacher=anita, subject=dbms, classroom=classroom)
        TeacherAssignment.objects.create(teacher=vikram, subject=subjects["MCA103"], classroom=classroom)
        TeacherAssignment.objects.create(teacher=vikram, subject=subjects["MCA104"], classroom=classroom)
        students = []
        roster = [
            ("rahul.verma", "Rahul", "Verma", "ADM25001", "MCA25001"),
            ("neha.kulkarni", "Neha", "Kulkarni", "ADM25002", "MCA25002"),
            ("arjun.patel", "Arjun", "Patel", "ADM25003", "MCA25003"),
            ("meera.nair", "Meera", "Nair", "ADM25004", "MCA25004"),
            ("dev.joshi", "Dev", "Joshi", "ADM25005", "MCA25005"),
            ("sara.khan", "Sara", "Khan", "ADM25006", "MCA25006"),
        ]
        for username, first, last, admission, student_id in roster:
            user = self._user(username, "Student@12345", first, last, User.Role.STUDENT, "9000000099")
            students.append(
                StudentProfile.objects.create(
                    user=user,
                    admission_number=admission,
                    student_id=student_id,
                    department=department,
                    course=course,
                    classroom=classroom,
                    academic_year=1,
                    guardian_name=f"{last} family",
                    guardian_phone="9000001111",
                    city="Pune",
                )
            )
        rahul, neha = students[0], students[1]
        pdf = self._pdf()
        material = StudyMaterial.objects.create(
            title="Python unit notes",
            subject=python,
            unit=python.units.first(),
            topic=Topic.objects.get(title="Functions"),
            classroom=classroom,
            kind=StudyMaterial.Kind.PDF,
            description="Class notes grounded in the Python unit.",
            uploaded_by=anita_user,
        )
        material.file.save("python-notes.pdf", ContentFile(pdf), save=True)
        doc = Document()
        doc.add_paragraph("A primary key identifies one row in a table and it cannot contain duplicate values.")
        buffer = BytesIO()
        doc.save(buffer)
        docx = StudyMaterial.objects.create(
            title="DBMS keys handout",
            subject=dbms,
            kind=StudyMaterial.Kind.DOCX,
            description="Short handout on keys.",
            uploaded_by=anita_user,
            classroom=classroom,
        )
        docx.file.save("dbms-keys.docx", ContentFile(buffer.getvalue()), save=True)
        StudyMaterial.objects.create(
            title="Python functions walkthrough",
            subject=python,
            kind=StudyMaterial.Kind.VIDEO,
            external_url="https://www.youtube.com/watch?v=kqtD5dpn9C8",
            description="Watch the linked walkthrough.",
            uploaded_by=anita_user,
            classroom=classroom,
        )
        assignment = Assignment.objects.create(
            title="Library ER diagram",
            subject=dbms,
            classroom=classroom,
            teacher=anita,
            description="Draw an ER diagram for a college library with books, members, and issues.",
            deadline=timezone.now() + timedelta(days=10),
            max_marks=20,
        )
        AssignmentSubmission.objects.create(
            assignment=assignment, student=rahul, text="Members borrow books. A book has an ISBN.", marks=Decimal("16"), feedback="Add the issue date."
        )
        AssignmentSubmission.objects.create(assignment=assignment, student=neha, text="Draft diagram uploaded as text.")
        today = timezone.localdate()
        for offset in range(1, 6):
            day = today - timedelta(days=offset)
            if day.weekday() > 4:
                continue
            for student in students:
                Attendance.objects.create(
                    student=student,
                    subject=python,
                    classroom=classroom,
                    teacher=anita,
                    date=day,
                    status=Attendance.Status.ABSENT if student == neha and offset == 1 else Attendance.Status.PRESENT,
                )
        exam = Examination.objects.create(
            title="Python basics quiz exam",
            subject=python,
            classroom=classroom,
            teacher=anita,
            exam_date=timezone.now() + timedelta(days=2),
            duration_minutes=20,
            instructions="Choose one option for each question.",
            is_published=True,
            results_published=True,
            negative_mark=Decimal("0"),
        )
        prompts = [
            ("Which structure keeps ordered items that can change?", ["List", "Tuple only", "Set literal", "Module"], 0, "Lists"),
            ("Which clause handles an unexpected error?", ["import", "except", "lambda", "yield"], 1, "Functions"),
            ("What does a dictionary store?", ["Only numbers", "Key and value pairs", "Only functions", "Binary files"], 1, "Dictionaries"),
            ("What is a module?", ["A loop", "A file of definitions", "A database row", "A CSS class"], 1, "Functions"),
        ]
        for order, (text, options, correct, topic_name) in enumerate(prompts, start=1):
            topic = Topic.objects.filter(title=topic_name, chapter__unit__subject=python).first()
            question = Question.objects.create(
                subject=python, topic=topic, unit=topic.chapter.unit if topic else None, teacher=anita,
                text=text, explanation="Seeded demonstration question.", marks=Decimal("2"), source="manual", difficulty="easy",
            )
            for index, option in enumerate(options, start=1):
                QuestionOption.objects.create(question=question, text=option, is_correct=index - 1 == correct, order=index)
            ExaminationQuestion.objects.create(examination=exam, question=question, order=order)
        exam.max_marks = Decimal("8")
        exam.save(update_fields=["max_marks"])
        attempt = start_attempt(exam, rahul)
        rows = list(attempt.answers.prefetch_related("question__options"))
        for index, answer in enumerate(rows):
            options = list(answer.question.options.all())
            correct = next(option for option in options if option.is_correct)
            wrong = next(option for option in options if not option.is_correct)
            answer.selected_option = wrong if index == 0 else correct
            answer.save(update_fields=["selected_option"])
        score_attempt(attempt)
        questions = sample_questions("Functions", 4, "mixed", "en")
        quiz = Quiz.objects.create(
            title="Python functions practice",
            teacher=anita,
            department=department,
            course=course,
            classroom=classroom,
            subject=python,
            topic=Topic.objects.filter(title="Functions").first(),
            source_type=Quiz.Source.TOPIC,
            question_count=4,
            difficulty=Quiz.Difficulty.MIXED,
            duration_minutes=10,
            is_demo=True,
            status=Quiz.Status.DRAFT,
        )
        write_questions(quiz, questions, replace=True)
        publish_quiz(quiz, anita_user)
        problem = ProgrammingProblem.objects.create(
            title="Sum of two integers",
            statement="Read two integers from one line and print their sum.",
            subject=python,
            classroom=classroom,
            teacher=anita,
            sample_input="2 3",
            sample_output="5",
            deadline=timezone.now() + timedelta(days=14),
        )
        ProgrammingTestCase.objects.create(problem=problem, stdin="2 3\n", expected_stdout="5\n", is_sample=True, marks=Decimal("5"))
        ProgrammingTestCase.objects.create(problem=problem, stdin="10 1\n", expected_stdout="11\n", is_sample=False, marks=Decimal("5"))
        category = BookCategory.objects.create(name="Computer Science")
        books = []
        for isbn, title, author in [
            ("9780132350884", "Clean Code", "Robert C. Martin"),
            ("9780262033848", "Introduction to Algorithms", "Cormen"),
            ("9780134685991", "Effective Java", "Joshua Bloch"),
            ("9781491957660", "Fluent Python", "Luciano Ramalho"),
            ("9780135957059", "The Pragmatic Programmer", "Thomas and Hunt"),
        ]:
            books.append(LibraryBook.objects.create(title=title, author=author, isbn=isbn, category=category, total_copies=2, available=2))
        issue_book(book=books[0], student=rahul, due_on=today + timedelta(days=7), actor=admin)
        overdue = issue_book(book=books[1], student=neha, due_on=today + timedelta(days=7), actor=admin)
        overdue.due_on = today - timedelta(days=4)
        overdue.save(update_fields=["due_on"])
        structure = FeeStructure.objects.create(course=course, session=session, name="Tuition", amount=Decimal("45000"), due_date=today + timedelta(days=30))
        generate_dues(structure)
        rahul_fee = rahul.fees.get(structure=structure)
        neha_fee = neha.fees.get(structure=structure)
        record_payment(student_fee=rahul_fee, amount=Decimal("20000"), method="UPI", reference="UPI25001", paid_on=today, actor=admin)
        record_payment(student_fee=neha_fee, amount=Decimal("45000"), method="BANK", reference="NEFT25002", paid_on=today, actor=admin)
        slots = [
            (0, 1, "09:00", "09:50", python, anita, "Lab-1"),
            (0, 2, "10:00", "10:50", dbms, anita, "Lab-1"),
            (1, 1, "09:00", "09:50", subjects["MCA103"], vikram, "Lab-2"),
            (2, 1, "09:00", "09:50", subjects["MCA104"], vikram, "Lab-2"),
            (3, 1, "11:00", "11:50", python, anita, "Lab-1"),
        ]
        for day, period, start, end, subject, teacher, room in slots:
            start_h, start_m = [int(part) for part in start.split(":")]
            end_h, end_m = [int(part) for part in end.split(":")]
            Timetable.objects.create(
                classroom=classroom, subject=subject, teacher=teacher, session=session, room=room,
                day_of_week=day, period=period,
                start_time=timezone.datetime(2025, 1, 1, start_h, start_m).time(),
                end_time=timezone.datetime(2025, 1, 1, end_h, end_m).time(),
            )
        company = Company.objects.create(name="Nimbus Labs", website="https://example.com", description="Product engineering team.")
        job = Placement.objects.create(
            company=company, title="Associate Software Engineer", description="Backend internship conversion role.",
            package="6 LPA", ctc_lpa=Decimal("6.0"), location="Pune", deadline=today + timedelta(days=40), is_open=True,
        )
        PlacementApplication.objects.create(placement=job, student=rahul, status=PlacementApplication.Status.APPLIED)
        note = Announcement.objects.create(
            title="Internal exam week",
            body="Python and DBMS assessments are scheduled this month. Check the exam list for the exact time.",
            audience=Announcement.Audience.STUDENTS,
            author=admin,
        )
        fanout_announcement(note)
        Announcement.objects.create(
            title="Faculty meeting",
            body="Department meeting on Friday at 3 PM in the seminar room.",
            audience=Announcement.Audience.TEACHERS,
            author=admin,
            is_active=True,
        )
        refresh_recommendations(rahul)
        self.stdout.write(self.style.SUCCESS(f"Seeded {college.name}."))

    def _user(self, username, password, first, last, role, phone, staff=False):
        user = User(username=username, email=f"{username}@safiya.college", first_name=first, last_name=last, role=role, phone=phone)
        user.set_password(password)
        user.is_staff = staff
        user.is_superuser = staff
        user.save()
        return user

    def _pdf(self):
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer)
        text = pdf.beginText(40, 800)
        for line in NOTES:
            text.textLine(line[:110])
        pdf.drawText(text)
        pdf.save()
        return buffer.getvalue()
