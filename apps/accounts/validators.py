import re

from django.core.exceptions import ValidationError
from django.utils import timezone

PHONE_PATTERN = re.compile(r'^\+?[0-9][0-9\s\-]{6,18}$')


def validate_phone(value):
    if not PHONE_PATTERN.match((value or '').strip()):
        raise ValidationError('Enter a valid phone number using digits, spaces, or hyphens.')


def validate_date_of_birth(value):
    today = timezone.localdate()
    if value > today:
        raise ValidationError('Date of birth cannot be in the future.')
    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if age < 3 or age > 30:
        raise ValidationError('Enter a date of birth for a school student aged 3 to 30.')


def validate_joined_on(value):
    today = timezone.localdate()
    latest = today.replace(year=today.year + 1)
    if value.year < 1970 or value > latest:
        raise ValidationError('Enter a joining date between 1970 and one year from today.')
