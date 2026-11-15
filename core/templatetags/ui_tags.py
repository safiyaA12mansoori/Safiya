from django import template
from django.urls import resolve, reverse

register = template.Library()

BADGES = {
    "PRESENT": "success",
    "PAID": "success",
    "PUBLISHED": "success",
    "SELECTED": "success",
    "SUBMITTED": "success",
    "passed": "success",
    "ABSENT": "danger",
    "REJECTED": "danger",
    "failed": "danger",
    "PENDING": "warning",
    "PARTIAL": "warning",
    "LEAVE": "warning",
    "DRAFT": "secondary",
    "IN_PROGRESS": "info",
    "APPLIED": "info",
    "SHORTLISTED": "info",
    "INTERVIEW": "info",
    "demo": "warning",
}


@register.filter
def get_item(mapping, key):
    if not mapping:
        return ""
    return mapping.get(key, "")


@register.filter
def initials(user):
    if not getattr(user, "is_authenticated", False):
        return "?"
    name = (user.get_full_name() or user.username or "?").strip()
    parts = [p for p in name.split() if p]
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    return name[:2].upper()


@register.filter
def badge_tone(value):
    return BADGES.get(str(value), "secondary")


@register.simple_tag(takes_context=True)
def querystring(context, **kwargs):
    request = context["request"]
    data = request.GET.copy()
    for key, value in kwargs.items():
        if value is None:
            data.pop(key, None)
        else:
            data[key] = value
    return data.urlencode()


@register.simple_tag(takes_context=True)
def nav_active(context, url_name):
    request = context["request"]
    try:
        current = request.resolver_match.view_name
    except Exception:
        return ""
    if current == url_name:
        return "active"
    try:
        target_ns = resolve(reverse(url_name)).namespace
    except Exception:
        return ""
    if request.resolver_match.namespace and request.resolver_match.namespace == target_ns and url_name.endswith(":list"):
        return "active"
    return ""
