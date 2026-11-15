from accounts.models import User

from .models import Announcement, Notification


def notify(users, title, body="", link=""):
    rows = [
        Notification(recipient=user, title=title[:200], body=body or "", link=(link or "")[:240])
        for user in users
        if getattr(user, "is_active", True)
    ]
    if rows:
        Notification.objects.bulk_create(rows)


def audience_users(announcement):
    if announcement.audience == Announcement.Audience.ALL:
        return User.objects.filter(is_active=True)
    if announcement.audience == Announcement.Audience.TEACHERS:
        return User.objects.filter(is_active=True, role=User.Role.TEACHER)
    if announcement.audience == Announcement.Audience.STUDENTS:
        return User.objects.filter(is_active=True, role=User.Role.STUDENT)
    return User.objects.filter(is_active=True, student_profile__classroom=announcement.classroom)


def fanout_announcement(announcement):
    notify(
        audience_users(announcement),
        announcement.title,
        announcement.body[:500],
        "/notifications/announcements/",
    )
