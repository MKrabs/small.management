from rest_framework import serializers
from apps.activities.serializers import MemberSerializer, CommentSerializer
from .models import Poll, PollKind, Option, Slot

FEED_COMMENT_COUNT = 3


class SlotSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)

    class Meta:
        model = Slot
        fields = ["id", "member", "status", "date", "date_end", "time_start", "time_end", "note", "created_at", "deleted_at"]


class OptionSerializer(serializers.ModelSerializer):
    created_by = MemberSerializer(read_only=True)
    voters = serializers.SerializerMethodField()
    my_vote = serializers.SerializerMethodField()

    def get_voters(self, obj):
        return [
            {"id": str(v.member.id), "display_name": v.member.display_name}
            for v in obj.votes.select_related("member").order_by("created_at")
        ]

    def get_my_vote(self, obj):
        member = self.context.get("member")
        if not member:
            return False
        return any(v.member_id == member.id for v in obj.votes.all())

    class Meta:
        model = Option
        fields = ["id", "label", "created_by", "voters", "my_vote", "created_at", "deleted_at"]


class PollSerializer(serializers.ModelSerializer):
    created_by = MemberSerializer(read_only=True)
    voter_count = serializers.SerializerMethodField()
    my_vote = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()
    slots = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    latest_comments = serializers.SerializerMethodField()

    def get_voter_count(self, obj):
        if obj.kind == PollKind.CHOICE:
            member_ids = set()
            for opt in obj.options.all():
                if opt.deleted_at:  # removed option → its votes are invalidated
                    continue
                member_ids.update(v.member_id for v in opt.votes.all())
            return len(member_ids)
        return obj.slots.filter(deleted_at__isnull=True).values("member_id").distinct().count()

    # summary of the requesting member's own slots (needs "member" in context, e.g. the feed)
    def get_my_vote(self, obj):
        member = self.context.get("member")
        if not member or obj.kind == PollKind.CHOICE:
            return None
        slots = obj.slots.filter(deleted_at__isnull=True, member=member)
        return {
            "voted": slots.exists(),
            "has_date": slots.filter(date__isnull=False).exists(),
            "has_time": slots.filter(time_start__isnull=False).exists(),
        }

    def get_options(self, obj):
        if obj.kind != PollKind.CHOICE:
            return None
        qs = obj.options.filter(deleted_at__isnull=True).select_related("created_by").prefetch_related("votes__member")
        return OptionSerializer(qs, many=True, context=self.context).data

    # date/range cards render a calendar with everyone's votes directly on the feed
    def get_slots(self, obj):
        if obj.kind not in (PollKind.DATE, PollKind.RANGE):
            return None
        qs = obj.slots.filter(deleted_at__isnull=True).select_related("member")
        return SlotSerializer(qs, many=True).data

    def get_comment_count(self, obj):
        return obj.comments.filter(deleted_at__isnull=True).count()

    def get_latest_comments(self, obj):
        qs = obj.comments.filter(parent=None, deleted_at__isnull=True).select_related("member")
        newest = list(qs.order_by("-created_at")[:FEED_COMMENT_COUNT])
        return CommentSerializer(reversed(newest), many=True).data

    class Meta:
        model = Poll
        fields = [
            "id", "cycle_id", "kind", "allow_multiple", "title", "created_by",
            "voter_count", "my_vote", "options", "slots",
            "comment_count", "latest_comments", "created_at", "deleted_at",
        ]
