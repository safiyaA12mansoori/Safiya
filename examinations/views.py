from decimal import Decimal

from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from accounts.models import User
from core.access import role_required, student_profile, teacher_owns, teacher_profile
from core.audit import log_action
from notifications.services import notify

from .forms import ExamForm, MCQForm, ProgramForm
from .models import Examination, ExaminationQuestion, ProgrammingProblem, ProgrammingTestCase, Question, QuestionOption
from .services import attempt_items, publish_exam, result_rows, save_posted, score_attempt, seconds_left, start_attempt, submit_program


def _exams(user):
    qs = Examination.objects.select_related("subject", "classroom", "teacher__user")
    if user.role == User.Role.ADMIN:
        return qs
    if user.role == User.Role.TEACHER:
        profile = teacher_profile(user)
        return qs.filter(teacher=profile) if profile else qs.none()
    profile = student_profile(user)
    return qs.filter(classroom=profile.classroom, is_published=True) if profile else qs.none()


def _programs(user):
    qs = ProgrammingProblem.objects.select_related("subject", "classroom", "teacher__user")
    if user.role == User.Role.ADMIN:
        return qs
    if user.role == User.Role.TEACHER:
        profile = teacher_profile(user)
        return qs.filter(teacher=profile) if profile else qs.none()
    profile = student_profile(user)
    return qs.filter(classroom=profile.classroom, is_published=True) if profile else qs.none()


def _save_mcq(form, subject, teacher, source="manual"):
    data = form.cleaned_data
    question = Question.objects.create(
        subject=subject,
        topic=data.get("topic"),
        unit=data["topic"].chapter.unit if data.get("topic") else None,
        teacher=teacher,
        difficulty=data["difficulty"],
        text=data["text"],
        explanation=data["explanation"],
        marks=data["marks"],
        source=source,
    )
    for index in range(1, 5):
        QuestionOption.objects.create(
            question=question,
            text=data[f"option_{index}"],
            is_correct=data["correct"] == str(index),
            order=index,
        )
    return question


@role_required("ADMIN", "TEACHER", "STUDENT")
def exam_list(request):
    qs = _exams(request.user)
    if request.GET.get("q"):
        qs = qs.filter(title__icontains=request.GET["q"].strip())
    return render(request, "examinations/list.html", {"page_obj": Paginator(qs, 12).get_page(request.GET.get("page"))})


@role_required("ADMIN", "TEACHER")
def exam_create(request):
    teacher = teacher_profile(request.user) if request.user.role == User.Role.TEACHER else None
    form = ExamForm(request.POST or None, teacher=teacher)
    if request.method == "POST" and form.is_valid():
        exam = form.save(commit=False)
        if teacher:
            if not teacher_owns(request.user, exam.classroom_id, exam.subject_id):
                raise PermissionDenied
            exam.teacher = teacher
        else:
            from teachers.models import TeacherAssignment

            load = TeacherAssignment.objects.filter(classroom=exam.classroom, subject=exam.subject).select_related("teacher").first()
            if not load:
                messages.error(request, "Assign a teacher to that class and subject first.")
                return render(request, "examinations/form.html", {"form": form, "page_title": "New examination"})
            exam.teacher = load.teacher
        exam.save()
        messages.success(request, "Examination created. Add questions next.")
        return redirect("examinations:detail", pk=exam.pk)
    return render(request, "examinations/form.html", {"form": form, "page_title": "New examination"})


@role_required("ADMIN", "TEACHER")
def exam_edit(request, pk):
    exam = get_object_or_404(_exams(request.user), pk=pk)
    teacher = teacher_profile(request.user) if request.user.role == User.Role.TEACHER else None
    form = ExamForm(request.POST or None, instance=exam, teacher=teacher)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Examination updated.")
        return redirect("examinations:detail", pk=exam.pk)
    return render(request, "examinations/form.html", {"form": form, "page_title": "Edit examination"})


@role_required("ADMIN", "TEACHER", "STUDENT")
def exam_detail(request, pk):
    exam = get_object_or_404(_exams(request.user), pk=pk)
    links = exam.links.select_related("question").prefetch_related("question__options")
    form = MCQForm(subject=exam.subject) if request.user.role != User.Role.STUDENT else None
    bank = []
    if request.user.role != User.Role.STUDENT:
        bank = Question.objects.filter(subject=exam.subject, is_active=True).exclude(exam_links__examination=exam)[:30]
    attempt = None
    if request.user.role == User.Role.STUDENT:
        profile = student_profile(request.user)
        attempt = exam.attempts.filter(student=profile).first()
    return render(
        request,
        "examinations/detail.html",
        {"exam": exam, "links": links, "form": form, "bank": bank, "attempt": attempt},
    )


