import re

from django import forms
from django.core.exceptions import ValidationError

from apps.accounts.forms import BootstrapFormMixin
from apps.teachers.models import Teacher, TeacherAssignment

from .models import AcademicYear, ClassRoom, GradeLevel, Subject
from .widgets import ClassroomSelect


def bind_classroom_years(field):
    mapping = {str(room.pk): room.academic_year_id for room in field.queryset}
    attrs = field.widget.attrs.copy()
    attrs['class'] = attrs.get('class', 'form-select')
    attrs['data-year-select'] = 'id_academic_year'
    widget = ClassroomSelect(year_for=mapping, attrs=attrs)
    widget.choices = field.choices
    field.widget = widget


class AcademicYearForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = AcademicYear
        fields = ['name', 'start_date', 'end_date', 'is_current']
        widgets = {
            'start_date': forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'),
            'end_date': forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'),
        }
        help_texts = {
            'name': 'For example, 2026-2027.',
            'is_current': 'Only one academic year can be current. Saving this as current clears the others.',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name in ('start_date', 'end_date'):
            self.fields[name].input_formats = ['%Y-%m-%d']
            self.fields[name].widget.format = '%Y-%m-%d'


class ClassRoomForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = ClassRoom
        fields = ['academic_year', 'grade_level', 'division']
        labels = {'grade_level': 'Class'}
        help_texts = {
            'grade_level': 'Primary 1–5 and Secondary 6–10.',
            'division': '1 to 3 letters or digits, for example A.',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['academic_year'].queryset = AcademicYear.objects.order_by('-start_date')
        self.fields['grade_level'].queryset = GradeLevel.objects.order_by('number')
        self.fields['division'].widget.attrs.update({
            'pattern': '[A-Za-z0-9]{1,3}',
            'maxlength': '3',
            'title': '1 to 3 letters or digits',
        })

    def clean_division(self):
        division = self.cleaned_data['division'].strip().upper()
        if not re.fullmatch(r'[A-Z0-9]{1,3}', division):
            raise ValidationError('Use 1 to 3 letters or digits.')
        return division

    def clean(self):
        cleaned = super().clean()
        year = cleaned.get('academic_year')
        grade = cleaned.get('grade_level')
        division = cleaned.get('division')
        if year and grade and division:
            existing = ClassRoom.objects.filter(
                academic_year=year,
                grade_level=grade,
                division=division,
            )
            if self.instance.pk:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                self.add_error('division', 'That division already exists for this class and academic year.')
        return cleaned


class SubjectForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = Subject
        fields = ['name', 'code', 'description']
        widgets = {'description': forms.Textarea(attrs={'rows': 3})}
        help_texts = {'code': '2 to 10 letters or digits, starting with a letter. For example MATH.'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['code'].widget.attrs.update({
            'pattern': '[A-Za-z][A-Za-z0-9]{1,9}',
            'maxlength': '10',
            'title': 'Start with a letter. Use 2 to 10 letters or digits.',
        })

    def clean_name(self):
        return self.cleaned_data['name'].strip()

    def clean_code(self):
        code = self.cleaned_data['code'].strip().upper()
        if not re.fullmatch(r'[A-Z][A-Z0-9]{1,9}', code):
            raise ValidationError('Use 2 to 10 letters or digits, starting with a letter.')
        return code


class TeacherAssignmentForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = TeacherAssignment
        fields = ['academic_year', 'classroom', 'subject', 'teacher']
        help_texts = {
            'subject': 'Saving also offers this subject in the class if it is not offered yet.',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['academic_year'].queryset = AcademicYear.objects.order_by('-start_date')
        self.fields['classroom'].queryset = (
            ClassRoom.objects.select_related('grade_level', 'academic_year')
            .order_by('-academic_year__start_date', 'grade_level__number', 'division')
        )
        self.fields['subject'].queryset = Subject.objects.order_by('name')
        self.fields['teacher'].queryset = (
            Teacher.objects.select_related('user').order_by('teacher_id')
        )
        bind_classroom_years(self.fields['classroom'])

    def clean(self):
        cleaned = super().clean()
        year = cleaned.get('academic_year')
        classroom = cleaned.get('classroom')
        subject = cleaned.get('subject')
        teacher = cleaned.get('teacher')
        if year and classroom and classroom.academic_year_id != year.id:
            self.add_error('classroom', 'Choose a division from the selected academic year.')
        if year and classroom and subject and teacher:
            existing = TeacherAssignment.objects.filter(
                teacher=teacher,
                classroom=classroom,
                subject=subject,
                academic_year=year,
            )
            if self.instance.pk:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise ValidationError(
                    'This teacher is already allocated to that subject and class for the year.'
                )
        return cleaned


class AddClassSubjectForm(BootstrapFormMixin, forms.Form):
    subject = forms.ModelChoiceField(queryset=Subject.objects.order_by('name'), label='Subject')
