# Governance

## No Admin

There is no admin role. Every member of an activity has equal power. Any member can:
- Create a poll, proposal, comment, or new cycle
- Vote on anything
- Finalize a proposal into an event
- Soft-delete any card
- Change the activity PIN
- Rename a cycle

The group is accountable to itself. The activity log is the accountability layer.

## Soft Delete

Nothing is permanently deleted. Any member can soft-delete any card (poll, proposal, event, comment, vote). Soft-deleted items are visually struck through or greyed out in the feed. The deletion is logged. Any member can see what was deleted and who deleted it.

## Activity Log

A chronological record of meaningful actions within the activity. Visible to all members.

**Logged actions include:**
- Creating a poll, proposal, event, or comment
- Voting or retracting a vote
- Finalizing a proposal
- Soft-deleting anything
- Changing the PIN
- Renaming a cycle
- Starting a new cycle

**Not logged:**
- Viewing the activity
- Opening a card
- Any passive interaction

**Format:** Plain text with inline styling.
Examples:
- `John created a proposal for Friday 4 July at 20h`
- `Jannice voted [yes] on proposal #2`
- `Alex set proposal #1 as deleted`
- `Sam retracted their vote on poll #1`

The log toggle in the activity header is off by default. Turning it on shows log entries inline in the feed, chronologically between cards.

## Deadlines

The service never enforces deadlines. Polls, proposals, and activities have no expiry. Members may optionally add a deadline attribute to a poll or proposal as informational metadata, but the service takes no action when it passes.
