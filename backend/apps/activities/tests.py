from django.test import TestCase
from rest_framework.test import APIClient

from apps.activities.models import Activity, Comment, Member


class ThreadCommentTests(TestCase):
    def setUp(self):
        self.activity = Activity.objects.create(title="Test night")
        self.member = Member.objects.create(
            activity=self.activity, display_name="Ana", session_token="00000000-0000-0000-0000-000000000001",
        )
        self.client = APIClient(headers={"X-Session-Token": str(self.member.session_token)})
        self.base = f"/api/activities/{self.activity.short_id}"

    def _comment(self, body, parent=None):
        return Comment.objects.create(activity=self.activity, member=self.member, body=body, parent=parent)

    def test_thread_query_returns_whole_subtree(self):
        thread = self._comment("thread root")
        reply = self._comment("reply", parent=thread)
        nested = self._comment("nested reply", parent=reply)
        other_thread = self._comment("unrelated thread")
        self._comment("unrelated reply", parent=other_thread)

        res = self.client.get(f"{self.base}/comments/?thread={thread.id}")
        self.assertEqual(res.status_code, 200)
        ids = {c["id"] for c in res.json()}
        self.assertEqual(ids, {reply.id, nested.id})

    def test_feed_shows_thread_roots_but_not_replies(self):
        thread = self._comment("thread root")
        self._comment("reply", parent=thread)

        res = self.client.get(f"{self.base}/comments/")
        self.assertEqual([c["id"] for c in res.json()], [thread.id])
