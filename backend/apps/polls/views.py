from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.mixins import ActivityMixin
from apps.activities.models import Log
from .models import Poll, Slot
from .serializers import PollSerializer, SlotSerializer


class PollListCreateView(ActivityMixin, APIView):
    def get(self, request, activity_id):
        self.get_member()
        polls = self.get_activity().polls.select_related("created_by").all()
        return Response(PollSerializer(polls, many=True).data)

    def post(self, request, activity_id):
        activity = self.get_activity()
        member = self.get_member()
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"title": ["This field is required"]}, status=400)
        poll = Poll.objects.create(
            activity=activity,
            cycle_id=request.data.get("cycle"),
            title=title,
            created_by=member,
        )
        Log.record(activity, member, "created_poll", title=title, poll_id=poll.id)
        return Response(PollSerializer(poll).data, status=201)


class PollDetailView(ActivityMixin, APIView):
    def get(self, request, activity_id, pk):
        self.get_member()
        poll = get_object_or_404(Poll, id=pk, activity=self.get_activity())
        return Response(PollSerializer(poll).data)

    def delete(self, request, activity_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=pk, activity=activity)
        poll.deleted_at = timezone.now()
        poll.save()
        Log.record(activity, member, "soft_deleted", target="poll", target_id=pk)
        return Response(PollSerializer(poll).data)


class SlotListCreateView(ActivityMixin, APIView):
    def get(self, request, activity_id, poll_id):
        self.get_member()
        poll = get_object_or_404(Poll, id=poll_id, activity=self.get_activity())
        slots = poll.slots.filter(deleted_at__isnull=True).select_related("member")
        return Response(SlotSerializer(slots, many=True).data)

    def post(self, request, activity_id, poll_id):
        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=poll_id, activity=activity)
        status_val = request.data.get("status")
        if status_val not in ("yes", "maybe", "no"):
            return Response({"status": ["Must be yes, maybe, or no"]}, status=400)
        slot = Slot.objects.create(
            poll=poll,
            member=member,
            status=status_val,
            date=request.data.get("date"),
            time_start=request.data.get("time_start"),
            time_end=request.data.get("time_end"),
            note=request.data.get("note", ""),
        )
        Log.record(activity, member, "voted", poll_id=poll_id, status=status_val, date=str(slot.date))
        return Response(SlotSerializer(slot).data, status=201)


class SlotDetailView(ActivityMixin, APIView):
    def patch(self, request, activity_id, poll_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=poll_id, activity=activity)
        slot = get_object_or_404(Slot, id=pk, poll=poll)
        if "status" in request.data:
            slot.status = request.data["status"]
        if "date" in request.data:
            slot.date = request.data["date"]
        if "time_start" in request.data:
            slot.time_start = request.data["time_start"]
        if "time_end" in request.data:
            slot.time_end = request.data["time_end"]
        if "note" in request.data:
            slot.note = request.data["note"]
        slot.save()
        return Response(SlotSerializer(slot).data)

    def delete(self, request, activity_id, poll_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=poll_id, activity=activity)
        slot = get_object_or_404(Slot, id=pk, poll=poll)
        slot.deleted_at = timezone.now()
        slot.save()
        Log.record(activity, member, "retracted_vote", poll_id=poll_id, slot_id=pk)
        return Response(SlotSerializer(slot).data)
