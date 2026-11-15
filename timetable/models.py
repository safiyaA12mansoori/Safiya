from django.core.exceptions import ValidationError
from django.db import models

from core.models import TimeStampedModel


class Timetable(TimeStampedModel):
    DAYS = [
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
    ]

    classroom = models.ForeignKey("academics.ClassRoom", on_delete=models.CASCADE, related_name="timetable")
    subject = models.ForeignKey("academics.Subject", on_delete=models.PROTECT, related_name="timetable")
    teacher = models.ForeignKey("teachers.TeacherProfile", on_delete=models.PROTECT, related_name="timetable")
    session = models.ForeignKey("academics.AcademicSession", on_delete=models.PROTECT, related_name="timetable")
    room = models.CharField(max_length=40)
    day_of_week = models.PositiveSmallIntegerField(choices=DAYS, db_index=True)
    period = models.PositiveSmallIntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        ordering = ["day_of_week", "period"]
        constraints = [
            models.UniqueConstraint(fields=["classroom", "session", "day_of_week", "period"], name="uniq_class_period"),
            models.UniqueConstraint(fields=["teacher", "session", "day_of_week", "period"], name="uniq_teacher_period"),
            models.UniqueConstraint(fields=["room", "session", "day_of_week", "period"], name="uniq_room_period"),
        ]

    def __str__(self):
        return f"{self.get_day_of_week_display()} P{self.period} {self.subject}"

    def clean(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError("End time must be after the start time.")
        if self.classroom_id and self.session_id and self.classroom.session_id != self.session_id:
            raise ValidationError("The class belongs to a different academic session.")
        clash = Timetable.objects.filter(session_id=self.session_id, day_of_week=self.day_of_week, period=self.period)
        if self.pk:
            clash = clash.exclude(pk=self.pk)
        if self.classroom_id and clash.filter(classroom_id=self.classroom_id).exists():
            raise ValidationError("This class already has a period at that time.")
        if self.teacher_id and clash.filter(teacher_id=self.teacher_id).exists():
            raise ValidationError("This teacher is already booked in that period.")
        if self.room and clash.filter(room__iexact=self.room).exists():
            raise ValidationError("This room is already booked in that period.")
