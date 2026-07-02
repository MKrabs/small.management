from django.db import models
from apps.choices import VoteStatus


class Poll(models.Model):
    activity = models.ForeignKey("activities.Activity", on_delete=models.CASCADE, related_name="polls")
    cycle = models.ForeignKey("activities.Cycle", on_delete=models.SET_NULL, null=True, blank=True, related_name="polls")
    title = models.CharField(max_length=200)
    created_by = models.ForeignKey("activities.Member", on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title


class Slot(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="slots")
    member = models.ForeignKey("activities.Member", on_delete=models.CASCADE)
    status = models.CharField(max_length=5, choices=VoteStatus.choices)
    date = models.DateField(null=True, blank=True)  # null = general yes/maybe/no
    time_start = models.TimeField(null=True, blank=True)
    time_end = models.TimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["date", "time_start"]

    def __str__(self):
        return f"{self.member} {self.status} on {self.date}"
