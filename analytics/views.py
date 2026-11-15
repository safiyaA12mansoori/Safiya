from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, render

from accounts.models import User
from attendance.models import Attendance
from core.access import role_required, student_profile, teacher_classroom_ids
from students.models import StudentProfile

from .models import StudentPerformance
from .services import refresh_recommendations, topic_stats


def _can_view(user, student):
    if user.role == User.Role.ADMIN:
        return True
    if user.role == User.Role.TEACHER:
        return student.classroom_id in teacher_classroom_ids(user)
    profile = student_profile(user)
    return profile and profile.pk == student.pk


def _payload(student):
    stats = []
    for label, bucket in topic_stats(student).items():
        percent = round(100 * bucket["correct"] / bucket["total"], 1) if bucket["total"] else 0
        stats.append({"label": label, "correct": bucket["correct"], "total": bucket["total"], "percent": percent})
    stats.sort(key=lambda row: row["percent"])
    history = list(student.performances.all()[:12])
    attendance = Attendance.objects.filter(student=student)
    marked = attendance.count()
    present = attendance.filter(status=Attendance.Status.PRESENT).count()
    return {
        "student": student,
        "topics": stats,
        "history": history,
        "correct": sum(row.correct_count for row in history),
        "incorrect": sum(row.incorrect_count for row in history),
        "attendance": round(100 * present / marked, 1) if marked else 0,
        "recommendations": student.recommendations.select_related("material", "topic", "subject"),
    }


@role_required("ADMIN", "TEACHER", "STUDENT")
def overview(request):
    if request.method == "POST" and request.user.role == User.Role.STUDENT:
        refresh_recommendations(student_profile(request.user))
    if request.user.role == User.Role.STUDENT:
        return render(request, "analytics/student.html", _payload(student_profile(request.user)))
    if request.user.role == User.Role.TEACHER:
        students = StudentProfile.objects.filter(classroom_id__in=teacher_classroom_ids(request.user), user__is_active=True).select_related("user", "classroom")
    else:
        students = StudentProfile.objects.filter(user__is_active=True).select_related("user", "classroom")
    rows = []
    for student in students[:40]:
        perf = student.performances.first()
        rows.append({"student": student, "latest": perf})
    return render(request, "analytics/overview.html", {"rows": rows})


@role_required("ADMIN", "TEACHER", "STUDENT")
def student_detail(request, pk):
    student = get_object_or_404(StudentProfile.objects.select_related("user", "classroom", "course"), pk=pk)
    if not _can_view(request.user, student):
        raise PermissionDenied
    if request.method == "POST":
        refresh_recommendations(student)
    return render(request, "analytics/student.html", _payload(student))
