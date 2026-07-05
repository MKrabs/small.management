---
type: Product Doc
description: The no-admin model, archiving, and the activity log.
---

# Governance

## No Admin

There is no admin role. Every member of an activity has equal power. Any member can:
- Create a poll, comment, or new cycle
- Vote on anything
- Finish voting on a poll (and resume it)
- Archive (and unarchive) any card, or the whole activity
- Change the activity PIN
- Rename a cycle

The group is accountable to itself. The activity log is the accountability layer.

## Archiving

Nothing is permanently deleted. Any member can archive any card (poll, comment) or the whole activity, and unarchive it again at any time. Archived items are visually struck through or greyed out in the feed. Archiving is logged. Any member can see what was archived and who archived it.

Removing a poll option is the one destructive-feeling exception: the option disappears from the ballot and votes placed on it are invalidated. If the option had votes, the system posts a ⚠️ warning comment on the poll stating what was removed and how many votes were invalidated; warning comments are tinted yellow.

## Activity Log

A chronological record of meaningful actions within the activity. Visible to all members.

**Logged actions include:**
- Creating a poll, event, or comment
- Voting or retracting a vote
- Finishing or resuming voting
- Archiving or unarchiving anything
- Removing a poll option
- Changing the PIN
- Renaming a cycle
- Starting a new cycle

**Not logged:**
- Viewing the activity
- Opening a card
- Any passive interaction

**Format:** Plain text with inline styling.
Examples:
- `John finished voting on a poll`
- `Alex archived a poll`
- `Sam retracted their vote on poll #1`

The log toggle in the activity header is off by default. Turning it on shows log entries inline in the feed, chronologically between cards.

## Deadlines

The service never enforces deadlines. Polls and activities have no expiry. Members may optionally add a deadline attribute to a poll as informational metadata, but the service takes no action when it passes.
