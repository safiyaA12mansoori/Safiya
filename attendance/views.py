import calendar
from collections import defaultdict

from django.contrib import messages
from django.db import transaction
from django.shortcuts import redirect, render
from django.utils import timezone

from academics.models import Subject
from accounts.models import User
from core.access import role_required, student_profile, teacher_classroom_ids, teacher_owns, teacher_profile, teacher_subject_ids
from students.models import StudentProfile

from .models import Attendance


def _classes_and_subjects(user):
    from academics.models import ClassRoom

    if user.role == User.Role.ADMIN:
        return ClassRoom.objects.select_related("session"), Subject.objects.all()
    profile = teacher_profile(user)
    classes = ClassRoom.objects.filter(id__in=teacher_classroom_ids(user))
    subjects = Subject.objects.filter(id__in=teacher_subject_ids(user))
    return classes, subjects


@role_required("ADMIN", "TEACHER")
def mark(request):
    classes, subjects = _classes_and_subjects(request.user)
    classroom_id = request.GET.get("classroom") or request.POST.get("classroom")
    subject_id = request.GET.get("subject") or request.POST.get("subject")
    date_raw = request.GET.get("date") or request.POST.get("date") or str(timezone.localdate())
    students = []
    existing = {}
    if classroom_id and subject_id:
        if request.user.role == User.Role.TEACHER and not teacher_owns(request.user, int(classroom_id), int(subject_id)):
            messages.error(request, "You can mark attendance only for your own class and subject.")
            return redirect("attendance:mark")
        students = list(StudentProfile.objects.filter(classroom_id=classroom_id, user__is_active=True).select_related("user"))
        existing = {
            row.student_id: row.status
            for row in Attendance.objects.filter(classroom_id=classroom_id, subject_id=subject_id, date=date_raw)
        }
    if request.method == "POST" and students:
        teacher = teacher_profile(request.user)
        if request.user.role == User.Role.ADMIN and not teacher:
            from teachers.models import TeacherProfile

            teacher = TeacherProfile.objects.filter(
                assignments__classroom_id=classroom_id, assignments__subject_id=subject_id
            ).first()
        if not teacher:
            messages.error(request, "Assign a teacher to this class and subject before marking attendance.")
            return redirect(request.path + f"?classroom={classroom_id}&subject={subject_id}&date={date_raw}")
        with transaction.atomic():
            for student in students:
                status = request.POST.get(f"status_{student.pk}")
                if status not in {Attendance.Status.PRESENT, Attendance.Status.ABSENT, Attendance.Status.LEAVE}:
                    continue
                Attendance.objects.update_or_create(
                    student=student,
                    subject_id=subject_id,
                    date=date_raw,
                    defaults={
                        "classroom_id": classroom_id,
                        "teacher": teacher,
                        "status": status,
                        "remarks": request.POST.get(f"remarks_{student.pk}", "")[:200],
                    },
                )
        messages.success(request, "Attendance saved.")
        return redirect(request.path + f"?classroom={classroom_id}&subject={subject_id}&date={date_raw}")
    return render(
        request,
        "attendance/mark.html",
        {
            "classes": classes,
            "subjects": subjects,
            "students": students,
            "existing": existing,
            "classroom_id": classroom_id or "",
            "subject_id": subject_id or "",
            "date": date_raw,
            "statuses": Attendance.Status.choices,
        },
    )


@role_required("ADMIN", "TEACHER")
def monthly(request):
    classes, subjects = _classes_and_subjects(request.user)
    classroom_id = request.GET.get("classroom")
    subject_id = request.GET.get("subject")
    month = request.GET.get("month") or timezone.localdate().strftime("%Y-%m")
    rows = []
    dates = []
    if classroom_id and subject_id and request.user.role == User.Role.TEACHER:
        if not teacher_owns(request.user, int(classroom_id), int(subject_id)):
            messages.error(request, "That class is outside your workload.")
            classroom_id = ""
    if classroom_id and subject_id:
        year, mon = [int(part) for part in month.split("-")]
        start, end = calendar.monthrange(year, mon)[0], calendar.monthrange(year, mon)[1]
        from datetime import date

        dates = [date(year, mon, day) for day in range(1, end + 1)]
        records = Attendance.objects.filter(
            classroom_id=classroom_id, subject_id=subject_id, date__year=year, date__month=mon
        )
        grid = defaultdict(dict)
        for record in records:
            grid[record.student_id][record.date] = record.status
        for student in StudentProfile.objects.filter(classroom_id=classroom_id, user__is_active=True).select_related("user"):
            cells = [grid[student.pk].get(day, "") for day in dates]
            present = cells.count(Attendance.Status.PRESENT)
            marked = sum(1 for cell in cells if cell)
            percent = round(100 * present / marked, 1) if marked else 0
            rows.append({"student": student, "cells": cells, "present": present, "marked": marked, "percent": percent})
    return render(
        request,
        "attendance/monthly.html",
        {
            "classes": classes,
            "subjects": subjects,
            "rows": rows,
            "dates": dates,
            "classroom_id": classroom_id or "",
            "subject_id": subject_id or "",
            "month": month,
        },
    )


@role_required("STUDENT")
def mine(request):
    profile = student_profile(request.user)
    rows = []
    overall = 0
    if profile:
        subjects = Subject.objects.filter(course=profile.course)
        total_p = total_n = 0
        for subject in subjects:
            records = Attendance.objects.filter(student=profile, subject=subject)
            marked = records.count()
            present = records.filter(status=Attendance.Status.PRESENT).count()
            absent = records.filter(status=Attendance.Status.ABSENT).count()
            leave = records.filter(status=Attendance.Status.LEAVE).count()
            percent = round(100 * present / marked, 1) if marked else 0
            total_p += present
            total_n += marked
            if marked:
                rows.append(
                    {"subject": subject, "present": present, "absent": absent, "leave": leave, "percent": percent, "marked": marked}
                )
        overall = round(100 * total_p / total_n, 1) if total_n else 0
    return render(request, "attendance/mine.html", {"rows": rows, "overall": overall})
