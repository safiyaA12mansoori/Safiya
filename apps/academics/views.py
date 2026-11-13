from django.contrib import messages
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods, require_POST

from apps.accounts.access import role_required
from apps.accounts.deletion import delete_record
from apps.accounts.listing import list_context, paginate, search_term
from apps.accounts.models import CustomUser
from apps.audit.models import AuditLog
from apps.audit.utils import audit_saved_form, record_audit

from .forms import (
    AcademicYearForm,
    AddClassSubjectForm,
    ClassRoomForm,
    SubjectForm,
    TeacherAssignmentForm,
)
from .models import AcademicYear, ClassRoom, ClassSubject, Subject
from apps.teachers.models import TeacherAssignment


def _form_page(request, form, title, cancel_url, subtitle='', submit_label='Save'):
    return render(
        request,
        'admin/simple_form.html',
        {
            'form': form,
            'title': title,
            'subtitle': subtitle,
            'cancel_url': cancel_url,
            'submit_label': submit_label,
        },
    )


def _confirm(request, title, message, cancel_url, confirm_label='Delete'):
    return render(
        request,
        'admin/confirm_delete.html',
        {
            'title': title,
            'message': message,
            'cancel_url': cancel_url,
            'confirm_label': confirm_label,
        },
    )


@role_required(CustomUser.Role.PRINCIPAL)
def year_list(request):
    query = search_term(request)
    years = AcademicYear.objects.all()
    if query:
        years = years.filter(name__icontains=query)
    page = paginate(request, years)
    return render(
        request,
        'admin/years/list.html',
        list_context(request, page, search_placeholder='Search academic year'),
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def year_create(request):
    form = AcademicYearForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        year = form.save()
        audit_saved_form(request, form, year, created=True)
        messages.success(request, f'Academic year {year.name} was added.')
        return redirect('year-list')
    return _form_page(request, form, 'Add academic year', reverse('year-list'), submit_label='Save year')


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def year_edit(request, pk):
    year = get_object_or_404(AcademicYear, pk=pk)
    form = AcademicYearForm(request.POST or None, instance=year)
    if request.method == 'POST' and form.is_valid():
        year = form.save()
        audit_saved_form(request, form, year, created=False)
        messages.success(request, f'Academic year {year.name} was updated.')
        return redirect('year-list')
    return _form_page(
        request,
        form,
        f'Edit {year.name}',
        reverse('year-list'),
        submit_label='Save year',
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def year_delete(request, pk):
    year = get_object_or_404(AcademicYear, pk=pk)
    if request.method == 'POST':
        return delete_record(
            request,
            year,
            success_url=reverse('year-list'),
            blocked_url=reverse('year-list'),
            success_message=f'{year.name} was deleted.',
            blocked_message='This academic year cannot be deleted because classes or enrollments still use it.',
        )
    return _confirm(
        request,
        'Delete academic year',
        f'Delete {year.name}? This cannot be undone.',
        reverse('year-list'),
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_POST
def year_set_current(request, pk):
    year = get_object_or_404(AcademicYear, pk=pk)
    year.is_current = True
    year.save(update_fields=['is_current', 'updated_at'])
    record_audit(request, AuditLog.Action.UPDATE, year, {'is_current': True})
    messages.success(request, f'{year.name} is now the current academic year.')
    return redirect('year-list')


@role_required(CustomUser.Role.PRINCIPAL)
def class_list(request):
    query = search_term(request)
    rooms = (
        ClassRoom.objects.select_related('grade_level', 'academic_year')
        .annotate(student_count=Count('enrollments'))
        .order_by('-academic_year__start_date', 'grade_level__number', 'division')
    )
    if query:
        rooms = rooms.filter(
            Q(division__icontains=query)
            | Q(grade_level__name__icontains=query)
            | Q(academic_year__name__icontains=query)
        )
    page = paginate(request, rooms)
    return render(
        request,
        'admin/classes/list.html',
        list_context(request, page, search_placeholder='Search class, division, or year'),
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def class_create(request):
    form = ClassRoomForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        room = form.save()
        audit_saved_form(request, form, room, created=True)
        messages.success(request, f'{room} was added.')
        return redirect('class-detail', pk=room.pk)
    return _form_page(request, form, 'Add class and division', reverse('class-list'), submit_label='Save class')


@role_required(CustomUser.Role.PRINCIPAL)
def class_detail(request, pk):
    room = get_object_or_404(ClassRoom.objects.select_related('grade_level', 'academic_year'), pk=pk)
    return render(
        request,
        'admin/classes/detail.html',
        {
            'room': room,
            'subjects': room.class_subjects.select_related('subject'),
            'students': room.enrollments.select_related('student__user'),
            'assignments': room.assignments.select_related('teacher__user', 'subject'),
            'subject_form': AddClassSubjectForm(),
        },
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def class_edit(request, pk):
    room = get_object_or_404(ClassRoom.objects.select_related('grade_level', 'academic_year'), pk=pk)
    form = ClassRoomForm(request.POST or None, instance=room)
    if request.method == 'POST' and form.is_valid():
        room = form.save()
        audit_saved_form(request, form, room, created=False)
        messages.success(request, f'{room} was updated.')
        return redirect('class-detail', pk=room.pk)
    return _form_page(
        request,
        form,
        f'Edit {room.label}',
        reverse('class-detail', args=[room.pk]),
        submit_label='Save class',
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def class_delete(request, pk):
    room = get_object_or_404(ClassRoom, pk=pk)
    detail_url = reverse('class-detail', args=[room.pk])
    if request.method == 'POST':
        return delete_record(
            request,
            room,
            success_url=reverse('class-list'),
            blocked_url=detail_url,
            success_message=f'{room} was deleted.',
            blocked_message='This class cannot be deleted because students or teacher allocations are still linked to it.',
        )
    return _confirm(request, 'Delete class', f'Delete {room}? This cannot be undone.', detail_url)


@role_required(CustomUser.Role.PRINCIPAL)
@require_POST
def class_add_subject(request, pk):
    room = get_object_or_404(ClassRoom.objects.select_related('grade_level', 'academic_year'), pk=pk)
    form = AddClassSubjectForm(request.POST)
    if form.is_valid():
        subject = form.cleaned_data['subject']
        link, created = ClassSubject.objects.get_or_create(classroom=room, subject=subject)
        if created:
            record_audit(
                request,
                AuditLog.Action.CREATE,
                link,
                {'classroom': str(room), 'subject': subject.code},
            )
            messages.success(request, f'{subject.name} is now offered in {room.label}.')
        else:
            messages.info(request, f'{subject.name} is already offered in this class.')
    else:
        messages.error(request, 'Choose a subject to add.')
    return redirect('class-detail', pk=room.pk)


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def class_remove_subject(request, pk, subject_pk):
    room = get_object_or_404(ClassRoom.objects.select_related('grade_level', 'academic_year'), pk=pk)
    link = get_object_or_404(
        ClassSubject.objects.select_related('subject'),
        classroom=room,
        subject_id=subject_pk,
    )
    if request.method == 'POST':
        if TeacherAssignment.objects.filter(classroom=room, subject=link.subject).exists():
            messages.error(request, 'Remove the teacher allocation before removing this subject.')
            return redirect('class-detail', pk=room.pk)
        subject_name = link.subject.name
        record_audit(request, AuditLog.Action.DELETE, link, {'subject': link.subject.code})
        link.delete()
        messages.success(request, f'{subject_name} was removed from {room.label}.')
        return redirect('class-detail', pk=room.pk)
    return _confirm(
        request,
        'Remove subject',
        f'Remove {link.subject.name} from {room.label}?',
        reverse('class-detail', args=[room.pk]),
        confirm_label='Remove subject',
    )


@role_required(CustomUser.Role.PRINCIPAL)
def subject_list(request):
    query = search_term(request)
    subjects = Subject.objects.annotate(
        class_count=Count('class_subjects', distinct=True)
    ).order_by('name')
    if query:
        subjects = subjects.filter(Q(name__icontains=query) | Q(code__icontains=query))
    page = paginate(request, subjects)
    return render(
        request,
        'admin/subjects/list.html',
        list_context(request, page, search_placeholder='Search subject name or code'),
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def subject_create(request):
    form = SubjectForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        subject = form.save()
        audit_saved_form(request, form, subject, created=True)
        messages.success(request, f'{subject.name} was added.')
        return redirect('subject-detail', pk=subject.pk)
    return _form_page(request, form, 'Add subject', reverse('subject-list'), submit_label='Save subject')


@role_required(CustomUser.Role.PRINCIPAL)
def subject_detail(request, pk):
    subject = get_object_or_404(Subject, pk=pk)
    return render(
        request,
        'admin/subjects/detail.html',
        {
            'subject': subject,
            'links': subject.class_subjects.select_related('classroom__grade_level', 'classroom__academic_year'),
            'assignments': subject.assignments.select_related('teacher__user', 'classroom__grade_level'),
        },
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def subject_edit(request, pk):
    subject = get_object_or_404(Subject, pk=pk)
    form = SubjectForm(request.POST or None, instance=subject)
    if request.method == 'POST' and form.is_valid():
        subject = form.save()
        audit_saved_form(request, form, subject, created=False)
        messages.success(request, f'{subject.name} was updated.')
        return redirect('subject-detail', pk=subject.pk)
    return _form_page(
        request,
        form,
        f'Edit {subject.name}',
        reverse('subject-detail', args=[subject.pk]),
        submit_label='Save subject',
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def subject_delete(request, pk):
    subject = get_object_or_404(Subject, pk=pk)
    detail_url = reverse('subject-detail', args=[subject.pk])
    if request.method == 'POST':
        return delete_record(
            request,
            subject,
            success_url=reverse('subject-list'),
            blocked_url=detail_url,
            success_message=f'{subject.name} was deleted.',
            blocked_message='This subject cannot be deleted because a class or teacher allocation still uses it.',
        )
    return _confirm(request, 'Delete subject', f'Delete {subject}? This cannot be undone.', detail_url)


@role_required(CustomUser.Role.PRINCIPAL)
def allocation_list(request):
    query = search_term(request)
    allocations = TeacherAssignment.objects.select_related(
        'teacher__user', 'classroom__grade_level', 'classroom__academic_year', 'subject', 'academic_year'
    )
    if query:
        allocations = allocations.filter(
            Q(teacher__teacher_id__icontains=query)
            | Q(teacher__user__first_name__icontains=query)
            | Q(teacher__user__last_name__icontains=query)
            | Q(subject__name__icontains=query)
            | Q(subject__code__icontains=query)
            | Q(classroom__division__icontains=query)
            | Q(classroom__grade_level__name__icontains=query)
        )
    page = paginate(request, allocations)
    return render(
        request,
        'admin/allocations/list.html',
        list_context(request, page, search_placeholder='Search teacher, subject, or class'),
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def allocation_create(request):
    form = TeacherAssignmentForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        assignment = form.save()
        ClassSubject.objects.get_or_create(classroom=assignment.classroom, subject=assignment.subject)
        audit_saved_form(request, form, assignment, created=True)
        messages.success(request, 'Teacher allocation saved.')
        return redirect('allocation-list')
    return _form_page(
        request,
        form,
        'Allocate a teacher',
        reverse('allocation-list'),
        subtitle='Choose the year, class, subject, and teacher.',
        submit_label='Save allocation',
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def allocation_edit(request, pk):
    assignment = get_object_or_404(TeacherAssignment, pk=pk)
    form = TeacherAssignmentForm(request.POST or None, instance=assignment)
    if request.method == 'POST' and form.is_valid():
        assignment = form.save()
        ClassSubject.objects.get_or_create(classroom=assignment.classroom, subject=assignment.subject)
        audit_saved_form(request, form, assignment, created=False)
        messages.success(request, 'Teacher allocation updated.')
        return redirect('allocation-list')
    return _form_page(
        request,
        form,
        'Edit allocation',
        reverse('allocation-list'),
        submit_label='Save allocation',
    )


@role_required(CustomUser.Role.PRINCIPAL)
@require_http_methods(['GET', 'POST'])
def allocation_delete(request, pk):
    assignment = get_object_or_404(
        TeacherAssignment.objects.select_related('teacher', 'subject', 'classroom'),
        pk=pk,
    )
    if request.method == 'POST':
        return delete_record(
            request,
            assignment,
            success_url=reverse('allocation-list'),
            blocked_url=reverse('allocation-list'),
            success_message='Teacher allocation was deleted.',
            blocked_message='This allocation cannot be deleted.',
        )
    return _confirm(
        request,
        'Remove allocation',
        f'Remove {assignment.teacher} from {assignment.subject.name} in {assignment.classroom}?',
        reverse('allocation-list'),
        confirm_label='Remove allocation',
    )
