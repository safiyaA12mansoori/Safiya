import re

from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, redirect, render

from academics.models import Subject
from accounts.models import User
from core.access import role_required, student_profile, teacher_owns, teacher_profile, teacher_subject_ids
from core.files import send_file

from .forms import MaterialForm
from .models import StudyMaterial


def _visible(user):
    qs = StudyMaterial.objects.select_related("subject", "unit", "topic", "classroom", "uploaded_by")
    if user.role == User.Role.ADMIN:
        return qs
    if user.role == User.Role.TEACHER:
        return qs.filter(subject_id__in=teacher_subject_ids(user))
    profile = student_profile(user)
    if not profile:
        return qs.none()
    return qs.filter(subject__course=profile.course).filter(models_classroom(profile))


def models_classroom(profile):
    from django.db.models import Q

    return Q(classroom__isnull=True) | Q(classroom=profile.classroom)


def _can_manage(user, material):
    if user.role == User.Role.ADMIN:
        return True
    if user.role != User.Role.TEACHER:
        return False
    return teacher_owns(user, material.classroom_id, material.subject_id) or (
        material.classroom_id is None and material.subject_id in teacher_subject_ids(user)
    )


@role_required("ADMIN", "TEACHER", "STUDENT")
def material_list(request):
    qs = _visible(request.user)
    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(title__icontains=q)
    if request.GET.get("subject"):
        qs = qs.filter(subject_id=request.GET["subject"])
    if request.GET.get("kind"):
        qs = qs.filter(kind=request.GET["kind"])
    subjects = Subject.objects.all()
    if request.user.role == User.Role.TEACHER:
        subjects = subjects.filter(id__in=teacher_subject_ids(request.user))
    elif request.user.role == User.Role.STUDENT:
        profile = student_profile(request.user)
        subjects = subjects.filter(course=profile.course) if profile else subjects.none()
    page = Paginator(qs, 12).get_page(request.GET.get("page"))
    return render(
        request,
        "learning/list.html",
        {"page_obj": page, "subjects": subjects, "kinds": StudyMaterial.Kind.choices, "q": q},
    )


@role_required("ADMIN", "TEACHER")
def material_create(request):
    subjects = Subject.objects.all()
    if request.user.role == User.Role.TEACHER:
        subjects = subjects.filter(id__in=teacher_subject_ids(request.user))
    form = MaterialForm(request.POST or None, request.FILES or None, subjects=subjects)
    if request.method == "POST" and form.is_valid():
        material = form.save(commit=False)
        material.uploaded_by = request.user
        if request.user.role == User.Role.TEACHER and material.subject_id not in teacher_subject_ids(request.user):
            raise PermissionDenied
        material.save()
        messages.success(request, "Material saved.")
        return redirect("learning:detail", pk=material.pk)
    return render(request, "learning/form.html", {"form": form, "page_title": "Upload material"})


@role_required("ADMIN", "TEACHER")
def material_edit(request, pk):
    material = get_object_or_404(StudyMaterial, pk=pk)
    if not _can_manage(request.user, material):
        raise PermissionDenied
    subjects = Subject.objects.all()
    if request.user.role == User.Role.TEACHER:
        subjects = subjects.filter(id__in=teacher_subject_ids(request.user))
    form = MaterialForm(request.POST or None, request.FILES or None, instance=material, subjects=subjects)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Material updated.")
        return redirect("learning:detail", pk=material.pk)
    return render(request, "learning/form.html", {"form": form, "page_title": "Edit material"})


@role_required("ADMIN", "TEACHER", "STUDENT")
def material_detail(request, pk):
    material = get_object_or_404(_visible(request.user), pk=pk)
    return render(
        request,
        "learning/detail.html",
        {"material": material, "embed": embed_url(material.external_url), "can_manage": _can_manage(request.user, material)},
    )


@role_required("ADMIN", "TEACHER", "STUDENT")
def material_download(request, pk):
    material = get_object_or_404(_visible(request.user), pk=pk)
    return send_file(material.file)


def embed_url(url):
    if not url:
        return ""
    match = re.search(r"(?:youtu\.be/|v=)([\w-]{6,})", url)
    if match:
        return f"https://www.youtube.com/embed/{match.group(1)}"
    if "player.vimeo.com" in url or "vimeo.com/" in url:
        vid = url.rstrip("/").split("/")[-1]
        if vid.isdigit():
            return f"https://player.vimeo.com/video/{vid}"
    return ""
