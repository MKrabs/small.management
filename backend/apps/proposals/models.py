from django.db import models
from apps.choices import VoteStatus


class Proposal(models.Model):
    activity = models.ForeignKey("activities.Activity", on_delete=models.CASCADE, related_name="proposals")
    cycle = models.ForeignKey("activities.Cycle", on_delete=models.SET_NULL, null=True, blank=True, related_name="proposals")
    poll = models.ForeignKey("polls.Poll", on_delete=models.SET_NULL, null=True, blank=True, related_name="proposals")
    proposed_date = models.DateField()
    proposed_time = models.TimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    created_by = models.ForeignKey("activities.Member", on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["proposed_date", "proposed_time"]

    def __str__(self):
        return f"Proposal {self.proposed_date} {self.proposed_time or ''}".strip()


class ProposalVote(models.Model):
    proposal = models.ForeignKey(Proposal, on_delete=models.CASCADE, related_name="votes")
    member = models.ForeignKey("activities.Member", on_delete=models.CASCADE)
    status = models.CharField(max_length=5, choices=VoteStatus.choices)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)  # retraction

    class Meta:
        unique_together = [("proposal", "member")]

    def __str__(self):
        return f"{self.member} {self.status} on {self.proposal}"
