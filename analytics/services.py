from decimal import Decimal

from django.utils import timezone

from ai_quiz.models import QuizAnswer
from attendance.models import Attendance
from examinations.models import StudentAnswer
from learning.models import StudyMaterial

from .models import StudentPerformance, StudyRecommendation


def record_performance(*, student, subject, assessment_type, title, score, max_score, correct, incorrect, source_key, topic_label=""):
    score = Decimal(score or 0)
    max_score = Decimal(max_score or 0)
    total = (correct or 0) + (incorrect or 0)
    if total:
        accuracy = (Decimal(correct) / Decimal(total) * Decimal("100")).quantize(Decimal("0.01"))
    elif max_score:
        accuracy = (score / max_score * Decimal("100")).quantize(Decimal("0.01"))
    else:
        accuracy = Decimal("0")
    StudentPerformance.objects.update_or_create(
        student=student,
        source_key=source_key,
        defaults={
            "subject": subject,
            "topic_label": topic_label[:200],
            "assessment_type": assessment_type,
            "title": title[:200],
            "score": score,
            "max_score": max_score,
            "accuracy": accuracy,
            "correct_count": correct or 0,
            "incorrect_count": incorrect or 0,
            "recorded_on": timezone.localdate(),
        },
    )


def topic_stats(student):
    buckets = {}
    quiz_answers = QuizAnswer.objects.filter(attempt__student=student, attempt__status="SUBMITTED").select_related(
        "question__quiz"
    )
    for answer in quiz_answers:
        label = answer.question.topic_label or "General"
        bucket = buckets.setdefault(label, {"correct": 0, "total": 0, "subject_id": answer.question.quiz.subject_id})
        bucket["total"] += 1
        bucket["correct"] += 1 if answer.is_correct else 0
    exam_answers = StudentAnswer.objects.filter(attempt__student=student, attempt__status="SUBMITTED").select_related(
        "question__topic"
    )
    for answer in exam_answers:
        label = answer.question.topic.title if answer.question.topic_id else "General"
        bucket = buckets.setdefault(label, {"correct": 0, "total": 0, "subject_id": answer.question.subject_id})
        bucket["total"] += 1
        bucket["correct"] += 1 if answer.is_correct else 0
    return buckets


def refresh_recommendations(student):
    StudyRecommendation.objects.filter(student=student).delete()
    rows = []
    for label, bucket in topic_stats(student).items():
        if not bucket["total"]:
            continue
        accuracy = bucket["correct"] / bucket["total"]
        if accuracy >= 0.6:
            continue
        from academics.models import Topic

        topic = Topic.objects.filter(title__iexact=label, chapter__unit__subject_id=bucket["subject_id"]).select_related(
            "chapter"
        ).first()
        material = None
        if topic:
            material = StudyMaterial.objects.filter(topic=topic).first()
        if material is None and bucket["subject_id"]:
            material = StudyMaterial.objects.filter(subject_id=bucket["subject_id"]).first()
        percent = round(accuracy * 100)
        if material:
            rows.append(
                StudyRecommendation(
                    student=student,
                    subject_id=bucket["subject_id"],
                    topic=topic,
                    material=material,
                    kind=StudyRecommendation.Kind.MATERIAL,
                    title=f"Read {material.title}",
                    detail=f"This file is already in the library for {label}. Accuracy on that topic is {percent}%.",
                    priority=1,
                )
            )
        if topic:
            rows.append(
                StudyRecommendation(
                    student=student,
                    subject_id=bucket["subject_id"],
                    topic=topic,
                    kind=StudyRecommendation.Kind.CHAPTER,
                    title=f"Revise {topic.chapter.title}",
                    detail=f"{label} sits in this chapter. Accuracy is {percent}%.",
                    priority=1,
                )
            )
        rows.append(
            StudyRecommendation(
                student=student,
                subject_id=bucket["subject_id"],
                topic=topic,
                kind=StudyRecommendation.Kind.TOPIC,
                title=f"Revisit {label}",
                detail=f"Accuracy is {percent}% across {bucket['total']} answered questions.",
                priority=1,
            )
        )
        rows.append(
            StudyRecommendation(
                student=student,
                subject_id=bucket["subject_id"],
                topic=topic,
                kind=StudyRecommendation.Kind.PRACTICE,
                title=f"Practice {label}",
                detail="Take another quiz that includes this topic.",
                priority=2,
            )
        )
        rows.append(
            StudyRecommendation(
                student=student,
                subject_id=bucket["subject_id"],
                topic=topic,
                kind=StudyRecommendation.Kind.REVISION,
                title=f"Schedule a revision block for {label}",
                detail="Use class notes and the linked material, then retry the questions you missed.",
                priority=2,
            )
        )
    attendance = Attendance.objects.filter(student=student)
    total = attendance.count()
    if total:
        present = attendance.filter(status=Attendance.Status.PRESENT).count()
        rate = present / total
        if rate < 0.75:
            rows.append(
                StudyRecommendation(
                    student=student,
                    kind=StudyRecommendation.Kind.ATTENDANCE,
                    title="Bring attendance to at least 75%",
                    detail=f"Present rate is {round(rate * 100, 1)}% of marked sessions.",
                    priority=1,
                )
            )
    if rows:
        StudyRecommendation.objects.bulk_create(rows[:12])
