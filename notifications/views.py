from django.contrib import messages
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render

from accounts.models import User
from core.access import role_required, student_profile
from core.audit import log_action

from .forms import AnnouncementForm
from .models import Announcement, Notification
from .services import fanout_announcement


def visible_announcements(user):
    qs = Announcement.objects.filter(is_active=True).select_related("author", "classroom")
    if user.role == User.Role.ADMIN:
        return Announcement.objects.select_related("author", "classroom")
    profile = student_profile(user)
    audience = Q(audience=Announcement.Audience.ALL)
    if user.role == User.Role.TEACHER:
        audience |= Q(audience=Announcement.Audience.TEACHERS)
    if user.role == User.Role.STUDENT and profile:
        audience |= Q(audience=Announcement.Audience.STUDENTS) | Q(audience=Announcement.Audience.CLASS, classroom=profile.classroom)
    return qs.filter(audience)


@role_required("ADMIN", "TEACHER", "STUDENT")
def announcements(request):
    return render(request, "notifications/announcements.html", {"announcements": visible_announcements(request.user)})


@role_required("ADMIN", "TEACHER")
def announcement_create(request):
    form = AnnouncementForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        item = form.save(commit=False)
        item.author = request.user
        item.save()
        if item.is_active:
            fanout_announcement(item)
        log_action(request.user, "announcement", f"Posted {item.title}", "announcement", item.pk)
        messages.success(request, "Announcement posted.")
        return redirect("notifications:announcements")
    return render(request, "notifications/form.html", {"form": form})


@role_required("ADMIN")
def announcement_toggle(request, pk):
    item = get_object_or_404(Announcement, pk=pk)
    if request.method == "POST":
        item.is_active = not item.is_active
        item.save(update_fields=["is_active", "updated_at"])
        messages.success(request, "Announcement updated.")
    return redirect("notifications:announcements")


@role_required("ADMIN", "TEACHER", "STUDENT")
def inbox(request):
    notes = Notification.objects.filter(recipient=request.user)
    return render(request, "notifications/list.html", {"notes": notes})


@role_required("ADMIN", "TEACHER", "STUDENT")
def mark_read(request, pk=None):
    if request.method == "POST":
        qs = Notification.objects.filter(recipient=request.user, is_read=False)
        if pk:
            qs = qs.filter(pk=pk)
        qs.update(is_read=True)
    return redirect(request.POST.get("next") or "notifications:list")
