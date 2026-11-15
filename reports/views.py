from django.core.exceptions import PermissionDenied
from django.shortcuts import render

from accounts.models import User
from ai_quiz.models import QuizAttempt
from assignments.models import AssignmentSubmission
from attendance.models import Attendance
from core.access import role_required, student_profile, teacher_classroom_ids, teacher_profile
from examinations.models import ExaminationAttempt
from fees.models import StudentFee
from library.models import BookIssue
from placements.models import PlacementApplication
from students.models import StudentProfile
from teachers.models import TeacherProfile

from .exporters import pdf_response, xlsx_response

REPORTS = [
    ("students", "Students", "ADMIN", "TEACHER"),
    ("teachers", "Teachers", "ADMIN"),
    ("attendance", "Attendance", "ADMIN", "TEACHER", "STUDENT"),
    ("exams", "Exam results", "ADMIN", "TEACHER", "STUDENT"),
    ("assignments", "Assignments", "ADMIN", "TEACHER", "STUDENT"),
    ("quizzes", "AI quiz performance", "ADMIN", "TEACHER", "STUDENT"),
    ("fees", "Fees", "ADMIN", "STUDENT"),
    ("library", "Library", "ADMIN"),
    ("placements", "Placements", "ADMIN", "STUDENT"),
]


def _students(user, request):
    qs = StudentProfile.objects.select_related("user", "department", "course", "classroom")
    if user.role == User.Role.TEACHER:
        qs = qs.filter(classroom_id__in=teacher_classroom_ids(user))
    elif user.role == User.Role.STUDENT:
        qs = qs.filter(pk=student_profile(user).pk)
    if request.GET.get("q"):
        qs = qs.filter(user__first_name__icontains=request.GET["q"].strip())
    if request.GET.get("department"):
        qs = qs.filter(department_id=request.GET["department"])
    if request.GET.get("course"):
        qs = qs.filter(course_id=request.GET["course"])
    if request.GET.get("classroom"):
        qs = qs.filter(classroom_id=request.GET["classroom"])
    rows = [
        [row.admission_number, row.student_id, row.user.get_full_name(), row.user.email, row.department.code, row.course.code, str(row.classroom), "Active" if row.user.is_active else "Inactive"]
        for row in qs
    ]
    return ["Admission", "Student ID", "Name", "Email", "Dept", "Course", "Class", "Status"], rows


def _teachers(user, request):
    qs = TeacherProfile.objects.select_related("user", "department")
    if request.GET.get("department"):
        qs = qs.filter(department_id=request.GET["department"])
    rows = [[row.employee_id, row.user.get_full_name(), row.designation, row.department.code, row.user.email, row.assignments.count()] for row in qs]
    return ["Employee ID", "Name", "Designation", "Dept", "Email", "Workload"], rows


def _attendance(user, request):
    qs = Attendance.objects.select_related("student__user", "subject", "classroom")
    if user.role == User.Role.TEACHER:
        qs = qs.filter(teacher=teacher_profile(user))
    elif user.role == User.Role.STUDENT:
        qs = qs.filter(student=student_profile(user))
    if request.GET.get("classroom"):
        qs = qs.filter(classroom_id=request.GET["classroom"])
    if request.GET.get("subject"):
        qs = qs.filter(subject_id=request.GET["subject"])
    if request.GET.get("month"):
        year, month = request.GET["month"].split("-")
        qs = qs.filter(date__year=year, date__month=month)
    rows = [[row.date, row.student.student_id, row.student.user.get_full_name(), row.subject.code, row.status] for row in qs[:1000]]
    return ["Date", "Student ID", "Name", "Subject", "Status"], rows


def _exams(user, request):
    qs = ExaminationAttempt.objects.filter(status="SUBMITTED").select_related("examination", "student__user")
    if user.role == User.Role.TEACHER:
        qs = qs.filter(examination__teacher=teacher_profile(user))
    elif user.role == User.Role.STUDENT:
        qs = qs.filter(student=student_profile(user))
    if request.GET.get("exam"):
        qs = qs.filter(examination_id=request.GET["exam"])
    rows = [[row.examination.title, row.student.student_id, row.student.user.get_full_name(), row.score, row.max_score, row.submitted_at] for row in qs]
    return ["Exam", "Student ID", "Name", "Score", "Max", "Submitted"], rows


