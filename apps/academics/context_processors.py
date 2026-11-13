def current_academic_year(request):
    user = getattr(request, 'user', None)
    if user is None or not user.is_authenticated:
        return {'current_academic_year': None}
    from .models import AcademicYear

    return {'current_academic_year': AcademicYear.objects.filter(is_current=True).first()}
