from django.db import migrations

GRADES = (
    (1, 'Primary 1', 'primary'),
    (2, 'Primary 2', 'primary'),
    (3, 'Primary 3', 'primary'),
    (4, 'Primary 4', 'primary'),
    (5, 'Primary 5', 'primary'),
    (6, 'Secondary 6', 'secondary'),
    (7, 'Secondary 7', 'secondary'),
    (8, 'Secondary 8', 'secondary'),
    (9, 'Secondary 9', 'secondary'),
    (10, 'Secondary 10', 'secondary'),
)


def seed_grade_levels(apps, schema_editor):
    GradeLevel = apps.get_model('academics', 'GradeLevel')
    for number, name, stage in GRADES:
        GradeLevel.objects.update_or_create(number=number, defaults={'name': name, 'stage': stage})


def remove_grade_levels(apps, schema_editor):
    GradeLevel = apps.get_model('academics', 'GradeLevel')
    GradeLevel.objects.filter(number__in=[number for number, _name, _stage in GRADES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('academics', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_grade_levels, remove_grade_levels),
    ]
