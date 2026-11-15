import json
import re
import urllib.error
import urllib.request
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from analytics.services import record_performance, refresh_recommendations
from core.audit import log_action
from examinations.models import Question, QuestionOption
from notifications.services import notify

from .models import AIQuestionGeneration, Quiz, QuizAttempt, QuizOption, QuizQuestion

class AIServiceError(Exception):
    pass


SYSTEM = (
    "You write multiple-choice questions and return JSON only. "
    'Schema: {"questions":[{"question":"","options":["","","",""],"correct_index":0,'
    '"explanation":"","difficulty":"easy","topic":"","source_span":""}]}. '
    "When SOURCE is provided, every option and source_span must be copied verbatim from SOURCE. "
    "Do not add facts that are not in SOURCE. If SOURCE cannot support the request, return "
    '{"error":"insufficient_source","message":"Not enough source text"}.'
)

SAMPLES = {
    "en": [
        (
            "[SAMPLE] Practice drill on {topic}. Which choice is the designated sample answer?",
            ["Sample answer A for {topic}", "Sample distractor B", "Sample distractor C", "Sample distractor D"],
            0,
        ),
        (
            "[SAMPLE] Navigation check for {topic}. Which option is marked correct in this sample?",
            ["Unmarked sample", "Marked sample answer", "Another sample", "Last sample"],
            1,
        ),
        (
            "[SAMPLE] This item only tests the quiz screen for {topic}. Pick the sample key.",
            ["First sample", "Second sample", "Third sample is the key", "Fourth sample"],
            2,
        ),
        (
            "[SAMPLE] Demo item about {topic}. The sample key is the last option.",
            ["Sample one", "Sample two", "Sample three", "Sample key"],
            3,
        ),
    ],
    "hi": [
        (
            "[नमूना] {topic} पर अभ्यास। नमूना सही विकल्प कौन-सा है?",
            ["{topic} का नमूना उत्तर", "नमूना विकल्प ख", "नमूना विकल्प ग", "नमूना विकल्प घ"],
            0,
        ),
        (
            "[नमूना] {topic} स्क्रीन जाँच। चिह्नित नमूना उत्तर चुनें।",
            ["बिना चिह्न का नमूना", "चिह्नित नमूना उत्तर", "एक और नमूना", "अंतिम नमूना"],
            1,
        ),
        (
            "[नमूना] यह प्रश्न {topic} का वास्तविक तथ्य नहीं है। नमूना कुंजी चुनें।",
            ["पहला नमूना", "दूसरा नमूना", "तीसरा नमूना कुंजी है", "चौथा नमूना"],
            2,
        ),
        (
            "[नमूना] {topic} डेमो। नमूना कुंजी अंतिम विकल्प है।",
            ["नमूना एक", "नमूना दो", "नमूना तीन", "नमूना कुंजी"],
            3,
        ),
    ],
}


def using_demo():
    provider = (settings.AI_PROVIDER or "demo").strip().lower()
    return provider in {"", "demo"} or not (settings.AI_API_KEY or "").strip()


def _sentences(text):
    parts = re.split(r"(?<=[.!?।])\s+|\n+", text or "")
    seen = set()
    rows = []
    for part in parts:
        sentence = " ".join(part.split())
        if len(sentence) < 40:
            continue
        key = sentence.lower()
        if key in seen:
            continue
        seen.add(key)
        rows.append(sentence[:300])
    return rows


def _cue(sentence, others):
    words = sentence.split()
    for size in range(4, len(words) + 1):
        prefix = " ".join(words[:size])
        if not any(other.lower().startswith(prefix.lower()) for other in others):
            return prefix
    return sentence


