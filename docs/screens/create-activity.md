# Screen: Create Activity

Dedicated page at `/new`. Get an activity created as fast as possible. The poll comes after, not here.

## Layout

```
┌─────────────────────────────┐
│  What are you planning?     │
│  [ Activity name field ]    │
├─────────────────────────────┤
│  PIN (optional)             │
│  [ PIN field ]              │
├─────────────────────────────┤
│  [ Create ]                 │
└─────────────────────────────┘
```

## Details

**Activity name** — required. Placeholder: "Karaoke night, weekend trip, …"

**PIN** — optional, clearly labelled. Show/hide toggle on the field. No confirmation field — any member who knows the PIN can change it if it gets typo'd.

**Create** — on success, lands on the Activity view of the newly created activity. The feed is empty. The `+` button is the only affordance.
