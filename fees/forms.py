from django import forms

from core.forms import StyledModelForm

from .models import FeeStructure, Payment, StudentFee


class StructureForm(StyledModelForm):
    class Meta:
        model = FeeStructure
        fields = ["course", "session", "name", "amount", "due_date"]
        widgets = {"due_date": forms.DateInput(attrs={"type": "date"})}


class PaymentForm(forms.Form):
    student_fee = forms.ModelChoiceField(queryset=StudentFee.objects.none(), widget=forms.Select(attrs={"class": "form-select"}))
    amount = forms.DecimalField(min_value=0.01, decimal_places=2, max_digits=10, widget=forms.NumberInput(attrs={"class": "form-control"}))
    method = forms.ChoiceField(choices=Payment.Method.choices, widget=forms.Select(attrs={"class": "form-select"}))
    reference = forms.CharField(required=False, widget=forms.TextInput(attrs={"class": "form-control"}))
    paid_on = forms.DateField(widget=forms.DateInput(attrs={"type": "date", "class": "form-control"}))

    def __init__(self, *args, queryset=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["student_fee"].queryset = queryset if queryset is not None else StudentFee.objects.none()