def extractive_questions(text, count, difficulty, topic, language):
    rows = _sentences(text)
    if len(rows) < count + 3:
        raise AIServiceError(
            f"The source has {len(rows)} usable sentences. "
            f"At least {count + 3} are needed for {count} four-option questions without adding facts. "
            "Add more source text or lower the question count."
        )
    cycle = ["easy", "medium", "hard"]
    questions = []
    for index in range(count):
        correct = rows[index]
        distractors = [row for row in rows if row != correct][:3]
        options = [correct, *distractors]
        shift = index % 4
        options = options[shift:] + options[:shift]
        cue = _cue(correct, distractors)
        if language == "hi":
            stem = f"स्रोत का कौन-सा वाक्य “{cue}” से शुरू होता है?"
            explanation = "यह वाक्य अपलोड किए गए स्रोत से ज्यों का त्यों लिया गया है। डेमो जनरेटर ने कोई बाहरी तथ्य नहीं जोड़ा।"
        else:
            stem = f"Which sentence from the source starts with “{cue}”?"
            explanation = "This sentence is copied from the uploaded source. Demo mode did not add outside facts."
        diff = cycle[index % 3] if difficulty == "mixed" else difficulty
        questions.append(
            {
                "question": stem,
                "options": options,
                "correct_index": options.index(correct),
                "explanation": explanation,
                "difficulty": diff,
                "topic": topic or "Source",
                "source_span": correct,
            }
        )
    return questions


def sample_questions(topic, count, difficulty, language):
    topic = topic or "the selected topic"
    bank = SAMPLES["hi" if language == "hi" else "en"]
    cycle = ["easy", "medium", "hard"]
    questions = []
    for index in range(count):
        stem, options, correct = bank[index % len(bank)]
        text = stem.format(topic=topic)
        if index >= len(bank):
            text = f"{text} ({index + 1})"
        rendered = [option.format(topic=topic) for option in options]
        note = (
            "डेमो नमूना। यह पाठ्यक्रम का तथ्य नहीं है।"
            if language == "hi"
            else "Demo sample. This is not a syllabus fact."
        )
        questions.append(
            {
                "question": text,
                "options": rendered,
                "correct_index": correct,
                "explanation": note,
                "difficulty": cycle[index % 3] if difficulty == "mixed" else difficulty,
                "topic": topic,
                "source_span": "",
            }
        )
    return questions


def _parse_json(raw):
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise AIServiceError("The AI response was not valid JSON, so nothing was saved.") from exc


def validate_questions(payload, *, count, difficulty, source_text, source_based):
    if not isinstance(payload, dict):
        raise AIServiceError("The AI response was not a JSON object, so nothing was saved.")
    if payload.get("error"):
        message = payload.get("message") or "The source could not support those questions."
        raise AIServiceError(message)
    items = payload.get("questions")
    if not isinstance(items, list) or not items:
        raise AIServiceError("The AI response did not include questions, so nothing was saved.")
    source_norm = " ".join((source_text or "").lower().split())
    clean = []
    seen = set()
    for item in items:
        if not isinstance(item, dict):
            raise AIServiceError("A question in the AI response was malformed, so nothing was saved.")
        question = " ".join(str(item.get("question") or "").split())
        options = item.get("options")
        if not question or not isinstance(options, list) or len(options) != 4:
            raise AIServiceError("Each question needs text and exactly 4 options. Nothing was saved.")
        options = [" ".join(str(option).split()) for option in options]
        if any(not option for option in options) or len({option.lower() for option in options}) < 4:
            raise AIServiceError("Options must be four different non-empty choices. Nothing was saved.")
        try:
            index = int(item.get("correct_index"))
        except (TypeError, ValueError):
            raise AIServiceError("Each question needs a correct_index of 0 to 3. Nothing was saved.")
        if index not in range(4):
            raise AIServiceError("Each question needs a correct_index of 0 to 3. Nothing was saved.")
        diff = str(item.get("difficulty") or "medium").lower()
        if diff not in {"easy", "medium", "hard"}:
            raise AIServiceError("Difficulty must be easy, medium, or hard. Nothing was saved.")
        if difficulty != "mixed" and diff != difficulty:
            raise AIServiceError("A question did not match the requested difficulty. Nothing was saved.")
        topic = " ".join(str(item.get("topic") or "").split()) or "General"
        explanation = " ".join(str(item.get("explanation") or "").split())
        if source_based:
            span = " ".join(str(item.get("source_span") or "").split())
            span_norm = " ".join(span.lower().split())
            if len(span_norm) < 20 or span_norm not in source_norm:
                raise AIServiceError("A question was not grounded in the source, so nothing was saved.")
            if any(" ".join(option.lower().split()) not in source_norm for option in options):
                raise AIServiceError("Source-based options must be verbatim spans from the source. Nothing was saved.")
            if span_norm not in " ".join(options[index].lower().split()):
                raise AIServiceError("The correct option did not contain the source span. Nothing was saved.")
        key = question.lower()
        if key in seen:
            continue
        seen.add(key)
        clean.append(
            {
                "question": question,
                "options": options,
                "correct_index": index,
                "explanation": explanation,
                "difficulty": diff,
                "topic": topic,
                "source_span": " ".join(str(item.get("source_span") or "").split()),
            }
        )
        if len(clean) >= count:
            break
    if not clean:
        raise AIServiceError("The AI response had no usable questions, so nothing was saved.")
    return clean


