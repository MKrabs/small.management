from django.db import models
from apps.choices import RSVPStatus


class Event(models.Model):
    activity = models.ForeignKey("activities.Activity", on_delete=models.CASCADE, related_name="events")
    cycle = models.ForeignKey("activities.Cycle", on_delete=models.SET_NULL, null=True, blank=True, related_name="events")
    poll = models.ForeignKey("polls.Poll", on_delete=models.SET_NULL, null=True, blank=True, related_name="events")
    date = models.DateField()
    time_start = models.TimeField(null=True, blank=True)
    time_end = models.TimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    created_by = models.ForeignKey("activities.Member", on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Event {self.date} ({self.activity})"


class RSVP(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="rsvps")
    member = models.ForeignKey("activities.Member", on_delete=models.CASCADE)
    status = models.CharField(max_length=9, choices=RSVPStatus.choices)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("event", "member")]

    def __str__(self):
        return f"{self.member} {self.status} to {self.event}"
