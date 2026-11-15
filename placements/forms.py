from django import forms

from core.forms import StyledModelForm

from .models import Company, Placement, PlacementApplication


class CompanyForm(StyledModelForm):
    class Meta:
        model = Company
        fields = ["name", "website", "description"]
        widgets = {"description": forms.Textarea(attrs={"rows": 3})}


class JobForm(StyledModelForm):
    class Meta:
        model = Placement
        fields = ["company", "title", "description", "package", "ctc_lpa", "location", "deadline", "min_cgpa", "is_open"]
        widgets = {
            "description": forms.Textarea(attrs={"rows": 4}),
            "deadline": forms.DateInput(attrs={"type": "date"}),
        }


class ApplicationStatusForm(StyledModelForm):
    class Meta:
        model = PlacementApplication
        fields = ["status", "interview_at", "notes"]
        widgets = {"interview_at": forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M")}
