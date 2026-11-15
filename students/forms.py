from django import forms

from academics.models import ClassRoom, Course
from accounts.models import User
from core.forms import StyledFormMixin
from core.validators import validate_image

from .models import StudentProfile


class StudentForm(StyledFormMixin, forms.Form):
    username = forms.CharField(max_length=150)
    first_name = forms.CharField(max_length=150)
    last_name = forms.CharField(max_length=150)
    email = forms.EmailField()
    phone = forms.CharField(max_length=20, required=False)
    password = forms.CharField(widget=forms.PasswordInput, required=False, help_text="Leave blank to keep the current password.")
    photo = forms.ImageField(required=False, validators=[validate_image])
    admission_number = forms.CharField(max_length=30)
    student_id = forms.CharField(max_length=30)
    department = forms.ModelChoiceField(queryset=None)
    course = forms.ModelChoiceField(queryset=Course.objects.none())
    classroom = forms.ModelChoiceField(queryset=ClassRoom.objects.none())
    academic_year = forms.IntegerField(min_value=1, max_value=6)
    guardian_name = forms.CharField(max_length=120, required=False)
    guardian_phone = forms.CharField(max_length=20, required=False)
    address = forms.CharField(widget=forms.Textarea(attrs={"rows": 2}), required=False)
    city = forms.CharField(max_length=80, required=False)
    date_of_birth = forms.DateField(required=False, widget=forms.DateInput(attrs={"type": "date"}))
    gender = forms.ChoiceField(choices=[("", "—")] + list(StudentProfile.Gender.choices), required=False)

    def __init__(self, *args, profile=None, **kwargs):
        from academics.models import Department

        self.profile = profile
        super().__init__(*args, **kwargs)
        self.fields["department"].queryset = Department.objects.all()
        self.fields["course"].queryset = Course.objects.select_related("department")
        self.fields["classroom"].queryset = ClassRoom.objects.select_related("course", "session")
        if profile:
            user = profile.user
            self.fields["username"].initial = user.username
            self.fields["first_name"].initial = user.first_name
            self.fields["last_name"].initial = user.last_name
            self.fields["email"].initial = user.email
            self.fields["phone"].initial = user.phone
            self.fields["admission_number"].initial = profile.admission_number
            self.fields["student_id"].initial = profile.student_id
            self.fields["department"].initial = profile.department_id
            self.fields["course"].initial = profile.course_id
            self.fields["classroom"].initial = profile.classroom_id
            self.fields["academic_year"].initial = profile.academic_year
            self.fields["guardian_name"].initial = profile.guardian_name
            self.fields["guardian_phone"].initial = profile.guardian_phone
            self.fields["address"].initial = profile.address
            self.fields["city"].initial = profile.city
            self.fields["date_of_birth"].initial = profile.date_of_birth
            self.fields["gender"].initial = profile.gender

    def clean(self):
        data = super().clean()
        course = data.get("course")
        department = data.get("department")
        classroom = data.get("classroom")
        if course and department and course.department_id != department.id:
            self.add_error("course", "That course is not in the selected department.")
        if classroom and course and classroom.course_id != course.id:
            self.add_error("classroom", "That class is not part of the selected course.")
        username = data.get("username")
        email = (data.get("email") or "").lower()
        users = User.objects.all()
        if self.profile:
            users = users.exclude(pk=self.profile.user_id)
        if username and users.filter(username__iexact=username).exists():
            self.add_error("username", "That username is taken.")
        if email and users.filter(email__iexact=email).exists():
            self.add_error("email", "That email is taken.")
        profiles = StudentProfile.objects.all()
        if self.profile:
            profiles = profiles.exclude(pk=self.profile.pk)
        if data.get("admission_number") and profiles.filter(admission_number__iexact=data["admission_number"]).exists():
            self.add_error("admission_number", "Admission number already exists.")
        if data.get("student_id") and profiles.filter(student_id__iexact=data["student_id"]).exists():
            self.add_error("student_id", "Student ID already exists.")
        if not self.profile and not data.get("password"):
            self.add_error("password", "Set an initial password.")
        return data
