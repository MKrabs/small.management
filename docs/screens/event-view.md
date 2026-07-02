# Screen: Event View

The fixed outcome. RSVP, share the date, close the loop.

## Layout

```
┌─────────────────────────────┐
│  Event header               │
├─────────────────────────────┤
│  RSVP bar                   │
├─────────────────────────────┤
│  Member RSVPs               │
├─────────────────────────────┤
│  Add to calendar            │
├─────────────────────────────┤
│  Comments (collapsed)       │
└─────────────────────────────┘
  [ RSVP ]   [ Start new cycle ]  ← sticky bottom
```

## Event Header

- Date + time — the most prominent element on the screen
- Finalized by · timestamp
- Optional note left by whoever finalized ("come earlier if you want, around 18h")
- After event date + 1 day: card dims, "This event has passed" label appears

## RSVP Bar

Three counts: **going · maybe · not going**. Tapping a count shows who.

## Member RSVPs

Each member as a row:
- Avatar + display name
- going / maybe / not going chip
- Optional comment
- Non-responders: greyed out

## Add to Calendar

A single "Add to calendar" button. Generates a standard `.ics` file with the event title, date, and time. No account required.

## Comments

Collapsed by default. Threaded replies.

## Sticky Bottom

- **RSVP** — sheet with going / maybe / not going + optional comment. Can be changed at any time.
- **Start new cycle** — available at any time; becomes prominent after the event date has passed. Prompts for a cycle name, defaults to the incremented name ("Karaoke night #2").
