---
type: Product Doc
description: Voting models per poll kind, heatmap rules, and finishing a vote.
---

# Voting

## Choice Polls

Options with votes. Single-choice polls replace the member's previous vote when they pick another option; multiple-choice polls (`allow_multiple`) accumulate. Any member can add options after creation, reorder them by dragging, or remove one — removing a voted option invalidates its votes and posts a ⚠️ system comment on the poll. Votes are hard-deleted on unvote (no retraction history).

UI: exactly two options render as two big side-by-side buttons with voter avatars beneath; three or more render as rows with proportional bars, counts, and avatar chips.

## Date & Range Polls (binary)

Selected = available. No maybe/no, no time ranges.

- **Date polls**: each selected day is one vote (a Slot with `date`, status forced to `yes`). Tap toggles a day, dragging paints several days at once.
- **Range polls**: each vote is one from–to span (Slot `date` + `date_end`). Dragging creates a range, a tap creates a single-day range, and a member can have several ranges. Tapping an endpoint of an own range activates it — the next calendar tap moves that endpoint.

The calendar tints days by how many members cover them and shows the count in the cell.

## Date+Time Polls (tri-state)

The classic availability model. Members express availability at the day level, with optional time range and note. Each vote entry has:

- **Status** — `yes` / `maybe` / `no` (enum, not a number)
- **Day** — a specific date (required)
- **Time range** — a start and end time within the day, 30-minute resolution (optional)
- **Note** — free text (optional)

One day can have multiple entries with different statuses (e.g., `no` before 17h, `maybe` 17h–19h30, `yes` after 20h). The general no-date vote was dropped.

## Heatmap (date+time polls)

The group overview shows raw vote counts per day and time slot. Darker = more people available. No "of X members" framing — the count shown is simply how many voted for that slot.

Day colors in the monthly calendar (slot editor):

| Color | Meaning |
|---|---|
| Green | Yes only (all day or with time range) |
| Orange | Maybe only |
| Red | No only |
| Green + Orange | Mix of yes and maybe |
| Orange + Red | Mix of maybe and no |
| Green + Orange + Red | All three present |

## Retracting a Vote

Any member can fully retract their vote at any time. Slot retractions are logged as a destructive action.

## Finishing a Vote

Any member can finish voting on a poll at any time, regardless of vote counts or thresholds. A finished poll stays visible with its results but accepts no more votes, options, or slot changes. The action is reversible — any member can resume voting. Both directions are logged.

The leading choice(s) — options or calendar days with the most votes, once something has at least 2 — are marked with a crown.

(The legacy finalize-into-event endpoint still exists in the API but has no UI.)
