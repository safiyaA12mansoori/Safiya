from django import forms
from django.utils import timezone

from apps.academics.forms import bind_classroom_years
from apps.academics.models import AcademicYear, ClassRoom
from apps.accounts.forms import BootstrapFormMixin
from apps.accounts.validators import validate_date_of_birth, validate_phone

from .models import Student


class StudentForm(BootstrapFormMixin, forms.Form):
    first_name = forms.CharField(max_length=150)
    last_name = forms.CharField(max_length=150)
    date_of_birth = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'),
        input_formats=['%Y-%m-%d'],
    )
    gender = forms.ChoiceField(choices=[('', 'Select gender'), *Student.Gender.choices])
    address = forms.CharField(required=False, widget=forms.Textarea(attrs={'rows': 3}))
    parent_name = forms.CharField(max_length=150, label='Parent or guardian name')
    parent_phone = forms.CharField(max_length=20, label='Parent or guardian phone')
    academic_year = forms.ModelChoiceField(
        queryset=AcademicYear.objects.none(),
        help_text='Saving updates the class for the selected academic year and keeps other years.',
    )
    classroom = forms.ModelChoiceField(queryset=ClassRoom.objects.none(), label='Class and division')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['academic_year'].queryset = AcademicYear.objects.order_by('-start_date')
        self.fields['classroom'].queryset = (
            ClassRoom.objects.select_related('grade_level', 'academic_year')
            .order_by('-academic_year__start_date', 'grade_level__number', 'division')
        )
        bind_classroom_years(self.fields['classroom'])
        self.fields['parent_phone'].widget.attrs.update({
            'pattern': r'\+?[0-9][0-9\s\-]{6,18}',
            'title': 'Use digits, spaces, or hyphens. You may start with +.',
            'inputmode': 'tel',
            'autocomplete': 'tel',
        })
        self.fields['date_of_birth'].widget.attrs['max'] = timezone.localdate().isoformat()
        self.fields['first_name'].widget.attrs['autocomplete'] = 'given-name'
        self.fields['last_name'].widget.attrs['autocomplete'] = 'family-name'

    def clean_first_name(self):
        return self.cleaned_data['first_name'].strip()

    def clean_last_name(self):
        return self.cleaned_data['last_name'].strip()

    def clean_parent_name(self):
        return self.cleaned_data['parent_name'].strip()

    def clean_parent_phone(self):
        phone = self.cleaned_data['parent_phone'].strip()
        validate_phone(phone)
        return phone

    def clean_date_of_birth(self):
        value = self.cleaned_data['date_of_birth']
        validate_date_of_birth(value)
        return value

    def clean(self):
        cleaned = super().clean()
        year = cleaned.get('academic_year')
        classroom = cleaned.get('classroom')
        if year and classroom and classroom.academic_year_id != year.id:
            self.add_error('classroom', 'Choose a division from the selected academic year.')
        return cleaned


class StudentUpdateForm(StudentForm):
    is_active = forms.BooleanField(required=False, label='Active login')
