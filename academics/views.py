from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.db import IntegrityError
from django.shortcuts import get_object_or_404, redirect, render

from accounts.models import User
from core.access import role_required, student_profile, teacher_subject_ids
from core.audit import log_action
from core.master import MasterCreateView, MasterDeleteView, MasterListView, MasterUpdateView

from .forms import ChapterForm, ClassRoomForm, CourseForm, DepartmentForm, SessionForm, SubjectForm, TopicForm, UnitForm
from .models import AcademicSession, Chapter, ClassRoom, Course, Department, Subject, Topic, Unit


def _master(model, form, slug, title, headers, columns, search, select=(), parent_param="", parent_field=""):
    class List(MasterListView):
        select_related_fields = select
        search_fields = search

        def get_queryset(self):
            qs = super().get_queryset()
            if parent_param and self.request.GET.get(parent_param):
                qs = qs.filter(**{parent_field: self.request.GET.get(parent_param)})
            return qs

    List.model = model
    List.page_title = title
    List.headers = headers
    List.columns = columns
    List.create_url_name = f"academics:{slug}_create"
    List.edit_url_name = f"academics:{slug}_edit"
    List.delete_url_name = f"academics:{slug}_delete"
    List.__name__ = f"{slug.title()}List"
    singular = {"classes": "class"}.get(slug, title[:-1] if title.endswith("s") else title)

    class Create(MasterCreateView):
        pass

    Create.model = model
    Create.form_class = form
    Create.page_title = f"New {singular}"
    Create.success_url_name = f"academics:{slug}"
    Create.__name__ = f"{slug.title()}Create"

    class Update(MasterUpdateView):
        pass

    Update.model = model
    Update.form_class = form
    Update.page_title = f"Edit {singular}"
    Update.success_url_name = f"academics:{slug}"
    Update.__name__ = f"{slug.title()}Update"

    class Delete(MasterDeleteView):
        pass

    Delete.model = model
    Delete.success_url_name = f"academics:{slug}"
    Delete.__name__ = f"{slug.title()}Delete"
    return List, Create, Update, Delete


DepartmentList, DepartmentCreate, DepartmentUpdate, DepartmentDelete = _master(
    Department, DepartmentForm, "departments", "Departments", ["Code", "Name"], ["code", "name"], ["code", "name"]
)
SessionList, SessionCreate, SessionUpdate, SessionDelete = _master(
    AcademicSession,
    SessionForm,
    "sessions",
    "Sessions",
    ["Name", "Start", "End", "Current"],
    ["name", "start_date", "end_date", "is_current"],
    ["name"],
)
CourseList, CourseCreate, CourseUpdate, CourseDelete = _master(
    Course,
    CourseForm,
    "courses",
    "Courses",
    ["Code", "Name", "Department", "Years"],
    ["code", "name", "department.code", "duration_years"],
    ["code", "name"],
    select=("department",),
)
ClassList, ClassCreate, ClassUpdate, ClassDelete = _master(
    ClassRoom,
    ClassRoomForm,
    "classes",
    "Classes",
    ["Class", "Division", "Year", "Course", "Session"],
    ["name", "division", "year", "course.code", "session.name"],
    ["name", "division"],
    select=("course", "session"),
)


class SubjectList(MasterListView):
    model = Subject
    page_title = "Subjects"
    headers = ["Code", "Name", "Semester", "Course", "Syllabus"]
    columns = ["code", "name", "semester", "course.code", "completion_percent"]
    search_fields = ["code", "name"]
    create_url_name = "academics:subject_create"
    edit_url_name = "academics:subject_edit"
    delete_url_name = "academics:subject_delete"
    open_url_name = "academics:subject_detail"
    open_label = "Syllabus"
    allowed_roles = (User.Role.ADMIN, User.Role.TEACHER, User.Role.STUDENT)
    select_related_fields = ("course",)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == User.Role.TEACHER:
            qs = qs.filter(id__in=teacher_subject_ids(self.request.user))
        elif self.request.user.role == User.Role.STUDENT:
            profile = student_profile(self.request.user)
            qs = qs.filter(course=profile.course) if profile else qs.none()
        return qs

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        if self.request.user.role != User.Role.ADMIN:
            ctx["create_url"] = ""
            for row in ctx["rows"]:
                row["edit_url"] = ""
                row["delete_url"] = ""
        for row, obj in zip(ctx["rows"], ctx["object_list"]):
            row["cells"][-1] = f"{obj.completion_percent()}%"
        return ctx


