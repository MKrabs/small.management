from django.test import TestCase
from rest_framework.test import APIClient

from apps.activities.models import Activity, Member


class PollKindTests(TestCase):
    def setUp(self):
        self.activity = Activity.objects.create(title="Test night")
        self.member = Member.objects.create(
            activity=self.activity, display_name="Ana", session_token="00000000-0000-0000-0000-000000000001",
        )
        self.other = Member.objects.create(
            activity=self.activity, display_name="Ben", session_token="00000000-0000-0000-0000-000000000002",
        )
        self.client = APIClient(headers={"X-Session-Token": str(self.member.session_token)})
        self.base = f"/api/activities/{self.activity.short_id}"

    def _create(self, **payload):
        return self.client.post(f"{self.base}/polls/", payload, format="json")

    def test_choice_poll_needs_two_options(self):
        self.assertEqual(self._create(title="Pizza?", kind="choice", options=["Yes"]).status_code, 400)

    def test_single_choice_vote_replaces_previous(self):
        poll = self._create(title="Pizza?", kind="choice", options=["Yes", "No"]).json()
        opt_yes, opt_no = [o["id"] for o in poll["options"]]
        self.client.put(f"{self.base}/polls/{poll['id']}/options/{opt_yes}/vote/")
        data = self.client.put(f"{self.base}/polls/{poll['id']}/options/{opt_no}/vote/").json()
        votes = {o["label"]: len(o["voters"]) for o in data["options"]}
        self.assertEqual(votes, {"Yes": 0, "No": 1})
        self.assertTrue([o for o in data["options"] if o["label"] == "No"][0]["my_vote"])
        self.assertEqual(data["voter_count"], 1)

    def test_multiple_choice_keeps_votes(self):
        poll = self._create(title="Toppings", kind="choice", allow_multiple=True, options=["Ham", "Onion"]).json()
        for opt in poll["options"]:
            self.client.put(f"{self.base}/polls/{poll['id']}/options/{opt['id']}/vote/")
        data = self.client.get(f"{self.base}/polls/{poll['id']}/").json()
        self.assertEqual([len(o["voters"]) for o in data["options"]], [1, 1])

    def test_unvote(self):
        poll = self._create(title="Pizza?", kind="choice", options=["Yes", "No"]).json()
        opt = poll["options"][0]["id"]
        self.client.put(f"{self.base}/polls/{poll['id']}/options/{opt}/vote/")
        data = self.client.delete(f"{self.base}/polls/{poll['id']}/options/{opt}/vote/").json()
        self.assertEqual(len(data["options"][0]["voters"]), 0)

    def test_anyone_can_add_option(self):
        poll = self._create(title="Pizza?", kind="choice", options=["Yes", "No"]).json()
        other = APIClient(headers={"X-Session-Token": str(self.other.session_token)})
        res = other.post(f"{self.base}/polls/{poll['id']}/options/", {"label": "Maybe"}, format="json")
        self.assertEqual(res.status_code, 201)

    def test_date_poll_slots_are_binary_days(self):
        poll = self._create(title="Which day", kind="date").json()
        slots_url = f"{self.base}/polls/{poll['id']}/slots/"
        ok = self.client.post(slots_url, {"date": "2026-07-10"}, format="json")
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.json()["status"], "yes")
        bad = self.client.post(slots_url, {"date": "2026-07-10", "time_start": "18:00"}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_range_poll_needs_ordered_range(self):
        poll = self._create(title="Trip", kind="range").json()
        slots_url = f"{self.base}/polls/{poll['id']}/slots/"
        self.assertEqual(self.client.post(slots_url, {"date": "2026-07-10"}, format="json").status_code, 400)
        self.assertEqual(
            self.client.post(slots_url, {"date": "2026-07-12", "date_end": "2026-07-10"}, format="json").status_code, 400,
        )
        ok = self.client.post(slots_url, {"date": "2026-07-10", "date_end": "2026-07-12"}, format="json")
        self.assertEqual(ok.status_code, 201)

    def test_datetime_poll_rejects_choice_votes_and_keeps_tristate(self):
        poll = self._create(title="When", kind="datetime").json()
        slots_url = f"{self.base}/polls/{poll['id']}/slots/"
        ok = self.client.post(slots_url, {"date": "2026-07-10", "status": "maybe", "time_start": "18:00", "time_end": "20:00"}, format="json")
        self.assertEqual(ok.status_code, 201)
        no_date = self.client.post(slots_url, {"status": "yes"}, format="json")
        self.assertEqual(no_date.status_code, 400)

    def test_finalize_creates_event(self):
        poll = self._create(title="Trip", kind="range").json()
        missing = self.client.post(f"{self.base}/polls/{poll['id']}/finalize/", {}, format="json")
        self.assertEqual(missing.status_code, 400)
        res = self.client.post(
            f"{self.base}/polls/{poll['id']}/finalize/", {"date": "2026-07-10", "time_start": "19:00"}, format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["date"], "2026-07-10")

    def test_feed_poll_includes_kind_and_comments(self):
        poll = self._create(title="Pizza?", kind="choice", options=["Yes", "No"]).json()
        self.client.post(f"{self.base}/comments/", {"body": "hot take", "poll": poll["id"]}, format="json")
        feed = self.client.get(f"{self.base}/feed/").json()
        item = next(i["data"] for i in feed if i["type"] == "poll")
        self.assertEqual(item["kind"], "choice")
        self.assertEqual(item["comment_count"], 1)
        self.assertEqual(item["latest_comments"][0]["body"], "hot take")
