from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.mixins import ActivityMixin
from apps.activities.models import Comment, Log
from .models import Poll, PollKind, Option, OptionVote, Slot
from .serializers import PollSerializer, OptionSerializer, SlotSerializer


class PollListCreateView(ActivityMixin, APIView):
    def get(self, request, activity_id):
        member = self.get_member()
        polls = self.get_activity().polls.select_related("created_by").all()
        return Response(PollSerializer(polls, many=True, context={"member": member}).data)

    @transaction.atomic
    def post(self, request, activity_id):
        activity = self.get_activity()
        member = self.get_member()
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"title": ["This field is required"]}, status=400)
        kind = request.data.get("kind", PollKind.DATETIME)
        if kind not in PollKind.values:
            return Response({"kind": [f"Must be one of {', '.join(PollKind.values)}"]}, status=400)
        option_labels = [str(o).strip() for o in request.data.get("options") or [] if str(o).strip()]
        if kind == PollKind.CHOICE and len(option_labels) < 2:
            return Response({"options": ["Choice polls need at least 2 options"]}, status=400)
        poll = Poll.objects.create(
            activity=activity,
            cycle_id=request.data.get("cycle"),
            kind=kind,
            allow_multiple=bool(request.data.get("allow_multiple")) and kind == PollKind.CHOICE,
            title=title,
            created_by=member,
        )
        if kind == PollKind.CHOICE:
            Option.objects.bulk_create(
                Option(poll=poll, label=label, position=i, created_by=member)
                for i, label in enumerate(option_labels)
            )
        Log.record(activity, member, "created_poll", title=title, poll_id=poll.id, kind=kind)
        return Response(PollSerializer(poll, context={"member": member}).data, status=201)


class PollDetailView(ActivityMixin, APIView):
    def get(self, request, activity_id, pk):
        member = self.get_member()
        poll = get_object_or_404(Poll, id=pk, activity=self.get_activity())
        return Response(PollSerializer(poll, context={"member": member}).data)

    def patch(self, request, activity_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=pk, activity=activity)
        if "archived" in request.data:
            archived = bool(request.data["archived"])
            poll.deleted_at = timezone.now() if archived else None
            poll.save()
            Log.record(activity, member, "archived" if archived else "unarchived", target="poll", target_id=pk)
        return Response(PollSerializer(poll, context={"member": member}).data)


class PollFinalizeView(ActivityMixin, APIView):
    """Turn a decision into an Event: any member picks the winning date (+ optional time)."""

    def post(self, request, activity_id, pk):
        from apps.events.models import Event
        from apps.events.serializers import EventSerializer

        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=pk, activity=activity)
        if poll.deleted_at:
            return Response({"detail": "Cannot finalize an archived poll"}, status=400)
        date = request.data.get("date")
        if not date:
            return Response({"date": ["This field is required"]}, status=400)
        event = Event.objects.create(
            activity=activity,
            cycle=poll.cycle,
            poll=poll,
            date=date,
            time_start=request.data.get("time_start"),
            time_end=request.data.get("time_end"),
            note=request.data.get("note", ""),
            created_by=member,
        )
        Log.record(activity, member, "finalized_poll", poll_id=pk, date=str(date), event_id=event.id)
        return Response(EventSerializer(event).data, status=201)


class OptionListCreateView(ActivityMixin, APIView):
    def post(self, request, activity_id, poll_id):
        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=poll_id, activity=activity, kind=PollKind.CHOICE)
        label = (request.data.get("label") or "").strip()
        if not label:
            return Response({"label": ["This field is required"]}, status=400)
        option = Option.objects.create(
            poll=poll, label=label, position=poll.options.count(), created_by=member,
        )
        Log.record(activity, member, "added_option", poll_id=poll_id, label=label)
        return Response(OptionSerializer(option, context={"member": member}).data, status=201)

    @transaction.atomic
    def patch(self, request, activity_id, poll_id):
        """Reorder: {"order": [option ids, first to last]}."""
        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=poll_id, activity=activity, kind=PollKind.CHOICE)
        order = request.data.get("order") or []
        options = {o.id: o for o in poll.options.filter(deleted_at__isnull=True)}
        if set(order) != set(options):
            return Response({"order": ["Must list every option id of this poll exactly once"]}, status=400)
        for i, option_id in enumerate(order):
            options[option_id].position = i
        Option.objects.bulk_update(options.values(), ["position"])
        return Response(PollSerializer(poll, context={"member": member}).data)


