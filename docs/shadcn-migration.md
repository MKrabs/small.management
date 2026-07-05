---
type: Engineering Doc
description: Tracks the frontend's incremental migration from hand-rolled Tailwind markup to shadcn/ui components.
---

# shadcn Migration

The frontend was originally built with hand-rolled Tailwind markup and just one shadcn component (`Button`). This doc tracks the incremental migration to shadcn primitives where they're a clear win, and records what was deliberately left alone.

Project setup: style `base-nova` on **base-ui** primitives (`render={}` instead of `asChild`; ToggleGroup values are arrays), Tailwind v4, lucide icons. The app is light-only — the sonner Toaster is pinned `theme="light"`; wire a real theme toggle before trusting `dark:` styles.

## Done

- **Nav user menu** → `DropdownMenu` (PR #4)
- **`BottomSheet`** → `Drawer` (base-ui, mobile-first bottom panel). Single internal swap; every consumer (~10 sheets) now gets a real focus trap, ESC-to-close, and ARIA dialog semantics for free (PR #6)
- **Form inputs** → `Input` / `Textarea` / `Field` / `FieldGroup` / `FieldLabel` / `FieldError` / `Checkbox` across login, register, create-activity, join, and all create/RSVP/finalize sheets (PR #6)
- **Silent mutation failures** → `sonner` toasts. Vote/option/slot/comment/RSVP mutations previously failed with no feedback; they now `toast.error(...)`. Field-level validation errors stay inline as `FieldError`.
- **`window.confirm`** → `AlertDialog` via the shared `ConfirmDelete` wrapper (`components/ConfirmDelete.tsx`): poll delete (PollPage) and comment delete (CommentSection).
- **Status pickers** → `ToggleGroup` with the `STATUS_TOGGLE` palette (`lib/status.ts`): SlotEditor yes/maybe/no pills, EventPage RSVP tally-filter and RSVP sheet, LandingPage demo cards. `STATUS_CHIP` is retired.
- **Status chips** → `Badge` variants `yes`/`maybe`/`no` (`ui/badge.tsx`): EventPage member RSVP list; `VOTE_STYLES` duplication removed from LandingPage.
- **Initials avatars** → `Avatar`/`AvatarFallback` via the shared `UserAvatar` (`components/UserAvatar.tsx`, deterministic per-name hue + `Tooltip` with the full name) and `AvatarGroup` for the overlapping voter rows on choice polls.
- **Disclosure toggles** → `Collapsible`: ActivityFeed cycle folds, PollPage "See individual responses".
- **Empty states** → `Empty`: feed ("Nothing here yet"), comments ("No comments yet"), LandingPage ("No activities yet").
- **`border-t` dividers** → `Separator` in ActivityFeed, CommentSection, CommentPreview, PollPage.

## To do

- Nothing queued. Add items here as new hand-rolled patterns appear.

## Deliberately not migrating

- **Native `<input type="date">` / `type="time">`** (FinalizeSheet, SlotEditor) — native pickers are already correct on mobile; shadcn's `Calendar` would be strictly worse here.
- **`Heatmap.tsx`** — bespoke `color-mix()`-based availability heatmap with per-cell member lookup. No shadcn primitive fits.
- **`MonthGrid` / `DatePoll` / `RangePoll`** — drag-to-vote calendars with per-day group-count tints and range pills; shadcn's `Calendar` is a single/range date *picker*, not a multi-member voting grid.
- **Feed cards** — interactive composites with custom tap-target layout; `Card` would add wrapper markup for no behavioral gain.
- **`CommentSection`'s per-branch collapse** — text-link toggles inside a recursive tree; a `Collapsible` per node is heavier for no gain.
- **`DotGridBackground`, `ChatIllustration`, the marketing hero layout** — decorative/bespoke, no component fits or should.
