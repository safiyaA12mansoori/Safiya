import json
from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, Sum
from django.utils import timezone

from academics.models import ClassRoom, Course, Subject
from accounts.models import User
from assignments.models import Assignment, AssignmentSubmission
from attendance.models import Attendance
from core.access import student_profile, teacher_classroom_ids, teacher_profile, teacher_subject_ids
from core.models import ActivityLog
from examinations.models import Examination, ExaminationAttempt
from fees.models import Payment, StudentFee
from library.models import BookIssue
from notifications.models import Notification
from placements.models import PlacementApplication
from students.models import StudentProfile
from teachers.models import TeacherProfile
from timetable.models import Timetable


def _greeting():
    hour = timezone.localtime().hour
    if hour < 12:
        return "Good morning"
    if hour < 17:
        return "Good afternoon"
    return "Good evening"


def _percent(part, total):
    if not total:
        return 0
    return round(100 * part / total, 1)


def admin_dashboard():
    today = timezone.localdate()
    now = timezone.now()
    enrollment_rows = ClassRoom.objects.annotate(total=Count("students")).order_by("year", "name")
    labels, present, absent = [], [], []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        labels.append(day.strftime("%d %b"))
        day_rows = Attendance.objects.filter(date=day)
        present.append(day_rows.filter(status=Attendance.Status.PRESENT).count())
        absent.append(day_rows.filter(status=Attendance.Status.ABSENT).count())
    exam_rows = (
        ExaminationAttempt.objects.filter(status=ExaminationAttempt.Status.SUBMITTED)
        .values("examination__subject__code")
        .annotate(avg=Avg("score"))
        .order_by("examination__subject__code")
    )
    collected = Payment.objects.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    billed = StudentFee.objects.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    pending_amount = billed - collected
    marked = Attendance.objects.count()
    present_count = Attendance.objects.filter(status=Attendance.Status.PRESENT).count()
    return {
        "greeting": _greeting(),
        "stats": [
            ("Students", StudentProfile.objects.filter(user__is_active=True).count(), "people", "students:list"),
            ("Teachers", TeacherProfile.objects.filter(user__is_active=True).count(), "person-badge", "teachers:list"),
            ("Subjects", Subject.objects.count(), "journal-bookmark", "academics:subjects"),
            ("Courses", Course.objects.count(), "mortarboard", "academics:courses"),
            ("Exams", Examination.objects.count(), "pencil-square", "examinations:list"),
            ("Assignments", Assignment.objects.count(), "file-earmark-text", "assignments:list"),
        ],
        "attendance_rate": _percent(present_count, marked),
        "attendance_marked": marked,
        "fees_collected": collected,
        "fees_pending": pending_amount if pending_amount > 0 else Decimal("0"),
        "activity": ActivityLog.objects.select_related("actor")[:8],
        "approvals": PlacementApplication.objects.filter(status=PlacementApplication.Status.APPLIED).select_related(
            "student__user", "placement__company"
        )[:6],
        "overdue_books": BookIssue.objects.filter(returned_on__isnull=True, due_on__lt=today).select_related("book", "student__user")[:6],
        "pending_fees": StudentFee.objects.exclude(status=StudentFee.Status.PAID).count(),
        "avg_accuracy": StudentProfile.objects.count() and (
            ExaminationAttempt.objects.filter(status="SUBMITTED").aggregate(avg=Avg("score"))["avg"] or 0
        ),
        "enrollment_chart": json.dumps({
            "type": "bar",
            "labels": [f"{row.name}-{row.division}" for row in enrollment_rows],
            "datasets": [{"label": "Students", "data": [row.total for row in enrollment_rows], "backgroundColor": "#2563EB"}],
        }),
        "attendance_chart": json.dumps({
            "type": "line",
            "labels": labels,
            "datasets": [
                {"label": "Present", "data": present, "borderColor": "#16A34A", "backgroundColor": "#16A34A"},
                {"label": "Absent", "data": absent, "borderColor": "#EF4444", "backgroundColor": "#EF4444"},
            ],
        }),
        "exam_chart": json.dumps({
            "type": "bar",
            "labels": [row["examination__subject__code"] or "Exam" for row in exam_rows],
            "datasets": [{"label": "Average score", "data": [float(row["avg"] or 0) for row in exam_rows], "backgroundColor": "#14B8A6"}],
        }),
        "fee_chart": json.dumps({
            "type": "doughnut",
            "labels": ["Collected", "Pending"],
            "datasets": [{"data": [float(collected), float(pending_amount if pending_amount > 0 else 0)], "backgroundColor": ["#16A34A", "#F59E0B"]}],
        }),
        "upcoming": Examination.objects.filter(is_published=True, exam_date__gte=now).select_related("subject")[:5],
    }