def _assignments(user, request):
    qs = AssignmentSubmission.objects.select_related("assignment", "student__user")
    if user.role == User.Role.TEACHER:
        qs = qs.filter(assignment__teacher=teacher_profile(user))
    elif user.role == User.Role.STUDENT:
        qs = qs.filter(student=student_profile(user))
    if request.GET.get("assignment"):
        qs = qs.filter(assignment_id=request.GET["assignment"])
    rows = [[row.assignment.title, row.student.student_id, row.student.user.get_full_name(), row.marks, row.assignment.max_marks, row.submitted_at] for row in qs]
    return ["Assignment", "Student ID", "Name", "Marks", "Max", "Submitted"], rows


def _quizzes(user, request):
    qs = QuizAttempt.objects.filter(status="SUBMITTED").select_related("quiz", "student__user")
    if user.role == User.Role.TEACHER:
        qs = qs.filter(quiz__teacher=teacher_profile(user))
    elif user.role == User.Role.STUDENT:
        qs = qs.filter(student=student_profile(user))
    if request.GET.get("quiz"):
        qs = qs.filter(quiz_id=request.GET["quiz"])
    rows = [[row.quiz.title, row.student.student_id, row.student.user.get_full_name(), row.score, row.max_score, "Demo" if row.quiz.is_demo else "Live"] for row in qs]
    return ["Quiz", "Student ID", "Name", "Score", "Max", "Mode"], rows


def _fees(user, request):
    qs = StudentFee.objects.select_related("student__user", "structure")
    if user.role == User.Role.STUDENT:
        qs = qs.filter(student=student_profile(user))
    if request.GET.get("status"):
        qs = qs.filter(status=request.GET["status"])
    rows = [[row.student.student_id, row.student.user.get_full_name(), row.structure.name, row.amount, row.paid_amount, row.balance, row.status] for row in qs]
    return ["Student ID", "Name", "Fee", "Amount", "Paid", "Balance", "Status"], rows


def _library(user, request):
    qs = BookIssue.objects.select_related("book", "student__user")
    if request.GET.get("overdue") == "1":
        from django.utils import timezone

        qs = qs.filter(returned_on__isnull=True, due_on__lt=timezone.localdate())
    rows = [[row.book.title, row.book.isbn, row.student.student_id, row.issued_on, row.due_on, row.returned_on or "Open", row.fine] for row in qs]
    return ["Book", "ISBN", "Student", "Issued", "Due", "Returned", "Fine"], rows


def _placements(user, request):
    qs = PlacementApplication.objects.select_related("placement__company", "student__user")
    if user.role == User.Role.STUDENT:
        qs = qs.filter(student=student_profile(user))
    if request.GET.get("status"):
        qs = qs.filter(status=request.GET["status"])
    rows = [[row.placement.title, row.placement.company.name, row.student.student_id, row.student.user.get_full_name(), row.status, row.interview_at] for row in qs]
    return ["Job", "Company", "Student ID", "Name", "Status", "Interview"], rows


BUILDERS = {
    "students": _students,
    "teachers": _teachers,
    "attendance": _attendance,
    "exams": _exams,
    "assignments": _assignments,
    "quizzes": _quizzes,
    "fees": _fees,
    "library": _library,
    "placements": _placements,
}


def _guard(user, kind):
    allowed = next(item for item in REPORTS if item[0] == kind)
    if user.role not in allowed[2:]:
        raise PermissionDenied


@role_required("ADMIN", "TEACHER", "STUDENT")
def hub(request):
    visible = [item for item in REPORTS if request.user.role in item[2:]]
    return render(request, "reports/hub.html", {"reports": visible})


@role_required("ADMIN", "TEACHER", "STUDENT")
def report(request, kind):
    _guard(request.user, kind)
    headers, rows = BUILDERS[kind](request.user, request)
    title = next(item[1] for item in REPORTS if item[0] == kind)
    export = request.GET.get("export")
    if export == "xlsx":
        return xlsx_response(f"{kind}.xlsx", headers, rows)
    if export == "pdf":
        return pdf_response(f"{kind}.pdf", title, headers, rows)
    return render(request, "reports/table.html", {"title": title, "kind": kind, "headers": headers, "rows": rows})