def _prompt(source_text, topic, count, difficulty, language, avoid):
    lang = "Hindi" if language == "hi" else "English"
    avoid_block = "\n".join(f"- {item}" for item in avoid[:30])
    return (
        f"Write {count} {difficulty} MCQs in {lang}. Topic label: {topic or 'General'}.\n"
        f"Do not repeat these questions:\n{avoid_block or '- none'}\n"
        f"SOURCE:\n{source_text or '(no source document; use only the topic label and say they are general practice)'}"
    )


def _post(url, payload, headers):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        raise AIServiceError(f"The AI provider returned HTTP {exc.code}. Nothing was saved.") from exc
    except Exception as exc:
        raise AIServiceError(f"The AI provider could not be reached ({exc.__class__.__name__}). Nothing was saved.") from exc


def _call_provider(prompt):
    name = (settings.AI_PROVIDER or "demo").strip().lower()
    if name in {"gemini", "google"}:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
        data = _post(
            url,
            {"contents": [{"parts": [{"text": SYSTEM + "\n\n" + prompt}]}]},
            {"Content-Type": "application/json", "x-goog-api-key": settings.AI_API_KEY},
        )
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"], "gemini"
        except (KeyError, IndexError, TypeError) as exc:
            raise AIServiceError("Gemini returned an unexpected payload. Nothing was saved.") from exc
    if name not in {"openai", "custom", "openai_compatible", "groq", "together"}:
        raise AIServiceError("Unknown AI provider. Use demo, openai, custom, or gemini.")
    url = settings.AI_API_BASE.rstrip("/") + "/chat/completions"
    data = _post(
        url,
        {
            "model": settings.AI_MODEL,
            "temperature": 0.2,
            "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
        },
        {"Content-Type": "application/json", "Authorization": f"Bearer {settings.AI_API_KEY}"},
    )
    try:
        return data["choices"][0]["message"]["content"], name
    except (KeyError, IndexError, TypeError) as exc:
        raise AIServiceError("The AI provider returned an unexpected payload. Nothing was saved.") from exc


def generate_questions(*, source_text, topic, count, difficulty, language, source_based, avoid=None):
    avoid = avoid or []
    if using_demo():
        if source_based:
            questions = extractive_questions(source_text, count, difficulty, topic, language)
        else:
            questions = sample_questions(topic, count, difficulty, language)
        questions = [item for item in questions if item["question"].lower() not in {row.lower() for row in avoid}]
        if not questions:
            raise AIServiceError("Every generated question was a duplicate. Nothing was saved.")
        return questions, "demo", True
    raw, provider = _call_provider(_prompt(source_text if source_based else "", topic, count, difficulty, language, avoid))
    payload = _parse_json(raw)
    questions = validate_questions(
        payload, count=count, difficulty=difficulty, source_text=source_text, source_based=source_based
    )
    questions = [item for item in questions if item["question"].lower() not in {row.lower() for row in avoid}]
    if not questions:
        raise AIServiceError("The AI response duplicated existing questions. Nothing was saved.")
    return questions, provider, False


