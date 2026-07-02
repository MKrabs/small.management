import uuid
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotAuthenticated

from apps.accounts.models import User
from apps.mixins import ActivityMixin
from .models import Activity, Member, Cycle, Log, Comment
from .serializers import (
    ActivitySerializer, MemberSerializer, CycleSerializer,
    LogSerializer, CommentSerializer,
)


class ActivityListCreateView(APIView):
    def get(self, request):
        if not isinstance(request.user, User):
            raise NotAuthenticated()
        members = Member.objects.filter(user=request.user).select_related("activity")
        return Response(ActivitySerializer([m.activity for m in members], many=True, context={"request": request}).data)

    @transaction.atomic
    def post(self, request):
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"title": ["This field is required"]}, status=400)

        activity = Activity(title=title)
        raw_pin = request.data.get("pin")
        if raw_pin:
            activity.set_pin(raw_pin)
        activity.save()

        ctx = {"request": request}
        if isinstance(request.user, User):
            member = Member.objects.create(activity=activity, user=request.user, display_name=request.user.display_name)
            Cycle.objects.create(activity=activity, name=f"{title} #1", created_by=member)
            Log.record(activity, member, "created_activity", title=title)
            return Response(ActivitySerializer(activity, context=ctx).data, status=201)
        else:
            display_name = (request.data.get("display_name") or "").strip()
            if not display_name:
                return Response({"display_name": ["Required for anonymous users"]}, status=400)
            session_token = uuid.uuid4()
            member = Member.objects.create(activity=activity, display_name=display_name, session_token=session_token)
            Cycle.objects.create(activity=activity, name=f"{title} #1", created_by=member)
            Log.record(activity, member, "created_activity", title=title)
            return Response({**ActivitySerializer(activity, context=ctx).data, "session_token": str(session_token)}, status=201)


class ActivityDetailView(ActivityMixin, APIView):
    def _serialize(self, activity):
        return ActivitySerializer(activity, context={"request": self.request})

    # GET is public (needed for join screen)
    def get(self, request, activity_id):
        return Response(self._serialize(self.get_activity()).data)

    def patch(self, request, activity_id):
        activity = self.get_activity()
        member = self.get_member()
        title = (request.data.get("title") or "").strip()
        if title:
            activity.title = title
            activity.save()
            Log.record(activity, member, "renamed_activity", title=title)
        return Response(self._serialize(activity).data)


class JoinActivityView(ActivityMixin, APIView):
    @transaction.atomic
    def post(self, request, activity_id):
        activity = self.get_activity()

        raw_pin = request.data.get("pin")
        if activity.pin_hash:
            if not raw_pin or not activity.check_pin(raw_pin):
                return Response({"detail": "Invalid PIN"}, status=403)

        if isinstance(request.user, User):
            member, created = Member.objects.get_or_create(
                activity=activity, user=request.user,
                defaults={"display_name": request.user.display_name},
            )
            if created:
                Log.record(activity, member, "member_joined", display_name=member.display_name)
            return Response(MemberSerializer(member).data, status=201 if created else 200)
        else:
            display_name = (request.data.get("display_name") or "").strip()
            if not display_name:
                return Response({"display_name": ["Required for anonymous users"]}, status=400)
            session_token = uuid.uuid4()
            member = Member.objects.create(activity=activity, display_name=display_name, session_token=session_token)
            Log.record(activity, member, "member_joined", display_name=display_name)
            return Response({**MemberSerializer(member).data, "session_token": str(session_token)}, status=201)


