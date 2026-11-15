from collections import defaultdict

from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render

from academics.models import Subject, Topic
from accounts.models import User
from analytics.services import topic_stats
from core.access import role_required, student_profile, teacher_owns, teacher_profile, teacher_subject_ids
from examinations.forms import MCQForm
from examinations.models import Question, QuestionOption
from students.models import StudentProfile

from .extract import extract_material, extract_upload
from .forms import GenerateForm, QuizQuestionForm
from .models import Quiz, QuizOption, QuizQuestion
from .services import (
    AIServiceError,
    generate_questions,
    log_generation,
    publish_quiz,
    quiz_items,
    quiz_result_rows,
    save_quiz,
    score_quiz,
    seconds_left,
    start_quiz,
    using_demo,
    write_questions,
)


def _quizzes(user):
    qs = Quiz.objects.select_related("subject", "classroom", "teacher__user", "topic")
    if user.role == User.Role.ADMIN:
        return qs
    if user.role == User.Role.TEACHER:
        profile = teacher_profile(user)
        return qs.filter(teacher=profile) if profile else qs.none()
    profile = student_profile(user)
    return qs.filter(classroom=profile.classroom, status=Quiz.Status.PUBLISHED) if profile else qs.none()


def _draft(user, pk):
    quiz = get_object_or_404(_quizzes(user), pk=pk)
    if quiz.status != Quiz.Status.DRAFT or user.role == User.Role.STUDENT:
        raise PermissionDenied
    return quiz


def _source_text(data):
    source = data["source_type"]
    if source == Quiz.Source.TEXT:
        return data.get("source_text") or "", True
    if source == Quiz.Source.TOPIC:
        return "", False
    if source == Quiz.Source.MATERIAL:
        return extract_material(data["material"]), True
    uploaded = data.get("source_file")
    text = extract_upload(uploaded) if uploaded else ""
    try:
        uploaded.seek(0)
    except Exception:
        pass
    return text, True


@role_required("ADMIN", "TEACHER", "STUDENT")
def quiz_list(request):
    qs = _quizzes(request.user)
    if request.GET.get("q"):
        qs = qs.filter(title__icontains=request.GET["q"].strip())
    attempts = {}
    if request.user.role == User.Role.STUDENT:
        profile = student_profile(request.user)
        attempts = {row.quiz_id: row for row in profile.quiz_attempts.all()}
    return render(
        request,
        "ai_quiz/list.html",
        {"page_obj": Paginator(qs, 12).get_page(request.GET.get("page")), "attempts": attempts, "demo": using_demo()},
    )


@role_required("ADMIN", "TEACHER")
def generate(request):
    teacher = teacher_profile(request.user)
    form = GenerateForm(request.POST or None, request.FILES or None)
    if request.method == "POST" and form.is_valid():
        data = form.cleaned_data
        if teacher and not teacher_owns(request.user, data["classroom"].id, data["subject"].id):
            form.add_error("classroom", "You can generate quizzes only for your assigned class and subject.")
        else:
            try:
                text, source_based = _source_text(data)
                topic_name = data["topic"].title if data.get("topic") else data["subject"].name
                questions, provider, is_demo = generate_questions(
                    source_text=text,
                    topic=topic_name,
                    count=data["question_count"],
                    difficulty=data["difficulty"],
                    language=data["language"],
                    source_based=source_based,
                )
            except AIServiceError as exc:
                messages.error(request, str(exc))
            else:
                owner = teacher
                if owner is None:
                    from teachers.models import TeacherAssignment

                    load = TeacherAssignment.objects.filter(classroom=data["classroom"], subject=data["subject"]).first()
                    owner = load.teacher if load else None
                if owner is None:
                    messages.error(request, "Assign a teacher to that class before generating a quiz.")
                else:
                    with transaction.atomic():
                        quiz = Quiz.objects.create(
                            title=f"{data['subject'].code} · {topic_name}",
                            teacher=owner,
                            department=data["department"],
                            course=data["course"],
                            classroom=data["classroom"],
                            subject=data["subject"],
                            unit=data.get("unit"),
                            topic=data.get("topic"),
                            source_type=data["source_type"],
                            source_text=text[:20000],
                            source_file=data.get("source_file") or "",
                            material=data.get("material"),
                            question_count=data["question_count"],
                            difficulty=data["difficulty"],
                            duration_minutes=data["duration_minutes"],
                            marks_per_question=data["marks_per_question"],
                            negative_mark=data["negative_mark"],
                            language=data["language"],
                            is_demo=is_demo,
                        )
                        write_questions(quiz, questions, replace=True)
                        log_generation(
                            quiz,
                            owner,
                            provider,
                            "all",
                            {"count": data["question_count"], "source": data["source_type"], "language": data["language"]},
                            {"questions": len(questions)},
                            "success",
                            "",
                            is_demo,
                        )
                    messages.success(request, "Questions are ready for review." + (" Demo mode is on." if is_demo else ""))
                    return redirect("ai_quiz:review", pk=quiz.pk)
    return render(request, "ai_quiz/generate.html", {"form": form, "demo": using_demo()})


