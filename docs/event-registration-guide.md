# SOLUTIQ Event Registration Module: Phase-by-Phase Build Guide

Payload 3 inside the existing Next.js site. Built one phase at a time, with you running installs in CMD and checking each phase before the next begins.

---

## Part 1: How to use this guide

**The rhythm for every phase**

1. **You, in CMD:** run the commands listed (installs, git, builds). This costs no Claude tokens.
2. **Claude Code:** paste the short prompt for that phase. It points at the spec in Part 2, so you never paste the full detail again.
3. **You, in CMD:** run the checks (`npm run build`, `npm run dev`) and look at the result yourself. Fix or ask Claude Code to fix.
4. **Commit** only when the phase is right. Then move on.

**Token savers**
- Start each phase with `/clear` in Claude Code. Continuity comes from this guide and `CLAUDE.md`, not from chat history.
- Every prompt says "do only this phase, then stop". Do not let it run ahead.
- Run installs, migrations, builds and git yourself.

**One-time setup (do this before Phase A)**

Open CMD and go to the project (adjust the path):

```
cd /d C:\path\to\solutiq
git status
git checkout -b feat/event-registration
mkdir docs
copy "%USERPROFILE%\Downloads\event-registration-guide.md" docs\event-registration-guide.md
```

Check which package manager the project uses (look for the lockfile):

```
dir /b package-lock.json pnpm-lock.yaml yarn.lock 2>nul
```

The rest of this guide uses `npm`. If you see `pnpm-lock.yaml`, swap `npm install` for `pnpm add` and `npm run` for `pnpm`.

Add these standing rules to `CLAUDE.md` in the project root (create it if it does not exist; open with `notepad CLAUDE.md`). If a `CLAUDE.md` already exists, append this and keep what is there:

```md
## SOLUTIQ standing rules
- SOLUTIQ is always written in full capitals. Domain is solutiq.africa.
- British/South African spelling everywhere: organisation, programme, authorise, colour.
- The old tagline is retired. The only active line is the descriptor "Technology · Talent · Partnership".
- Brand constants live in lib/brand.ts and are never CMS-editable.
- Single-engineer maintainability is a hard constraint. No abstractions until a pattern appears three times. No libraries for things achievable in about ten lines. Whole files, not partial snippets. Server actions for our own writes; API routes only where an external service calls us.
- Gold is a sparse accent only, never small body text. Logo is white on dark, black on light, never boxed.
- The Event Registration Module is specified in docs/event-registration-guide.md (Part 2 is the spec). Work one phase at a time and stop at the end of each phase.
- Never touch the existing Supabase Black Book table or the old /black-book page unless told to.
```

---

## Phase A: Audit (read-only)

**Goal:** know exactly what is in the repo before anything changes.

**You, in CMD:**

```
node --version
npm --version
npx next --version
```

**Claude Code** (after `/clear`):

> Read docs/event-registration-guide.md, Part 2 (Spec) and Phase A only. Do a read-only audit and make NO changes. Report: (1) Next.js, React, Tailwind, TypeScript versions and whether next.config is ESM; (2) route and layout structure, where the root layout is, what the one-pager renders, how ISR/revalidate is used; (3) everything touching the existing Black Book (page, actions, Supabase client, RLS/migrations); (4) where lib/brand.ts, logo SVGs and the Ubuntu/Cabin fonts live; (5) any existing CLAUDE.md, env handling and Vercel config (maxDuration); (6) risks to the live one-pager from the Phase B restructure. Keep the report short.

**Check before moving on:** nothing changed (`git status` is clean apart from `docs/` and `CLAUDE.md`). You agree with the risks flagged.

**Commit:**

```
git add -A && git commit -m "docs: event registration guide and CLAUDE.md rules"
```

---

## Phase B: Install Payload and restructure routes

**Goal:** Payload running inside the site at `/admin`, with every existing page unchanged.

**You, in CMD:**

Payload packages must all be on the same version, so install them in one command:

```
npm install payload@latest @payloadcms/next@latest @payloadcms/db-postgres@latest @payloadcms/richtext-lexical@latest graphql sharp resend
```

