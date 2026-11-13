import secrets
import string

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import IdSequence

STUDENT_PREFIX = 'STD'
ADMISSION_PREFIX = 'ADM'
TEACHER_PREFIX = 'TCH'


def generate_identifier(prefix, year=None):
    year = year or timezone.now().year
    for _ in range(5):
        try:
            with transaction.atomic():
                sequence, _created = IdSequence.objects.get_or_create(
                    prefix=prefix,
                    year=year,
                    defaults={'last_value': 0},
                )
                sequence = IdSequence.objects.select_for_update().get(pk=sequence.pk)
                sequence.last_value += 1
                sequence.save(update_fields=['last_value', 'updated_at'])
                return f'{prefix}{year}{sequence.last_value:04d}'
        except IntegrityError:
            continue
    raise RuntimeError(f'Could not allocate a {prefix} identifier.')


def set_temporary_password(user):
    password = generate_temporary_password()
    user.set_password(password)
    user.save(update_fields=['password'])
    return password


def generate_temporary_password(length=12):
    alphabet = string.ascii_letters + string.digits
    for _ in range(30):
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        if not any(character.islower() for character in password):
            continue
        if not any(character.isupper() for character in password):
            continue
        if not any(character.isdigit() for character in password):
            continue
        try:
            validate_password(password)
        except ValidationError:
            continue
        return password
    raise RuntimeError('Could not generate a temporary password.')