@role_required("ADMIN", "TEACHER")
def review(request, pk):
    quiz = get_object_or_404(_quizzes(request.user), pk=pk)
    if request.user.role == User.Role.STUDENT:
        raise PermissionDenied
    questions = quiz.questions.prefetch_related("options")
    return render(request, "ai_quiz/review.html", {"quiz": quiz, "questions": questions, "demo": quiz.is_demo or using_demo()})


def _replace(question, item):
    question.text = item["question"]
    question.explanation = item["explanation"]
    question.difficulty = item["difficulty"]
    question.topic_label = item["topic"]
    question.save()
    question.options.all().delete()
    for index, option in enumerate(item["options"], start=1):
        QuizOption.objects.create(question=question, text=option[:500], is_correct=index - 1 == item["correct_index"], order=index)


@role_required("ADMIN", "TEACHER")
def edit_question(request, pk, question_id):
    quiz = _draft(request.user, pk)
    question = get_object_or_404(quiz.questions.prefetch_related("options"), pk=question_id)
    initial = {}
    if request.method != "POST":
        options = list(question.options.all())
        initial = {
            "text": question.text,
            "explanation": question.explanation,
            "difficulty": question.difficulty if question.difficulty in {"easy", "medium", "hard"} else "medium",
            "correct": str(next((option.order for option in options if option.is_correct), 1)),
        }
        for option in options:
            initial[f"option_{option.order}"] = option.text
    form = QuizQuestionForm(request.POST or None, initial=None if request.method == "POST" else initial, subject=quiz.subject)
    if request.method == "POST" and form.is_valid():
        data = form.cleaned_data
        sibling = quiz.questions.exclude(pk=question.pk).filter(normalized_text=" ".join(data["text"].lower().split())[:400])
        if sibling.exists():
            messages.error(request, "That question duplicates another item in this quiz.")
        else:
            _replace(
                question,
                {
                    "question": data["text"],
                    "explanation": data["explanation"],
                    "difficulty": data["difficulty"],
                    "topic": question.topic_label or (quiz.topic.title if quiz.topic_id else quiz.subject.name),
                    "options": [data[f"option_{i}"] for i in range(1, 5)],
                    "correct_index": int(data["correct"]) - 1,
                },
            )
            messages.success(request, "Question updated.")
            return redirect("ai_quiz:review", pk=pk)
    return render(request, "ai_quiz/edit_question.html", {"form": form, "quiz": quiz})


@role_required("ADMIN", "TEACHER")
def delete_question(request, pk, question_id):
    quiz = _draft(request.user, pk)
    if request.method == "POST":
        quiz.questions.filter(pk=question_id).delete()
        messages.success(request, "Question deleted.")
    return redirect("ai_quiz:review", pk=pk)


def _regenerate(quiz, count, avoid):
    source_based = quiz.source_type != Quiz.Source.TOPIC
    topic_name = quiz.topic.title if quiz.topic_id else quiz.subject.name
    return generate_questions(
        source_text=quiz.source_text,
        topic=topic_name,
        count=count,
        difficulty=quiz.difficulty,
        language=quiz.language,
        source_based=source_based,
        avoid=avoid,
    )


@role_required("ADMIN", "TEACHER")
def regenerate_one(request, pk, question_id):
    quiz = _draft(request.user, pk)
    question = get_object_or_404(quiz.questions, pk=question_id)
    if request.method == "POST":
        avoid = list(quiz.questions.exclude(pk=question.pk).values_list("text", flat=True))
        try:
            questions, provider, is_demo = _regenerate(quiz, 1, avoid)
        except AIServiceError as exc:
            log_generation(quiz, quiz.teacher, "demo" if using_demo() else "provider", "one", {}, {}, "error", str(exc), using_demo())
            messages.error(request, str(exc))
        else:
            _replace(question, questions[0])
            quiz.is_demo = quiz.is_demo or is_demo
            quiz.save(update_fields=["is_demo", "updated_at"])
            log_generation(quiz, quiz.teacher, provider, "one", {}, {"questions": 1}, "success", "", is_demo)
            messages.success(request, "Replaced that question.")
    return redirect("ai_quiz:review", pk=pk)


