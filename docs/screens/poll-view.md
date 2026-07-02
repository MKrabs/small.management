# Screen: Poll View

Where a member shares their own availability and sees the group's collective picture.

## Layout

```
┌─────────────────────────────┐
│  Poll header                │
├─────────────────────────────┤
│  Group heatmap              │
├─────────────────────────────┤
│  Your availability          │
│  [ slot ] [ slot ] [ + ]    │
├─────────────────────────────┤
│  Per-member breakdown       │
│  (expandable)               │
├─────────────────────────────┤
│  Comments (collapsed)       │
└─────────────────────────────┘
     [ Create Proposal ]  ← sticky bottom
```

## Poll Header

- Poll title / question
- Created by · timestamp
- "X of Y members have shared availability"

## Group Heatmap

Aggregated view of all day/time-specific votes. Darker = more people available.

- Days as columns, time as rows if time data exists
- Raw vote counts per cell — no "of X total" framing
- General yes/no voters are not shown on the heatmap
- Tapping a cell shows who voted for that slot

## Your Availability

Your submitted slots listed as chips or rows:

```
✓ Friday · 10h–12h · "free after lunch"
~ Friday · 17h–19h30
✗ Friday · before 17h · "school"
```

`+` opens the slot editor. Existing slots can be tapped to edit or retract.

## Per-member Breakdown

Collapsed by default ("See individual responses"). Expands to show each member's slots. Useful for reading the room before creating a proposal.

## Comments

Collapsed by default. Threaded replies. Same mechanic as standalone comment cards.

## Sticky Bottom

- **Create Proposal** — any member, any time, no threshold required
