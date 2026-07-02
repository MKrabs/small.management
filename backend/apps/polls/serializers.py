from rest_framework import serializers
from apps.activities.serializers import MemberSerializer
from .models import Poll, Slot


class SlotSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)

    class Meta:
        model = Slot
        fields = ["id", "member", "status", "date", "time_start", "time_end", "note", "created_at", "deleted_at"]


class PollSerializer(serializers.ModelSerializer):
    created_by = MemberSerializer(read_only=True)
    voter_count = serializers.SerializerMethodField()
    my_vote = serializers.SerializerMethodField()

    def get_voter_count(self, obj):
        return obj.slots.filter(deleted_at__isnull=True).values("member_id").distinct().count()

    # summary of the requesting member's own slots (needs "member" in context, e.g. the feed)
    def get_my_vote(self, obj):
        member = self.context.get("member")
        if not member:
            return None
        slots = obj.slots.filter(deleted_at__isnull=True, member=member)
        return {
            "voted": slots.exists(),
            "has_date": slots.filter(date__isnull=False).exists(),
            "has_time": slots.filter(time_start__isnull=False).exists(),
        }

    class Meta:
        model = Poll
        fields = ["id", "cycle_id", "title", "created_by", "voter_count", "my_vote", "created_at", "deleted_at"]
