import random
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from analytics.services import record_performance, refresh_recommendations
from core.audit import log_action
from notifications.services import notify

from .models import ExaminationAttempt, ExaminationQuestion, QuestionOption, StudentAnswer
from .runner import evaluate


def seconds_left(attempt):
    end = attempt.started_at + timedelta(minutes=attempt.examination.duration_minutes)
    return int((end - timezone.now()).total_seconds())


def _ordered_options(answer):
    options = {option.id: option for option in answer.question.options.all()}
    order = answer.option_order or list(options)
    return [options[key] for key in order if key in options]


@transaction.atomic
def start_attempt(exam, student):
    existing = (
        ExaminationAttempt.objects.select_for_update()
        .filter(examination=exam, student=student)
        .first()
    )
    if existing:
        if existing.status != ExaminationAttempt.Status.SUBMITTED and seconds_left(existing) <= 0:
            score_attempt(existing)
        return existing
    links = list(ExaminationQuestion.objects.filter(examination=exam).select_related("question"))
    if exam.randomize_questions:
        random.shuffle(links)
    attempt = ExaminationAttempt.objects.create(
        examination=exam,
        student=student,
        max_score=sum((link.question.marks for link in links), Decimal("0")),
        question_order=[link.question_id for link in links],
    )
    for link in links:
        option_ids = list(link.question.options.values_list("id", flat=True))
        if exam.randomize_options:
            random.shuffle(option_ids)
        StudentAnswer.objects.create(attempt=attempt, question=link.question, option_order=option_ids)
    return attempt


def attempt_items(attempt):
    answers = {
        answer.question_id: answer
        for answer in attempt.answers.select_related("question", "selected_option").prefetch_related("question__options")
    }
    items = []
    order = attempt.question_order or list(answers)
    number = 1
    for question_id in order:
        answer = answers.get(question_id)
        if not answer:
            continue
        items.append(
            {
                "key": answer.question_id,
                "number": number,
                "text": answer.question.text,
                "options": [{"id": option.id, "text": option.text} for option in _ordered_options(answer)],
                "selected": answer.selected_option_id or "",
                "review": answer.marked_for_review,
            }
        )
        number += 1
    return items


@transaction.atomic
def save_posted(attempt, data, complete=False):
    attempt = ExaminationAttempt.objects.select_for_update().get(pk=attempt.pk)
    if attempt.status == ExaminationAttempt.Status.SUBMITTED:
        return attempt
    if seconds_left(attempt) <= 0:
        return score_attempt(attempt)
    for answer in attempt.answers.all():
        key = f"q_{answer.question_id}"
        review_key = f"review_{answer.question_id}"
        if not complete and key not in data and review_key not in data:
            continue
        raw = data.get(key) or ""
        answer.selected_option = (
            QuestionOption.objects.filter(pk=raw, question_id=answer.question_id).first() if raw else None
        )
        answer.marked_for_review = review_key in data
        answer.save(update_fields=["selected_option", "marked_for_review"])
    return attempt


@transaction.atomic
def save_one(attempt, question_id, option_id, review):
    attempt = ExaminationAttempt.objects.select_for_update().get(pk=attempt.pk)
    if attempt.status == ExaminationAttempt.Status.SUBMITTED or seconds_left(attempt) <= 0:
        if attempt.status != ExaminationAttempt.Status.SUBMITTED and seconds_left(attempt) <= 0:
            score_attempt(attempt)
        return attempt
    answer = attempt.answers.get(question_id=question_id)
    if option_id:
        answer.selected_option = QuestionOption.objects.filter(pk=option_id, question_id=question_id).first()
    else:
        answer.selected_option = None
    answer.marked_for_review = bool(review)
    answer.save(update_fields=["selected_option", "marked_for_review"])
    return attempt


@transaction.atomic
def score_attempt(attempt, actor=None):
    attempt = ExaminationAttempt.objects.select_for_update().select_related("examination", "student").get(pk=attempt.pk)
    if attempt.status == ExaminationAttempt.Status.SUBMITTED:
        return attempt
    total = Decimal("0")
    max_score = Decimal("0")
    correct = 0
    incorrect = 0
    penalty = attempt.examination.negative_mark or Decimal("0")
    for answer in attempt.answers.select_related("selected_option", "question"):
        marks = answer.question.marks or Decimal("0")
        max_score += marks
        if answer.selected_option_id and answer.selected_option.is_correct:
            answer.is_correct = True
            answer.marks_awarded = marks
            total += marks
            correct += 1
        elif answer.selected_option_id:
            answer.is_correct = False
            answer.marks_awarded = -penalty
            total -= penalty
            incorrect += 1
        else:
            answer.is_correct = False
            answer.marks_awarded = Decimal("0")
            incorrect += 1
        answer.save(update_fields=["is_correct", "marks_awarded"])
    attempt.score = total
    attempt.max_score = max_score
    attempt.status = ExaminationAttempt.Status.SUBMITTED
    attempt.submitted_at = timezone.now()
    attempt.save(update_fields=["score", "max_score", "status", "submitted_at", "updated_at"])
    record_performance(
        student=attempt.student,
        subject=attempt.examination.subject,
        assessment_type="exam",
        title=attempt.examination.title,
        score=total,
        max_score=max_score,
        correct=correct,
        incorrect=incorrect,
        source_key=f"exam-{attempt.pk}",
    )
    refresh_recommendations(attempt.student)
    if actor:
        log_action(actor, "exam_submit", f"{attempt.student} submitted {attempt.examination}", "examinationattempt", attempt.pk)
    return attempt


def result_rows(attempt):
    rows = []
    answers = {
        answer.question_id: answer
        for answer in attempt.answers.select_related("question", "selected_option").prefetch_related("question__options")
    }
    for question_id in attempt.question_order or list(answers):
        answer = answers.get(question_id)
        if not answer:
            continue
        correct = next((option.text for option in answer.question.options.all() if option.is_correct), "")
        rows.append(
            {
                "text": answer.question.text,
                "selected": answer.selected_option.text if answer.selected_option_id else "Not answered",
                "correct": correct,
                "is_correct": answer.is_correct,
                "marks": answer.marks_awarded,
                "explanation": answer.question.explanation,
                "review": answer.marked_for_review,
            }
        )
    return rows


def submit_program(problem, student, language, code):
    cases = [
        {"stdin": case.stdin, "expected": case.expected_stdout, "marks": case.marks, "sample": case.is_sample}
        for case in problem.testcases.all()
    ]
    result = evaluate(language, code, cases)
    from .models import ProgrammingSubmission

    return ProgrammingSubmission.objects.create(
        problem=problem,
        student=student,
        language=language,
        code=code,
        status=result["status"],
        score=result["score"],
        max_score=result["max_score"],
        result=result,
    )


def publish_exam(exam, actor):
    if not exam.links.exists():
        raise ValueError("Add at least one question before publishing.")
    exam.is_published = True
    exam.max_marks = sum((link.question.marks for link in exam.links.select_related("question")), Decimal("0"))
    exam.save(update_fields=["is_published", "max_marks", "updated_at"])
    users = [student.user for student in exam.classroom.students.select_related("user") if student.user.is_active]
    notify(users, f"Exam published: {exam.title}", exam.subject.name, f"/exams/{exam.pk}/")
    log_action(actor, "exam_publish", f"Published {exam.title}", "examination", exam.pk)
