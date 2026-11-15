from django import forms
from django.conf import settings

from academics.models import ClassRoom, Course, Department, Subject, Topic, Unit
from core.forms import StyledFormMixin
from examinations.forms import MCQForm
from learning.models import StudyMaterial

from .models import Quiz


class GenerateForm(StyledFormMixin, forms.Form):
    department = forms.ModelChoiceField(queryset=Department.objects.all())
    course = forms.ModelChoiceField(queryset=Course.objects.select_related("department"))
    classroom = forms.ModelChoiceField(queryset=ClassRoom.objects.select_related("course", "session"))
    subject = forms.ModelChoiceField(queryset=Subject.objects.select_related("course"))
    unit = forms.ModelChoiceField(queryset=Unit.objects.select_related("subject"), required=False)
    topic = forms.ModelChoiceField(queryset=Topic.objects.select_related("chapter__unit"), required=False)
    source_type = forms.ChoiceField(choices=Quiz.Source.choices)
    material = forms.ModelChoiceField(queryset=StudyMaterial.objects.all(), required=False)
    source_file = forms.FileField(required=False)
    source_text = forms.CharField(required=False, widget=forms.Textarea(attrs={"rows": 8}))
    question_count = forms.IntegerField(min_value=1, max_value=20, initial=5)
    difficulty = forms.ChoiceField(choices=Quiz.Difficulty.choices, initial=Quiz.Difficulty.MIXED)
    duration_minutes = forms.IntegerField(min_value=5, max_value=180, initial=15)
    marks_per_question = forms.DecimalField(min_value=0, initial=1, decimal_places=2, max_digits=5)
    negative_mark = forms.DecimalField(min_value=0, initial=0, decimal_places=2, max_digits=5)
    language = forms.ChoiceField(choices=settings.QUIZ_LANGUAGES)

    def clean(self):
        data = super().clean()
        course, department = data.get("course"), data.get("department")
        classroom, subject = data.get("classroom"), data.get("subject")
        unit, topic = data.get("unit"), data.get("topic")
        if course and department and course.department_id != department.id:
            self.add_error("course", "Course is not in that department.")
        if classroom and course and classroom.course_id != course.id:
            self.add_error("classroom", "Class is not in that course.")
        if subject and course and subject.course_id != course.id:
            self.add_error("subject", "Subject is not in that course.")
        if unit and subject and unit.subject_id != subject.id:
            self.add_error("unit", "Unit is not in that subject.")
        if topic and unit and topic.chapter.unit_id != unit.id:
            self.add_error("topic", "Topic is not in that unit.")
        if topic and subject and topic.chapter.unit.subject_id != subject.id:
            self.add_error("topic", "Topic is not in that subject.")
        source = data.get("source_type")
        if source in {Quiz.Source.PDF, Quiz.Source.DOCX} and not data.get("source_file"):
            self.add_error("source_file", "Upload the source file.")
        if source == Quiz.Source.MATERIAL and not data.get("material"):
            self.add_error("material", "Choose a material.")
        if source == Quiz.Source.TEXT and len((data.get("source_text") or "").strip()) < 40:
            self.add_error("source_text", "Paste at least a short paragraph so questions can stay inside it.")
        if source == Quiz.Source.TOPIC and not topic:
            self.add_error("topic", "Pick a topic for manual-topic generation.")
        if data.get("material") and subject and data["material"].subject_id != subject.id:
            self.add_error("material", "That material belongs to another subject.")
        return data


class QuizQuestionForm(MCQForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop("marks", None)
        self.fields.pop("topic", None)
