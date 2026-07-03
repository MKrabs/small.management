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
- **Status pickers** → `ToggleGroup` in `SlotEditor` (status pills), `EventPage`/`ProposalPage` (tally filters), the RSVP/vote sheet pickers, and `LandingPage`'s demo vote buttons. Pressed-state colors live in `STATUS_TOGGLE` (`lib/status.ts`), `aria-pressed:`-scoped so the component's own state drives styling; retired the duplicated `VOTE_STYLES`.
- **Status chips** → `Badge` with custom `yes`/`maybe`/`no` variants (`ui/badge.tsx`); retired `STATUS_CHIP`. `STATUS_TEXT`/`STATUS_ICON` stay — the colored ✓/~/✗ glyphs in `PollPage`/`Heatmap` aren't chips.
- **`window.confirm`** → `AlertDialog` via a shared `ConfirmDelete` wrapper (poll, proposal, and comment deletion).
- **Disclosure toggles** → `Collapsible` (`ActivityFeed.CycleFold`, `CommentSection`, `PollPage.MemberBreakdown`); the comments one stays controlled so its query only runs once opened.
- **Initials circle** → `Avatar` + `AvatarFallback`; **empty states** → `Empty`; **`border-t` dividers** → `Separator` (`ActivityFeed`, `CommentSection`, `PollPage`).
- **Generic mutation errors** → `sonner` toasts (top-center; bottom is occupied by sticky bars and drawers). Field-level validation errors (wrong password, taken name, wrong PIN) stay inline. The `Toaster` is pinned to light theme until something actually toggles `.dark`.

## To do

Nothing queued — the list above cleared the backlog.

## Deliberately not migrating

- **Native `<input type="date">` / `type="time">`** (`CreateProposalSheet`, `SlotEditor`, RSVP/vote sheets) — native pickers are already correct on mobile; shadcn's `Calendar` would be strictly worse here.
- **`Heatmap.tsx`** — bespoke `color-mix()`-based availability heatmap with per-cell member lookup. No shadcn primitive fits.
- **`SlotEditor`'s custom calendar grid** — shows multiple colored status dots per day and toggles multi-day selection; shadcn's `Calendar` is a single/range date-picker, not a multi-status marker grid.
- **`DotGridBackground`, `ChatIllustration`, the marketing hero layout** — decorative/bespoke, no component fits or should.