SubjectCreate = type(
    "SubjectCreate",
    (MasterCreateView,),
    {"model": Subject, "form_class": SubjectForm, "page_title": "New subject", "success_url_name": "academics:subjects"},
)
SubjectUpdate = type(
    "SubjectUpdate",
    (MasterUpdateView,),
    {"model": Subject, "form_class": SubjectForm, "page_title": "Edit subject", "success_url_name": "academics:subjects"},
)
SubjectDelete = type(
    "SubjectDelete", (MasterDeleteView,), {"model": Subject, "success_url_name": "academics:subjects"}
)

UnitList, UnitCreate, UnitUpdate, UnitDelete = _master(
    Unit, UnitForm, "units", "Units", ["Subject", "No.", "Title"], ["subject.code", "number", "title"], ["title"], ("subject",), "subject", "subject_id"
)
ChapterList, ChapterCreate, ChapterUpdate, ChapterDelete = _master(
    Chapter,
    ChapterForm,
    "chapters",
    "Chapters",
    ["Unit", "No.", "Title"],
    ["unit.title", "number", "title"],
    ["title"],
    ("unit", "unit__subject"),
    "unit",
    "unit_id",
)
TopicList, TopicCreate, TopicUpdate, TopicDelete = _master(
    Topic,
    TopicForm,
    "topics",
    "Topics",
    ["Chapter", "No.", "Title", "Done"],
    ["chapter.title", "number", "title", "is_completed"],
    ["title"],
    ("chapter", "chapter__unit"),
    "chapter",
    "chapter_id",
)


def _can_manage_subject(user, subject):
    if user.role == User.Role.ADMIN:
        return True
    if user.role == User.Role.TEACHER:
        return subject.id in teacher_subject_ids(user)
    return False


def _can_view_subject(user, subject):
    if _can_manage_subject(user, subject):
        return True
    profile = student_profile(user)
    return bool(profile and profile.course_id == subject.course_id)


@role_required("ADMIN", "TEACHER", "STUDENT")
def subject_detail(request, pk):
    subject = get_object_or_404(
        Subject.objects.select_related("course"),
        pk=pk,
    )
    if not _can_view_subject(request.user, subject):
        raise PermissionDenied
    can_edit = _can_manage_subject(request.user, subject)
    if request.method == "POST":
        if not can_edit:
            raise PermissionDenied
        action = request.POST.get("action")
        title = request.POST.get("title", "").strip()
        try:
            number = int(request.POST.get("number") or 1)
            if not title:
                raise ValueError
            if action == "unit":
                Unit.objects.create(subject=subject, number=number, title=title)
            elif action == "chapter":
                unit = get_object_or_404(Unit, pk=request.POST.get("unit"), subject=subject)
                Chapter.objects.create(unit=unit, number=number, title=title)
            elif action == "topic":
                chapter = get_object_or_404(Chapter, pk=request.POST.get("chapter"), unit__subject=subject)
                Topic.objects.create(chapter=chapter, number=number, title=title)
            else:
                raise ValueError
            messages.success(request, "Syllabus updated.")
            log_action(request.user, "syllabus", f"Updated {subject.code}", "subject", subject.pk)
        except (IntegrityError, ValueError):
            messages.error(request, "Could not add that row. Check the number is unique and the title is filled in.")
        return redirect("academics:subject_detail", pk=subject.pk)
    units = subject.units.prefetch_related("chapters__topics")
    return render(
        request,
        "academics/subject_detail.html",
        {"subject": subject, "units": units, "can_edit": can_edit, "completion": subject.completion_percent()},
    )


@role_required("ADMIN", "TEACHER")
def toggle_topic(request, pk, topic_id):
    if request.method != "POST":
        return redirect("academics:subject_detail", pk=pk)
    subject = get_object_or_404(Subject, pk=pk)
    if not _can_manage_subject(request.user, subject):
        raise PermissionDenied
    topic = get_object_or_404(Topic, pk=topic_id, chapter__unit__subject=subject)
    topic.is_completed = not topic.is_completed
    topic.save(update_fields=["is_completed", "updated_at"])
    messages.success(request, "Topic completion updated.")
    return redirect("academics:subject_detail", pk=pk)
