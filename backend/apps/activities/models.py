import uuid
import secrets
import string
from django.db import models
from django.utils.text import slugify
from django.contrib.auth.hashers import make_password, check_password

_CHARS = string.ascii_lowercase + string.digits


def _short_id():
    return "".join(secrets.choice(_CHARS) for _ in range(6))


class Activity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    short_id = models.CharField(max_length=6, unique=True, db_index=True, default=_short_id)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=40)
    pin_hash = models.CharField(max_length=128, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.short_id:
            candidate = _short_id()
            while Activity.objects.filter(short_id=candidate).exists():
                candidate = _short_id()
            self.short_id = candidate
        if not self.slug:
            self.slug = slugify(self.title)[:40]
        super().save(*args, **kwargs)

    def set_pin(self, raw_pin):
        self.pin_hash = make_password(raw_pin)

    def check_pin(self, raw_pin):
        return check_password(raw_pin, self.pin_hash)

    def __str__(self):
        return self.title


class Member(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    display_name = models.CharField(max_length=50)
    session_token = models.UUIDField(null=True, blank=True, unique=True, db_index=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.display_name} in {self.activity}"


class Cycle(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name="cycles")
    name = models.CharField(max_length=200)
    created_by = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.name} ({self.activity})"


class Log(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name="logs")
    member = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=50)
    details = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def record(cls, activity, member, action_type, **details):
        cls.objects.create(activity=activity, member=member, action_type=action_type, details=details)

    def __str__(self):
        return f"{self.action_type} by {self.member} at {self.created_at}"


class Comment(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name="comments")
    cycle = models.ForeignKey(Cycle, on_delete=models.SET_NULL, null=True, blank=True)
    member = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True)
    body = models.TextField()
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies")
    # At most one of these is set (standalone if all null)
    poll = models.ForeignKey("polls.Poll", on_delete=models.CASCADE, null=True, blank=True, related_name="comments")
    proposal = models.ForeignKey("proposals.Proposal", on_delete=models.CASCADE, null=True, blank=True, related_name="comments")
    event = models.ForeignKey("events.Event", on_delete=models.CASCADE, null=True, blank=True, related_name="comments")
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
