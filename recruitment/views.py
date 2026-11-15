from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods

from .forms import ApplicantForm, ApplicationForm, InterviewForm, JobOpeningForm
from .models import Applicant, Application, Interview, JobOpening
from .services import (
    PipelineError,
    apply_to_job,
    register_applicant,
    schedule_interview,
    screen_application,
)


def dashboard(request):
    return render(
        request,
        "recruitment/dashboard.html",
        {
            "jobs_open": JobOpening.objects.filter(status=JobOpening.Status.OPEN).count(),
            "applicants": Applicant.objects.count(),
            "applications": Application.objects.count(),
            "passed": Application.objects.filter(status=Application.Status.PASSED).count(),
            "interviews": Interview.objects.filter(status=Interview.Status.SCHEDULED).count(),
            "recent_applications": Application.objects.select_related("job", "applicant")[:8],
            "upcoming_interviews": Interview.objects.select_related(
                "application__applicant", "application__job"
            ).filter(status=Interview.Status.SCHEDULED)[:8],
        },
    )


@require_http_methods(["GET", "POST"])
def job_list(request):
    if request.method == "POST":
        form = JobOpeningForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Job opening created.")
            return redirect("job_list")
    else:
        form = JobOpeningForm()
    return render(
        request,
        "recruitment/jobs.html",
        {"form": form, "jobs": JobOpening.objects.all()},
    )


@require_http_methods(["GET", "POST"])
def job_edit(request, pk):
    job = get_object_or_404(JobOpening, pk=pk)
    if request.method == "POST":
        form = JobOpeningForm(request.POST, instance=job)
        if form.is_valid():
            form.save()
            messages.success(request, "Job opening updated.")
            return redirect("job_list")
    else:
        form = JobOpeningForm(instance=job)
    return render(request, "recruitment/job_edit.html", {"form": form, "job": job})


@require_http_methods(["GET", "POST"])
def applicant_list(request):
    if request.method == "POST":
        form = ApplicantForm(request.POST)
        if form.is_valid():
            register_applicant(**form.cleaned_data)
            messages.success(request, "Applicant registered.")
            return redirect("applicant_list")
    else:
        form = ApplicantForm()
    return render(
        request,
        "recruitment/applicants.html",
        {"form": form, "applicants": Applicant.objects.all()},
    )


@require_http_methods(["GET", "POST"])
def application_list(request):
    if request.method == "POST":
        form = ApplicationForm(request.POST)
        if form.is_valid():
            try:
                apply_to_job(
                    job=form.cleaned_data["job"],
                    applicant=form.cleaned_data["applicant"],
                    cover_letter=form.cleaned_data.get("cover_letter") or "",
                )
                messages.success(request, "Application submitted.")
            except PipelineError as exc:
                messages.error(request, str(exc))
            return redirect("application_list")
    else:
        form = ApplicationForm()
    return render(
        request,
        "recruitment/applications.html",
        {
            "form": form,
            "applications": Application.objects.select_related("job", "applicant"),
        },
    )


@require_http_methods(["POST"])
def screen_one(request, pk):
    application = get_object_or_404(Application, pk=pk)
    try:
        result = screen_application(application)
        if result.passed:
            messages.success(request, f"{application.applicant.full_name} passed screening.")
        else:
            messages.warning(
                request,
                f"{application.applicant.full_name} failed: {'; '.join(result.reasons)}",
            )
    except PipelineError as exc:
        messages.error(request, str(exc))
    return redirect("application_list")


@require_http_methods(["GET", "POST"])
def interview_list(request):
    if request.method == "POST":
        form = InterviewForm(request.POST)
        if form.is_valid():
            data = form.cleaned_data
            try:
                schedule_interview(
                    application=data["application"],
                    scheduled_at=data["scheduled_at"],
                    interviewer_name=data["interviewer_name"],
                    duration_minutes=data["duration_minutes"],
                    location_or_link=data.get("location_or_link") or "",
                    notes=data.get("notes") or "",
                )
                messages.success(request, "Interview scheduled.")
            except PipelineError as exc:
                messages.error(request, str(exc))
            return redirect("interview_list")
    else:
        form = InterviewForm()
    return render(
        request,
        "recruitment/interviews.html",
        {
            "form": form,
            "interviews": Interview.objects.select_related(
                "application__applicant", "application__job"
            ),
        },
    )
