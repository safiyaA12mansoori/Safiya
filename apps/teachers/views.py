from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods

from apps.academics.models import AcademicYear
from apps.accounts.access import role_required
from apps.accounts.credentials import CREDENTIAL_NOTE, stash_credentials
from apps.accounts.identifiers import set_temporary_password
from apps.accounts.listing import list_context, paginate, search_term
from apps.accounts.models import CustomUser
from apps.audit.models import AuditLog
from apps.audit.utils import record_audit

from .forms import TeacherForm, TeacherUpdateForm
from .models import Teacher
from .services import create_teacher, update_teacher


def _teachers():
    return (
        Teacher.objects.select_related('user')
        .annotate(assignment_count=Count('assignments'))
        .order_by('teacher_id')
    )


@role_required(CustomUser.Role.PRINCIPAL)
def teacher_list(request):
    query = search_term(request)
    teachers = _teachers()
    if query:
        teachers = teachers.filter(
            Q(teacher_id__icontains=query)
            | Q(phone__icontains=query)
            | Q(user__first_name__icontains=query)
            | Q(user__last_name__icontains=query)
        )
    page = paginate(request, teachers)
    return render(
        request,
        'admin/teachers/list.html',
        list_context(request, page, search_placeholder='Search name, teacher ID, or phone'),
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def teacher_create(request):
    form = TeacherForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        try:
            teacher, password = create_teacher(**form.cleaned_data, request=request)
        except ValidationError as exc:
            form.add_error(None, exc.messages)
        except IntegrityError:
            form.add_error(None, 'Could not save this teacher because it conflicts with an existing record.')
        else:
            stash_credentials(
                request,
                title='Teacher login created',
                username=teacher.user.username,
                password=password,
                note=CREDENTIAL_NOTE,
            )
            messages.success(
                request,
                f'{teacher.user.get_full_name()} was added. Share the temporary password now.',
            )
            return redirect('teacher-detail', pk=teacher.pk)
    return render(
        request,
        'admin/simple_form.html',
        {
            'form': form,
            'title': 'Add teacher',
            'subtitle': 'A teacher ID and temporary password are generated when you save.',
            'cancel_url': reverse('teacher-list'),
            'submit_label': 'Save teacher',
        },
    )


@role_required(CustomUser.Role.PRINCIPAL)
def teacher_detail(request, pk):
    teacher = get_object_or_404(_teachers(), pk=pk)
    assignments = teacher.assignments.select_related(
        'classroom__grade_level', 'classroom__academic_year', 'subject', 'academic_year'
    )
    class_teacher_of = teacher.class_teacher_of.select_related('grade_level', 'academic_year')
    return render(
        request,
        'admin/teachers/detail.html',
        {'teacher': teacher, 'assignments': assignments, 'class_teacher_of': class_teacher_of},
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def teacher_edit(request, pk):
    teacher = get_object_or_404(Teacher.objects.select_related('user'), pk=pk)
    initial = None
    if request.method != 'POST':
        initial = {
            'first_name': teacher.user.first_name,
            'last_name': teacher.user.last_name,
            'email': teacher.user.email,
            'phone': teacher.phone,
            'qualification': teacher.qualification,
            'joined_on': teacher.joined_on,
            'is_active': teacher.user.is_active,
        }
    form = TeacherUpdateForm(request.POST or None, initial=initial)
    if request.method == 'POST' and form.is_valid():
        try:
            update_teacher(teacher, **form.cleaned_data, request=request)
        except ValidationError as exc:
            form.add_error(None, exc.messages)
        except IntegrityError:
            form.add_error(None, 'Could not save this teacher because it conflicts with an existing record.')
        else:
            messages.success(request, f'{teacher.user.get_full_name()} was updated.')
            return redirect('teacher-detail', pk=teacher.pk)
    return render(
        request,
        'admin/simple_form.html',
        {
            'form': form,
            'title': f'Edit {teacher.user.get_full_name()}',
            'subtitle': f'{teacher.teacher_id}. The teacher ID stays the same.',
            'cancel_url': reverse('teacher-detail', args=[teacher.pk]),
            'submit_label': 'Save teacher',
        },
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def teacher_delete(request, pk):
    teacher = get_object_or_404(Teacher.objects.select_related('user'), pk=pk)
    if request.method == 'POST':
        label = str(teacher)
        with transaction.atomic():
            record_audit(request, AuditLog.Action.DELETE, teacher, {'teacher_id': teacher.teacher_id})
            teacher.user.delete()
        messages.success(request, f'{label} was deleted.')
        return redirect('teacher-list')
    return render(
        request,
        'admin/confirm_delete.html',
        {
            'title': 'Delete teacher',
            'message': f'Delete {teacher}, their login, and their allocations? This cannot be undone.',
            'confirm_label': 'Delete teacher',
            'cancel_url': reverse('teacher-detail', args=[teacher.pk]),
        },
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def teacher_reset_password(request, pk):
    teacher = get_object_or_404(Teacher.objects.select_related('user'), pk=pk)
    if request.method == 'POST':
        password = set_temporary_password(teacher.user)
        record_audit(request, AuditLog.Action.UPDATE, teacher, {'password': 'reset'})
        stash_credentials(
            request,
            title='Temporary password reset',
            username=teacher.user.username,
            password=password,
            note=CREDENTIAL_NOTE,
        )
        messages.success(request, 'A new temporary password was created and is shown once below.')
        return redirect('teacher-detail', pk=teacher.pk)
    return render(
        request,
        'admin/confirm_delete.html',
        {
            'title': 'Reset teacher password',
            'message': f'Generate a new temporary password for {teacher}? The current password will stop working.',
            'confirm_label': 'Generate password',
            'tone': 'primary',
            'cancel_url': reverse('teacher-detail', args=[teacher.pk]),
        },
    )


def _portal_teacher(user):
    try:
        teacher = user.teacher
    except ObjectDoesNotExist:
        return None, [], []
    current = AcademicYear.objects.filter(is_current=True).first()
    assignments = []
    class_teacher_of = []
    if current is not None:
        assignments = list(
            teacher.assignments.filter(academic_year=current)
            .select_related('classroom__grade_level', 'subject', 'academic_year')
            .order_by('classroom__grade_level__number', 'classroom__division', 'subject__name')
        )
        class_teacher_of = list(
            teacher.class_teacher_of.filter(academic_year=current).select_related('grade_level')
        )
    return teacher, assignments, class_teacher_of


@role_required(CustomUser.Role.TEACHER)
def teacher_dashboard(request):
    teacher, assignments, class_teacher_of = _portal_teacher(request.user)
    return render(
        request,
        'teacher/dashboard.html',
        {'teacher': teacher, 'assignments': assignments, 'class_teacher_of': class_teacher_of},
    )


@role_required(CustomUser.Role.TEACHER)
def teacher_profile(request):
    teacher, assignments, class_teacher_of = _portal_teacher(request.user)
    return render(
        request,
        'teacher/profile.html',
        {'teacher': teacher, 'assignments': assignments, 'class_teacher_of': class_teacher_of},
    )
