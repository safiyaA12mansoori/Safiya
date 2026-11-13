from django.middleware.csrf import get_token
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    UserSerializer,
)
from apps.audit.models import AuditLog


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.validated_data["user"]
        AuditLog.objects.create(
            user=user,
            action="login",
            entity="user",
            entity_id=str(user.pk),
            path="/api/auth/login/",
            method="POST",
        )
        data = {
            "user": UserSerializer(user).data,
            "tokens": tokens_for_user(user),
            "csrfToken": get_token(request),
        }
        return Response(data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if not request.user.check_password(ser.validated_data["old_password"]):
            return Response({"detail": "Old password incorrect."}, status=400)
        request.user.set_password(ser.validated_data["new_password"])
        request.user.must_change_password = False
        request.user.save(update_fields=["password", "must_change_password"])
        return Response({"detail": "Password updated."})


class CsrfView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})
