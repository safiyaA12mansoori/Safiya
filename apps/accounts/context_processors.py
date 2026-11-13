from django.conf import settings


def shell(request):
    reveal = None
    session = getattr(request, 'session', None)
    if session is not None and 'credential_reveal' in session:
        reveal = session.pop('credential_reveal')
    return {
        'school_name': settings.SCHOOL_NAME,
        'credential_reveal': reveal,
    }
