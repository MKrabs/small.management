from rest_framework import serializers
from apps.activities.serializers import MemberSerializer
from .models import Event, RSVP


class RSVPSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)

    class Meta:
        model = RSVP
        fields = ["id", "member", "status", "comment", "created_at", "updated_at"]


class EventSerializer(serializers.ModelSerializer):
    created_by = MemberSerializer(read_only=True)
    rsvps = RSVPSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "cycle_id", "proposal_id",
            "date", "time_start", "time_end", "note",
            "created_by", "rsvps", "created_at",
        ]