@role_required("ADMIN", "TEACHER")
def add_question(request, pk):
    exam = get_object_or_404(_exams(request.user), pk=pk)
    if request.method != "POST":
        return redirect("examinations:detail", pk=pk)
    if request.POST.get("bank_id"):
        question = get_object_or_404(Question, pk=request.POST["bank_id"], subject=exam.subject)
    else:
        form = MCQForm(request.POST, subject=exam.subject)
        if not form.is_valid():
            messages.error(request, "Check the question. It needs text, four options, and one correct answer.")
            return redirect("examinations:detail", pk=pk)
        question = _save_mcq(form, exam.subject, exam.teacher)
    order = (exam.links.order_by("-order").values_list("order", flat=True).first() or 0) + 1
    ExaminationQuestion.objects.get_or_create(examination=exam, question=question, defaults={"order": order})
    exam.max_marks = sum((link.question.marks for link in exam.links.select_related("question")), Decimal("0"))
    exam.save(update_fields=["max_marks", "updated_at"])
    messages.success(request, "Question added.")
    return redirect("examinations:detail", pk=pk)


@role_required("ADMIN", "TEACHER")
def remove_question(request, pk, link_id):
    exam = get_object_or_404(_exams(request.user), pk=pk)
    if request.method == "POST":
        exam.links.filter(pk=link_id).delete()
        messages.success(request, "Question removed from the exam. It stays in the bank.")
    return redirect("examinations:detail", pk=pk)


@role_required("ADMIN", "TEACHER")
def publish(request, pk):
    exam = get_object_or_404(_exams(request.user), pk=pk)
    if request.method == "POST":
        try:
            publish_exam(exam, request.user)
            messages.success(request, "Exam published.")
        except ValueError as exc:
            messages.error(request, str(exc))
    return redirect("examinations:detail", pk=pk)


@role_required("ADMIN", "TEACHER")
def toggle_results(request, pk):
    exam = get_object_or_404(_exams(request.user), pk=pk)
    if request.method == "POST":
        exam.results_published = not exam.results_published
        exam.save(update_fields=["results_published", "updated_at"])
        if exam.results_published:
            users = [row.user for row in exam.classroom.students.select_related("user") if row.user.is_active]
            notify(users, f"Results published: {exam.title}", "", f"/exams/{exam.pk}/result/")
            log_action(request.user, "results_publish", f"Published results for {exam.title}", "examination", exam.pk)
        messages.success(request, "Result visibility updated.")
    return redirect("examinations:detail", pk=pk)


@role_required("STUDENT")
def take(request, pk):
    profile = student_profile(request.user)
    exam = get_object_or_404(_exams(request.user), pk=pk)
    if not exam.links.exists():
        messages.error(request, "This exam has no questions yet.")
        return redirect("examinations:list")
    attempt = start_attempt(exam, profile)
    if attempt.status == attempt.Status.SUBMITTED:
        return redirect("examinations:result", pk=exam.pk)
    if request.method == "POST":
        attempt = save_posted(attempt, request.POST, complete=True)
        if request.POST.get("action") == "submit" or attempt.status == attempt.Status.SUBMITTED:
            if attempt.status != attempt.Status.SUBMITTED:
                score_attempt(attempt, request.user)
            messages.success(request, "Exam submitted and evaluated.")
            return redirect("examinations:result", pk=exam.pk)
        messages.success(request, "Answers saved.")
        return redirect("examinations:take", pk=exam.pk)
    remaining = seconds_left(attempt)
    if remaining <= 0:
        score_attempt(attempt, request.user)
        return redirect("examinations:result", pk=exam.pk)
    return render(
        request,
        "assessments/attempt.html",
        {
            "paper_title": exam.title,
            "instructions": exam.instructions,
            "items": attempt_items(attempt),
            "seconds_left": remaining,
            "save_url": f"/api/exams/attempts/{attempt.pk}/save/",
            "demo": False,
        },
    )


