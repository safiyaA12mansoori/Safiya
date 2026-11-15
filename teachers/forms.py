from django import forms

from academics.models import ClassRoom, Subject
from accounts.models import User
from core.forms import StyledFormMixin
from core.validators import validate_image

from .models import TeacherAssignment, TeacherProfile


class TeacherForm(StyledFormMixin, forms.Form):
    username = forms.CharField(max_length=150)
    first_name = forms.CharField(max_length=150)
    last_name = forms.CharField(max_length=150)
    email = forms.EmailField()
    phone = forms.CharField(max_length=20, required=False)
    password = forms.CharField(widget=forms.PasswordInput, required=False)
    photo = forms.ImageField(required=False, validators=[validate_image])
    employee_id = forms.CharField(max_length=30)
    department = forms.ModelChoiceField(queryset=None)
    designation = forms.CharField(max_length=120, initial="Assistant Professor")
    qualification = forms.CharField(max_length=160, required=False)
    joining_date = forms.DateField(required=False, widget=forms.DateInput(attrs={"type": "date"}))

    def __init__(self, *args, profile=None, **kwargs):
        from academics.models import Department

        self.profile = profile
        super().__init__(*args, **kwargs)
        self.fields["department"].queryset = Department.objects.all()
        if profile:
            user = profile.user
            self.initial.update(
                {
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "phone": user.phone,
                    "employee_id": profile.employee_id,
                    "department": profile.department_id,
                    "designation": profile.designation,
                    "qualification": profile.qualification,
                    "joining_date": profile.joining_date,
                }
            )

    def clean(self):
        data = super().clean()
        users = User.objects.all()
        profiles = TeacherProfile.objects.all()
        if self.profile:
            users = users.exclude(pk=self.profile.user_id)
            profiles = profiles.exclude(pk=self.profile.pk)
        if data.get("username") and users.filter(username__iexact=data["username"]).exists():
            self.add_error("username", "That username is taken.")
        if data.get("email") and users.filter(email__iexact=data["email"]).exists():
            self.add_error("email", "That email is taken.")
        if data.get("employee_id") and profiles.filter(employee_id__iexact=data["employee_id"]).exists():
            self.add_error("employee_id", "Employee ID already exists.")
        if not self.profile and not data.get("password"):
            self.add_error("password", "Set an initial password.")
        return data


class WorkloadForm(StyledFormMixin, forms.Form):
    subject = forms.ModelChoiceField(queryset=Subject.objects.select_related("course"))
    classroom = forms.ModelChoiceField(queryset=ClassRoom.objects.select_related("course", "session"))

    def clean(self):
        data = super().clean()
        subject = data.get("subject")
        classroom = data.get("classroom")
        if subject and classroom and subject.course_id != classroom.course_id:
            self.add_error("classroom", "Pick a class that belongs to the subject's course.")
        return data
