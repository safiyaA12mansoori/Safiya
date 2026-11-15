from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.shortcuts import redirect, render

from academics.models import Subject
from accounts.models import User
from core.access import role_required, student_profile
from core.audit import log_action
from core.forms import StyledModelForm
from library.models import LibraryBook
from students.models import StudentProfile

from .dashboard_data import admin_dashboard, student_dashboard, teacher_dashboard
from .models import CollegeProfile


class CollegeForm(StyledModelForm):
    class Meta:
        model = CollegeProfile
        fields = ["name", "code", "address", "city", "phone", "email", "website", "logo", "established_year"]


@login_required
def dashboard(request):
    role = request.user.role
    if role == User.Role.ADMIN:
        return render(request, "core/dashboard_admin.html", admin_dashboard())
    if role == User.Role.TEACHER:
        return render(request, "core/dashboard_teacher.html", teacher_dashboard(request.user))
    return render(request, "core/dashboard_student.html", student_dashboard(request.user))


@role_required("ADMIN")
def college(request):
    instance = CollegeProfile.objects.first()
    form = CollegeForm(request.POST or None, request.FILES or None, instance=instance)
    if request.method == "POST" and form.is_valid():
        saved = form.save()
        log_action(request.user, "college", f"Updated {saved.name}", "college", saved.pk)
        messages.success(request, "College profile saved.")
        return redirect("core:college")
    return render(request, "core/college_form.html", {"form": form, "page_title": "College profile"})


@login_required
def search(request):
    q = request.GET.get("q", "").strip()
    students = teachers = subjects = books = []
    if q:
        if request.user.role == User.Role.ADMIN:
            students = StudentProfile.objects.select_related("user", "classroom").filter(
                Q(admission_number__icontains=q)
                | Q(student_id__icontains=q)
                | Q(user__first_name__icontains=q)
                | Q(user__last_name__icontains=q)
                | Q(user__username__icontains=q)
            )[:12]
            teachers = User.objects.filter(role=User.Role.TEACHER).filter(
                Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(username__icontains=q)
            )[:12]
            books = LibraryBook.objects.filter(Q(title__icontains=q) | Q(isbn__icontains=q) | Q(author__icontains=q))[:12]
        if request.user.role in {User.Role.ADMIN, User.Role.TEACHER}:
            subjects = Subject.objects.filter(Q(name__icontains=q) | Q(code__icontains=q))[:12]
        else:
            profile = student_profile(request.user)
            if profile:
                subjects = Subject.objects.filter(course=profile.course).filter(Q(name__icontains=q) | Q(code__icontains=q))[:12]
                books = LibraryBook.objects.filter(Q(title__icontains=q) | Q(author__icontains=q))[:12]
    return render(
        request,
        "core/search.html",
        {"q": q, "students": students, "teachers": teachers, "subjects": subjects, "books": books},
    )


def error_403(request, exception):
    return render(request, "403.html", status=403)


def error_404(request, exception):
    return render(request, "404.html", status=404)


def error_500(request):
    return render(request, "500.html", status=500)
