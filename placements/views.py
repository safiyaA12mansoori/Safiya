from django.contrib import messages
from django.db import IntegrityError
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from accounts.models import User
from core.access import role_required, student_profile
from core.audit import log_action
from notifications.services import notify

from .forms import ApplicationStatusForm, CompanyForm, JobForm
from .models import Company, Placement, PlacementApplication


@role_required("ADMIN", "STUDENT")
def jobs(request):
    qs = Placement.objects.select_related("company")
    if request.GET.get("q"):
        qs = qs.filter(title__icontains=request.GET["q"].strip())
    applied = set()
    if request.user.role == User.Role.STUDENT:
        profile = student_profile(request.user)
        applied = set(PlacementApplication.objects.filter(student=profile).values_list("placement_id", flat=True))
        qs = qs.filter(is_open=True)
    return render(request, "placements/jobs.html", {"jobs": qs, "applied": applied, "companies": Company.objects.all() if request.user.role == User.Role.ADMIN else []})


@role_required("ADMIN")
def company_create(request):
    form = CompanyForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Company saved.")
        return redirect("placements:jobs")
    return render(request, "placements/form.html", {"form": form, "page_title": "New company"})


@role_required("ADMIN")
def job_create(request):
    form = JobForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Job opening saved.")
        return redirect("placements:jobs")
    return render(request, "placements/form.html", {"form": form, "page_title": "New opening"})


@role_required("STUDENT")
def apply(request, pk):
    job = get_object_or_404(Placement, pk=pk, is_open=True)
    profile = student_profile(request.user)
    if request.method == "POST":
        if job.deadline < timezone.localdate():
            messages.error(request, "Applications are closed.")
        else:
            try:
                application = PlacementApplication.objects.create(placement=job, student=profile)
                notify(User.objects.filter(role=User.Role.ADMIN, is_active=True), f"Application: {job.title}", str(profile), "/placements/applications/")
                log_action(request.user, "placement_apply", f"{profile} applied to {job}", "placement", job.pk)
                messages.success(request, "Application submitted.")
            except IntegrityError:
                messages.error(request, "You already applied for this opening.")
    return redirect("placements:jobs")


@role_required("ADMIN")
def applications(request):
    qs = PlacementApplication.objects.select_related("student__user", "placement__company")
    if request.GET.get("status"):
        qs = qs.filter(status=request.GET["status"])
    return render(request, "placements/applications.html", {"applications": qs, "statuses": PlacementApplication.Status.choices})


@role_required("ADMIN")
def update_application(request, pk):
    application = get_object_or_404(PlacementApplication, pk=pk)
    form = ApplicationStatusForm(request.POST or None, instance=application)
    if request.method == "POST" and form.is_valid():
        saved = form.save()
        notify([saved.student.user], f"Placement update: {saved.placement.title}", saved.get_status_display(), "/placements/")
        messages.success(request, "Application updated.")
        return redirect("placements:applications")
    return render(request, "placements/form.html", {"form": form, "page_title": "Update application"})
