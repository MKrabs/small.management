---
type: Product Doc
description: Entity hierarchy (Activity → Poll/Event) and the planning loop.
---

# Product Structure

## Hierarchy

```
Activity  ("Karaoke night at my place")
├── Poll(s)       → typed decisions: choice / date / date+time / date range
│   ├── Options + votes   (choice polls)
│   └── Slots             (date-based polls)
├── Event         → fixed date+time, RSVP, iCal
├── Comments      → threaded (Reddit-style); standalone or attached to a poll/event
├── Log           → history of meaningful actions
└── New Cycle     → next round of planning for the same activity
```

An Activity is the top-level container. Everything else lives inside it. Multiple Activities can run in parallel for the same group of people.

## Poll Kinds

| Kind | Question | Voting |
|---|---|---|
| `choice` | "Pizza or sushi?" | Pick one (or several if allowed) of the options; anyone can add options |
| `date` | "Which day?" | Tap/drag days on a calendar — each day is a binary vote |
| `range` | "Which week works?" | Drag from–to on a calendar — each vote is a date range |
| `datetime` | "When exactly?" | Day + time slots with yes/maybe/no (the classic availability poll) |

## The Planning Loop

1. A member creates a **Poll** of whatever kind fits the question
2. Members vote — right on the feed card for choice/date/range polls, on the dedicated page for date+time
3. Any member **finalizes** the winning date into an **Event**
4. Members RSVP to the event
5. After the event, any member can start a **New Cycle** — same activity, fresh planning round

Proposals were removed: polls finalize straight into events (pick the date, optionally a time).

## Feed Cards

The activity feed shows interactive decision cards: vote and add options without leaving the feed, see the latest 3 top-level comments, tap through for full results and the threaded comment tree. Date+time polls are summary cards only — their editor lives on the dedicated page.

## Cycles

Starting a new cycle collapses the previous history in the frontend (not in the database). The collapsed section is labelled with the cycle name and date. Previous cycles can be re-expanded.

Default cycle name: incremented ("Karaoke night #2"). Any member can rename it at any time.

## Activity Lifecycle

- Activities have no enforced end date. They can sit dormant indefinitely.
- Events auto-archive 1 day after the event date passes.
- Everything uses soft delete — nothing is permanently removed from the database.

## Multiple Polls

Any number of polls can be active simultaneously within an activity. Members manage the chaos themselves.
