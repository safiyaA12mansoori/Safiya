from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class CollegeProfile(TimeStampedModel):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to="college/", blank=True)
    established_year = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = "College profile"

    def __str__(self):
        return self.name


class ActivityLog(models.Model):
    actor = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="activity_logs"
    )
    action = models.CharField(max_length=60, db_index=True)
    entity = models.CharField(max_length=60, blank=True)
    entity_id = models.CharField(max_length=40, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action}: {self.message[:80]}"
