from django import forms
from django.contrib.auth.forms import AuthenticationForm, PasswordChangeForm

from .models import UserProfile
from .validators import validate_phone


def _merge_class(existing, addition):
    parts = [part for part in (existing or '').split() if part and part != addition]
    parts.append(addition)
    return ' '.join(parts)


class BootstrapFormMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            widget = field.widget
            if isinstance(widget, forms.CheckboxInput):
                css = 'form-check-input'
            elif isinstance(widget, forms.Select):
                css = 'form-select'
            else:
                css = 'form-control'
            widget.attrs['class'] = _merge_class(widget.attrs.get('class'), css)
            if field.required and not isinstance(widget, forms.CheckboxInput):
                widget.attrs.setdefault('required', 'required')


class LoginForm(BootstrapFormMixin, AuthenticationForm):
    def __init__(self, request=None, *args, **kwargs):
        super().__init__(request, *args, **kwargs)
        self.fields['username'].widget.attrs.setdefault('autocomplete', 'username')
        self.fields['username'].widget.attrs.setdefault('autofocus', 'autofocus')
        self.fields['password'].widget.attrs.setdefault('autocomplete', 'current-password')


class BootstrapPasswordChangeForm(BootstrapFormMixin, PasswordChangeForm):
    pass


class ProfileContactForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ['phone', 'address']
        labels = {
            'phone': 'Personal phone',
            'address': 'Home address',
        }
        widgets = {
            'address': forms.Textarea(attrs={'rows': 3}),
        }

    def clean_phone(self):
        phone = (self.cleaned_data.get('phone') or '').strip()
        if phone:
            validate_phone(phone)
        return phone
