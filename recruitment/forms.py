from django import forms

from .eligibility import EducationLevel
from .models import Applicant, Application, Interview, JobOpening


EDUCATION_CHOICES = [
    (level.value, level.name.replace("_", " ").title()) for level in EducationLevel
]


class JobOpeningForm(forms.ModelForm):
    class Meta:
        model = JobOpening
        fields = [
            "title",
            "department",
            "location",
            "description",
            "status",
            "min_education",
            "min_experience_years",
            "required_skills",
            "max_notice_period_days",
            "require_work_authorization",
            "min_age",
            "max_age",
            "remote_ok",
            "allowed_locations",
        ]
        widgets = {
            "description": forms.Textarea(attrs={"rows": 4}),
            "min_education": forms.Select(choices=EDUCATION_CHOICES),
        }


class ApplicantForm(forms.ModelForm):
    class Meta:
        model = Applicant
        fields = [
            "full_name",
            "email",
            "phone",
            "education",
            "experience_years",
            "skills",
            "notice_period_days",
            "work_authorized",
            "age",
            "location",
            "prefers_remote",
        ]
        widgets = {
            "education": forms.Select(choices=EDUCATION_CHOICES),
        }


class ApplicationForm(forms.Form):
    job = forms.ModelChoiceField(queryset=JobOpening.objects.filter(status=JobOpening.Status.OPEN))
    applicant = forms.ModelChoiceField(queryset=Applicant.objects.all())
    cover_letter = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), required=False)


class ScreenApplicationForm(forms.Form):
    application = forms.ModelChoiceField(
        queryset=Application.objects.filter(
            status__in=[
                Application.Status.APPLIED,
                Application.Status.SCREENING,
                Application.Status.FAILED,
                Application.Status.PASSED,
            ]
        )
    )


class InterviewForm(forms.ModelForm):
    class Meta:
        model = Interview
        fields = [
            "application",
            "scheduled_at",
            "duration_minutes",
            "interviewer_name",
            "location_or_link",
            "notes",
        ]
        widgets = {
            "scheduled_at": forms.DateTimeInput(attrs={"type": "datetime-local"}),
            "notes": forms.Textarea(attrs={"rows": 2}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["application"].queryset = Application.objects.filter(
            status=Application.Status.PASSED
        )
