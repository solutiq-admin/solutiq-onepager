// Delivery status rules for the Resend webhook. No imports, so the rules can
// be unit-tested with plain `node --test`.
//
// Status only moves forward: queued -> sent -> delayed -> delivered. The
// problem statuses (bounced, complained, failed) may always override, since
// an async bounce or a complaint can arrive after `delivered`. `suppressed`
// is set by our own send code before anything goes to Resend, never here.

export type DeliveryStatus =
  | "queued"
  | "sent"
  | "delayed"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed";

const FORWARD: DeliveryStatus[] = ["queued", "sent", "delayed", "delivered"];
const OVERRIDES: DeliveryStatus[] = ["bounced", "complained", "failed"];
const ALL: DeliveryStatus[] = [...FORWARD, ...OVERRIDES, "suppressed"];

// Resend event type -> Delivery status. Anything else (opened, clicked,
// scheduled, contact.*, domain.*) is ignored; open and click tracking stay off.
const EVENT_STATUS: Record<string, DeliveryStatus> = {
  "email.sent": "sent",
  "email.delivery_delayed": "delayed",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

export const statusForEvent = (type: string): DeliveryStatus | undefined => EVENT_STATUS[type];

// The current statuses from which a Delivery may move to `next`. The update
// only applies when the row's status is in this list, which makes a repeated
// or out-of-order webhook a no-op.
export function allowedFrom(next: DeliveryStatus): DeliveryStatus[] {
  if (OVERRIDES.includes(next)) return ALL.filter((status) => status !== next);
  const rank = FORWARD.indexOf(next);
  return rank > 0 ? FORWARD.slice(0, rank) : [];
}

// Resend passes the bounce classification through from the receiving server:
// "Permanent" is a hard bounce, "Transient" and "Undetermined" are not.
export const isHardBounce = (bounceType: string | undefined) =>
  bounceType?.toLowerCase() === "permanent";

// Deliveries that carry a calendar attachment. The confirmation always does.
export const INVITE_KINDS = ["confirmation", "invite", "update", "cancel"] as const;

// Bulk sending rules (Phase F1).

type Calendar = "none" | "invite" | "update" | "cancel";
type EntryStatus = "invited" | "registered" | "cancelled";

// Deliveries.kind for a message: its calendar option, or plain `bulk`.
export const kindFor = (calendar: Calendar) => (calendar === "none" ? "bulk" : calendar);

// Updates and cancellations to people who registered are service messages:
// they go out even to people who unsubscribed, and carry no unsubscribe link.
export const isServiceMessage = (calendar: Calendar, entryStatus: EntryStatus) =>
  (calendar === "update" || calendar === "cancel") && entryStatus === "registered";

// Why a recipient is skipped (the Delivery becomes `suppressed` with this as
// its error), or undefined to send. A bounce or complaint always wins.
export function skipReason(
  person: { emailSuppressed?: boolean | null; suppressedReason?: string | null; marketingOptOut?: boolean | null },
  calendar: Calendar,
  entryStatus: EntryStatus,
): string | undefined {
  if (person.emailSuppressed) return `Not sent: address suppressed (${person.suppressedReason ?? "unknown"})`;
  if (person.marketingOptOut && !isServiceMessage(calendar, entryStatus)) {
    return "Not sent: unsubscribed from SOLUTIQ event emails";
  }
  return undefined;
}

// Delivery table (Phase F2).

// Statuses the team follows up outside the admin.
export const PROBLEM_STATUSES = ["bounced", "complained", "failed"] as const;

export type StatusTone = "delivered" | "in-progress" | "problem" | "skipped";

// Colour group for a status. `suppressed` means we chose not to send (opted
// out, or already bounced), so it is neither in progress nor a new problem.
export function statusTone(status: DeliveryStatus): StatusTone {
  if (status === "delivered") return "delivered";
  if (status === "suppressed") return "skipped";
  if ((PROBLEM_STATUSES as readonly string[]).includes(status)) return "problem";
  return "in-progress";
}

export const DELIVERED_MEANS =
  "“Delivered” means the recipient's mail server accepted the email, not that it was read.";
