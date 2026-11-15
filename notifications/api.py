from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification


class RecentNotifications(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = Notification.objects.filter(recipient=request.user)[:6]
        return Response(
            {
                "unread": Notification.objects.filter(recipient=request.user, is_read=False).count(),
                "items": [{"id": row.id, "title": row.title, "link": row.link, "is_read": row.is_read} for row in rows],
            }
        )
