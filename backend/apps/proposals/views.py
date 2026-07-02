from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.mixins import ActivityMixin
from apps.activities.models import Log
from apps.events.models import Event
from apps.events.serializers import EventSerializer
from .models import Proposal, ProposalVote
from .serializers import ProposalSerializer, ProposalVoteSerializer


class ProposalListCreateView(ActivityMixin, APIView):
    def get(self, request, activity_id):
        self.get_member()
        proposals = self.get_activity().proposals.select_related("created_by").prefetch_related("votes__member").all()
        return Response(ProposalSerializer(proposals, many=True).data)

    def post(self, request, activity_id):
        activity = self.get_activity()
        member = self.get_member()
        proposed_date = request.data.get("proposed_date")
        if not proposed_date:
            return Response({"proposed_date": ["This field is required"]}, status=400)
        proposal = Proposal.objects.create(
            activity=activity,
            cycle_id=request.data.get("cycle"),
            poll_id=request.data.get("poll"),
            proposed_date=proposed_date,
            proposed_time=request.data.get("proposed_time"),
            note=request.data.get("note", ""),
            created_by=member,
        )
        Log.record(activity, member, "created_proposal", date=str(proposed_date), proposal_id=proposal.id)
        return Response(ProposalSerializer(proposal).data, status=201)


class ProposalDetailView(ActivityMixin, APIView):
    def get(self, request, activity_id, pk):
        self.get_member()
        proposal = get_object_or_404(Proposal, id=pk, activity=self.get_activity())
        return Response(ProposalSerializer(proposal).data)

    def delete(self, request, activity_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        proposal = get_object_or_404(Proposal, id=pk, activity=activity)
        proposal.deleted_at = timezone.now()
        proposal.save()
        Log.record(activity, member, "soft_deleted", target="proposal", target_id=pk)
        return Response(ProposalSerializer(proposal).data)


class FinalizeProposalView(ActivityMixin, APIView):
    def post(self, request, activity_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        proposal = get_object_or_404(Proposal, id=pk, activity=activity)
        if proposal.deleted_at:
            return Response({"detail": "Cannot finalize a deleted proposal"}, status=400)
        event = Event.objects.create(
            activity=activity,
            cycle=proposal.cycle,
            proposal=proposal,
            date=proposal.proposed_date,
            time_start=proposal.proposed_time,
            note=request.data.get("note", ""),
            created_by=member,
        )
        Log.record(activity, member, "finalized_proposal",
                   proposal_id=pk, date=str(proposal.proposed_date), event_id=event.id)
        return Response(EventSerializer(event).data, status=201)


class ProposalVoteCreateView(ActivityMixin, APIView):
    def post(self, request, activity_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        proposal = get_object_or_404(Proposal, id=pk, activity=activity)
        status_val = request.data.get("status")
        if status_val not in ("yes", "maybe", "no"):
            return Response({"status": ["Must be yes, maybe, or no"]}, status=400)
        vote, created = ProposalVote.objects.get_or_create(
            proposal=proposal, member=member,
            defaults={"status": status_val, "comment": request.data.get("comment", "")},
        )
        if not created:
            vote.status = status_val
            vote.comment = request.data.get("comment", vote.comment)
            vote.deleted_at = None
            vote.save()
        Log.record(activity, member, "voted_proposal", proposal_id=pk, status=status_val)
        return Response(ProposalVoteSerializer(vote).data, status=201 if created else 200)


class ProposalVoteDetailView(ActivityMixin, APIView):
    def patch(self, request, activity_id, pk, vote_id):
        activity = self.get_activity()
        member = self.get_member()
        proposal = get_object_or_404(Proposal, id=pk, activity=activity)
        vote = get_object_or_404(ProposalVote, id=vote_id, proposal=proposal, member=member)
        if "status" in request.data:
            vote.status = request.data["status"]
        if "comment" in request.data:
            vote.comment = request.data["comment"]
        vote.save()
        return Response(ProposalVoteSerializer(vote).data)

    def delete(self, request, activity_id, pk, vote_id):
        activity = self.get_activity()
        member = self.get_member()
        proposal = get_object_or_404(Proposal, id=pk, activity=activity)
        vote = get_object_or_404(ProposalVote, id=vote_id, proposal=proposal, member=member)
        vote.deleted_at = timezone.now()
        vote.save()
        Log.record(activity, member, "retracted_vote", proposal_id=pk)
        return Response(ProposalVoteSerializer(vote).data)