If npm complains about a Next.js peer dependency, bump within Next 15 and retry (do not jump to a new major):

```
npm install next@15 react@19 react-dom@19
```

Create a **separate development database** so you never touch production data. The simplest route is a second free Supabase project called `solutiq-dev`. From its dashboard, Connect, copy the **transaction pooler** connection string (port 6543).

Generate a secret and create `.env.local`:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
notepad .env.local
```

Put this in `.env.local` (use the secret you just generated and your dev connection string):

```
DATABASE_URI=postgresql://postgres.xxxx:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
PAYLOAD_SECRET=paste-the-generated-secret
SITE_URL=http://localhost:3000
```

Confirm `.env.local` is ignored by git:

```
git check-ignore .env.local
```

It should print the filename. If it prints nothing, add `.env.local` to `.gitignore` before going on.

**Claude Code** (after `/clear`):

> Read docs/event-registration-guide.md, Part 2 (Spec) and Phase B only. I have already installed the packages and created .env.local; do not run installs. Do only Phase B: convert next.config to ESM if needed and add withPayload and the @payload-config alias; restructure into route groups (app/(site) gets all current routes and the current root layout, app/(payload) gets Payload's admin layout, admin/[[...segments]] and api/[...slug]) without changing any public URL; create payload.config.ts with the postgres adapter (schemaName 'payload', push only in development, small pool), csrf/cors for https://solutiq.africa plus localhost, admin meta titleSuffix and noindex; add a minimal Users collection only so the admin can boot; create .env.example; add scripts payload:types and payload:importmap. Do not change the build script. Do not build any other collection. Stop when done and tell me what to run.

**You, in CMD, to verify:**

```
npm run payload:importmap
npm run payload:types
npm run build
npm run dev
```

Then open `http://localhost:3000` (one-pager must look identical) and `http://localhost:3000/admin` (create the first user; it becomes your super-admin later).

**Check before moving on:** one-pager and every existing page unchanged, `/admin` loads, build passes, no changes needed to Vercel yet. **Do not push or deploy to production at this stage.**

**Commit:**

```
git add -A && git commit -m "phase B: payload installed, route groups"
```

---

## Phase C1: Users, roles and People

**Goal:** the role system and the durable private list.

**Claude Code** (after `/clear`):

> Read docs/event-registration-guide.md, Part 2 (Spec) and Phase C1 only. Do only C1: build access.ts (all role logic in this one file), the full Users collection (role field, @solutiq.africa email validation, first user becomes super-admin, lockout settings, field-level rules) and the People collection with its access rules and read-only fields. Group People under "People" in the admin nav. Do not create Events, Guestlist, Messages or Deliveries yet. Stop when done and tell me what to run.

**You, in CMD:**

```
npm run payload:types
npm run build
npm run dev
```

In the admin: confirm the first user is `super-admin`, create a test `list-viewer` user (`test-viewer@solutiq.africa`), log in as them in a private window, and confirm they can read People but cannot edit, create, delete, or see Users.

**Migrations:** from here on, schema changes need a migration. Once C1 looks right:

```
npx payload migrate:create c1_users_people
```

(Locally, `push` keeps your dev database in sync automatically; the migration file is for production. Commit it.)

**Commit:**

```
git add -A && git commit -m "phase C1: users, roles, people"
```

---

## Phase C2: Events, Guestlist, Messages, Deliveries, quick-add

**Goal:** the remaining collections and the paste-in guestlist tool.

**Claude Code** (after `/clear`):

> Read docs/event-registration-guide.md, Part 2 (Spec) and Phase C2 only. Do only C2: create Events (with extraFields array and the calendarSequence bump + revalidatePath hook), Guestlist (unique event+person index, token auto-generation, denormalised delivery summary fields, list columns and filters), Messages, and Deliveries (read-only in admin, no API create/update), all using access.ts. Then build the quick-add custom component on the Event edit view (textarea, one guest per line: Full name, email) as a server action that creates or finds People by email and creates invited Guestlist entries, reporting added/skipped/invalid counts. Admin nav groups: Events (Events, Guestlist, Messages, Deliveries), People, Settings (Users). Stop when done and tell me what to run.

