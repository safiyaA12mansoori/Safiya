from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ExaminationAttempt
from .services import save_one


class SaveExamAnswer(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):
        attempt = ExaminationAttempt.objects.filter(pk=attempt_id, student__user=request.user).first()
        if not attempt:
            return Response({"detail": "Not found."}, status=404)
        attempt = save_one(
            attempt,
            request.data.get("key"),
            request.data.get("option") or None,
            request.data.get("review") in {True, "true", "on", 1, "1"},
        )
        return Response({"ok": True, "submitted": attempt.status == ExaminationAttempt.Status.SUBMITTED})
