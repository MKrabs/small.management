import uuid as uuid_lib
from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    display_name = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=128)
    avatar = models.JSONField(null=True, blank=True)
    # last changelog version the user opened; drives the "news" dot in the nav
    seen_changelog_version = models.CharField(max_length=20, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def __str__(self):
        return self.display_name


class AuthToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tokens")
    token = models.UUIDField(default=uuid_lib.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
