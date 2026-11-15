from core.navigation import nav_for
from notifications.models import Notification

from .models import CollegeProfile


def campus(request):
    college = CollegeProfile.objects.first()
    unread = 0
    recent = []
    if getattr(request.user, "is_authenticated", False):
        notes = Notification.objects.filter(recipient=request.user)
        unread = notes.filter(is_read=False).count()
        recent = list(notes[:5])
    return {
        "college": college,
        "unread_notifications": unread,
        "recent_notifications": recent,
        "nav_items": nav_for(request.user),
    }
