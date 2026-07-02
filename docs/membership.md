---
type: Product Doc
description: How members join, anonymous vs. logged-in identity, and PIN protection.
---

# Membership

## Joining an Activity

The only way to join an activity is via a direct URL (e.g., `events.mkrabs.de/activity/:id/:slug`). There is no public discovery page. Links are shared out-of-band (WhatsApp, SMS, etc.).

On visiting the link for the first time, a member chooses a display name (anonymous) or logs in with an existing account. Either way, they are now a member.

## Anonymous Members

- Choose a display name on join
- Identified by a local session token stored in the browser
- Device-bound: a different device means a different anonymous identity
- No password recovery — if the session is lost, access is lost
- Nudged toward creating an account, never forced

**Known limitation:** an anonymous member who votes from two different devices has two separate identities. Future plan: allow a logged-in account to claim anonymous sessions retroactively, merging their history.

## Logged-in Members

- Display name + password (v1; no email required)
- Can access their activities from any device via "My Activities"
- Account features: persistent identity, activity list

Future account features (not in v1): email notifications, magic link login, calendar integration, profile pictures, anonymous session claiming.

## PIN Protection

Activities can be PIN-protected. The PIN is set at creation and can be changed by any member who knows the current PIN.

- No PIN: anyone with the link can join
- With PIN: link + PIN required to join
- Wrong PIN: inline error, no lockout, no rate limiting (v1)

## Returning Members

If the browser session already identifies a member of the activity, the join screen is skipped entirely — the member lands directly on the Activity view.

Logged-in users who visit an activity URL they haven't joined yet see a greeting with their name and a single "Join" button.
