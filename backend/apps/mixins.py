from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotAuthenticated, PermissionDenied


class ActivityMixin:
    def get_activity(self):
        if not hasattr(self, "_activity"):
            from apps.activities.models import Activity
            self._activity = get_object_or_404(Activity, short_id=self.kwargs["activity_id"])
        return self._activity

    def get_member(self):
        if not hasattr(self, "_member"):
            from apps.activities.models import Member
            from apps.accounts.models import User
            activity = self.get_activity()
            if isinstance(self.request.user, User):
                self._member = get_object_or_404(Member, activity=activity, user=self.request.user)
            elif isinstance(self.request.auth, Member):
                member = self.request.auth
                if member.activity_id != activity.id:
                    raise PermissionDenied("Not a member of this activity")
                self._member = member
            else:
                raise NotAuthenticated()
        return self._member
