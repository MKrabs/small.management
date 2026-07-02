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
    specific_slot_count = serializers.SerializerMethodField()

    def get_specific_slot_count(self, obj):
        return obj.slots.filter(deleted_at__isnull=True, date__isnull=False).count()

    class Meta:
        model = Poll
        fields = ["id", "cycle_id", "title", "created_by", "specific_slot_count", "created_at", "deleted_at"]
