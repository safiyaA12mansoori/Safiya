from apps.audit.models import AuditLog


class AuditMiddleware:
    """Lightweight request audit for mutating API calls."""

    MUTATING = {"POST", "PUT", "PATCH", "DELETE"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            if request.method in self.MUTATING and request.path.startswith("/api/"):
                user = request.user if getattr(request.user, "is_authenticated", False) else None
                if user:
                    xff = request.META.get("HTTP_X_FORWARDED_FOR")
                    ip = xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR")
                    clinic_id = request.headers.get("X-Clinic-Id") or request.GET.get("clinic")
                    AuditLog.objects.create(
                        clinic_id=int(clinic_id) if clinic_id and str(clinic_id).isdigit() else None,
                        user=user,
                        action=f"{request.method.lower()}_api",
                        entity="http",
                        detail={"status": response.status_code},
                        ip_address=ip,
                        path=request.path[:255],
                        method=request.method,
                    )
        except Exception:
            # Never break the request for audit failures
            pass
        return response