@role_required("ADMIN", "TEACHER")
def regenerate_all(request, pk):
    quiz = _draft(request.user, pk)
    if request.method == "POST":
        try:
            questions, provider, is_demo = _regenerate(quiz, quiz.question_count, [])
        except AIServiceError as exc:
            log_generation(quiz, quiz.teacher, "demo" if using_demo() else "provider", "all", {}, {}, "error", str(exc), using_demo())
            messages.error(request, str(exc))
        else:
            with transaction.atomic():
                write_questions(quiz, questions, replace=True)
                quiz.is_demo = is_demo
                quiz.save(update_fields=["is_demo", "updated_at"])
                log_generation(quiz, quiz.teacher, provider, "all", {}, {"questions": len(questions)}, "success", "", is_demo)
            messages.success(request, "Regenerated the quiz.")
    return redirect("ai_quiz:review", pk=pk)


@role_required("ADMIN", "TEACHER")
def add_question(request, pk):
    quiz = _draft(request.user, pk)
    form = QuizQuestionForm(request.POST or None, subject=quiz.subject)
    if request.method == "POST" and form.is_valid():
        data = form.cleaned_data
        norm = " ".join(data["text"].lower().split())[:400]
        if quiz.questions.filter(normalized_text=norm).exists():
            messages.error(request, "That question is already in the quiz.")
        else:
            write_questions(
                quiz,
                [
                    {
                        "question": data["text"],
                        "options": [data[f"option_{i}"] for i in range(1, 5)],
                        "correct_index": int(data["correct"]) - 1,
                        "explanation": data["explanation"],
                        "difficulty": data["difficulty"],
                        "topic": quiz.topic.title if quiz.topic_id else quiz.subject.name,
                    }
                ],
                replace=False,
            )
            messages.success(request, "Manual question added.")
            return redirect("ai_quiz:review", pk=pk)
    return render(request, "ai_quiz/edit_question.html", {"form": form, "quiz": quiz})


@role_required("ADMIN", "TEACHER")
def preview(request, pk):
    quiz = get_object_or_404(_quizzes(request.user), pk=pk)
    return render(request, "ai_quiz/preview.html", {"quiz": quiz, "questions": quiz.questions.prefetch_related("options")})


@role_required("ADMIN", "TEACHER")
def publish(request, pk):
    quiz = _draft(request.user, pk)
    if request.method == "POST":
        try:
            publish_quiz(quiz, request.user)
            messages.success(request, "Quiz published and copied into the question bank.")
            return redirect("ai_quiz:list")
        except AIServiceError as exc:
            messages.error(request, str(exc))
    return redirect("ai_quiz:review", pk=pk)


@role_required("STUDENT")
def take(request, pk):
    profile = student_profile(request.user)
    quiz = get_object_or_404(_quizzes(request.user), pk=pk)
    if not quiz.questions.exists():
        messages.error(request, "This quiz has no questions.")
        return redirect("ai_quiz:list")
    attempt = start_quiz(quiz, profile)
    if attempt.status == attempt.Status.SUBMITTED:
        return redirect("ai_quiz:result", pk=quiz.pk)
    if request.method == "POST":
        attempt = save_quiz(attempt, request.POST, complete=True)
        if request.POST.get("action") == "submit" or attempt.status == attempt.Status.SUBMITTED:
            if attempt.status != attempt.Status.SUBMITTED:
                score_quiz(attempt)
            messages.success(request, "Quiz submitted.")
            return redirect("ai_quiz:result", pk=quiz.pk)
        messages.success(request, "Answers saved.")
        return redirect("ai_quiz:take", pk=quiz.pk)
    remaining = seconds_left(attempt)
    if remaining <= 0:
        score_quiz(attempt)
        return redirect("ai_quiz:result", pk=quiz.pk)
    return render(
        request,
        "assessments/attempt.html",
        {
            "paper_title": quiz.title,
            "instructions": "Demo questions are labeled." if quiz.is_demo else "",
            "items": quiz_items(attempt),
            "seconds_left": remaining,
            "save_url": f"/api/quizzes/attempts/{attempt.pk}/save/",
            "demo": quiz.is_demo,
        },
    )


