# Screen: Activity View

The main hub. Members land here after joining and return here for everything.

## Layout

```
┌─────────────────────────────┐
│  Header (sticky)            │
├─────────────────────────────┤
│                             │
│  Feed (scrollable,          │
│  newest on top)             │
│                             │
│  [ Cycle fold ]  ← older   │
│  [ Event card ]             │
│  [ Proposal card ]          │
│  [ Comment card ]           │
│  [ Proposal card ]          │
│  [ Poll card ]   ← newest  │
│                             │
└─────────────────────────────┘
        [ + ]  ← sticky bottom
```

Max-width reading width. Centered. Responsive.

## Header (sticky)

- Activity title
- Member avatars / count — tapping opens member list
- Share link button — copies URL to clipboard
- PIN indicator if activity is PIN-protected
- Log toggle — default off; when on, log entries appear inline in the feed

## Feed

Reverse-chronological. Four card types plus log entries and cycle folds.

### Poll Card
- Label: "Poll" + creation date
- Created by · timestamp
- Participation count: "4 of 6 have shared availability"
- Member's current vote status in the corner: `✓ yes · – date · – time` (yes in blue, missing fields in grey)
- CTA: "Vote" / "Edit vote" → opens Poll view

### Proposal Card
- Label: "Proposal" + proposed date+time
- Proposed by · timestamp
- Vote tally: yes · maybe · no counts
- CTA: "Vote" + "Set as Event" (any member, always visible)
- Soft-deleted state: greyed out, struck through

### Event Card
- Most visually prominent card
- Fixed date + time
- Optional note from the member who finalized it
- RSVP counts: going · maybe · not going
- "Add to calendar" iCal link
- After event date + 1 day: dimmed, "This event has passed" label

### Comment Card
- Standalone comment (not attached to a specific card)
- Author · timestamp
- Reply thread, collapsed by default

### Log Entry (when toggle is on)
- Single line of text between cards
- Example: `Alex set proposal #2 as deleted · 3h ago`
- Not a card — styled as a subtle separator

### Cycle Fold
- Collapses all content from a previous cycle
- Label: "Karaoke night #1 · March 2025 ›"
- Tap to expand / collapse

## Sticky Bottom: + Button

Opens a large bottom sheet with actions:
- New Poll
- New Proposal
- New Comment
- Start New Cycle (available at any time, prominent after an event has passed)

## Empty State

No nudge. If a poll exists, the poll card's "Vote" CTA is the only affordance needed. If the feed is truly empty (just created), the `+` button is the only affordance.
