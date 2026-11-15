from collections import defaultdict

from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render

from academics.models import ClassRoom
from accounts.models import User
from core.access import role_required, student_profile, teacher_classroom_ids, teacher_profile

from .forms import SlotForm
from .models import Timetable


def _slots(user):
    qs = Timetable.objects.select_related("classroom", "subject", "teacher__user", "session")
    if user.role == User.Role.ADMIN:
        return qs
    if user.role == User.Role.TEACHER:
        profile = teacher_profile(user)
        return qs.filter(teacher=profile) if profile else qs.none()
    profile = student_profile(user)
    return qs.filter(classroom=profile.classroom) if profile else qs.none()


@role_required("ADMIN", "TEACHER", "STUDENT")
def grid(request):
    slots = _slots(request.user)
    classes = ClassRoom.objects.all() if request.user.role == User.Role.ADMIN else ClassRoom.objects.filter(id__in=teacher_classroom_ids(request.user) or [])
    if request.user.role == User.Role.STUDENT:
        profile = student_profile(request.user)
        classes = ClassRoom.objects.filter(pk=profile.classroom_id) if profile else ClassRoom.objects.none()
    classroom_id = request.GET.get("classroom")
    if request.user.role == User.Role.STUDENT and student_profile(request.user):
        classroom_id = str(student_profile(request.user).classroom_id)
    if classroom_id:
        slots = slots.filter(classroom_id=classroom_id)
    matrix = defaultdict(dict)
    periods = set()
    for slot in slots:
        matrix[slot.day_of_week][slot.period] = slot
        periods.add(slot.period)
    return render(
        request,
        "timetable/grid.html",
        {
            "days": Timetable.DAYS,
            "periods": sorted(periods) or [1, 2, 3, 4, 5, 6],
            "matrix": matrix,
            "classes": classes,
            "classroom_id": classroom_id or "",
        },
    )


@role_required("ADMIN", "TEACHER")
def create(request):
    teacher = teacher_profile(request.user) if request.user.role == User.Role.TEACHER else None
    form = SlotForm(request.POST or None, teacher=teacher)
    if request.method == "POST" and form.is_valid():
        slot = form.save(commit=False)
        if teacher:
            slot.teacher = teacher
            if slot.classroom_id not in teacher_classroom_ids(request.user):
                raise PermissionDenied
        slot.save()
        messages.success(request, "Period added.")
        return redirect("timetable:grid")
    return render(request, "timetable/form.html", {"form": form})


@role_required("ADMIN", "TEACHER")
def delete(request, pk):
    slot = get_object_or_404(_slots(request.user), pk=pk)
    if request.method == "POST":
        slot.delete()
        messages.success(request, "Period removed.")
    return redirect("timetable:grid")