@role_required("ADMIN", "TEACHER", "STUDENT")
def result(request, pk):
    exam = get_object_or_404(Examination.objects.select_related("subject", "classroom"), pk=pk)
    if request.user.role == User.Role.STUDENT:
        profile = student_profile(request.user)
        if exam.classroom_id != profile.classroom_id:
            raise PermissionDenied
        attempt = get_object_or_404(exam.attempts, student=profile, status="SUBMITTED")
        rows = result_rows(attempt)
        classmates = None
    else:
        exam = get_object_or_404(_exams(request.user), pk=pk)
        attempt = None
        rows = []
        classmates = exam.attempts.filter(status="SUBMITTED").select_related("student__user")
    return render(request, "examinations/result.html", {"exam": exam, "attempt": attempt, "rows": rows, "classmates": classmates})


@role_required("STUDENT", "ADMIN", "TEACHER")
def history(request):
    from .models import ExaminationAttempt

    attempts = ExaminationAttempt.objects.select_related("examination", "student__user")
    if request.user.role == User.Role.STUDENT:
        attempts = attempts.filter(student=student_profile(request.user))
    elif request.user.role == User.Role.TEACHER:
        attempts = attempts.filter(examination__teacher=teacher_profile(request.user))
    return render(request, "examinations/history.html", {"attempts": attempts})


@role_required("ADMIN", "TEACHER", "STUDENT")
def programming_list(request):
    qs = _programs(request.user)
    return render(request, "examinations/programming_list.html", {"problems": qs})


@role_required("ADMIN", "TEACHER")
def programming_create(request):
    teacher = teacher_profile(request.user) if request.user.role == User.Role.TEACHER else None
    form = ProgramForm(request.POST or None, teacher=teacher)
    if request.method == "POST" and form.is_valid():
        problem = form.save(commit=False)
        if teacher:
            if not teacher_owns(request.user, problem.classroom_id, problem.subject_id):
                raise PermissionDenied
            problem.teacher = teacher
        else:
            from teachers.models import TeacherAssignment

            load = TeacherAssignment.objects.filter(classroom=problem.classroom, subject=problem.subject).first()
            if not load:
                messages.error(request, "Assign a teacher to that class and subject first.")
                return render(request, "examinations/programming_form.html", {"form": form})
            problem.teacher = load.teacher
        with transaction.atomic():
            problem.save()
            for index in range(1, 4):
                stdin = request.POST.get(f"stdin_{index}", "")
                expected = request.POST.get(f"expected_{index}", "")
                if stdin or expected:
                    ProgrammingTestCase.objects.create(
                        problem=problem,
                        stdin=stdin,
                        expected_stdout=expected,
                        is_sample=request.POST.get(f"sample_{index}") == "on" or index == 1,
                        marks=request.POST.get(f"marks_{index}") or 1,
                    )
        messages.success(request, "Programming test saved.")
        return redirect("examinations:programming_detail", pk=problem.pk)
    return render(request, "examinations/programming_form.html", {"form": form})


@role_required("ADMIN", "TEACHER", "STUDENT")
def programming_detail(request, pk):
    problem = get_object_or_404(_programs(request.user), pk=pk)
    if request.method == "POST":
        if request.user.role != User.Role.STUDENT:
            raise PermissionDenied
        if problem.deadline and timezone.now() > problem.deadline:
            messages.error(request, "The deadline has passed.")
            return redirect("examinations:programming_detail", pk=pk)
        code = request.POST.get("code", "")
        language = request.POST.get("language", "python")
        if not code.strip():
            messages.error(request, "Write some code before submitting.")
        else:
            submission = submit_program(problem, student_profile(request.user), language, code)
            messages.success(request, f"Submission {submission.status}. Score {submission.score} / {submission.max_score}.")
            return redirect("examinations:programming_detail", pk=pk)
    staff = request.user.role != User.Role.STUDENT
    submissions = problem.submissions.select_related("student__user")
    if not staff:
        submissions = submissions.filter(student=student_profile(request.user))
    visible = []
    for submission in submissions:
        payload = dict(submission.result or {})
        cases = []
        for case in payload.get("cases", []):
            row = dict(case)
            if not staff and not case.get("sample"):
                row["expected"] = "Hidden until the sample set"
                if not case.get("sample"):
                    row["expected"] = "Hidden"
            cases.append(row)
        payload["cases"] = cases
        submission.public_result = payload
        visible.append(submission)
    return render(
        request,
        "examinations/programming_detail.html",
        {
            "problem": problem,
            "samples": problem.testcases.filter(is_sample=True),
            "submissions": visible,
            "languages": [("python", "Python")],
        },
    )