def teacher_dashboard(user):
    profile = teacher_profile(user)
    class_ids = teacher_classroom_ids(user)
    subject_ids = teacher_subject_ids(user)
    today = timezone.localdate()
    if not profile:
        return {"greeting": _greeting(), "empty": True}
    since = today - timedelta(days=13)
    recent = Attendance.objects.filter(teacher=profile, date__gte=since)
    return {
        "greeting": _greeting(),
        "empty": False,
        "profile": profile,
        "class_count": len(set(class_ids)),
        "subject_count": len(set(subject_ids)),
        "student_count": StudentProfile.objects.filter(classroom_id__in=class_ids, user__is_active=True).count(),
        "today": Timetable.objects.filter(teacher=profile, day_of_week=today.weekday()).select_related(
            "subject", "classroom"
        ),
        "pending_assignments": AssignmentSubmission.objects.filter(assignment__teacher=profile, marks__isnull=True)
        .select_related("assignment", "student__user")[:6],
        "upcoming": Examination.objects.filter(teacher=profile, exam_date__gte=timezone.now()).select_related("subject", "classroom")[:5],
        "attendance_rate": _percent(recent.filter(status=Attendance.Status.PRESENT).count(), recent.count()),
        "activity": ActivityLog.objects.filter(actor=user)[:8],
        "assignments": Assignment.objects.filter(teacher=profile, deadline__gte=timezone.now(), is_published=True)[:5],
    }


def student_dashboard(user):
    profile = student_profile(user)
    today = timezone.localdate()
    if not profile:
        return {"greeting": _greeting(), "empty": True}
    from academics.models import Topic
    from ai_quiz.models import Quiz

    attendance = Attendance.objects.filter(student=profile)
    topics = Topic.objects.filter(chapter__unit__subject__course=profile.course)
    topic_total = topics.count()
    topic_done = topics.filter(is_completed=True).count()
    published = Assignment.objects.filter(classroom=profile.classroom, is_published=True)
    submitted_ids = AssignmentSubmission.objects.filter(student=profile).values_list("assignment_id", flat=True)
    pending = published.exclude(id__in=submitted_ids).filter(deadline__gte=timezone.now())
    quizzes = Quiz.objects.filter(classroom=profile.classroom, status=Quiz.Status.PUBLISHED)
    return {
        "greeting": _greeting(),
        "empty": False,
        "profile": profile,
        "attendance_rate": _percent(attendance.filter(status=Attendance.Status.PRESENT).count(), attendance.count()),
        "subjects": Subject.objects.filter(course=profile.course).order_by("semester", "code"),
        "today": Timetable.objects.filter(classroom=profile.classroom, day_of_week=today.weekday()).select_related(
            "subject", "teacher__user"
        ),
        "upcoming": Examination.objects.filter(
            classroom=profile.classroom, is_published=True, exam_date__gte=timezone.now()
        ).select_related("subject")[:5],
        "pending_assignments": pending.select_related("subject")[:5],
        "quizzes": quizzes[:5],
        "marks": profile.performances.select_related("subject")[:5],
        "progress": _percent(topic_done, topic_total),
        "notifications": Notification.objects.filter(recipient=user)[:5],
        "recommendations": profile.recommendations.select_related("material", "topic")[:4],
    }
