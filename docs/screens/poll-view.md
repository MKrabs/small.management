---
type: Screen Spec
description: Dedicated page for one decision - full voting UI, results, and the threaded comment tree.
---

# Screen: Poll View

Dedicated page for one decision. Reached by tapping its feed card. Shows the full voting UI, the results, and the complete comment tree.

## Layout

```
┌─────────────────────────────┐
│  Poll header                │
├─────────────────────────────┤
│  Voting UI (per kind)       │
├─────────────────────────────┤
│  Per-member breakdown       │
│  (date-based kinds,         │
│   expandable)               │
├─────────────────────────────┤
│  Comments (full tree)       │
└─────────────────────────────┘
   [ Finish voting ]  ← sticky bottom
```

## Poll Header

- Kind label + poll title / question
- Created by · timestamp
- "X of Y members have voted"
- Archive in the corner (unarchive when archived)

## Voting UI per Kind

- **Choice** — same interactive UI as the feed card: two big buttons (2 options) or bar rows (3+), voter avatars, add-option.
- **Date** — drag/tap calendar (same as the card), plus per-member breakdown below.
- **Range** — drag calendar with own-range pills and endpoint moving (same as the card), plus breakdown.
- **Date+time** — group heatmap, "Your availability" slot list, and the slot editor. This kind has no feed-card voting; the page is the only place to vote.

## Per-member Breakdown

Collapsed by default ("See individual responses"). Expands with a By selection / By person toggle (default: by selection) — group votes per day or per member. Useful for reading the room before finishing the vote.

## Comments

Full Reddit-style tree, open by default: nested replies with indent, collapse per branch, reply and archive inline. The feed card only previews the latest 3 top-level comments; this page is where members actually comment.

## Sticky Bottom

- **Finish voting** — any member, any time, no threshold. Locks the poll: no more votes or option changes, leading choice(s) crowned. Becomes **Resume voting** on a finished poll (reversible).