@role_required("STUDENT", "TEACHER", "ADMIN")
def result(request, pk):
    quiz = get_object_or_404(Quiz, pk=pk, status=Quiz.Status.PUBLISHED)
    if request.user.role == User.Role.STUDENT:
        attempt = get_object_or_404(quiz.attempts, student=student_profile(request.user), status="SUBMITTED")
    else:
        quiz = get_object_or_404(_quizzes(request.user), pk=pk)
        attempt = quiz.attempts.filter(status="SUBMITTED").select_related("student__user").first()
        if request.GET.get("student"):
            attempt = get_object_or_404(quiz.attempts, student_id=request.GET["student"], status="SUBMITTED")
    rows = quiz_result_rows(attempt) if attempt else []
    return render(request, "ai_quiz/result.html", {"quiz": quiz, "attempt": attempt, "rows": rows})


def _bank(user):
    qs = Question.objects.filter(is_active=True).select_related("subject", "topic", "teacher__user")
    if user.role == User.Role.TEACHER:
        qs = qs.filter(subject_id__in=teacher_subject_ids(user))
    elif user.role != User.Role.ADMIN:
        return qs.none()
    return qs


@role_required("ADMIN", "TEACHER")
def bank(request):
    qs = _bank(request.user)
    if request.GET.get("q"):
        qs = qs.filter(text__icontains=request.GET["q"].strip())
    if request.GET.get("subject"):
        qs = qs.filter(subject_id=request.GET["subject"])
    if request.GET.get("difficulty"):
        qs = qs.filter(difficulty=request.GET["difficulty"])
    if request.GET.get("topic"):
        qs = qs.filter(Q(topic_id=request.GET["topic"]) | Q(topic__title__icontains=request.GET["topic"]))
    subjects = Subject.objects.all()
    if request.user.role == User.Role.TEACHER:
        subjects = subjects.filter(id__in=teacher_subject_ids(request.user))
    return render(
        request,
        "ai_quiz/bank.html",
        {
            "page_obj": Paginator(qs, 12).get_page(request.GET.get("page")),
            "subjects": subjects,
            "topics": Topic.objects.filter(chapter__unit__subject__in=subjects),
        },
    )


@role_required("ADMIN", "TEACHER")
def bank_create(request):
    subjects = Subject.objects.all()
    if request.user.role == User.Role.TEACHER:
        subjects = subjects.filter(id__in=teacher_subject_ids(request.user))
    subject = subjects.filter(pk=request.GET.get("subject") or request.POST.get("subject")).first()
    form = MCQForm(request.POST or None, subject=subject)
    if request.method == "POST" and form.is_valid() and subject:
        if request.user.role == User.Role.TEACHER and subject.id not in teacher_subject_ids(request.user):
            raise PermissionDenied
        data = form.cleaned_data
        question = Question.objects.create(
            subject=subject,
            topic=data.get("topic"),
            unit=data["topic"].chapter.unit if data.get("topic") else None,
            teacher=teacher_profile(request.user),
            difficulty=data["difficulty"],
            text=data["text"],
            explanation=data["explanation"],
            marks=data["marks"],
            source="manual",
        )
        for index in range(1, 5):
            QuestionOption.objects.create(
                question=question, text=data[f"option_{index}"], is_correct=data["correct"] == str(index), order=index
            )
        messages.success(request, "Question saved to the bank.")
        return redirect("ai_quiz:bank")
    return render(request, "ai_quiz/bank_form.html", {"form": form, "subjects": subjects, "subject": subject})


@role_required("ADMIN", "TEACHER")
def bank_delete(request, pk):
    question = get_object_or_404(_bank(request.user), pk=pk)
    if request.method == "POST":
        from django.db.models import ProtectedError

        try:
            question.delete()
            messages.success(request, "Question deleted.")
        except ProtectedError:
            messages.error(request, "That question is used by an exam and was kept.")
    return redirect("ai_quiz:bank")


def _adaptive_questions(subject, students, count):
    buckets = defaultdict(lambda: {"correct": 0, "total": 0})
    for student in students:
        for label, bucket in topic_stats(student).items():
            buckets[label]["correct"] += bucket["correct"]
            buckets[label]["total"] += bucket["total"]
    weak = [label for label, bucket in buckets.items() if bucket["total"] and bucket["correct"] / bucket["total"] < 0.7]
    bank_qs = Question.objects.filter(subject=subject, is_active=True).prefetch_related("options")
    matched = bank_qs.filter(topic__title__in=weak) if weak else bank_qs
    questions = []
    for item in matched[:count]:
        options = list(item.options.all())
        if len(options) != 4 or sum(option.is_correct for option in options) != 1:
            continue
        questions.append(
            {
                "question": item.text,
                "options": [option.text for option in options],
                "correct_index": next(index for index, option in enumerate(options) if option.is_correct),
                "explanation": item.explanation,
                "difficulty": item.difficulty,
                "topic": item.topic.title if item.topic_id else (weak[0] if weak else subject.name),
            }
        )
    demo = False
    if len(questions) < count:
        extra, _, is_demo = generate_questions(
            source_text="",
            topic=weak[0] if weak else subject.name,
            count=count - len(questions),
            difficulty="mixed",
            language="en",
            source_based=False,
            avoid=[row["question"] for row in questions],
        )
        questions.extend(extra)
        demo = is_demo
    return questions, weak, demo


