import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User, AuthToken
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, MeUpdateSerializer


class RegisterView(APIView):
    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if User.objects.filter(display_name=s.validated_data["display_name"]).exists():
            return Response({"display_name": ["This name is already taken"]}, status=400)
        user = User(display_name=s.validated_data["display_name"])
        user.set_password(s.validated_data["password"])
        user.save()
        token = AuthToken.objects.create(user=user)
        return Response({"user": UserSerializer(user).data, "token": str(token.token)}, status=201)


class LoginView(APIView):
    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            user = User.objects.get(display_name=s.validated_data["display_name"])
        except User.DoesNotExist:
            return Response({"detail": "Invalid credentials"}, status=401)
        if not user.check_password(s.validated_data["password"]):
            return Response({"detail": "Invalid credentials"}, status=401)
        token = AuthToken.objects.create(user=user)
        return Response({"user": UserSerializer(user).data, "token": str(token.token)})


class LogoutView(APIView):
    def delete(self, request):
        if isinstance(request.auth, AuthToken):
            request.auth.delete()
        return Response(status=204)


class MeView(APIView):
    def _require_user(self, request):
        if not isinstance(request.user, User):
            return Response({"detail": "Authentication required"}, status=401)
        return None

    def get(self, request):
        if err := self._require_user(request):
            return err
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        if err := self._require_user(request):
            return err
        s = MeUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = request.user
        if "display_name" in s.validated_data:
            user.display_name = s.validated_data["display_name"]
        if "password" in s.validated_data:
            user.set_password(s.validated_data["password"])
        user.save()
        return Response(UserSerializer(user).data)

    def delete(self, request):
        if err := self._require_user(request):
            return err
        request.user.delete()
        return Response(status=204)
