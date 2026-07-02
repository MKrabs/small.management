---
type: Screen Spec
description: A specific date+time put forward by a member for others to vote on and finalize.
---

# Screen: Proposal View

A specific date+time put forward by a member. Others vote on it. Any member can finalize it into an Event.

## Layout

```
┌─────────────────────────────┐
│  Proposal header            │
├─────────────────────────────┤
│  Vote tally                 │
├─────────────────────────────┤
│  Member votes               │
├─────────────────────────────┤
│  Comments (collapsed)       │
└─────────────────────────────┘
  [ Vote ]     [ Set as Event ]  ← sticky bottom
```

## Proposal Header

- Proposed date + time (prominent)
- Proposed by · timestamp
- Soft-deleted state if applicable: greyed out, struck through

## Vote Tally

Three counts: **yes · maybe · no**. No percentages. Tapping a count shows who voted that way.

## Member Votes

Each member as a row:
- Avatar + display name
- yes / maybe / no chip
- Optional comment
- Members who haven't voted: greyed out

## Comments

Collapsed by default. Threaded replies. Same mechanic as standalone comment cards.

## Sticky Bottom

- **Vote** — opens a small sheet: yes / maybe / no + optional comment. Can be changed or retracted at any time.
- **Set as Event** — always visible to any member, no vote threshold required. Tapping prompts for an optional note, then creates the Event card in the activity feed and logs the action.
