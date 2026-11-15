from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from accounts.models import User
from analytics.services import record_performance, refresh_recommendations
from core.access import role_required, student_profile, teacher_owns, teacher_profile
from core.files import send_file

from .forms import AssignmentForm, GradeForm, SubmissionForm
from .models import Assignment, AssignmentSubmission


def _visible(user):
    qs = Assignment.objects.select_related("subject", "classroom", "teacher__user")
    if user.role == User.Role.ADMIN:
        return qs
    if user.role == User.Role.TEACHER:
        profile = teacher_profile(user)
        return qs.filter(teacher=profile) if profile else qs.none()
    profile = student_profile(user)
    if not profile:
        return qs.none()
    return qs.filter(classroom=profile.classroom, is_published=True)


@role_required("ADMIN", "TEACHER", "STUDENT")
def assignment_list(request):
    qs = _visible(request.user)
    if request.GET.get("q"):
        qs = qs.filter(title__icontains=request.GET["q"].strip())
    page = Paginator(qs, 12).get_page(request.GET.get("page"))
    return render(request, "assignments/list.html", {"page_obj": page})


def _assignment_form(request, instance=None):
    teacher = teacher_profile(request.user) if request.user.role == User.Role.TEACHER else None
    return AssignmentForm(
        request.POST or None,
        request.FILES or None,
        instance=instance,
        teacher=teacher,
        include_teacher=request.user.role == User.Role.ADMIN,
    ), teacher


@role_required("ADMIN", "TEACHER")
def assignment_create(request):
    form, teacher = _assignment_form(request)
    if request.method == "POST" and form.is_valid():
        item = form.save(commit=False)
        item.teacher = teacher or form.cleaned_data["teacher"]
        if request.user.role == User.Role.TEACHER and not teacher_owns(request.user, item.classroom_id, item.subject_id):
            raise PermissionDenied
        item.save()
        messages.success(request, "Assignment saved.")
        return redirect("assignments:detail", pk=item.pk)
    return render(request, "assignments/form.html", {"form": form, "page_title": "New assignment"})


@role_required("ADMIN", "TEACHER")
def assignment_edit(request, pk):
    item = get_object_or_404(_visible(request.user), pk=pk)
    form, teacher = _assignment_form(request, item)
    if request.method == "POST" and form.is_valid():
        item = form.save(commit=False)
        if request.user.role == User.Role.ADMIN:
            item.teacher = form.cleaned_data["teacher"]
        item.save()
        messages.success(request, "Assignment updated.")
        return redirect("assignments:detail", pk=item.pk)
    return render(request, "assignments/form.html", {"form": form, "page_title": "Edit assignment"})


@role_required("ADMIN", "TEACHER", "STUDENT")
def assignment_detail(request, pk):
    item = get_object_or_404(_visible(request.user), pk=pk)
    submission = None
    if request.user.role == User.Role.STUDENT:
        profile = student_profile(request.user)
        submission = AssignmentSubmission.objects.filter(assignment=item, student=profile).first()
    submissions = item.submissions.select_related("student__user") if request.user.role != User.Role.STUDENT else None
    return render(
        request,
        "assignments/detail.html",
        {"assignment": item, "submission": submission, "submissions": submissions, "now": timezone.now()},
    )


@role_required("STUDENT")
def assignment_submit(request, pk):
    item = get_object_or_404(_visible(request.user), pk=pk)
    profile = student_profile(request.user)
    if timezone.now() > item.deadline:
        messages.error(request, "The deadline has passed.")
        return redirect("assignments:detail", pk=pk)
    submission = AssignmentSubmission.objects.filter(assignment=item, student=profile).first()
    if submission and submission.marks is not None:
        messages.error(request, "This submission is already graded.")
        return redirect("assignments:detail", pk=pk)
    form = SubmissionForm(request.POST or None, request.FILES or None, instance=submission)
    if request.method == "POST" and form.is_valid():
        saved = form.save(commit=False)
        saved.assignment = item
        saved.student = profile
        saved.save()
        messages.success(request, "Submission saved.")
        return redirect("assignments:detail", pk=pk)
    return render(request, "assignments/submit.html", {"form": form, "assignment": item})


@role_required("ADMIN", "TEACHER")
def assignment_grade(request, pk, submission_id):
    item = get_object_or_404(_visible(request.user), pk=pk)
    submission = get_object_or_404(item.submissions.select_related("student"), pk=submission_id)
    form = GradeForm(request.POST or None, instance=submission)
    if request.method == "POST" and form.is_valid():
        saved = form.save()
        record_performance(
            student=saved.student,
            subject=item.subject,
            assessment_type="assignment",
            title=item.title,
            score=saved.marks or 0,
            max_score=item.max_marks,
            correct=0,
            incorrect=0,
            source_key=f"asg-{saved.pk}",
        )
        refresh_recommendations(saved.student)
        messages.success(request, "Marks saved.")
        return redirect("assignments:detail", pk=pk)
    return render(request, "assignments/grade.html", {"form": form, "assignment": item, "submission": submission})


@role_required("ADMIN", "TEACHER", "STUDENT")
def download_brief(request, pk):
    item = get_object_or_404(_visible(request.user), pk=pk)
    return send_file(item.file)


@role_required("ADMIN", "TEACHER")
def download_submission(request, pk, submission_id):
    item = get_object_or_404(_visible(request.user), pk=pk)
    submission = get_object_or_404(item.submissions, pk=submission_id)
    return send_file(submission.file)
