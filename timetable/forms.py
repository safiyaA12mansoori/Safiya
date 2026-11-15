from django import forms

from core.forms import StyledModelForm

from .models import Timetable


class SlotForm(StyledModelForm):
    class Meta:
        model = Timetable
        fields = ["session", "classroom", "subject", "teacher", "room", "day_of_week", "period", "start_time", "end_time"]
        widgets = {
            "start_time": forms.TimeInput(attrs={"type": "time"}),
            "end_time": forms.TimeInput(attrs={"type": "time"}),
        }

    def __init__(self, *args, teacher=None, **kwargs):
        super().__init__(*args, **kwargs)
        if teacher is not None:
            pairs = teacher.assignments.all()
            self.fields["classroom"].queryset = self.fields["classroom"].queryset.filter(id__in=pairs.values("classroom_id"))
            self.fields["subject"].queryset = self.fields["subject"].queryset.filter(id__in=pairs.values("subject_id"))
            self.fields["teacher"].queryset = self.fields["teacher"].queryset.filter(pk=teacher.pk)
            self.fields["teacher"].initial = teacher.pk
