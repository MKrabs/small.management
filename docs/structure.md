---
type: Product Doc
description: Entity hierarchy (Activity → Poll/Proposal/Event) and the planning loop.
---

# Product Structure

## Hierarchy

```
Activity  ("Karaoke night at my place")
├── Poll          → members share availability
├── Proposal(s)   → a member suggests a specific date+time
│   └── Votes on proposal
├── Event         → fixed date+time, RSVP, iCal
├── Comments      → standalone or attached to any card
├── Log           → history of meaningful actions
└── New Cycle     → next round of planning for the same activity
```

An Activity is the top-level container. Everything else lives inside it. Multiple Activities can run in parallel for the same group of people.

## The Planning Loop

1. A member creates a **Poll** ("when are you free?")
2. Members share their availability via the slot editor
3. A member reads the responses and creates one or more **Proposals** (specific date+time)
4. Members vote on proposals
5. A member finalizes a proposal → becomes an **Event**
6. Members RSVP to the event
7. After the event, any member can start a **New Cycle** — same activity, fresh planning round

## Cycles

Starting a new cycle collapses the previous history in the frontend (not in the database). The collapsed section is labelled with the cycle name and date. Previous cycles can be re-expanded.

Default cycle name: incremented ("Karaoke night #2"). Any member can rename it at any time.

## Activity Lifecycle

- Activities have no enforced end date. They can sit dormant indefinitely.
- Events auto-archive 1 day after the event date passes.
- Everything uses soft delete — nothing is permanently removed from the database.

## Multiple Polls / Proposals

Any number of polls and proposals can be active simultaneously within an activity. Members manage the chaos themselves.
