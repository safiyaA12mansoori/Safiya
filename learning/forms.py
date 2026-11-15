from django import forms

from core.forms import StyledModelForm

from .models import StudyMaterial


class MaterialForm(StyledModelForm):
    class Meta:
        model = StudyMaterial
        fields = ["title", "subject", "unit", "topic", "classroom", "kind", "file", "external_url", "description"]
        widgets = {"description": forms.Textarea(attrs={"rows": 3})}

    def __init__(self, *args, subjects=None, **kwargs):
        super().__init__(*args, **kwargs)
        if subjects is not None:
            self.fields["subject"].queryset = subjects
            self.fields["unit"].queryset = self.fields["unit"].queryset.filter(subject__in=subjects)
            self.fields["topic"].queryset = self.fields["topic"].queryset.filter(chapter__unit__subject__in=subjects)
            self.fields["classroom"].queryset = self.fields["classroom"].queryset.filter(course__subjects__in=subjects).distinct()