def write_questions(quiz, questions, replace=True):
    if replace:
        quiz.questions.all().delete()
        start = 1
    else:
        start = (quiz.questions.order_by("-order").values_list("order", flat=True).first() or 0) + 1
    for offset, item in enumerate(questions):
        row = QuizQuestion.objects.create(
            quiz=quiz,
            text=item["question"],
            explanation=item["explanation"],
            difficulty=item["difficulty"],
            topic_label=item["topic"],
            marks=quiz.marks_per_question,
            order=start + offset,
        )
        for index, option in enumerate(item["options"], start=1):
            QuizOption.objects.create(
                question=row, text=option[:500], is_correct=index - 1 == item["correct_index"], order=index
            )


def log_generation(quiz, teacher, provider, mode, request_payload, response_payload, status, error, is_demo):
    AIQuestionGeneration.objects.create(
        quiz=quiz,
        teacher=teacher,
        provider=provider,
        mode=mode,
        request_payload=request_payload,
        response_payload=response_payload,
        status=status,
        error=error or "",
        is_demo=is_demo,
    )


def _valid_question(question):
    options = list(question.options.all())
    return len(options) == 4 and sum(1 for option in options if option.is_correct) == 1 and question.text.strip()


@transaction.atomic
def publish_quiz(quiz, actor):
    questions = list(quiz.questions.prefetch_related("options"))
    if not questions:
        raise AIServiceError("Add at least one question before publishing.")
    for question in questions:
        if not _valid_question(question):
            raise AIServiceError("Every question needs text, four options, and one correct answer.")
        norm = question.normalized_text
        existing = Question.objects.filter(subject=quiz.subject, normalized_text=norm).first()
        if existing is None:
            existing = Question.objects.create(
                subject=quiz.subject,
                unit=quiz.unit,
                topic=quiz.topic,
                teacher=quiz.teacher,
                difficulty=question.difficulty if question.difficulty in {"easy", "medium", "hard"} else "medium",
                text=question.text,
                explanation=question.explanation,
                marks=question.marks,
                source="demo" if quiz.is_demo else "ai",
                language=quiz.language,
            )
            for option in question.options.all():
                QuestionOption.objects.create(
                    question=existing, text=option.text, is_correct=option.is_correct, order=option.order
                )
        question.bank_question = existing
        question.save(update_fields=["bank_question", "updated_at"])
    quiz.status = Quiz.Status.PUBLISHED
    quiz.save(update_fields=["status", "updated_at"])
    users = [student.user for student in quiz.classroom.students.select_related("user") if student.user.is_active]
    notify(users, f"Quiz published: {quiz.title}", quiz.subject.name, f"/quizzes/{quiz.pk}/take/")
    log_action(actor, "quiz_publish", f"Published {quiz.title}", "quiz", quiz.pk)
    return quiz


def seconds_left(attempt):
    from datetime import timedelta

    end = attempt.started_at + timedelta(minutes=attempt.quiz.duration_minutes)
    return int((end - timezone.now()).total_seconds())


@transaction.atomic
def start_quiz(quiz, student):
    existing = QuizAttempt.objects.select_for_update().filter(quiz=quiz, student=student).first()
    if existing:
        if existing.status != QuizAttempt.Status.SUBMITTED and seconds_left(existing) <= 0:
            score_quiz(existing)
        return existing
    import random

    questions = list(quiz.questions.prefetch_related("options"))
    random.shuffle(questions)
    attempt = QuizAttempt.objects.create(
        quiz=quiz, student=student, max_score=sum((item.marks for item in questions), Decimal("0"))
    )
    for item in questions:
        option_ids = list(item.options.values_list("id", flat=True))
        random.shuffle(option_ids)
        from .models import QuizAnswer

        QuizAnswer.objects.create(attempt=attempt, question=item, option_order=option_ids)
    return attempt


