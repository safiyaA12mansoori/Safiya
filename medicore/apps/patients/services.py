from apps.patients.models import Patient


def find_duplicate_patients(clinic_id, *, phone=None, email=None, first_name=None, last_name=None, date_of_birth=None, exclude_id=None):
    """
    Duplicate prevention heuristics (clinic-scoped):
    1) same phone
    2) same email (if provided)
    3) same name + DOB
    """
    qs = Patient.objects.filter(clinic_id=clinic_id, is_active=True)
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)

    matches = Patient.objects.none()
    if phone:
        matches = matches | qs.filter(phone=phone)
    if email:
        matches = matches | qs.filter(email__iexact=email)
    if first_name and last_name and date_of_birth:
        matches = matches | qs.filter(
            first_name__iexact=first_name,
            last_name__iexact=last_name,
            date_of_birth=date_of_birth,
        )
    return matches.distinct()


def next_mrn(clinic):
    prefix = (clinic.code or "CLN").upper()[:6]
    count = Patient.objects.filter(clinic=clinic).count() + 1
    return f"{prefix}-{count:05d}"
