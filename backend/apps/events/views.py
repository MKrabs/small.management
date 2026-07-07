from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.mixins import ActivityMixin
from apps.activities.models import Log
from .models import Event, RSVP
from .serializers import EventSerializer, RSVPSerializer


class EventListCreateView(ActivityMixin, APIView):
    """POST to post an event directly to the feed, no poll needed."""
    def post(self, request, activity_id):
        activity = self.get_activity()
        member = self.get_member()
        date = request.data.get("date")
        if not date:
            return Response({"date": ["This field is required"]}, status=400)
        event = Event.objects.create(
            activity=activity,
            date=date,
            time_start=request.data.get("time_start") or None,
            time_end=request.data.get("time_end") or None,
            note=request.data.get("note", ""),
            created_by=member,
        )
        Log.record(activity, member, "created_event", date=str(date), event_id=event.id)
        return Response(EventSerializer(event).data, status=201)


class EventDetailView(ActivityMixin, APIView):
    def get(self, request, activity_id, pk):
        self.get_member()
        event = get_object_or_404(Event, id=pk, activity=self.get_activity())
        return Response(EventSerializer(event).data)

    def patch(self, request, activity_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        event = get_object_or_404(Event, id=pk, activity=activity)
        if "archived" in request.data:
            archived = bool(request.data["archived"])
            event.deleted_at = timezone.now() if archived else None
            event.save()
            Log.record(activity, member, "archived" if archived else "unarchived", target="event", target_id=pk)
        if "note" in request.data:
            event.note = (request.data.get("note") or "").strip()
            event.save()
            Log.record(activity, member, "edited_note", target="event", target_id=pk)
        return Response(EventSerializer(event).data)


class RSVPView(ActivityMixin, APIView):
    """PUT to upsert own RSVP."""
    def put(self, request, activity_id, event_id):
        activity = self.get_activity()
        member = self.get_member()
        event = get_object_or_404(Event, id=event_id, activity=activity)
        status_val = request.data.get("status")
        if status_val not in ("going", "maybe", "not_going"):
            return Response({"status": ["Must be going, maybe, or not_going"]}, status=400)
        rsvp, created = RSVP.objects.update_or_create(
            event=event, member=member,
            defaults={"status": status_val, "comment": request.data.get("comment", "")},
        )
        Log.record(activity, member, "rsvp", event_id=event_id, status=status_val)
        return Response(RSVPSerializer(rsvp).data, status=201 if created else 200)

    def delete(self, request, activity_id, event_id):
        activity = self.get_activity()
        member = self.get_member()
        event = get_object_or_404(Event, id=event_id, activity=activity)
        RSVP.objects.filter(event=event, member=member).delete()
        Log.record(activity, member, "retracted_rsvp", event_id=event_id)
        return Response(status=204)