def quiz_items(attempt):
    from .models import QuizAnswer

    answers = list(attempt.answers.select_related("question").prefetch_related("question__options"))
    items = []
    for number, answer in enumerate(answers, start=1):
        options = {option.id: option for option in answer.question.options.all()}
        ordered = [options[key] for key in (answer.option_order or []) if key in options]
        items.append(
            {
                "key": answer.question_id,
                "number": number,
                "text": answer.question.text,
                "options": [{"id": option.id, "text": option.text} for option in ordered],
                "selected": answer.selected_option_id or "",
                "review": answer.marked_for_review,
            }
        )
    return items


@transaction.atomic
def save_quiz(attempt, data, complete=False):
    from .models import QuizAnswer

    attempt = QuizAttempt.objects.select_for_update().get(pk=attempt.pk)
    if attempt.status == QuizAttempt.Status.SUBMITTED:
        return attempt
    if seconds_left(attempt) <= 0:
        return score_quiz(attempt)
    for answer in attempt.answers.all():
        key = f"q_{answer.question_id}"
        review_key = f"review_{answer.question_id}"
        if not complete and key not in data and review_key not in data:
            continue
        raw = data.get(key) or ""
        answer.selected_option = QuizOption.objects.filter(pk=raw, question_id=answer.question_id).first() if raw else None
        answer.marked_for_review = review_key in data
        answer.save(update_fields=["selected_option", "marked_for_review"])
    return attempt


@transaction.atomic
def save_quiz_one(attempt, question_id, option_id, review):
    attempt = QuizAttempt.objects.select_for_update().get(pk=attempt.pk)
    if attempt.status != QuizAttempt.Status.SUBMITTED and seconds_left(attempt) <= 0:
        return score_quiz(attempt)
    if attempt.status == QuizAttempt.Status.SUBMITTED:
        return attempt
    answer = attempt.answers.get(question_id=question_id)
    answer.selected_option = QuizOption.objects.filter(pk=option_id, question_id=question_id).first() if option_id else None
    answer.marked_for_review = bool(review)
    answer.save(update_fields=["selected_option", "marked_for_review"])
    return attempt


@transaction.atomic
def score_quiz(attempt):
    from .models import QuizAnswer

    attempt = QuizAttempt.objects.select_for_update().select_related("quiz", "student").get(pk=attempt.pk)
    if attempt.status == QuizAttempt.Status.SUBMITTED:
        return attempt
    total = Decimal("0")
    max_score = Decimal("0")
    correct = 0
    incorrect = 0
    penalty = attempt.quiz.negative_mark or Decimal("0")
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
    attempt.status = QuizAttempt.Status.SUBMITTED
    attempt.submitted_at = timezone.now()
    attempt.save(update_fields=["score", "max_score", "status", "submitted_at", "updated_at"])
    record_performance(
        student=attempt.student,
        subject=attempt.quiz.subject,
        assessment_type="quiz",
        title=attempt.quiz.title,
        score=total,
        max_score=max_score,
        correct=correct,
        incorrect=incorrect,
        source_key=f"quiz-{attempt.pk}",
        topic_label=attempt.quiz.topic.title if attempt.quiz.topic_id else "",
    )
    refresh_recommendations(attempt.student)
    return attempt


def quiz_result_rows(attempt):
    rows = []
    for answer in attempt.answers.select_related("question", "selected_option").prefetch_related("question__options"):
        correct = next((option.text for option in answer.question.options.all() if option.is_correct), "")
        rows.append(
            {
                "text": answer.question.text,
                "selected": answer.selected_option.text if answer.selected_option_id else "Not answered",
                "correct": correct,
                "is_correct": answer.is_correct,
                "marks": answer.marks_awarded,
                "explanation": answer.question.explanation,
                "topic": answer.question.topic_label,
            }
        )
    return rows
