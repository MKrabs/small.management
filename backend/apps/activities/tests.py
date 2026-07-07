from django.test import TestCase
from rest_framework.test import APIClient

from apps.activities.models import Activity, Comment, Cycle, Member
from apps.polls.models import Poll


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


class CycleDeleteTests(TestCase):
    def setUp(self):
        self.activity = Activity.objects.create(title="Test night")
        self.member = Member.objects.create(
            activity=self.activity, display_name="Ana", session_token="00000000-0000-0000-0000-000000000001",
        )
        self.client = APIClient(headers={"X-Session-Token": str(self.member.session_token)})
        self.base = f"/api/activities/{self.activity.short_id}"

    def test_delete_keeps_content_and_logs(self):
        cycle = Cycle.objects.create(activity=self.activity, name="Round 2", created_by=self.member)
        poll = Poll.objects.create(activity=self.activity, cycle=cycle, title="Where?", created_by=self.member)

        res = self.client.delete(f"{self.base}/cycles/{cycle.id}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Cycle.objects.filter(id=cycle.id).exists())
        poll.refresh_from_db()  # survives with its cycle tag nulled
        self.assertIsNone(poll.cycle)
        log = self.activity.logs.first()
        self.assertEqual(log.action_type, "deleted_cycle")
        self.assertEqual(log.details["name"], "Round 2")

    def test_archive_toggle(self):
        cycle = Cycle.objects.create(activity=self.activity, name="Round 2", created_by=self.member)
        res = self.client.patch(f"{self.base}/cycles/{cycle.id}/", {"archived": True}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(res.json()["archived_at"])
        res = self.client.patch(f"{self.base}/cycles/{cycle.id}/", {"archived": False}, format="json")
        self.assertIsNone(res.json()["archived_at"])

    def test_delete_other_activitys_cycle_404s(self):
        other = Activity.objects.create(title="Other")
        cycle = Cycle.objects.create(activity=other, name="Theirs")
        res = self.client.delete(f"{self.base}/cycles/{cycle.id}/")
        self.assertEqual(res.status_code, 404)
        self.assertTrue(Cycle.objects.filter(id=cycle.id).exists())
