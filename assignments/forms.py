from django import forms

from core.forms import StyledModelForm

from .models import Assignment, AssignmentSubmission


class AssignmentForm(StyledModelForm):
    deadline = forms.DateTimeField(
        widget=forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"),
        input_formats=["%Y-%m-%dT%H:%M", "%Y-%m-%dT%H:%M:%S"],
    )

    class Meta:
        model = Assignment
        fields = ["title", "subject", "classroom", "description", "file", "deadline", "max_marks", "is_published"]
        widgets = {"description": forms.Textarea(attrs={"rows": 3})}

    def __init__(self, *args, teacher=None, include_teacher=False, **kwargs):
        super().__init__(*args, **kwargs)
        if include_teacher:
            from teachers.models import TeacherProfile

            self.fields["teacher"] = forms.ModelChoiceField(
                queryset=TeacherProfile.objects.select_related("user"),
                widget=forms.Select(attrs={"class": "form-select"}),
            )
            if self.instance.pk:
                self.fields["teacher"].initial = self.instance.teacher_id
        if teacher is not None:
            pairs = teacher.assignments.all()
            self.fields["subject"].queryset = self.fields["subject"].queryset.filter(id__in=pairs.values("subject_id"))
            self.fields["classroom"].queryset = self.fields["classroom"].queryset.filter(id__in=pairs.values("classroom_id"))

    def clean(self):
        data = super().clean()
        subject = data.get("subject")
        classroom = data.get("classroom")
        if subject and classroom and subject.course_id != classroom.course_id:
            self.add_error("classroom", "The class does not belong to that subject's course.")
        return data


class SubmissionForm(StyledModelForm):
    class Meta:
        model = AssignmentSubmission
        fields = ["file", "text"]
        widgets = {"text": forms.Textarea(attrs={"rows": 4})}


class GradeForm(StyledModelForm):
    class Meta:
        model = AssignmentSubmission
        fields = ["marks", "feedback"]
        widgets = {"feedback": forms.Textarea(attrs={"rows": 3})}
