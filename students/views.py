from django.contrib import messages
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from openpyxl import Workbook, load_workbook

from academics.models import ClassRoom, Course, Department
from accounts.models import User
from core.access import role_required, student_profile, teacher_classroom_ids
from core.audit import log_action

from .forms import StudentForm
from .models import StudentProfile


def _scoped(user):
    qs = StudentProfile.objects.select_related("user", "department", "course", "classroom")
    if user.role == User.Role.ADMIN:
        return qs
    if user.role == User.Role.TEACHER:
        return qs.filter(classroom_id__in=teacher_classroom_ids(user))
    profile = student_profile(user)
    return qs.filter(pk=profile.pk) if profile else qs.none()


def _save(form, actor, profile=None):
    data = form.cleaned_data
    with transaction.atomic():
        if profile:
            user = profile.user
        else:
            user = User(role=User.Role.STUDENT)
            profile = StudentProfile(user=user)
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
        for field in (
            "admission_number",
            "student_id",
            "department",
            "course",
            "classroom",
            "academic_year",
            "guardian_name",
            "guardian_phone",
            "address",
            "city",
            "date_of_birth",
            "gender",
        ):
            setattr(profile, field, data.get(field) or "")
        if not data.get("date_of_birth"):
            profile.date_of_birth = None
        profile.user = user
        profile.save()
    log_action(actor, "student_save", f"Saved student {profile.student_id}", "student", profile.pk)
    return profile


@role_required("ADMIN", "TEACHER")
def student_list(request):
    qs = _scoped(request.user)
    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(
            Q(admission_number__icontains=q)
            | Q(student_id__icontains=q)
            | Q(user__first_name__icontains=q)
            | Q(user__last_name__icontains=q)
            | Q(user__email__icontains=q)
        )
    if request.GET.get("department"):
        qs = qs.filter(department_id=request.GET["department"])
    if request.GET.get("course"):
        qs = qs.filter(course_id=request.GET["course"])
    if request.GET.get("classroom"):
        qs = qs.filter(classroom_id=request.GET["classroom"])
    if request.GET.get("active") == "0":
        qs = qs.filter(user__is_active=False)
    elif request.GET.get("active") == "1":
        qs = qs.filter(user__is_active=True)
    page = Paginator(qs, 12).get_page(request.GET.get("page"))
    return render(
        request,
        "students/list.html",
        {
            "page_obj": page,
            "departments": Department.objects.all(),
            "courses": Course.objects.all(),
            "classrooms": ClassRoom.objects.select_related("session"),
            "q": q,
        },
    )


@role_required("ADMIN")
def student_create(request):
    form = StudentForm(request.POST or None, request.FILES or None)
    if request.method == "POST" and form.is_valid():
        profile = _save(form, request.user)
        messages.success(request, "Student created.")
        return redirect("students:detail", pk=profile.pk)
    return render(request, "students/form.html", {"form": form, "page_title": "New student"})


@role_required("ADMIN")
def student_edit(request, pk):
    profile = get_object_or_404(StudentProfile, pk=pk)
    form = StudentForm(request.POST or None, request.FILES or None, profile=profile)
    if request.method == "POST" and form.is_valid():
        _save(form, request.user, profile)
        messages.success(request, "Student updated.")
        return redirect("students:detail", pk=profile.pk)
    return render(request, "students/form.html", {"form": form, "page_title": "Edit student"})


@role_required("ADMIN", "TEACHER", "STUDENT")
def student_detail(request, pk):
    profile = get_object_or_404(_scoped(request.user), pk=pk)
    return render(request, "students/detail.html", {"profile": profile})


@role_required("ADMIN")
def student_toggle(request, pk):
    if request.method != "POST":
        return redirect("students:detail", pk=pk)
    profile = get_object_or_404(StudentProfile, pk=pk)
    profile.user.is_active = not profile.user.is_active
    profile.user.save(update_fields=["is_active"])
    state = "activated" if profile.user.is_active else "deactivated"
    log_action(request.user, "student_active", f"{profile.student_id} {state}", "student", profile.pk)
    messages.success(request, f"Student {state}.")
    return redirect("students:detail", pk=pk)


@role_required("ADMIN")
def import_template(request):
    wb = Workbook()
    ws = wb.active
    ws.title = "Students"
    ws.append(
        [
            "admission_number",
            "student_id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "department_code",
            "course_code",
            "class_name",
            "division",
            "year",
            "guardian_name",
            "guardian_phone",
        ]
    )
    ws.append(["ADM1001", "MCA25001", "new.student", "New", "Student", "new.student@college.test", "9000000000", "MCA", "MCA", "MCA-I", "A", 1, "Guardian", "9000000001"])
    from io import BytesIO

    buf = BytesIO()
    wb.save(buf)
    response = HttpResponse(buf.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response["Content-Disposition"] = 'attachment; filename="student-import-template.xlsx"'
    return response


@role_required("ADMIN")
def import_students(request):
    results = None
    if request.method == "POST" and request.FILES.get("file"):
        results = _import(request.FILES["file"], request.user)
        messages.success(request, f"Imported {results['created']} students. {results['failed']} rows failed.")
    return render(request, "students/import.html", {"results": results})


def _import(upload, actor):
    wb = load_workbook(upload, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {"created": 0, "failed": 0, "errors": ["The file is empty."]}
    headers = [str(cell or "").strip().lower() for cell in rows[0]]
    created = 0
    errors = []
    for index, row in enumerate(rows[1:], start=2):
        data = {headers[i]: (row[i] if i < len(row) else "") for i in range(len(headers))}
        data = {key: ("" if value is None else str(value).strip()) for key, value in data.items()}
        try:
            department = Department.objects.get(code__iexact=data.get("department_code", ""))
            course = Course.objects.get(department=department, code__iexact=data.get("course_code", ""))
            classroom = ClassRoom.objects.get(
                course=course, name__iexact=data.get("class_name", ""), division__iexact=data.get("division") or "A"
            )
            form = StudentForm(
                data={
                    "username": data.get("username"),
                    "first_name": data.get("first_name"),
                    "last_name": data.get("last_name"),
                    "email": data.get("email"),
                    "phone": data.get("phone"),
                    "password": "Student@12345",
                    "admission_number": data.get("admission_number"),
                    "student_id": data.get("student_id"),
                    "department": department.pk,
                    "course": course.pk,
                    "classroom": classroom.pk,
                    "academic_year": int(float(data.get("year") or classroom.year)),
                    "guardian_name": data.get("guardian_name", ""),
                    "guardian_phone": data.get("guardian_phone", ""),
                    "address": "",
                    "city": "",
                    "gender": "",
                }
            )
            if not form.is_valid():
                errors.append(f"Row {index}: {form.errors.as_text()}")
                continue
            _save(form, actor)
            created += 1
        except Exception as exc:
            errors.append(f"Row {index}: {exc}")
    log_action(actor, "student_import", f"Imported {created} students", "student", "")
    return {"created": created, "failed": len(errors), "errors": errors}
