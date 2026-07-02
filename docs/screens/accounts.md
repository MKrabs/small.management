---
type: Screen Spec
description: Optional accounts — persistent identity across devices and a personal activity list.
---

# Screen: Account Screens

Accounts are optional. Anonymous participation is always available. Accounts unlock persistent identity across devices and a personal activity list.

## Register

Fields:
- Display name (required)
- Password (required)

No email required in v1. No email means no password recovery in v1 — this is a known, accepted limitation.

On success: lands on My Activities (empty).

## Login

Fields:
- Display name
- Password

On success: lands on My Activities.

## My Activities

The only dashboard for logged-in users. A list of activities the account is a member of.

Each entry:
- Activity name
- Last action · timestamp
- Member count
- Tap → Activity view

Sorted by most recent activity.

## Profile / Settings

- Change display name
- Change password
- Delete account

**On account deletion:** anonymous activity history attributed to this account remains in the database but is relabelled as "Deleted user." The account entry itself is removed.

## Future Account Features (not in v1)

See `future.md`.
