from django import forms

from academics.models import Topic
from core.forms import StyledFormMixin, StyledModelForm

from .models import Examination, ProgrammingProblem, Question


class ExamForm(StyledModelForm):
    exam_date = forms.DateTimeField(
        widget=forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"),
        input_formats=["%Y-%m-%dT%H:%M", "%Y-%m-%dT%H:%M:%S"],
    )

    class Meta:
        model = Examination
        fields = [
            "title",
            "subject",
            "classroom",
            "exam_date",
            "duration_minutes",
            "instructions",
            "randomize_questions",
            "randomize_options",
            "negative_mark",
        ]
        widgets = {"instructions": forms.Textarea(attrs={"rows": 3})}

    def __init__(self, *args, teacher=None, **kwargs):
        super().__init__(*args, **kwargs)
        if teacher is not None:
            pairs = teacher.assignments.all()
            self.fields["subject"].queryset = self.fields["subject"].queryset.filter(id__in=pairs.values("subject_id"))
            self.fields["classroom"].queryset = self.fields["classroom"].queryset.filter(id__in=pairs.values("classroom_id"))


class MCQForm(StyledFormMixin, forms.Form):
    text = forms.CharField(label="Question", widget=forms.Textarea(attrs={"rows": 3}))
    explanation = forms.CharField(required=False, widget=forms.Textarea(attrs={"rows": 2}))
    difficulty = forms.ChoiceField(choices=Question.Difficulty.choices)
    marks = forms.DecimalField(min_value=0, initial=1, decimal_places=2, max_digits=6)
    option_1 = forms.CharField(max_length=500)
    option_2 = forms.CharField(max_length=500)
    option_3 = forms.CharField(max_length=500)
    option_4 = forms.CharField(max_length=500)
    correct = forms.ChoiceField(choices=[("1", "Option 1"), ("2", "Option 2"), ("3", "Option 3"), ("4", "Option 4")])
    topic = forms.ModelChoiceField(queryset=Topic.objects.none(), required=False)

    def __init__(self, *args, subject=None, **kwargs):
        super().__init__(*args, **kwargs)
        if subject is not None:
            self.fields["topic"].queryset = Topic.objects.filter(chapter__unit__subject=subject)


class ProgramForm(StyledModelForm):
    deadline = forms.DateTimeField(
        required=False,
        widget=forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"),
        input_formats=["%Y-%m-%dT%H:%M", "%Y-%m-%dT%H:%M:%S"],
    )

    class Meta:
        model = ProgrammingProblem
        fields = ["title", "statement", "subject", "classroom", "deadline", "sample_input", "sample_output", "is_published"]
        widgets = {
            "statement": forms.Textarea(attrs={"rows": 6}),
            "sample_input": forms.Textarea(attrs={"rows": 3, "class": "code"}),
            "sample_output": forms.Textarea(attrs={"rows": 3, "class": "code"}),
        }

    def __init__(self, *args, teacher=None, **kwargs):
        super().__init__(*args, **kwargs)
        if teacher is not None:
            pairs = teacher.assignments.all()
            self.fields["subject"].queryset = self.fields["subject"].queryset.filter(id__in=pairs.values("subject_id"))
            self.fields["classroom"].queryset = self.fields["classroom"].queryset.filter(id__in=pairs.values("classroom_id"))
