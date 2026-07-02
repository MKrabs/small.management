# Screen: Slot Editor

The mobile-first component. Opened from the Poll view when a member wants to share or edit their availability.

## Layout

```
┌─────────────────────────────┐
│  Monthly calendar           │
│  (tap days to select)       │
├─────────────────────────────┤
│  Day entry list             │
│                             │
│  ┌─────────────────────┐    │
│  │ Friday, 4 July      │    │
│  │ [Yes · Maybe · No]  │    │
│  │ |——●————●———————|   │    │
│  │ 00h           23h  │    │
│  │ 💬 ▾               │    │
│  └─────────────────────┘    │
│  [ + add another slot ]     │
│                             │
│  ┌─────────────────────┐    │
│  │ Saturday, 5 July    │    │
│  │ ...                 │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
          [ Done ]
```

## Monthly Calendar

Standard month grid. Focused on upcoming dates by default; scrollable to any future date.

- Tap a day → entry appears in the list below
- Tap again (same status) → removes the entry
- Day colors reflect the current state of that day's entries, updated live

**Day color legend:**

| Color | Meaning |
|---|---|
| Green | Yes only |
| Orange | Maybe only |
| Red | No only |
| Green + Orange | Mix of yes and maybe |
| Orange + Red | Mix of maybe and no |
| Green + Orange + Red | All three present |

## Day Entry List

Each selected day produces one or more slot cards below the calendar.

### Slot Card

- **Day label** — "Friday, 4 July"
- **Status pill** — Yes / Maybe / No; sets the color fed back to the calendar
- **Time range** — horizontal draggable span, 30-minute resolution; default is no range (= all day)
- **Comment** — tap the icon to expand a free-text field; collapses when empty

### Multiple Slots Per Day

Each day card has a `+ add another slot` button. Each additional slot has its own status, time range, and comment. The day's calendar color reflects the mix of all its slots.

Example for one day:
```
✗ no   · 00h–17h · "school"
~  maybe · 17h–19h30
✓ yes  · 19h30–23h30
```

## Done

Saves all entries and returns to the Poll view.
