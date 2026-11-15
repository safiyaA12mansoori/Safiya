from django.db import models

from core.models import TimeStampedModel
from examinations.models import normalize_text


class Quiz(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"

    class Source(models.TextChoices):
        PDF = "pdf", "Upload PDF"
        DOCX = "docx", "Upload DOCX"
        MATERIAL = "material", "Existing material"
        TOPIC = "topic", "Manual topic"
        TEXT = "text", "Custom text"

    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"
        MIXED = "mixed", "Mixed"

    title = models.CharField(max_length=200)
    teacher = models.ForeignKey("teachers.TeacherProfile", on_delete=models.PROTECT, related_name="quizzes")
    department = models.ForeignKey("academics.Department", on_delete=models.PROTECT, related_name="quizzes")
    course = models.ForeignKey("academics.Course", on_delete=models.PROTECT, related_name="quizzes")
    classroom = models.ForeignKey("academics.ClassRoom", on_delete=models.PROTECT, related_name="quizzes")
    subject = models.ForeignKey("academics.Subject", on_delete=models.PROTECT, related_name="quizzes")
    unit = models.ForeignKey("academics.Unit", null=True, blank=True, on_delete=models.SET_NULL, related_name="quizzes")
    topic = models.ForeignKey("academics.Topic", null=True, blank=True, on_delete=models.SET_NULL, related_name="quizzes")
    source_type = models.CharField(max_length=20, choices=Source.choices)
    source_text = models.TextField(blank=True)
    source_file = models.FileField(upload_to="quiz_sources/%Y/%m/", blank=True)
    material = models.ForeignKey(
        "learning.StudyMaterial", null=True, blank=True, on_delete=models.SET_NULL, related_name="quizzes"
    )
    question_count = models.PositiveSmallIntegerField(default=5)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MIXED)
    duration_minutes = models.PositiveSmallIntegerField(default=15)
    marks_per_question = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    negative_mark = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    language = models.CharField(max_length=10, default="en")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    is_demo = models.BooleanField(default=False)
    is_adaptive = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class QuizQuestion(TimeStampedModel):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    bank_question = models.ForeignKey(
        "examinations.Question", null=True, blank=True, on_delete=models.SET_NULL, related_name="quiz_uses"
    )
    text = models.TextField()
    explanation = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, default="medium")
    topic_label = models.CharField(max_length=200, blank=True)
    marks = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    order = models.PositiveSmallIntegerField(default=1)
    normalized_text = models.CharField(max_length=400, blank=True, db_index=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.text[:80]

    def save(self, *args, **kwargs):
        self.normalized_text = normalize_text(self.text)
        super().save(*args, **kwargs)


class QuizOption(models.Model):
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["order", "id"]


class QuizAttempt(TimeStampedModel):
    class Status(models.TextChoices):
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        SUBMITTED = "SUBMITTED", "Submitted"

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="quiz_attempts")
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    max_score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS, db_index=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["quiz", "student"], name="uniq_quiz_attempt")]

    def __str__(self):
        return f"{self.student} · {self.quiz}"


class QuizAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE, related_name="answers")
    selected_option = models.ForeignKey(QuizOption, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    marked_for_review = models.BooleanField(default=False)
    is_correct = models.BooleanField(null=True, blank=True)
    marks_awarded = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    option_order = models.JSONField(default=list, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["attempt", "question"], name="uniq_quiz_answer")]


class AIQuestionGeneration(TimeStampedModel):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="generations")
    teacher = models.ForeignKey(
        "teachers.TeacherProfile", null=True, blank=True, on_delete=models.SET_NULL, related_name="generations"
    )
    provider = models.CharField(max_length=40)
    mode = models.CharField(max_length=20, default="all")
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, default="success")
    error = models.TextField(blank=True)
    is_demo = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
