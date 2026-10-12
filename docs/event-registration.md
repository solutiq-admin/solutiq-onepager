# Event registration: operator guide

Short guide for the SOLUTIQ team. The admin is at `https://solutiq.africa/admin`.
The full build spec is in `docs/event-registration-guide.md` (Part 2).

## Admin layout

- **Events:** Events, Form templates, Guestlist, Messages, Deliveries
- **People:** People (the private contact list, seed of the future Black Book)
- **Settings:** Users

## Creating an event

1. Events → Create new. Fill in title, dates, venue and description. The slug fills from the
   title if left empty; it becomes the public link `/events/<slug>`.
2. Registration questions: either add them under the event's questions, or pick a
   **Form template** in "Apply a form template" and save. Applying a template **copies** its questions
   into the event. It only works when the event has no questions yet; clear them first if you
   want to switch templates. Editing or deleting a template later never changes this event.
3. **Save as template** (on the event) turns the event's saved questions into a new template.
   Save the event first.
4. Leave status on `draft` until ready (drafts are a 404 publicly). Set `open` to take
   registrations, `closed` to stop them, `cancelled` to show a cancelled notice.
5. "Allow registration through the shared link" controls the shared link. Off = invite-only (guestlist only).
   `Capacity` limits shared-link registrations only; guestlist invitees are always admitted.
6. `Reply-to email` defaults to the host's address. `Confirmation note` is added to the end of
   every confirmation email.

## Adding guests

- On the event, **Quick-add**: one guest per line, `Full name, email`, then "Add to guestlist".
  It finds or creates each Person by email, adds them as `invited`, skips anyone already on the
  list and reports added / skipped / invalid.
- Or Guestlist → Create new, for one person at a time.

## The two links

- **Shared link:** `https://solutiq.africa/events/<slug>`. For anyone. Works only while the event
  is `open`, shared-link registration is allowed, registration hasn't closed and capacity isn't reached.
  If the email is already on the guestlist, that entry is upgraded (no duplicate).
- **Personal link:** `https://solutiq.africa/events/<slug>/r/<token>`. One per guestlist entry;
  email is locked to that person. It goes out automatically as `{{registrationLink}}` in
  messages, so you rarely need to copy it by hand.

Every successful registration sends **one** automatic confirmation email with a calendar
invite (only ever once per person per event).

## Sending a message or invite

1. Messages → Create new. Pick the event, write subject and plain-text body. Variables:
   `{{firstName}}`, `{{eventTitle}}`, `{{eventDate}}`, `{{venueName}}`, `{{registrationLink}}`.
2. Audience: all guestlist, not yet registered, or registered.
3. Calendar: `none`, `invite`, `update` (after changing date/venue; replaces the earlier invite)
   or `cancel` (removes it from calendars).
4. Save, then **Send test to me** to check it in your own inbox.
5. **Send**: confirm the recipient count. Keep the tab open; progress shows live. If the tab
   closes or it pauses, come back and press **Continue / retry unsent**.
6. Emails go out from **your own** `@solutiq.africa` address, one per recipient; replies come
   to your inbox. Suppressed (bounced/complained) addresses are always skipped; unsubscribed
   people are skipped except for `update`/`cancel` messages to registered guests.
7. Super-admins also get **Resend to failed**, which retries only failed deliveries.

## Reading delivery status

- Guestlist list: last-invite and last-email status columns, colour-coded (delivered, in progress,
  problem). Open an entry to see its full **Delivery history**.
- **Needs follow-up** (top of the Guestlist list) filters to bounced, failed or complained;
  follow those up by phone or another address.
- `delivered` means the recipient's mail server accepted it, **not** that it was read. Open and
  click tracking are off by design.
- A hard bounce or spam complaint marks the Person as suppressed; they won't be emailed again.

## Users and roles

| Role | Can do |
|---|---|
| `super-admin` | Everything, including deletes and managing users. |
| `event-manager` | Events, form templates, guestlist, People, messages and sending. No other deletes, no users. |
| `list-viewer` | Read-only People, Guestlist and Deliveries. No messages, no users. |

- Only a super-admin creates users. Every user email must end in `@solutiq.africa`.
- The first user created in an empty system becomes super-admin.
- 5 failed logins lock the account for 10 minutes. Sessions last 8 hours.
- POPIA erasure requests: a super-admin deletes the Person.

## Migrations

Payload tables live in the `payload` schema (not `public`). Migrations are run by hand, never in
the Vercel build.

- After changing a collection: `npx payload migrate:create <name>` and commit the new files in
  `src/migrations/`.
- Apply to a database with the **direct or session** connection string (not the pooler), from CMD:
  ```
  set DATABASE_URI=YOUR_DIRECT_OR_SESSION_CONNECTION_STRING&& npx payload migrate
  ```
  Run this against production **before** deploying code that needs it.
- Locally, `npm run dev` pushes schema changes to the dev database automatically.
  Never point a local machine at the production database.

## Environment variables

| Variable | What |
|---|---|
| `DATABASE_URI` | Postgres (Supabase) **transaction pooler** string, port 6543. |
| `PAYLOAD_SECRET` | Long random string. Separate value for production. |
| `SITE_URL` | `https://solutiq.africa` in production; used in email links. |
| `RESEND_API_KEY` | Resend API key (contact form and events). |
| `RESEND_WEBHOOK_SECRET` | Signing secret of the Resend webhook at `/api/webhooks/resend`. |
| `EVENTS_FROM_ADDRESS` | Sender for confirmations, e.g. `SOLUTIQ Events <events@solutiq.africa>`. |
| `CONTACT_TO_EMAIL` | Inbox for the one-pager contact form. |
| `DEV_FROM_OVERRIDE` | Dev only, before the domain is verified. Leave empty in production. |

The Resend webhook subscribes to: sent, delivered, delivery_delayed, bounced, complained, failed.
