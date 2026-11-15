from django.contrib import messages
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render

from accounts.models import User
from core.access import role_required, teacher_profile
from core.audit import log_action
from students.models import StudentProfile
from timetable.models import Timetable

from .forms import TeacherForm, WorkloadForm
from .models import TeacherAssignment, TeacherProfile


def _save(form, actor, profile=None):
    data = form.cleaned_data
    with transaction.atomic():
        if profile:
            user = profile.user
        else:
            user = User(role=User.Role.TEACHER)
            profile = TeacherProfile(user=user)
        user.username = data["username"]
        user.email = data["email"].lower()
        user.first_name = data["first_name"]
        user.last_name = data["last_name"]
        user.phone = data["phone"]
        if data.get("photo"):
            user.photo = data["photo"]
        if data.get("password"):
            user.set_password(data["password"])
        user.save()
        profile.user = user
        profile.employee_id = data["employee_id"]
        profile.department = data["department"]
        profile.designation = data["designation"]
        profile.qualification = data["qualification"]
        profile.joining_date = data.get("joining_date") or None
        profile.save()
    log_action(actor, "teacher_save", f"Saved teacher {profile.employee_id}", "teacher", profile.pk)
    return profile


@role_required("ADMIN")
def teacher_list(request):
    qs = TeacherProfile.objects.select_related("user", "department")
    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(
            Q(employee_id__icontains=q) | Q(user__first_name__icontains=q) | Q(user__last_name__icontains=q)
        )
    if request.GET.get("department"):
        qs = qs.filter(department_id=request.GET["department"])
    page = Paginator(qs, 12).get_page(request.GET.get("page"))
    from academics.models import Department

    return render(request, "teachers/list.html", {"page_obj": page, "departments": Department.objects.all(), "q": q})


@role_required("ADMIN")
def teacher_create(request):
    form = TeacherForm(request.POST or None, request.FILES or None)
    if request.method == "POST" and form.is_valid():
        profile = _save(form, request.user)
        messages.success(request, "Teacher created.")
        return redirect("teachers:detail", pk=profile.pk)
    return render(request, "teachers/form.html", {"form": form, "page_title": "New teacher"})


@role_required("ADMIN")
def teacher_edit(request, pk):
    profile = get_object_or_404(TeacherProfile, pk=pk)
    form = TeacherForm(request.POST or None, request.FILES or None, profile=profile)
    if request.method == "POST" and form.is_valid():
        _save(form, request.user, profile)
        messages.success(request, "Teacher updated.")
        return redirect("teachers:detail", pk=profile.pk)
    return render(request, "teachers/form.html", {"form": form, "page_title": "Edit teacher"})


@role_required("ADMIN", "TEACHER")
def teacher_detail(request, pk):
    profile = get_object_or_404(TeacherProfile.objects.select_related("user", "department"), pk=pk)
    if request.user.role == User.Role.TEACHER and teacher_profile(request.user) != profile:
        from django.core.exceptions import PermissionDenied

        raise PermissionDenied
    form = WorkloadForm()
    if request.method == "POST" and request.user.role == User.Role.ADMIN:
        form = WorkloadForm(request.POST)
        if form.is_valid():
            try:
                TeacherAssignment.objects.create(teacher=profile, **form.cleaned_data)
                messages.success(request, "Workload added.")
                log_action(request.user, "workload", f"Assigned {profile.employee_id}", "teacher", profile.pk)
            except IntegrityError:
                messages.error(request, "That subject and class are already assigned.")
            return redirect("teachers:detail", pk=profile.pk)
    loads = profile.assignments.select_related("subject", "classroom")
    periods = Timetable.objects.filter(teacher=profile).count()
    return render(
        request,
        "teachers/detail.html",
        {"profile": profile, "form": form, "loads": loads, "periods": periods},
    )


@role_required("ADMIN")
def teacher_unassign(request, pk, load_id):
    if request.method == "POST":
        TeacherAssignment.objects.filter(teacher_id=pk, pk=load_id).delete()
        messages.success(request, "Assignment removed.")
    return redirect("teachers:detail", pk=pk)


@role_required("ADMIN")
def teacher_toggle(request, pk):
    if request.method != "POST":
        return redirect("teachers:detail", pk=pk)
    profile = get_object_or_404(TeacherProfile, pk=pk)
    profile.user.is_active = not profile.user.is_active
    profile.user.save(update_fields=["is_active"])
    state = "activated" if profile.user.is_active else "deactivated"
    log_action(request.user, "teacher_active", f"{profile.employee_id} {state}", "teacher", profile.pk)
    messages.success(request, f"Teacher {state}.")
    return redirect("teachers:detail", pk=pk)


@role_required("TEACHER")
def my_classes(request):
    profile = teacher_profile(request.user)
    loads = profile.assignments.select_related("subject", "classroom", "classroom__session") if profile else []
    cards = []
    for load in loads:
        cards.append(
            {
                "load": load,
                "students": StudentProfile.objects.filter(classroom=load.classroom, user__is_active=True).count(),
            }
        )
    return render(request, "teachers/classes.html", {"cards": cards})