**You, in CMD:**

```
npm run payload:types
npm run payload:importmap
npm run build
npm run dev
```

In the admin: create a test event, paste three guests (use your own email addresses) into quick-add, confirm three Guestlist entries with unique tokens, confirm pasting the same list twice adds none. Change the event date and confirm `calendarSequence` went up.

```
npx payload migrate:create c2_events_guestlist
git add -A && git commit -m "phase C2: events, guestlist, messages, deliveries"
```

---

## Phase D: Public registration pages (records only, no email)

**Goal:** both links work and write the right records.

**Claude Code** (after `/clear`):

> Read docs/event-registration-guide.md, Part 2 (Spec) and Phase D only. Do only D: the shared route /events/[slug] (ISR), the personal route /events/[slug]/r/[token] (dynamic, noindex, no-referrer), the shared client form component, the registerForEvent server action with all the rules in the spec, and the consent handling. No email sending yet. Stop when done and tell me what to run.

**You, in CMD:** `npm run build`, `npm run dev`. Then test by hand:

- Set your test event to `open`. Open the shared link in a private window and register with a new email.
- Copy a guest's token from the admin and open their personal link. Email must be locked and name prefilled. Register.
- Register again on the same link: nothing should change and no error should leak.
- Use the shared link with an email already on the guestlist: the existing entry upgrades and no duplicate appears.
- Switch `openRegistration` off: shared link shows the invite-only message with no form.
- Check the invalid token page reveals nothing.

```
git add -A && git commit -m "phase D: public registration pages"
```

---

## Phase E1: Email plumbing, calendar invite, confirmation

**Goal:** one confirmation email with a working calendar invite.

**Before this phase (about 10 minutes, no code):** create a Resend account and an API key. You can send test emails to your own address with Resend's testing sender before your domain is verified. Add to `.env.local`:

```
RESEND_API_KEY=re_xxxxxxxx
EVENTS_FROM_ADDRESS=SOLUTIQ Events <onboarding@resend.dev>
```

(Switch `EVENTS_FROM_ADDRESS` to `events@solutiq.africa` after domain verification in the manual checklist at the end.)

**Claude Code** (after `/clear`):

> Read docs/event-registration-guide.md, Part 2 (Spec) and Phase E1 only. Do only E1: lib/email/ics.ts (hand-written, no library), send.ts (Resend wrapper with 429 backoff), templates.ts (HTML and plain text, white canvas, black header band with white logo), and the confirmation flow inside after() from next/server with exactly one automatic confirmation per person per event and a Delivery row. Add unit tests for ics.ts. No webhook and no bulk sending yet. Stop when done and tell me what to run.

**You, in CMD:**

```
npm test
npm run build
npm run dev
```

Register through your test event using addresses at **Gmail, Outlook and Apple Mail (iCloud)**. Check, in each: the email renders, the `.ics` opens as a **native invite card with Accept/Decline** (not just a downloadable file), the time shows correctly in SAST, and adding it books the calendar.

**This is the phase most likely to need fixing.** If any client only shows a plain attachment, tell Claude Code exactly which one and what you see. Do not move on until you are happy.

```
git add -A && git commit -m "phase E1: email, ics, confirmation"
```

---

## Phase E2: Resend webhook and delivery status

**Goal:** delivery status updates flow back into Deliveries and the guestlist.

**You, in CMD:** the webhook needs a public URL. For local testing use a tunnel (needs a free ngrok account and `ngrok config add-authtoken ...` once):

```
npx ngrok http 3000
```

In Resend, Webhooks, add `https://YOUR-NGROK-URL/api/webhooks/resend`, subscribe to: sent, delivered, delivery_delayed, bounced, complained, failed. Copy the signing secret into `.env.local`:

```
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxx
```

**Claude Code** (after `/clear`):

