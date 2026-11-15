from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import QuizAttempt
from .services import save_quiz_one


class SaveQuizAnswer(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):
        attempt = QuizAttempt.objects.filter(pk=attempt_id, student__user=request.user).first()
        if not attempt:
            return Response({"detail": "Not found."}, status=404)
        attempt = save_quiz_one(
            attempt,
            request.data.get("key"),
            request.data.get("option") or None,
            request.data.get("review") in {True, "true", "on", 1, "1"},
        )
        return Response({"ok": True, "submitted": attempt.status == QuizAttempt.Status.SUBMITTED})
