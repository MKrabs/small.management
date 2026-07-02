---
type: Product Doc
description: Poll and proposal voting model, heatmap rules, and finalizing.
---

# Voting

## Poll Voting Model

Members express availability at the day level, with optional time range and note. This is Option B: day-level votes with time annotations.

Each vote entry has:
- **Status** — `yes` / `maybe` / `no` (enum, not a number)
- **Day** — a specific date (optional; omitting means "general yes/maybe/no")
- **Time range** — a start and end time within the day, 30-minute resolution (optional)
- **Note** — free text (optional)

One day can have multiple entries with different statuses (e.g., `no` before 17h, `maybe` 17h–19h30, `yes` after 20h).

## General Yes / No

A vote with no date specified is a general statement of intent. It counts toward the member count but does not appear on the heatmap. Members who submit only a general vote are nudged (not forced) to add specific dates.

## Heatmap

The group overview shows raw vote counts per day and time slot. Darker = more people available.

- Only day/time-specific votes appear on the heatmap
- No "of X members" framing — the count shown is simply how many voted for that slot
- General yes/no voters are invisible on the heatmap

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

Any member can fully retract their vote at any time. Retractions are logged as a destructive action.

## Proposal Voting

Proposals are voted on separately with a simpler model: `yes` / `maybe` / `no` + optional comment. No time ranges — the proposal already has a fixed date and time.

## Finalizing

Any member can finalize a proposal into an Event at any time, regardless of vote counts or thresholds. First member to act wins. The log records who did it.
