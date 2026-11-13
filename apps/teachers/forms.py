from django import forms

from apps.accounts.forms import BootstrapFormMixin
from apps.accounts.validators import validate_joined_on, validate_phone


class TeacherForm(BootstrapFormMixin, forms.Form):
    first_name = forms.CharField(max_length=150)
    last_name = forms.CharField(max_length=150)
    email = forms.EmailField(required=False)
    phone = forms.CharField(max_length=20, label='School phone')
    qualification = forms.CharField(max_length=120, required=False)
    joined_on = forms.DateField(
        label='Joined on',
        widget=forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'),
        input_formats=['%Y-%m-%d'],
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['phone'].widget.attrs.update({
            'pattern': r'\+?[0-9][0-9\s\-]{6,18}',
            'title': 'Use digits, spaces, or hyphens. You may start with +.',
            'inputmode': 'tel',
        })
        self.fields['email'].widget.attrs['autocomplete'] = 'email'
        self.fields['first_name'].widget.attrs['autocomplete'] = 'given-name'
        self.fields['last_name'].widget.attrs['autocomplete'] = 'family-name'

    def clean_first_name(self):
        return self.cleaned_data['first_name'].strip()

    def clean_last_name(self):
        return self.cleaned_data['last_name'].strip()

    def clean_phone(self):
        phone = self.cleaned_data['phone'].strip()
        validate_phone(phone)
        return phone

    def clean_email(self):
        return (self.cleaned_data.get('email') or '').strip()

    def clean_qualification(self):
        return (self.cleaned_data.get('qualification') or '').strip()

    def clean_joined_on(self):
        value = self.cleaned_data['joined_on']
        validate_joined_on(value)
        return value


class TeacherUpdateForm(TeacherForm):
    is_active = forms.BooleanField(required=False, label='Active login')
