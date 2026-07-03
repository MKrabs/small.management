from django.utils import timezone
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
    recent_members = serializers.SerializerMethodField()
    open_item = serializers.SerializerMethodField()

    def get_has_pin(self, obj):
        return obj.pin_hash is not None

    def get_member_count(self, obj):
        return obj.members.count()

    def get_recent_members(self, obj):
        recent = obj.members.order_by("-joined_at")[:4]
        return MemberSerializer(recent, many=True).data

    def get_open_item(self, obj):
        """Newest open votable (poll / unfinalized proposal / upcoming event)
        plus whether the requesting member already voted on it."""
        member = self._own_member(obj)
        candidates = []

        poll = obj.polls.filter(deleted_at=None).order_by("-created_at").first()
        if poll:
            voted = bool(member) and poll.slots.filter(member=member, deleted_at=None).exists()
            candidates.append((poll.created_at, {
                "type": "poll", "id": poll.id, "title": poll.title, "voted": voted,
            }))

        proposal = obj.proposals.filter(deleted_at=None, event__isnull=True).order_by("-created_at").first()
        if proposal:
            voted = bool(member) and proposal.votes.filter(member=member, deleted_at=None).exists()
            candidates.append((proposal.created_at, {
                "type": "proposal", "id": proposal.id,
                "date": str(proposal.proposed_date), "voted": voted,
            }))

        event = obj.events.filter(date__gte=timezone.localdate()).order_by("-created_at").first()
        if event:
            voted = bool(member) and event.rsvps.filter(member=member).exists()
            candidates.append((event.created_at, {
                "type": "event", "id": event.id,
                "date": str(event.date), "voted": voted,
            }))

        if not candidates:
            return None
        return max(candidates, key=lambda c: c[0])[1]

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
        fields = [
            "id", "short_id", "title", "slug", "has_pin", "member_count",
            "is_member", "me", "recent_members", "open_item", "created_at",
        ]


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
            "poll_id", "proposal_id", "event_id",
            "reply_count", "created_at", "deleted_at",
        ]
