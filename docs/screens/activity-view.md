---
type: Screen Spec
description: The main hub members land on after joining and return to for everything.
---

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
│  [ Comment card ]           │
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

Reverse-chronological. Three card types plus log entries and cycle folds. Poll cards are **interactive** — members vote without leaving the feed.

### Poll Card (all kinds)
- Kind label ("Poll" / "Day poll" / "Date range poll" / "Day & time poll") + title
- Participation count: "4 of 6 voted" · created by · timestamp
- Latest 3 top-level comments, read-only, with "View all N comments"
- Tapping title or comments opens the Poll view
- Archived state: greyed out, struck through, voting removed

Per kind:
- **Choice** — vote directly on the card: two big side-by-side buttons with voter avatars beneath (2 options) or bar rows with counts and avatar chips (3+). Anyone can add an option from the card.
- **Date** — a month calendar on the card: tap toggles a day, drag paints several days. Cells tint by group count.
- **Range** — the same calendar: drag creates a from–to vote, tap a single-day vote; own ranges listed as pills with endpoint moving and delete.
- **Date+time** — summary card only (own vote status in the corner); voting happens on the Poll view.

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
- Example: `Alex archived a poll · 3h ago`
- Not a card — styled as a subtle separator

### Cycle Fold
- Collapses all content from a previous cycle
- Label: "Karaoke night #1 · March 2025 ›"
- Tap to expand / collapse

## Sticky Bottom: + Button

Opens a large bottom sheet with actions:
- New Poll (choice / day / date range / day & time)
- New Comment
- Start New Cycle (available at any time, prominent after an event has passed)

## Empty State

No nudge. If a poll exists, its card is directly votable. If the feed is truly empty (just created), the `+` button is the only affordance.
