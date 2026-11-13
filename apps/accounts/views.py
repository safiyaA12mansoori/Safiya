from django.contrib import messages
from django.contrib.auth import login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods, require_POST

from apps.academics.models import AcademicYear, ClassRoom, Subject
from apps.audit.models import AuditLog
from apps.audit.utils import record_audit
from apps.students.models import Student
from apps.teachers.models import Teacher, TeacherAssignment

from .access import home_url_name, role_required
from .forms import BootstrapPasswordChangeForm, LoginForm, ProfileContactForm
from .models import CustomUser, UserProfile
from .rate_limit import clear_failures, is_rate_limited, register_failure

RATE_LIMIT_MESSAGE = 'Too many login attempts. Try again in 15 minutes.'


@require_http_methods(['GET', 'POST'])
def login_view(request):
    if request.user.is_authenticated:
        return redirect(home_url_name(request.user))
    form = LoginForm(request, data=request.POST or None)
    if request.method == 'POST':
        username = request.POST.get('username', '')
        if is_rate_limited(request, username):
            form.add_error(None, RATE_LIMIT_MESSAGE)
            return render(request, 'auth/login.html', {'form': form}, status=429)
        if form.is_valid():
            clear_failures(request, username)
            login(request, form.get_user())
            return redirect(home_url_name(form.get_user()))
        register_failure(request, username)
        if is_rate_limited(request, username):
            form.add_error(None, RATE_LIMIT_MESSAGE)
            return render(request, 'auth/login.html', {'form': form}, status=429)
        return render(request, 'auth/login.html', {'form': form})
    return render(request, 'auth/login.html', {'form': form})


@require_POST
def logout_view(request):
    logout(request)
    messages.success(request, 'You have logged out.')
    return redirect('login')


@login_required
def dashboard_redirect(request):
    return redirect(home_url_name(request.user))


@login_required
@require_http_methods(['GET', 'POST'])
def account_view(request):
    templates = {
        CustomUser.Role.PRINCIPAL: 'auth/account_principal.html',
        CustomUser.Role.TEACHER: 'auth/account_teacher.html',
        CustomUser.Role.STUDENT: 'auth/account_student.html',
    }
    template = templates.get(request.user.role)
    if template is None:
        raise PermissionDenied
    profile, _created = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'POST' and request.POST.get('form') == 'profile':
        profile_form = ProfileContactForm(request.POST, instance=profile)
        password_form = BootstrapPasswordChangeForm(user=request.user)
        if profile_form.is_valid():
            profile_form.save()
            if profile_form.changed_data:
                record_audit(
                    request,
                    AuditLog.Action.UPDATE,
                    profile,
                    {name: profile_form.cleaned_data.get(name) for name in profile_form.changed_data},
                )
            messages.success(request, 'Contact details saved.')
            return redirect('account')
    elif request.method == 'POST' and request.POST.get('form') == 'password':
        profile_form = ProfileContactForm(instance=profile)
        password_form = BootstrapPasswordChangeForm(user=request.user, data=request.POST)
        if password_form.is_valid():
            password_form.save()
            update_session_auth_hash(request, password_form.user)
            record_audit(request, AuditLog.Action.UPDATE, request.user, {'password': 'changed'})
            messages.success(request, 'Password changed.')
            return redirect('account')
    else:
        profile_form = ProfileContactForm(instance=profile)
        password_form = BootstrapPasswordChangeForm(user=request.user)
    return render(
        request,
        template,
        {'profile_form': profile_form, 'password_form': password_form},
    )


@role_required(CustomUser.Role.PRINCIPAL)
def principal_dashboard(request):
    current = AcademicYear.objects.filter(is_current=True).first()
    class_count = ClassRoom.objects.filter(academic_year=current).count() if current else 0
    return render(
        request,
        'admin/dashboard.html',
        {
            'current_year': current,
            'student_count': Student.objects.count(),
            'teacher_count': Teacher.objects.count(),
            'class_count': class_count,
            'subject_count': Subject.objects.count(),
            'allocation_count': (
                TeacherAssignment.objects.filter(academic_year=current).count() if current else 0
            ),
            'recent_audits': AuditLog.objects.select_related('actor')[:8],
        },
    )