@role_required("ADMIN", "TEACHER")
def adaptive(request):
    teacher = teacher_profile(request.user)
    from academics.models import ClassRoom

    classes = ClassRoom.objects.all() if request.user.role == User.Role.ADMIN else ClassRoom.objects.filter(
        id__in=teacher.assignments.values("classroom_id")
    )
    subjects = Subject.objects.all() if request.user.role == User.Role.ADMIN else Subject.objects.filter(
        id__in=teacher.assignments.values("subject_id")
    )
    if request.method == "POST":
        classroom = get_object_or_404(classes, pk=request.POST.get("classroom"))
        subject = get_object_or_404(subjects, pk=request.POST.get("subject"))
        if teacher and not teacher_owns(request.user, classroom.id, subject.id):
            raise PermissionDenied
        students = list(StudentProfile.objects.filter(classroom=classroom, user__is_active=True))
        try:
            questions, weak, demo = _adaptive_questions(subject, students, int(request.POST.get("count") or 5))
        except AIServiceError as exc:
            messages.error(request, str(exc))
            return redirect("ai_quiz:adaptive")
        load = subject.teacher_assignments.filter(classroom=classroom).select_related("teacher").first()
        owner = teacher or (load.teacher if load else None)
        if owner is None:
            messages.error(request, "Assign a teacher to that class and subject first.")
            return redirect("ai_quiz:adaptive")
        quiz = Quiz.objects.create(
            title=f"Adaptive · {subject.code}",
            teacher=owner,
            department=subject.course.department,
            course=subject.course,
            classroom=classroom,
            subject=subject,
            source_type=Quiz.Source.TOPIC,
            question_count=len(questions),
            difficulty=Quiz.Difficulty.MIXED,
            duration_minutes=15,
            is_demo=demo,
            is_adaptive=True,
            status=Quiz.Status.DRAFT,
        )
        write_questions(quiz, questions, replace=True)
        publish_quiz(quiz, request.user)
        note = ", ".join(weak) if weak else "no weak topics yet, so the set uses the bank and labeled samples"
        messages.success(request, f"Adaptive quiz published from {note}.")
        return redirect("ai_quiz:review", pk=quiz.pk)
    return render(request, "ai_quiz/adaptive.html", {"classes": classes, "subjects": subjects, "demo": using_demo()})


@role_required("STUDENT")
def adaptive_student(request):
    profile = student_profile(request.user)
    if request.method != "POST":
        return redirect("analytics:overview")
    subject = Subject.objects.filter(course=profile.course, pk=request.POST.get("subject")).first() or Subject.objects.filter(
        course=profile.course
    ).first()
    if not subject:
        messages.error(request, "No subject is available for practice.")
        return redirect("analytics:overview")
    load = subject.teacher_assignments.select_related("teacher").first()
    if not load:
        messages.error(request, "No teacher is assigned to that subject yet.")
        return redirect("analytics:overview")
    try:
        questions, weak, demo = _adaptive_questions(subject, [profile], 5)
    except AIServiceError as exc:
        messages.error(request, str(exc))
        return redirect("analytics:overview")
    quiz = Quiz.objects.create(
        title=f"My practice · {subject.code}",
        teacher=load.teacher,
        department=subject.course.department,
        course=subject.course,
        classroom=profile.classroom,
        subject=subject,
        source_type=Quiz.Source.TOPIC,
        question_count=len(questions),
        difficulty=Quiz.Difficulty.MIXED,
        duration_minutes=10,
        is_demo=demo,
        is_adaptive=True,
        status=Quiz.Status.DRAFT,
    )
    write_questions(quiz, questions, replace=True)
    publish_quiz(quiz, request.user)
    messages.success(request, "Practice quiz ready." + (" Weak topics: " + ", ".join(weak) if weak else " No weak-topic history yet; samples are labeled."))
    return redirect("ai_quiz:take", pk=quiz.pk)
