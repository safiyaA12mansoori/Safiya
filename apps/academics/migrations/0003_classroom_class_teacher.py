import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0002_seed_grade_levels'),
        ('teachers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='classroom',
            name='class_teacher',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='class_teacher_of',
                to='teachers.teacher',
            ),
        ),
    ]
