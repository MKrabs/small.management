from rest_framework import serializers
from apps.activities.serializers import MemberSerializer, LatestCommentsMixin
from .models import Event, RSVP


class RSVPSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)

    class Meta:
        model = RSVP
        fields = ["id", "member", "status", "comment", "created_at", "updated_at"]


class EventSerializer(LatestCommentsMixin, serializers.ModelSerializer):
    created_by = MemberSerializer(read_only=True)
    rsvps = RSVPSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()
    latest_comments = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id", "cycle_id", "poll_id",
            "date", "time_start", "time_end", "note",
            "created_by", "rsvps", "comment_count", "latest_comments",
            "created_at", "deleted_at",
        ]
