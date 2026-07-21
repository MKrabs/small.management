from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, AuthToken
from apps.activities.models import Activity, Member

AVATAR = {"chars": "MK", "bg": "teal", "border": "pink", "name_color": "teal", "shape": "heart", "rotation": 15}


def make_user(name="Marc", password="hunter22"):
    user = User(display_name=name)
    user.set_password(password)
    user.save()
    token = AuthToken.objects.create(user=user)
    return user, token


class MeUpdateTests(TestCase):
    def setUp(self):
        self.user, self.token = make_user()
        self.client = APIClient(headers={"Authorization": f"Bearer {self.token.token}"})

    def test_password_change_requires_current_password(self):
        res = self.client.patch("/api/auth/me/", {"password": "newpass1"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("current_password", res.json())

    def test_password_change_rejects_wrong_current_password(self):
        res = self.client.patch(
            "/api/auth/me/", {"password": "newpass1", "current_password": "wrong"}, format="json"
        )
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("hunter22"))

    def test_password_change_revokes_other_tokens_keeps_current(self):
        other = AuthToken.objects.create(user=self.user)
        res = self.client.patch(
            "/api/auth/me/", {"password": "newpass1", "current_password": "hunter22"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpass1"))
        tokens = set(self.user.tokens.values_list("pk", flat=True))
        self.assertEqual(tokens, {self.token.pk})
        self.assertNotIn(other.pk, tokens)

    def test_rename_to_taken_name_fails(self):
        make_user("Ana")
        res = self.client.patch("/api/auth/me/", {"display_name": "Ana"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("display_name", res.json())

    def test_rename_to_own_name_is_noop(self):
        res = self.client.patch("/api/auth/me/", {"display_name": "Marc"}, format="json")
        self.assertEqual(res.status_code, 200)

    def test_avatar_roundtrip(self):
        res = self.client.patch("/api/auth/me/", {"avatar": AVATAR}, format="json")
        self.assertEqual(res.status_code, 200)
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.json()["avatar"], AVATAR)
        # clearing resets to default
        res = self.client.patch("/api/auth/me/", {"avatar": None}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.json()["avatar"])

    def test_avatar_validation(self):
        for bad in (
            {**AVATAR, "shape": "star"},
            {**AVATAR, "bg": "#ff0000"},
            {**AVATAR, "rotation": 7},
            {**AVATAR, "rotation": 360},
            {**AVATAR, "chars": "way too long"},
        ):
            res = self.client.patch("/api/auth/me/", {"avatar": bad}, format="json")
            self.assertEqual(res.status_code, 400, bad)

    def test_seen_changelog_version_roundtrip(self):
        res = self.client.patch("/api/auth/me/", {"seen_changelog_version": "v0.0.9"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["seen_changelog_version"], "v0.0.9")

    def test_delete_requires_correct_password(self):
        res = self.client.delete("/api/auth/me/", {}, format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.delete("/api/auth/me/", {"password": "wrong"}, format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.delete("/api/auth/me/", {"password": "hunter22"}, format="json")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())


class MemberAvatarTests(TestCase):
    def test_member_list_exposes_linked_user_avatar_guest_null(self):
        user, token = make_user()
        user.avatar = AVATAR
        user.save()
        activity = Activity.objects.create(title="Test night")
        Member.objects.create(activity=activity, user=user, display_name=user.display_name)
        Member.objects.create(
            activity=activity, display_name="Guest", session_token="00000000-0000-0000-0000-000000000002"
        )
        client = APIClient(headers={"Authorization": f"Bearer {token.token}"})
        res = client.get(f"/api/activities/{activity.short_id}/members/")
        self.assertEqual(res.status_code, 200)
        by_name = {m["display_name"]: m["avatar"] for m in res.json()}
        self.assertEqual(by_name["Marc"], AVATAR)
        self.assertIsNone(by_name["Guest"])