> Read docs/event-registration-guide.md, Part 2 (Spec) and Phase E2 only. Do only E2: the Resend webhook route handler (signature verified with the SDK, not hand-rolled), status updates on Deliveries with the forward-only rule plus overrides, People suppression on complaint or hard bounce, refresh of the denormalised fields on Guestlist, idempotency. Stop when done and tell me what to run.

**You, in CMD:** `npm run build`, `npm run dev`. Register a test guest, then watch the Delivery go `queued`, `sent`, `delivered` in the admin. Test a bounce by registering `bounced@resend.dev` (Resend's test address) and confirm it shows `bounced` next to that person.

```
git add -A && git commit -m "phase E2: resend webhook and statuses"
```

---

## Phase F1: Bulk messages and unsubscribe

**Goal:** bulk emails and calendar invites from the logged-in user's own address.

**Claude Code** (after `/clear`):

> Read docs/event-registration-guide.md, Part 2 (Spec) and Phase F1 only. Do only F1: the Message edit view component with Send test to me, Send (confirmation step with recipient count, then queued Delivery rows created up front) and Continue/retry unsent; chunked sending in batches of 10 with live progress; the sending rules in the spec (own address as From and Reply-To and organiser, personalised registration link per recipient, one recipient per email, suppression and opt-out rules, invite/update/cancel calendar options); the /unsubscribe page and one-click route handler with List-Unsubscribe headers. Do not build the delivery history panel yet. Stop when done and tell me what to run.

**You, in CMD:** `npm run build`, `npm run dev`. Note: until solutiq.africa is verified in Resend (manual checklist at the end), sends **from** a `@solutiq.africa` address will be rejected by Resend. Test the engine first with the Resend testing sender by setting a temporary env var `DEV_FROM_OVERRIDE` if Claude Code added one, or complete domain verification now (recommended, since you need it anyway).

Test: test-send to yourself, then a small real send to three of your own addresses with an invite, an update after changing the event time (must replace the original), and a cancel (must remove it). Confirm unsubscribe works, including from the email client's own unsubscribe button.

```
git add -A && git commit -m "phase F1: bulk messages and unsubscribe"
```

---

## Phase F2: Delivery table next to each person

**Goal:** see status per person, and follow up outside the admin where needed.

**Claude Code** (after `/clear`):

> Read docs/event-registration-guide.md, Part 2 (Spec) and Phase F2 only. Do only F2: colour-coded status columns on the Guestlist list view, the read-only Delivery history panel on each Guestlist entry, a saved filter for bounced/failed/complained, the explanatory text that "delivered" means accepted by the recipient's mail server, and the super-admin "Resend to failed" action on Messages. Stop when done and tell me what to run.

**You, in CMD:** `npm run build`, `npm run dev`. Check that a bounced or failed test address is easy to find and that the history panel shows every email that person received for that event.

```
git add -A && git commit -m "phase F2: delivery table and history"
```

---

## Phase G: Branding, docs, verification

**Claude Code** (after `/clear`):

> Read docs/event-registration-guide.md, Part 2 (Spec) and Phase G only. Do only G: light admin branding (white logo, brand colour variables), final admin nav groups, docs/event-registration.md (short operator guide), and run whatever checks can run locally. Give me the verification checklist from the spec with pass/fail for what you could test and a clear list of what I must test by hand.

**You, in CMD:** work through the checklist yourself, then:

```
npm run build
git add -A && git commit -m "phase G: branding, docs, verification"
```

---

## Going live (after Phase G)

Do these in order. None of them are Claude Code tasks.

1. **Production database.** Decide whether the module uses your production Supabase project. Payload tables live in their own `payload` schema, so they do not interfere with existing tables. Get the **transaction pooler** string (port 6543) for runtime and the **direct or session** string for migrations.
2. **Run migrations against production from CMD** (before you deploy):
   ```
   set DATABASE_URI=YOUR_DIRECT_OR_SESSION_CONNECTION_STRING&& npx payload migrate
   ```
   Check `payload.migrations` exists in the database afterwards. Run this again every time a later change adds a migration.
3. **Vercel env vars** (Project, Settings, Environment Variables, Production): `DATABASE_URI` (pooled), `PAYLOAD_SECRET` (generate a new one for production), `SITE_URL=https://solutiq.africa`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EVENTS_FROM_ADDRESS`.
4. **Resend domain verification for solutiq.africa.** Add the DKIM records Resend gives you at your DNS host. Your mail is on cPanel, so you already have an SPF record: **merge** Resend's `include:` into the existing record. Never add a second SPF record. Check your DMARC record too. Wait for Resend to show the domain as verified.
5. **Resend webhook for production:** endpoint `https://solutiq.africa/api/webhooks/resend`, same six event types. Copy that signing secret into Vercel.
6. **Deploy** (merge the branch or push it). Open `/admin` on production, create the first super-admin, then create team users (all `@solutiq.africa`).
7. **Dress rehearsal:** create a real test event, add your own mailboxes on Gmail, Outlook and Apple Mail, send a confirmation and a bulk invite, and check statuses arrive.
8. **Ask your lawyer** to review the POPIA position for emailing a private list (legal basis, consent wording, privacy notice, opt-out handling). This is a design requirement, not legal advice from us.

---

## Part 2: Spec (reference for Claude Code)

### Purpose

A SOLUTIQ team member creates an event in the Payload admin at `/admin` and loads its information. Each event has two registration links: a **personal link** for guestlist members and a **shared link** for everyone else. Registering triggers an automatic confirmation email with a calendar invite. Team members can bulk-email an event's guestlist, optionally with a calendar invite, update or cancellation, from their own logged-in `@solutiq.africa` address. Every email creates a delivery record, and delivery status is visible next to each person. Response tracking is NOT needed: replies go to the team's own inboxes, and open and click tracking stay off. People are stored once in a durable private **People** list, which is the seed of the future Black Book.

### Decisions already made (do not reopen)

- Payload 3 lives inside the existing Next.js 15 app (App Router, Tailwind v4, shadcn/ui, Vercel). Payload is the system of record for events, guestlists, People and deliveries.
- Provider: **Resend** for sending and delivery webhooks.
- Extra registration questions are an array field on the Event. No form-builder plugin. Name and email are always fixed fields in code.
- Do not touch the existing Supabase Black Book table or the old `/black-book` page.
- Payload tables live in schema `payload`, outside `public` (which Supabase exposes through its API). Runtime uses the pooled connection; migrations are run manually from CMD, not in the Vercel build.
- No abstractions until a pattern appears three times. No libraries for things achievable in about ten lines (write the `.ics` generator by hand). Server actions for our own writes; API routes only for the Resend webhook and one-click unsubscribe.
- Time zone is Africa/Johannesburg (no DST); store UTC.

### Roles (all logic in one `access.ts`)

| Role | Can do |
|---|---|
| `super-admin` | Everything, including deleting records and managing users. |
| `event-manager` | Create and edit events, guestlist entries, People; create messages and send; read deliveries. No deletes, no users. |
| `list-viewer` | Read-only on People, Guestlist and Deliveries. No Messages, no Users. |

Public (unauthenticated) access to any collection through `/api/...` is denied. Public pages read server-side; public writes use the Local API with `overrideAccess: true` inside server actions.

### Collections

**Users** (auth). `role` select (`super-admin`, `event-manager`, `list-viewer`), required, changeable only by a super-admin. Email must end in `@solutiq.africa` (it is the bulk-send sender address). Only a super-admin creates, deletes or edits other users; everyone edits their own name and password. The first user in an empty system becomes `super-admin`. Hardening: `maxLoginAttempts: 5`, 10-minute `lockTime`, secure cookies, sensible token expiry.

**People** (nav group "People").
- `fullName` (required), `email` (required, unique, lowercased on save), `type` select (`guest`, `partner`, `other`; default `guest`), `organisation` (optional), `internalNotes` (staff only), `futureEventsConsent` (default false), `marketingOptOut` (default false), `emailSuppressed` (checkbox) plus `suppressedReason` (`bounced`, `complained`), `unsubscribeToken` (auto-generated, unique, hidden), `createdVia` (text).
- Access: super-admin full incl. delete (POPIA erasure requests); event-manager read/create/update; list-viewer read.
- `marketingOptOut`, `emailSuppressed`, `suppressedReason`, `unsubscribeToken` are read-only for everyone except super-admin. `emailSuppressed` and `suppressedReason` are set only by the webhook.

**Events** (nav group "Events").
- `title`, `slug` (unique, URL-safe), `status` (`draft`, `open`, `closed`, `cancelled`), `startsAt`, `endsAt`, `venueName`, `venueAddress`, `mapUrl`, `description` (Lexical rich text), `capacity` (optional), `registrationCloses` (optional), `openRegistration` (checkbox, default true; controls the shared link), `hostUser` (defaults to creator), `replyToEmail` (defaults to host's email), `confirmationNote` (textarea appended to confirmation emails), `extraFields` (array: `name` slug, `label`, `type` of text/textarea/select/checkbox, `required`, `options` for select).
- Hidden `calendarSequence` (number, starts 0). An `afterChange` hook increments it when `startsAt`, `endsAt`, `venueName`, `venueAddress` or `status` changes, and calls `revalidatePath` for the event's public routes.
- Access: super-admin and event-manager create/update; only super-admin deletes; list-viewer reads.

**Guestlist** (nav group "Events"; one row per person per event).
- `event`, `person`, `token` (auto, 24 random bytes base64url, unique, read-only), `status` (`invited`, `registered`, `cancelled`), `source` (`guestlist`, `shared-link`, `manual`), `registeredAt`, `responses` (JSON of extra-field answers), denormalised `lastEmailStatus`, `lastInviteStatus`, `lastEmailAt` (read-only, written only by delivery code).
- Unique index on (`event`, `person`).
- Default list columns: person name, email, event, status, source, lastInviteStatus, lastEmailStatus, lastEmailAt; filterable by the status fields.
- Access: super-admin and event-manager create/update/delete; list-viewer read.
- **Quick-add:** custom component on the Event edit view. Textarea, one guest per line ("Full name, email"), "Add to guestlist" button (server action). Creates or finds People by email, creates `invited` entries with source `guestlist`, skips duplicates, reports added / skipped / invalid.

**Messages** (nav group "Events").
- `event`, `subject`, `body` (plain text; variables `{{firstName}}`, `{{eventTitle}}`, `{{eventDate}}`, `{{venueName}}`, `{{registrationLink}}`), `audience` (`all-guestlist`, `not-yet-registered`, `registered`), `calendar` (`none`, `invite`, `update`, `cancel`), `status` (`draft`, `sending`, `sent`, `partial`), `sender` (Users; set automatically to the logged-in user; read-only), `sentAt`.
- Access: super-admin and event-manager only.

**Deliveries** (nav group "Events"; read-only in admin for everyone; written by system code only).
- `event`, `guestlistEntry`, `message` (optional), `toEmail`, `kind` (`confirmation`, `bulk`, `invite`, `update`, `cancel`), `status` (`queued`, `sent`, `delayed`, `delivered`, `bounced`, `complained`, `failed`, `suppressed`), `providerMessageId` (indexed), `error`, `sentAt`, `statusUpdatedAt`.
- Read access: super-admin, event-manager, list-viewer. Nobody creates or updates through the API.

### Phase C1 scope

Users (full) and People (full), plus `access.ts`. Nothing else.

### Phase C2 scope

Events, Guestlist (with quick-add), Messages, Deliveries as specified above. Nav groups: Events (Events, Guestlist, Messages, Deliveries), People, Settings (Users).

### Phase D scope: public pages

- `/events/[slug]` (shared link). Statically generated with ISR, revalidated by the Events hook. Shows event details and the form if the event is `open`, `openRegistration` is on and `registrationCloses` has not passed. If `openRegistration` is off, show details plus a message that registration is by personal invitation, no form. `draft` returns 404. `closed` and `cancelled` show a clear state with no form. If `capacity` is set and shared-link registrations have reached it, show "registration full". Capacity applies only to shared-link registrations; guestlist invitees are always admitted.
- `/events/[slug]/r/[token]` (personal link). Dynamic, `noindex`, `Referrer-Policy: no-referrer`. Looks up the Guestlist entry by token and event. Prefills name, locks email. If already `registered`, shows a "you are registered" state with event details and no form. An invalid token shows a neutral "this link is not valid; please contact the host" message and reveals nothing else.
- Shared client form component: name, email (locked when personal), the event's `extraFields` via one `switch` (no general form framework), a required POPIA consent checkbox with versioned wording (`CONSENT_VERSION = '2026-09-v1'`, one constant), and an optional "Keep me informed about future SOLUTIQ events" checkbox mapped to `futureEventsConsent`. Link to `/privacy` if it exists; otherwise a clearly marked TODO and tell me. Do NOT write privacy policy copy (template-only legal work).
- Server action `registerForEvent` (used by both routes):
  - Re-loads the event and `extraFields` server-side and validates everything against them; never trust the client's field list. Honeypot plus a minimum-time-on-page check; no third-party service.
  - Token path: find the Guestlist entry by token and event; set `registered`, `registeredAt`, `responses`, consent fields. Never overwrite the Person's stored name from a public submission.
  - Shared path: reject if invite-only. Find or create the Person by lowercased email. If a Guestlist entry already exists, upgrade it to `registered` (no duplicate, keep its `source`). Otherwise create one with `source: shared-link`.
  - Always return the same generic success message whether or not the email already existed.
  - Idempotent: registering again for an already-registered entry changes nothing and sends no second email.
- Design: dark SOLUTIQ surfaces, Ubuntu headings, Cabin body, gold as a sparse accent only. It must not look like a template.

### Phase E1 scope: email, ICS, confirmation

- `lib/email/ics.ts`: hand-written iCalendar. CRLF line endings, line folding at 75 octets, correct escaping, `METHOD:REQUEST` or `METHOD:CANCEL`, stable `UID` of `event-{eventId}@solutiq.africa`, `SEQUENCE` from `calendarSequence`, `DTSTART`/`DTEND` in UTC, `ORGANIZER` as the sender, `ATTENDEE` with `RSVP=TRUE`, `LOCATION`, `DESCRIPTION`, `URL`. Cancellations reuse the UID with a higher sequence. Unit-test folding, escaping, UTC conversion and sequence.
- `lib/email/send.ts`: one function wrapping the Resend SDK. Attach the `.ics` with content type `text/calendar; method=REQUEST` (or `CANCEL`), filename `invite.ics`. Handle 429 with short backoff. Returns the provider message id or an error.
- `lib/email/templates.ts`: HTML and plain-text renderers. White canvas, black header band with the white SOLUTIQ logo, navy rule, gold only as a thin accent. Table-based layout with inline styles. Plain-text version always included.
- Confirmation flow: after a successful registration, inside `after()` from `next/server`, create a Delivery (`kind: confirmation`, `queued`), send from `EVENTS_FROM_ADDRESS` with `replyTo` set to the event's `replyToEmail` and calendar organiser set to that address, then update the Delivery (`sent` or `failed` with error) and the denormalised Guestlist fields. Send **one automatic confirmation per person per event**, so the shared link cannot trigger repeated emails to someone else's address.
- Risk to report: Resend does not let us set a `text/calendar` alternative body part, only an attachment. Test in Gmail, Outlook and Apple Mail and report clearly if any fails to show a native invite card.

### Phase E2 scope: webhook

`app/(site)/api/webhooks/resend/route.ts`: verify the signature with the SDK's verification (do not hand-roll crypto), find the Delivery by `providerMessageId`, update its status. Status only moves forward, except `bounced`, `complained` and `failed`, which may always override (an async bounce can follow a `delivered`). On a complaint or hard bounce set `emailSuppressed` and `suppressedReason` on the Person. Refresh the denormalised fields on the Guestlist entry. Idempotent on repeated events. Open and click tracking stay off.

### Phase F1 scope: bulk sending and unsubscribe

- Message edit view component with three server-action buttons. Each verifies role (super-admin or event-manager) and that the user's email ends in `@solutiq.africa`:
  - **Send test to me:** one rendered email (and invite if selected) to the logged-in user's address, subject prefixed "[TEST]", no Delivery rows.
  - **Send:** confirmation step showing recipient count and audience, then create a Delivery row for every recipient up front as `queued`.
  - **Continue / retry unsent:** sends remaining `queued` and `failed` Deliveries.
- Chunked sending: each server-action call processes a small batch (default 10), and the client calls repeatedly with live progress ("42 of 110 sent") until none are `queued`. This fits serverless time limits without a queue, survives a closed tab, and respects Resend's rate limit. Do not use Resend's batch endpoint (it does not support attachments). Export `maxDuration` if the plan allows it.
- Sending rules: `From`, `Reply-To` and calendar `ORGANIZER` are the logged-in user's own address. Every recipient gets their own personalised `{{registrationLink}}` (their token path) and variables. Never put multiple recipients in `To`, `CC` or `BCC`. Skip and mark `suppressed` (with reason) anyone with `emailSuppressed`, and anyone with `marketingOptOut` **except** `update` and `cancel` calendar messages to already-registered guests (service messages). `calendar: invite | update | cancel` attaches the `.ics` using the event's current `calendarSequence`, so an update replaces the original and a cancel removes it. Message `status` becomes `sent` when nothing is `queued`, or `partial` if some failed.
- Unsubscribe: non-service bulk emails carry a footer link to `/unsubscribe?u=<unsubscribeToken>` (GET shows a confirm button, POST sets `marketingOptOut`), plus `List-Unsubscribe` and `List-Unsubscribe-Post` headers backed by a small route handler for one-click unsubscribe.

### Phase F2 scope: delivery table

- Guestlist list view: colour-coded status columns (delivered, in progress, problem).
- Each Guestlist entry's edit view: read-only "Delivery history" panel listing all that person's Deliveries for the event (kind, status, time, error).
- A saved filter or view to pull up everyone with `bounced`, `failed` or `complained`, so the team can follow up outside the admin.
- Admin UI text clarifying that `delivered` means the recipient's mail server accepted the email, not that it was read.
- Super-admin-only "Resend to failed" action on a Message that retries only `failed` Deliveries.

### Phase G scope and verification checklist

- Light admin branding: white SOLUTIQ logo SVG in the admin logo and icon slots; brand colour overrides via CSS variables (black and navy surfaces, gold accent). Final nav groups. Short `docs/event-registration.md` operator guide (creating an event, adding guests, the two links, sending a message and invite, reading delivery status, users and roles, migrations, env vars).
- Verification checklist:
  - Anonymous visitors cannot read People, unpublished Events, Guestlist, Messages, Deliveries or Users through `/api/...`.
  - Role matrix holds: `list-viewer` read-only and no Messages or Users; `event-manager` manages events, guestlist, messages and sends; only `super-admin` manages users and deletes.
  - Personal link registers the right entry and locks the email; shared link creates a `shared-link` entry; shared link with an email already on the guestlist upgrades the existing entry; invite-only event refuses shared-link registration.
  - Exactly one automatic confirmation per person per event.
  - A bulk send with invite creates one Delivery per recipient, statuses update from webhooks, a bounced address shows `bounced` next to that person and is skipped in later sends.
  - Editing the event date bumps the sequence, an "update" replaces the invite instead of duplicating it, a "cancel" removes it.
  - Unsubscribe works, including one-click.
  - Existing pages and ISR unchanged; `npm run build` passes.

### Out of scope for now

Image and media uploads (Vercel's filesystem is ephemeral, so media needs blob storage; decide separately), waitlists, plus-one handling beyond an extra field, RSVP tracking, open and click tracking, email verification for shared-link registrants, 2FA, CSV file upload for the guestlist (paste-in only), scheduled sends, the Black Book public directory, and the DPI schema. Note anything that should feed these later, but do not build it.
