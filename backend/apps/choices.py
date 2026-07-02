from django.db import models


class VoteStatus(models.TextChoices):
    YES = "yes", "Yes"
    MAYBE = "maybe", "Maybe"
    NO = "no", "No"


class RSVPStatus(models.TextChoices):
    GOING = "going", "Going"
    MAYBE = "maybe", "Maybe"
    NOT_GOING = "not_going", "Not going"
