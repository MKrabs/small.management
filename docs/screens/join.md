# Screen: Join / Landing

First screen a new member sees when hitting an activity URL. Goal: get them in with minimum friction.

## Layout

```
┌─────────────────────────────┐
│  "John invited you to:"     │
│  Karaoke night at my place  │
│  5 members already in       │
├─────────────────────────────┤
│  [ PIN field ]  ← if needed │
├─────────────────────────────┤
│  [ Display name field ]     │
│                             │
│  ── or ──                   │
│                             │
│  [ Log in ]                 │
├─────────────────────────────┤
│  [ Join ]                   │
└─────────────────────────────┘
```

## Details

**Activity title** — shown immediately so the visitor knows they're in the right place.

**Member count** — "5 members already in." Sets social context.

**PIN field** — only shown if the activity is PIN-protected. Wrong PIN shows an inline error. No lockout.

**Display name** — required for anonymous join. Free text. Pre-filled if the browser has a name from a previous activity session.

**Log in** — secondary option, visually smaller, below the name field. For members who have an account.

**Join** — single action. On success, lands on the Activity view.

## Variations

**Logged-in user:** Replace name field and login link with a greeting — "Welcome back, Alex" — and a single "Join" button.

**Returning anonymous member:** If the session token already matches a member of this activity, skip this screen entirely and land on the Activity view.
