from django.db import models

from core.models import TimeStampedModel


def normalize_text(value):
    return " ".join((value or "").lower().split())[:400]


class Question(TimeStampedModel):
    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    class QType(models.TextChoices):
        MCQ = "MCQ", "Multiple choice"

    subject = models.ForeignKey("academics.Subject", on_delete=models.CASCADE, related_name="questions")
    unit = models.ForeignKey(
        "academics.Unit", null=True, blank=True, on_delete=models.SET_NULL, related_name="questions"
    )
    topic = models.ForeignKey(
        "academics.Topic", null=True, blank=True, on_delete=models.SET_NULL, related_name="questions"
    )
    teacher = models.ForeignKey(
        "teachers.TeacherProfile", null=True, blank=True, on_delete=models.SET_NULL, related_name="questions"
    )
    question_type = models.CharField(max_length=10, choices=QType.choices, default=QType.MCQ, db_index=True)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM, db_index=True)
    text = models.TextField()
    explanation = models.TextField(blank=True)
    marks = models.DecimalField(max_digits=6, decimal_places=2, default=1)
    source = models.CharField(max_length=40, blank=True, db_index=True)
    language = models.CharField(max_length=10, default="en")
    is_active = models.BooleanField(default=True, db_index=True)
    normalized_text = models.CharField(max_length=400, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.text[:80]

    def save(self, *args, **kwargs):
        self.normalized_text = normalize_text(self.text)
        super().save(*args, **kwargs)


class QuestionOption(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.text[:60]


class Examination(TimeStampedModel):
    title = models.CharField(max_length=200)
    subject = models.ForeignKey("academics.Subject", on_delete=models.PROTECT, related_name="examinations")
    classroom = models.ForeignKey("academics.ClassRoom", on_delete=models.PROTECT, related_name="examinations")
    teacher = models.ForeignKey("teachers.TeacherProfile", on_delete=models.PROTECT, related_name="examinations")
    exam_date = models.DateTimeField(db_index=True)
    duration_minutes = models.PositiveSmallIntegerField(default=30)
    max_marks = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    instructions = models.TextField(blank=True)
    is_published = models.BooleanField(default=False, db_index=True)
    results_published = models.BooleanField(default=False)
    randomize_questions = models.BooleanField(default=False)
    randomize_options = models.BooleanField(default=False)
    negative_mark = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        ordering = ["-exam_date"]

    def __str__(self):
        return self.title


class ExaminationQuestion(models.Model):
    examination = models.ForeignKey(Examination, on_delete=models.CASCADE, related_name="links")
    question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name="exam_links")
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["order", "id"]
        constraints = [models.UniqueConstraint(fields=["examination", "question"], name="uniq_exam_question")]


class ExaminationAttempt(TimeStampedModel):
    class Status(models.TextChoices):
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        SUBMITTED = "SUBMITTED", "Submitted"

    examination = models.ForeignKey(Examination, on_delete=models.CASCADE, related_name="attempts")
    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="exam_attempts")
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    max_score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS, db_index=True)
    question_order = models.JSONField(default=list, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["examination", "student"], name="uniq_exam_attempt")]

    def __str__(self):
        return f"{self.student} · {self.examination}"


class StudentAnswer(models.Model):
    attempt = models.ForeignKey(ExaminationAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name="student_answers")
    selected_option = models.ForeignKey(
        QuestionOption, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    marked_for_review = models.BooleanField(default=False)
    is_correct = models.BooleanField(null=True, blank=True)
    marks_awarded = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    option_order = models.JSONField(default=list, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["attempt", "question"], name="uniq_student_answer")]


class ProgrammingProblem(TimeStampedModel):
    title = models.CharField(max_length=200)
    statement = models.TextField()
    subject = models.ForeignKey("academics.Subject", on_delete=models.PROTECT, related_name="programming_problems")
    classroom = models.ForeignKey("academics.ClassRoom", on_delete=models.PROTECT, related_name="programming_problems")
    teacher = models.ForeignKey(
        "teachers.TeacherProfile", on_delete=models.PROTECT, related_name="programming_problems"
    )
    deadline = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=True)
    sample_input = models.TextField(blank=True)
    sample_output = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ProgrammingTestCase(models.Model):
    problem = models.ForeignKey(ProgrammingProblem, on_delete=models.CASCADE, related_name="testcases")
    stdin = models.TextField(blank=True)
    expected_stdout = models.TextField(blank=True)
    is_sample = models.BooleanField(default=False)
    marks = models.DecimalField(max_digits=6, decimal_places=2, default=1)

    def __str__(self):
        return f"Case {self.pk} for {self.problem}"


class ProgrammingSubmission(TimeStampedModel):
    problem = models.ForeignKey(ProgrammingProblem, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(
        "students.StudentProfile", on_delete=models.CASCADE, related_name="programming_submissions"
    )
    language = models.CharField(max_length=20, default="python")
    code = models.TextField()
    status = models.CharField(max_length=20, default="pending", db_index=True)
    score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    max_score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    result = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student} · {self.problem} · {self.status}"
