import { Resend } from "resend";

import type { IcsMethod } from "./ics";
import { LOGO_CID, LOGO_PNG_BASE64 } from "./logo";

// The one place event email goes out through Resend. One recipient per call,
// never a list. Callers record the result on a Delivery row.

export type SendInput = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  ics?: { content: string; method: IcsMethod };
  headers?: Record<string, string>;
  // Resend drops a repeat with the same key for 24 hours, so a retry can
  // never send twice.
  idempotencyKey?: string;
};

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

// Short backoff on 429 (Resend's per-second rate limit). Daily and monthly
// quota errors are also 429 but will not clear in seconds, so fail fast.
const RETRY_DELAYS_MS = [500, 1000, 2000];

let client: Resend | undefined;

export async function sendEmail(input: SendInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set" };
  client ??= new Resend(apiKey);

  // Every template shows the logo as cid:LOGO_CID, so it always goes inline.
  const attachments = [
    { filename: "solutiq-logo.png", content: LOGO_PNG_BASE64, contentType: "image/png", contentId: LOGO_CID },
    ...(input.ics
      ? [
          {
            filename: "invite.ics",
            content: Buffer.from(input.ics.content, "utf8"),
            contentType: `text/calendar; charset=utf-8; method=${input.ics.method}`,
          },
        ]
      : []),
  ];

  for (let attempt = 0; ; attempt++) {
    try {
      const { data, error, headers } = await client.emails.send(
        {
          from: input.from,
          to: input.to,
          replyTo: input.replyTo,
          subject: input.subject,
          html: input.html,
          text: input.text,
          attachments,
          headers: input.headers,
        },
        input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
      );
      if (data) return { ok: true, id: data.id };

      const rateLimited = error.name === "rate_limit_exceeded";
      if (!rateLimited || attempt >= RETRY_DELAYS_MS.length) {
        return { ok: false, error: `${error.name}: ${error.message}` };
      }
      const retryAfter = Number(headers?.["retry-after"]) * 1000;
      await sleep(retryAfter > 0 && retryAfter <= 5000 ? retryAfter : RETRY_DELAYS_MS[attempt]);
    } catch (error) {
      // Network failure or an SDK throw: record it, never retry blind.
      return { ok: false, error: error instanceof Error ? error.message : "Unknown send error" };
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// "SOLUTIQ Events <events@solutiq.africa>" -> "events@solutiq.africa"
export const addressOf = (from: string) => from.match(/<([^>]+)>/)?.[1] ?? from.trim();
