from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "display_name", "created_at"]


class RegisterSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=50)
    password = serializers.CharField(min_length=6, write_only=True)


class LoginSerializer(serializers.Serializer):
    display_name = serializers.CharField()
    password = serializers.CharField()


class MeUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=50, required=False)
    password = serializers.CharField(min_length=6, required=False)