class FeedView(ActivityMixin, APIView):
    def get(self, request, activity_id):
        from apps.polls.serializers import PollSerializer
        from apps.proposals.serializers import ProposalSerializer
        from apps.events.serializers import EventSerializer

        activity = self.get_activity()
        self.get_member()

        include_logs = request.query_params.get("include_logs") == "true"
        items = []

        for obj in activity.cycles.all():
            items.append({"type": "cycle", "created_at": obj.created_at, "data": CycleSerializer(obj).data})

        for obj in activity.polls.select_related("created_by").all():
            items.append({"type": "poll", "created_at": obj.created_at, "data": PollSerializer(obj).data})

        for obj in activity.proposals.select_related("created_by").prefetch_related("votes__member").all():
            items.append({"type": "proposal", "created_at": obj.created_at, "data": ProposalSerializer(obj).data})

        for obj in activity.events.select_related("created_by").prefetch_related("rsvps__member").all():
            items.append({"type": "event", "created_at": obj.created_at, "data": EventSerializer(obj).data})

        for obj in activity.comments.filter(parent=None).select_related("member").all():
            items.append({"type": "comment", "created_at": obj.created_at, "data": CommentSerializer(obj).data})

        if include_logs:
            for obj in activity.logs.select_related("member").all():
                items.append({"type": "log", "created_at": obj.created_at, "data": LogSerializer(obj).data})

        items.sort(key=lambda x: x["created_at"], reverse=True)
        for item in items:
            item["created_at"] = item["created_at"].isoformat()

        return Response(items)


class MemberListView(ActivityMixin, APIView):
    def get(self, request, activity_id):
        self.get_member()
        members = self.get_activity().members.all()
        return Response(MemberSerializer(members, many=True).data)


class LogListView(ActivityMixin, APIView):
    def get(self, request, activity_id):
        self.get_member()
        logs = self.get_activity().logs.select_related("member").all()
        return Response(LogSerializer(logs, many=True).data)


class CycleCreateView(ActivityMixin, APIView):
    def post(self, request, activity_id):
        activity = self.get_activity()
        member = self.get_member()
        count = activity.cycles.count()
        name = (request.data.get("name") or f"{activity.title} #{count + 1}").strip()
        cycle = Cycle.objects.create(activity=activity, name=name, created_by=member)
        Log.record(activity, member, "started_cycle", name=name)
        return Response(CycleSerializer(cycle).data, status=201)


class CycleDetailView(ActivityMixin, APIView):
    def patch(self, request, activity_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        cycle = get_object_or_404(Cycle, id=pk, activity=activity)
        name = (request.data.get("name") or "").strip()
        if name:
            cycle.name = name
            cycle.save()
            Log.record(activity, member, "renamed_cycle", name=name, cycle_id=cycle.id)
        return Response(CycleSerializer(cycle).data)


class CommentListCreateView(ActivityMixin, APIView):
    def get(self, request, activity_id):
        self.get_member()
        qs = self.get_activity().comments.filter(parent=None).select_related("member")
        poll_id = request.query_params.get("poll")
        proposal_id = request.query_params.get("proposal")
        event_id = request.query_params.get("event")
        if poll_id:
            qs = qs.filter(poll_id=poll_id)
        elif proposal_id:
            qs = qs.filter(proposal_id=proposal_id)
        elif event_id:
            qs = qs.filter(event_id=event_id)
        else:
            qs = qs.filter(poll=None, proposal=None, event=None)
        return Response(CommentSerializer(qs, many=True).data)

    def post(self, request, activity_id):
        activity = self.get_activity()
        member = self.get_member()
        body = (request.data.get("body") or "").strip()
        if not body:
            return Response({"body": ["This field is required"]}, status=400)
        comment = Comment.objects.create(
            activity=activity,
            member=member,
            body=body,
            parent_id=request.data.get("parent"),
            poll_id=request.data.get("poll"),
            proposal_id=request.data.get("proposal"),
            event_id=request.data.get("event"),
        )
        Log.record(activity, member, "created_comment")
        return Response(CommentSerializer(comment).data, status=201)


class CommentDetailView(ActivityMixin, APIView):
    def delete(self, request, activity_id, pk):
        activity = self.get_activity()
        member = self.get_member()
        comment = get_object_or_404(Comment, id=pk, activity=activity)
        comment.deleted_at = timezone.now()
        comment.save()
        Log.record(activity, member, "soft_deleted", target="comment", target_id=pk)
        return Response(CommentSerializer(comment).data)
