---
type: Engineering Doc
description: Tracks the frontend's incremental migration from hand-rolled Tailwind markup to shadcn/ui components.
---

# shadcn Migration

The frontend was originally built with hand-rolled Tailwind markup and just one shadcn component (`Button`). This doc tracks the incremental migration to shadcn primitives where they're a clear win, and records what was deliberately left alone.

## Done

- **Nav user menu** → `DropdownMenu` (PR #4)
- **`BottomSheet`** → `Drawer` (base-ui, mobile-first bottom panel). Single internal swap; every consumer (~10 sheets) now gets a real focus trap, ESC-to-close, and ARIA dialog semantics for free (PR #6)
- **Form inputs** → `Input` / `Textarea` / `Field` / `FieldGroup` / `FieldLabel` / `FieldError` / `Checkbox` across login, register, create-activity, join, and all create-poll/proposal/comment/cycle + RSVP/vote/finalize sheets (PR #6)

## To do

- **`ToggleGroup`** for the yes/maybe/no and RSVP pickers — currently a manually-looped `Button` with active-state classes in `SlotEditor` (status pills), `EventPage`/`ProposalPage` (RSVP/vote tally + filter buttons), the `VoteSheet`/`RsvpSheet` status pickers, and `LandingPage`'s demo vote buttons.
- **`Badge`** for status chips — retire `STATUS_CHIP`/`STATUS_TEXT` (`lib/status.ts`) and the duplicated `VOTE_STYLES` in `LandingPage.tsx` in favor of Badge variants.
- **`AlertDialog`** for the three destructive-action confirmations that currently use `window.confirm(...)`: deleting a poll (`PollPage`), a proposal (`ProposalPage`), and a comment (`CommentSection`).
- **`Collapsible`** for the three hand-rolled disclosure toggles (`useState` + rotating `ChevronRight`): `ActivityFeed.CycleFold`, `CommentSection`'s comment thread, `PollPage.MemberBreakdown`.
- **`Avatar` + `AvatarFallback`** for the initials circle in `LandingPage.LoggedInHome` (currently a manual `rounded-full` div).
- **`Separator`** for manual `border-t` dividers in `ActivityFeed`, `CommentSection`, `PollPage`.
- **`Empty`** for empty states — "Nothing here yet" (`ActivityFeed`) and "No activities yet" (`LandingPage`).
- Lower priority: move generic "Something went wrong" mutation-failure messages to `sonner` toast instead of inline text, so errors don't shift layout. Field-level validation errors (wrong password, taken name) should stay inline.

## Deliberately not migrating

- **Native `<input type="date">` / `type="time">`** (`CreateProposalSheet`, `SlotEditor`, RSVP/vote sheets) — native pickers are already correct on mobile; shadcn's `Calendar` would be strictly worse here.
- **`Heatmap.tsx`** — bespoke `color-mix()`-based availability heatmap with per-cell member lookup. No shadcn primitive fits.
- **`SlotEditor`'s custom calendar grid** — shows multiple colored status dots per day and toggles multi-day selection; shadcn's `Calendar` is a single/range date-picker, not a multi-status marker grid.
- **`DotGridBackground`, `ChatIllustration`, the marketing hero layout** — decorative/bespoke, no component fits or should.