class OptionDetailView(ActivityMixin, APIView):
    @transaction.atomic
    def delete(self, request, activity_id, poll_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=poll_id, activity=activity, kind=PollKind.CHOICE)
        option = get_object_or_404(Option, id=pk, poll=poll, deleted_at__isnull=True)
        option.deleted_at = timezone.now()
        option.save()
        vote_count = option.votes.count()
        if vote_count:
            # system comment so the invalidated votes are visible in the thread
            Comment.objects.create(
                activity=activity,
                poll=poll,
                member=None,
                body=f"⚠️ Option “{option.label}” was removed by {member.display_name} — "
                     f"{vote_count} vote{'s' if vote_count != 1 else ''} invalidated.",
            )
        Log.record(activity, member, "removed_option", poll_id=poll_id, label=option.label, votes=vote_count)
        return Response(PollSerializer(poll, context={"member": member}).data)


class OptionVoteView(ActivityMixin, APIView):
    """PUT to vote for an option, DELETE to unvote. Single-choice polls clear other votes."""

    @transaction.atomic
    def put(self, request, activity_id, poll_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=poll_id, activity=activity, kind=PollKind.CHOICE)
        option = get_object_or_404(Option, id=pk, poll=poll, deleted_at__isnull=True)
        if not poll.allow_multiple:
            OptionVote.objects.filter(option__poll=poll, member=member).exclude(option=option).delete()
        OptionVote.objects.get_or_create(option=option, member=member)
        Log.record(activity, member, "voted", poll_id=poll_id, option_id=option.id)
        return Response(PollSerializer(poll, context={"member": member}).data)

    def delete(self, request, activity_id, poll_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        poll = get_object_or_404(Poll, id=poll_id, activity=activity, kind=PollKind.CHOICE)
        OptionVote.objects.filter(option_id=pk, option__poll=poll, member=member).delete()
        Log.record(activity, member, "retracted_vote", poll_id=poll_id, option_id=pk)
        return Response(PollSerializer(poll, context={"member": member}).data)


def _validate_slot(poll, data):
    """Per-kind slot rules. Returns an error dict or None."""
    if poll.kind == PollKind.CHOICE:
        return {"detail": "Choice polls take option votes, not slots"}
    if not data.get("date"):
        return {"date": ["This field is required"]}
    if poll.kind == PollKind.DATE:
        if data.get("time_start") or data.get("time_end") or data.get("date_end"):
            return {"detail": "Date polls take single days only"}
    elif poll.kind == PollKind.RANGE:
        if data.get("time_start") or data.get("time_end"):
            return {"detail": "Range polls take days only"}
        if not data.get("date_end"):
            return {"date_end": ["This field is required"]}
        if str(data["date_end"]) < str(data["date"]):
            return {"date_end": ["Must not be before date"]}
    elif data.get("date_end"):
        return {"detail": "Only range polls take date_end"}
    return None


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
        # binary kinds are always "yes"; datetime keeps the tri-state
        status_val = "yes" if poll.kind in (PollKind.DATE, PollKind.RANGE) else request.data.get("status")
        if status_val not in ("yes", "maybe", "no"):
            return Response({"status": ["Must be yes, maybe, or no"]}, status=400)
        error = _validate_slot(poll, request.data)
        if error:
            return Response(error, status=400)
        slot = Slot.objects.create(
            poll=poll,
            member=member,
            status=status_val,
            date=request.data.get("date"),
            date_end=request.data.get("date_end"),
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
        for field in ("status", "date", "date_end", "time_start", "time_end", "note"):
            if field in request.data:
                setattr(slot, field, request.data[field])
        error = _validate_slot(poll, {
            "date": slot.date, "date_end": slot.date_end,
            "time_start": slot.time_start, "time_end": slot.time_end,
        })
        if error:
            return Response(error, status=400)
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
