from rest_framework import serializers
from apps.activities.serializers import MemberSerializer
from .models import Proposal, ProposalVote


class ProposalVoteSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)

    class Meta:
        model = ProposalVote
        fields = ["id", "member", "status", "comment", "created_at", "updated_at", "deleted_at"]


class ProposalSerializer(serializers.ModelSerializer):
    created_by = MemberSerializer(read_only=True)
    votes = ProposalVoteSerializer(many=True, read_only=True)

    class Meta:
        model = Proposal
        fields = [
            "id", "cycle_id", "poll_id",
            "proposed_date", "proposed_time", "note",
            "created_by", "votes", "created_at", "deleted_at",
        ]
