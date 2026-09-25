"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { canSendEmail, isSuperAdminUser } from "@/access";
import {
  AUDIENCE_LABEL,
  composeMessageEmail,
  loadRecipients,
  messageCounts,
  queueMessage,
  sendBatch,
  type SendCounts,
} from "@/lib/email/bulk";
import { skipReason } from "@/lib/email/delivery-status";
import { sendEmail } from "@/lib/email/send";
import type { Message } from "@/payload-types";

// Server actions behind the Message edit view's send panel. Each one checks
// the role (super-admin or event-manager) and that the user's own address is
// on solutiq.africa, because emails go out from it. Reads run as the user;
// the writes that follow are system writes (Deliveries accept no others).

type Failure = { ok: false; message: string };

export type Progress = {
  ok: true;
  status: Message["status"];
  counts: SendCounts;
  claimed: number;
  serverTime: string;
};

async function authorise() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  return { payload, user: user && canSendEmail(user) ? user : null };
}

const NOT_ALLOWED: Failure = {
  ok: false,
  message: "Only event managers with a solutiq.africa address can send messages.",
};

async function loadMessage(id: number | string) {
  const { payload, user } = await authorise();
  if (!user) return { payload, user: null, message: null };
  const message = await payload.findByID({
    collection: "messages",
    id,
    depth: 0,
    user,
    overrideAccess: false,
  });
  return { payload, user, message };
}

const loadEvent = (payload: Awaited<ReturnType<typeof getPayload>>, message: Message) =>
  payload.findByID({
    collection: "events",
    id: typeof message.event === "object" ? message.event.id : message.event,
    depth: 0,
  });

export async function sendTestMessage(id: number | string): Promise<{ ok: true; message: string } | Failure> {
  try {
    const { payload, user, message } = await loadMessage(id);
    if (!user || !message) return NOT_ALLOWED;
    const event = await loadEvent(payload, message);

    // Recipients' personal links and unsubscribe links don't exist for the
    // sender: the test links to the shared event page and a token-less
    // /unsubscribe, which is enough to check wording and layout.
    const service =
      (message.calendar === "update" || message.calendar === "cancel") && message.audience === "registered";
    const email = composeMessageEmail({
      message,
      event,
      sender: user,
      to: { fullName: user.name || user.email, email: user.email },
      testUnsubscribe: !service,
    });
    const result = await sendEmail({ ...email, subject: `[TEST] ${email.subject}` });
    if (!result.ok) {
      payload.logger.error({ msg: `Test send for message ${message.id} failed: ${result.error}` });
      return { ok: false, message: `Resend refused the test email: ${result.error}` };
    }
    return { ok: true, message: `Test sent to ${user.email}.` };
  } catch (error) {
    console.error("Test send failed", error);
    return { ok: false, message: "Couldn't send the test. Please try again." };
  }
}

export type SendPreview = {
  ok: true;
  recipients: number;
  skipped: number;
  audience: string;
  calendar: Message["calendar"];
  warning?: string;
};

export async function previewSend(id: number | string): Promise<SendPreview | Failure> {
  try {
    const { payload, user, message } = await loadMessage(id);
    if (!user || !message) return NOT_ALLOWED;
    if (message.status !== "draft") return { ok: false, message: "This message has already been sent. Use Continue to finish it." };
    const event = await loadEvent(payload, message);
    if (event.status === "draft") {
      return { ok: false, message: "The event is still a draft, so its registration links don't work yet. Open it first." };
    }

    const recipients = await loadRecipients(payload, message);
    const skipped = recipients.filter(({ entry, person }) => skipReason(person, message.calendar, entry.status)).length;
    return {
      ok: true,
      recipients: recipients.length,
      skipped,
      audience: AUDIENCE_LABEL[message.audience],
      calendar: message.calendar,
      warning:
        message.calendar === "cancel" && event.status !== "cancelled"
          ? "The event's status is not Cancelled. Set it to Cancelled and save the event first, so the cancellation replaces the invite and the public page stops taking registrations."
          : undefined,
    };
  } catch (error) {
    console.error("Send preview failed", error);
    return { ok: false, message: "Couldn't count the recipients. Please try again." };
  }
}

// Creates every Delivery up front as `queued`. The client then calls
// sendNextBatch until nothing is left.
export async function startSend(id: number | string): Promise<Progress | Failure> {
  try {
    const { payload, user, message } = await loadMessage(id);
    if (!user || !message) return NOT_ALLOWED;
    if (message.status !== "draft") return { ok: false, message: "This message has already been sent. Use Continue to finish it." };
    const event = await loadEvent(payload, message);
    if (event.status === "draft") return { ok: false, message: "Open the event before sending." };

    const { queued, suppressed } = await queueMessage(payload, message, user.id);
    if (queued + suppressed === 0) return { ok: false, message: "No one on the guestlist matches this audience." };

    return {
      ok: true,
      status: "sending",
      counts: await messageCounts(payload, message.id),
      claimed: 0,
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Start send failed", error);
    return { ok: false, message: "Couldn't queue the message. Please try again; nobody is added twice." };
  }
}

// One batch. `retryBefore` (from an earlier Progress.serverTime) also
// retries rows that failed before then; without it only queued rows go.
export async function sendNextBatch(id: number | string, retryBefore?: string): Promise<Progress | Failure> {
  try {
    const { payload, user, message } = await loadMessage(id);
    if (!user || !message) return NOT_ALLOWED;
    if (message.status === "draft") return { ok: false, message: "This message hasn't been sent yet." };

    const before = retryBefore && !Number.isNaN(Date.parse(retryBefore)) ? retryBefore : undefined;
    const { claimed, counts } = await sendBatch(payload, message.id, user, before);
    const settled = await payload.findByID({ collection: "messages", id: message.id, depth: 0 });
    return { ok: true, status: settled.status, counts, claimed, serverTime: new Date().toISOString() };
  } catch (error) {
    console.error("Send batch failed", error);
    return { ok: false, message: "Sending stopped on an error. Use Continue to pick up where it left off." };
  }
}

// "Resend to failed" (super-admin only): one batch of `failed` rows that
// failed before `retryBefore`; queued rows are left for Continue. Emails go
// out as the original sender, like the rest of the message.
export async function resendFailedBatch(id: number | string, retryBefore: string): Promise<Progress | Failure> {
  try {
    const { payload, user, message } = await loadMessage(id);
    if (!user || !message) return NOT_ALLOWED;
    if (!isSuperAdminUser(user)) return { ok: false, message: "Only a super-admin can resend to failed recipients." };
    if (message.status === "draft") return { ok: false, message: "This message hasn't been sent yet." };
    if (Number.isNaN(Date.parse(retryBefore))) return { ok: false, message: "Couldn't start the resend. Please try again." };

    const { claimed, counts } = await sendBatch(payload, message.id, user, retryBefore, true);
    const settled = await payload.findByID({ collection: "messages", id: message.id, depth: 0 });
    return { ok: true, status: settled.status, counts, claimed, serverTime: new Date().toISOString() };
  } catch (error) {
    console.error("Resend to failed batch failed", error);
    return { ok: false, message: "Resending stopped on an error. Try Resend to failed again." };
  }
}

export async function getSendProgress(id: number | string): Promise<Progress | Failure> {
  try {
    const { payload, user, message } = await loadMessage(id);
    if (!user || !message) return NOT_ALLOWED;
    return {
      ok: true,
      status: message.status,
      counts: await messageCounts(payload, message.id),
      claimed: 0,
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Send progress failed", error);
    return { ok: false, message: "Couldn't load the send status." };
  }
}
