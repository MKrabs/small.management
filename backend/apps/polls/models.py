from django.db import models
from apps.choices import VoteStatus


class PollKind(models.TextChoices):
    CHOICE = "choice"       # options + votes
    DATE = "date"           # binary day votes
    DATETIME = "datetime"   # tri-state day + time slots
    RANGE = "range"         # binary from–to day votes


class Poll(models.Model):
    activity = models.ForeignKey("activities.Activity", on_delete=models.CASCADE, related_name="polls")
    cycle = models.ForeignKey("activities.Cycle", on_delete=models.SET_NULL, null=True, blank=True, related_name="polls")
    kind = models.CharField(max_length=8, choices=PollKind.choices, default=PollKind.DATETIME)
    allow_multiple = models.BooleanField(default=False)  # choice polls only
    title = models.CharField(max_length=200)
    created_by = models.ForeignKey("activities.Member", on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)  # voting finished (reversible)

    def __str__(self):
        return self.title


class Option(models.Model):
    """A votable option on a choice poll. Any member can add one."""
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="options")
    label = models.CharField(max_length=200)
    position = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey("activities.Member", on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["position", "created_at"]

    def __str__(self):
        return f"{self.label} ({self.poll})"


class OptionVote(models.Model):
    # ponytail: hard delete on unvote — soft delete fights the unique constraint on re-vote
    option = models.ForeignKey(Option, on_delete=models.CASCADE, related_name="votes")
    member = models.ForeignKey("activities.Member", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("option", "member")]

    def __str__(self):
        return f"{self.member} voted {self.option}"


class Slot(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="slots")
    member = models.ForeignKey("activities.Member", on_delete=models.CASCADE)
    status = models.CharField(max_length=5, choices=VoteStatus.choices)
    date = models.DateField(null=True, blank=True)  # null = general yes/maybe/no
    date_end = models.DateField(null=True, blank=True)  # range polls: inclusive end of from–to vote
    time_start = models.TimeField(null=True, blank=True)
    time_end = models.TimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["date", "time_start"]

    def __str__(self):
        return f"{self.member} {self.status} on {self.date}"
