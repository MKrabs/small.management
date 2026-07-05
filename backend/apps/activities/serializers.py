from rest_framework import serializers
from .models import Activity, Member, Cycle, Log, Comment


class MemberSerializer(serializers.ModelSerializer):
    is_anonymous = serializers.SerializerMethodField()

    def get_is_anonymous(self, obj):
        return obj.user_id is None

    class Meta:
        model = Member
        fields = ["id", "display_name", "is_anonymous", "joined_at"]


class ActivitySerializer(serializers.ModelSerializer):
    has_pin = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    me = serializers.SerializerMethodField()

    def get_has_pin(self, obj):
        return obj.pin_hash is not None

    def get_member_count(self, obj):
        return obj.members.count()

    def _own_member(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        from apps.accounts.models import User
        if isinstance(request.user, User):
            return obj.members.filter(user=request.user).first()
        if isinstance(request.auth, Member) and request.auth.activity_id == obj.id:
            return request.auth
        return None

    def get_is_member(self, obj):
        return self._own_member(obj) is not None

    def get_me(self, obj):
        member = self._own_member(obj)
        return MemberSerializer(member).data if member else None

    class Meta:
        model = Activity
        fields = ["id", "short_id", "title", "slug", "has_pin", "member_count", "is_member", "me", "created_at", "archived_at"]


class CycleSerializer(serializers.ModelSerializer):
    created_by = MemberSerializer(read_only=True)

    class Meta:
        model = Cycle
        fields = ["id", "name", "created_by", "created_at"]


class LogSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)

    class Meta:
        model = Log
        fields = ["id", "member", "action_type", "details", "created_at"]


class CommentSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)
    reply_count = serializers.SerializerMethodField()

    def get_reply_count(self, obj):
        return obj.replies.filter(deleted_at__isnull=True).count()

    class Meta:
        model = Comment
        fields = [
            "id", "member", "body", "parent_id",
            "poll_id", "event_id",
            "reply_count", "created_at", "deleted_at",
        ]
