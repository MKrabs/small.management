from rest_framework import serializers
from .models import User

PALETTE = ["red", "orange", "amber", "lime", "green", "teal", "sky", "blue", "violet", "pink"]
SHAPES = ["circle", "square", "trapezoid", "cloud", "heart", "diamond"]


class AvatarSerializer(serializers.Serializer):
    # ponytail: 8 code points ≈ 2 graphemes; client enforces the real limit via Intl.Segmenter
    chars = serializers.CharField(max_length=8, allow_blank=True)
    bg = serializers.ChoiceField(choices=PALETTE)
    border = serializers.ChoiceField(choices=PALETTE)
    name_color = serializers.ChoiceField(choices=PALETTE)
    shape = serializers.ChoiceField(choices=SHAPES)
    rotation = serializers.IntegerField(min_value=0, max_value=345)

    def validate_rotation(self, value):
        if value % 15 != 0:
            raise serializers.ValidationError("Must be a multiple of 15")
        return value


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "display_name", "avatar", "created_at"]


class RegisterSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=50)
    password = serializers.CharField(min_length=6, write_only=True)


class LoginSerializer(serializers.Serializer):
    display_name = serializers.CharField()
    password = serializers.CharField()


class MeUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=50, required=False)
    password = serializers.CharField(min_length=6, required=False)
    current_password = serializers.CharField(required=False)
    avatar = AvatarSerializer(required=False, allow_null=True)

    def validate(self, data):
        if "password" in data and not data.get("current_password"):
            raise serializers.ValidationError(
                {"current_password": ["Required to change your password"]}
            )
        return data
