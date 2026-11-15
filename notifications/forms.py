from django import forms

from core.forms import StyledModelForm

from .models import Announcement


class AnnouncementForm(StyledModelForm):
    class Meta:
        model = Announcement
        fields = ["title", "body", "audience", "classroom", "is_active"]
        widgets = {"body": forms.Textarea(attrs={"rows": 4})}

    def clean(self):
        data = super().clean()
        if data.get("audience") == Announcement.Audience.CLASS and not data.get("classroom"):
            self.add_error("classroom", "Choose a class.")
        return data
