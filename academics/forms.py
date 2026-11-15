from django import forms

from core.forms import StyledModelForm

from .models import AcademicSession, Chapter, ClassRoom, Course, Department, Subject, Topic, Unit


class DepartmentForm(StyledModelForm):
    class Meta:
        model = Department
        fields = ["name", "code"]


class SessionForm(StyledModelForm):
    class Meta:
        model = AcademicSession
        fields = ["name", "start_date", "end_date", "is_current"]
        widgets = {
            "start_date": forms.DateInput(attrs={"type": "date"}),
            "end_date": forms.DateInput(attrs={"type": "date"}),
        }


class CourseForm(StyledModelForm):
    class Meta:
        model = Course
        fields = ["department", "name", "code", "duration_years"]


class ClassRoomForm(StyledModelForm):
    class Meta:
        model = ClassRoom
        fields = ["course", "session", "name", "division", "year"]


class SubjectForm(StyledModelForm):
    class Meta:
        model = Subject
        fields = ["course", "code", "name", "semester", "credits"]


class UnitForm(StyledModelForm):
    class Meta:
        model = Unit
        fields = ["subject", "number", "title"]


class ChapterForm(StyledModelForm):
    class Meta:
        model = Chapter
        fields = ["unit", "number", "title"]


class TopicForm(StyledModelForm):
    class Meta:
        model = Topic
        fields = ["chapter", "number", "title", "is_completed"]
