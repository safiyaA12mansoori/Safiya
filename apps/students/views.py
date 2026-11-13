from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Prefetch, Q
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

from .forms import StudentForm, StudentUpdateForm
from .models import Student, StudentEnrollment
from .services import create_student, update_student


def _students():
    return Student.objects.select_related('user').prefetch_related(
        Prefetch(
            'enrollments',
            queryset=StudentEnrollment.objects.select_related('classroom__grade_level', 'academic_year'),
        )
    )


def _student_notice():
    from apps.academics.models import ClassRoom

    if not AcademicYear.objects.exists():
        return {
            'notice': 'Create an academic year before adding students.',
            'notice_url': reverse('year-create'),
            'notice_label': 'Add an academic year',
        }
    if not ClassRoom.objects.exists():
        return {
            'notice': 'Create a class and division before adding students.',
            'notice_url': reverse('class-create'),
            'notice_label': 'Add a class',
        }
    return {}


def _render_form(request, form, title, cancel_url, subtitle):
    context = {
        'form': form,
        'title': title,
        'subtitle': subtitle,
        'cancel_url': cancel_url,
        'submit_label': 'Save student',
    }
    context.update(_student_notice())
    return render(request, 'admin/simple_form.html', context)


@role_required(CustomUser.Role.PRINCIPAL)
def student_list(request):
    query = search_term(request)
    students = _students()
    if query:
        students = students.filter(
            Q(student_id__icontains=query)
            | Q(admission_number__icontains=query)
            | Q(user__first_name__icontains=query)
            | Q(user__last_name__icontains=query)
            | Q(parent_name__icontains=query)
        )
    page = paginate(request, students)
    return render(
        request,
        'admin/students/list.html',
        list_context(request, page, search_placeholder='Search name, student ID, or admission number'),
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def student_create(request):
    form = StudentForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        try:
            student, password = create_student(**form.cleaned_data, request=request)
        except ValidationError as exc:
            form.add_error(None, exc.messages)
        except IntegrityError:
            form.add_error(None, 'Could not save this student because it conflicts with an existing record.')
        else:
            stash_credentials(
                request,
                title='Student login created',
                username=student.user.username,
                password=password,
                note=CREDENTIAL_NOTE,
            )
            messages.success(
                request,
                f'{student.user.get_full_name()} was added. Share the temporary password now.',
            )
            return redirect('student-detail', pk=student.pk)
    return _render_form(
        request,
        form,
        'Add student',
        reverse('student-list'),
        'A student ID, admission number, and temporary password are generated when you save.',
    )


@role_required(CustomUser.Role.PRINCIPAL)
def student_detail(request, pk):
    student = get_object_or_404(_students(), pk=pk)
    return render(request, 'admin/students/detail.html', {'student': student})


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def student_edit(request, pk):
    student = get_object_or_404(_students(), pk=pk)
    initial = None
    if request.method != 'POST':
        enrollment = student.current_enrollment()
        initial = {
            'first_name': student.user.first_name,
            'last_name': student.user.last_name,
            'date_of_birth': student.date_of_birth,
            'gender': student.gender,
            'address': student.address,
            'parent_name': student.parent_name,
            'parent_phone': student.parent_phone,
            'academic_year': enrollment.academic_year_id if enrollment else None,
            'classroom': enrollment.classroom_id if enrollment else None,
            'is_active': student.user.is_active,
        }
    form = StudentUpdateForm(request.POST or None, initial=initial)
    if request.method == 'POST' and form.is_valid():
        try:
            update_student(student, **form.cleaned_data, request=request)
        except ValidationError as exc:
            form.add_error(None, exc.messages)
        except IntegrityError:
            form.add_error(None, 'Could not save this student because it conflicts with an existing record.')
        else:
            messages.success(request, f'{student.user.get_full_name()} was updated.')
            return redirect('student-detail', pk=student.pk)
    return _render_form(
        request,
        form,
        f'Edit {student.user.get_full_name()}',
        reverse('student-detail', args=[student.pk]),
        f'{student.student_id} · {student.admission_number}. IDs stay the same.',
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def student_delete(request, pk):
    student = get_object_or_404(Student.objects.select_related('user'), pk=pk)
    if request.method == 'POST':
        label = str(student)
        with transaction.atomic():
            record_audit(request, AuditLog.Action.DELETE, student, {'student_id': student.student_id})
            student.user.delete()
        messages.success(request, f'{label} was deleted.')
        return redirect('student-list')
    return render(
        request,
        'admin/confirm_delete.html',
        {
            'title': 'Delete student',
            'message': f'Delete {student} and their login? This cannot be undone.',
            'confirm_label': 'Delete student',
            'cancel_url': reverse('student-detail', args=[student.pk]),
        },
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def student_reset_password(request, pk):
    student = get_object_or_404(Student.objects.select_related('user'), pk=pk)
    if request.method == 'POST':
        password = set_temporary_password(student.user)
        record_audit(request, AuditLog.Action.UPDATE, student, {'password': 'reset'})
        stash_credentials(
            request,
            title='Temporary password reset',
            username=student.user.username,
            password=password,
            note=CREDENTIAL_NOTE,
        )
        messages.success(request, 'A new temporary password was created and is shown once below.')
        return redirect('student-detail', pk=student.pk)
    return render(
        request,
        'admin/confirm_delete.html',
        {
            'title': 'Reset student password',
            'message': f'Generate a new temporary password for {student}? The current password will stop working.',
            'confirm_label': 'Generate password',
            'tone': 'primary',
            'cancel_url': reverse('student-detail', args=[student.pk]),
        },
    )


def _portal_student(user):
    try:
        student = user.student
    except ObjectDoesNotExist:
        return None, None
    enrollment = (
        student.enrollments.filter(academic_year__is_current=True)
        .select_related('classroom__grade_level', 'academic_year')
        .first()
    )
    return student, enrollment


@role_required(CustomUser.Role.STUDENT)
def student_dashboard(request):
    student, enrollment = _portal_student(request.user)
    return render(
        request,
        'student/dashboard.html',
        {'student': student, 'enrollment': enrollment},
    )


@role_required(CustomUser.Role.STUDENT)
def student_profile(request):
    student, enrollment = _portal_student(request.user)
    enrollments = []
    if student is not None:
        enrollments = student.enrollments.select_related('classroom__grade_level', 'academic_year')
    return render(
        request,
        'student/profile.html',
        {'student': student, 'enrollment': enrollment, 'enrollments': enrollments},
    )
