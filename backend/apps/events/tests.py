from django.test import TestCase
from rest_framework.test import APIClient

from apps.activities.models import Activity, Member
from apps.events.models import Event


class RsvpRetractTests(TestCase):
    def setUp(self):
        self.activity = Activity.objects.create(title="Test night")
        self.member = Member.objects.create(
            activity=self.activity, display_name="Ana", session_token="00000000-0000-0000-0000-000000000001",
        )
        self.client = APIClient(headers={"X-Session-Token": str(self.member.session_token)})
        self.event = Event.objects.create(activity=self.activity, date="2026-07-18")
        self.url = f"/api/activities/{self.activity.short_id}/events/{self.event.id}/rsvps/"

    def test_delete_removes_own_rsvp(self):
        self.client.put(self.url, {"status": "going", "comment": ""}, format="json")
        self.assertEqual(self.event.rsvps.count(), 1)
        res = self.client.delete(self.url)
        self.assertEqual(res.status_code, 204)
        self.assertEqual(self.event.rsvps.count(), 0)

    def test_delete_without_rsvp_is_noop(self):
        self.assertEqual(self.client.delete(self.url).status_code, 204)


class EventNoteTests(TestCase):
    def setUp(self):
        self.activity = Activity.objects.create(title="Test night")
        self.member = Member.objects.create(
            activity=self.activity, display_name="Ana", session_token="00000000-0000-0000-0000-000000000001",
        )
        self.client = APIClient(headers={"X-Session-Token": str(self.member.session_token)})
        self.event = Event.objects.create(activity=self.activity, date="2026-07-18", note="bring snacks")
        self.url = f"/api/activities/{self.activity.short_id}/events/{self.event.id}/"

    def test_patch_edits_and_removes_note(self):
        res = self.client.patch(self.url, {"note": "bring games"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["note"], "bring games")
        res = self.client.patch(self.url, {"note": ""}, format="json")
        self.assertEqual(res.json()["note"], "")
        self.assertEqual(self.activity.logs.filter(action_type="edited_note").count(), 2)

    def test_patch_without_note_key_keeps_note(self):
        res = self.client.patch(self.url, {"archived": True}, format="json")
        self.assertEqual(res.json()["note"], "bring snacks")
