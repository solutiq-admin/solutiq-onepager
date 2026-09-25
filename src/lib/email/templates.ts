// Email renderers: HTML plus a plain-text version, always both.
// White canvas, black header band with the white logo, navy rule, gold only
// as a thin accent. Tables and inline styles, because that is what email
// clients render reliably. The logo is a PNG: Gmail and Outlook drop SVG.
//
// DRAFT: the wording below is functional, not signed-off brand copy.

const BLACK = "#0A0A0A";
const NAVY = "#161B35";
const GOLD = "#F9B630";
const WHITE = "#FFFFFF";
const MUTED = "#55524F"; // readable grey on white; silver is too light for text here

const HEADING_FONT = "Ubuntu, 'Segoe UI', Helvetica, Arial, sans-serif";
const BODY_FONT = "Cabin, 'Segoe UI', Helvetica, Arial, sans-serif";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Text with line breaks kept, safe for HTML.
const multiline = (value: string) => escapeHtml(value).replace(/\r\n|\r|\n/g, "<br>");

const link = (href: string, value: string) =>
  `<a href="${escapeHtml(href)}" style="color:${BLACK};text-decoration:underline;">${value}</a>`;

const isHttpUrl = (value?: string | null): value is string => Boolean(value && /^https?:\/\//.test(value));

export type ConfirmationContent = {
  firstName: string;
  title: string;
  when: string;
  venueName: string;
  venueAddress?: string | null;
  mapUrl?: string | null;
  eventUrl: string;
  note?: string | null;
  siteUrl: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

export function renderConfirmation(content: ConfirmationContent): RenderedEmail {
  const { firstName, title, when, venueName, venueAddress, eventUrl, siteUrl } = content;
  const mapUrl = isHttpUrl(content.mapUrl) ? content.mapUrl : undefined;
  const note = content.note?.trim();
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";

  const subject = `You're registered: ${title}`;
  const intro = `You're registered for ${title}. We look forward to seeing you.`;
  const invite = "A calendar invite is attached. Accept it to add the event to your calendar.";
  const questions = "Questions? Just reply to this email.";

  const text = [
    greeting,
    "",
    intro,
    "",
    `When: ${when}`,
    `Where: ${[venueName, venueAddress?.replace(/\s*\n\s*/g, ", ")].filter(Boolean).join(", ")}`,
    mapUrl && `Map: ${mapUrl}`,
    `Event details: ${eventUrl}`,
    "",
    invite,
    ...(note ? ["", note] : []),
    "",
    questions,
    "",
    "--",
    "SOLUTIQ · Technology · Talent · Partnership",
    "solutiq.africa",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const label = (value: string) =>
    `<td style="padding:0 0 4px 0;font-family:${HEADING_FONT};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${NAVY};">${value}</td>`;

  const html = frame({
    subject,
    preheader: `${title}, ${when}`,
    content: `<h1 style="margin:20px 0 24px 0;font-family:${HEADING_FONT};font-size:26px;line-height:1.25;font-weight:700;color:${BLACK};">${escapeHtml(title)}</h1>
<p style="margin:0 0 16px 0;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 28px 0;">${escapeHtml(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;border-top:1px solid #E4E2E1;border-bottom:1px solid #E4E2E1;">
<tr><td style="padding:20px 0 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>${label("When")}</tr>
<tr><td style="padding:0 0 20px 0;font-family:${BODY_FONT};font-size:16px;line-height:1.5;color:${BLACK};">${escapeHtml(when)}</td></tr>
<tr>${label("Where")}</tr>
<tr><td style="padding:0 0 20px 0;font-family:${BODY_FONT};font-size:16px;line-height:1.5;color:${BLACK};">${escapeHtml(venueName)}${
      venueAddress ? `<br><span style="color:${MUTED};font-size:15px;">${multiline(venueAddress)}</span>` : ""
    }${mapUrl ? `<br><span style="font-size:15px;">${link(mapUrl, "Open map")}</span>` : ""}</td></tr>
</table></td></tr>
</table>
<p style="margin:0 0 16px 0;">${escapeHtml(invite)}</p>
<p style="margin:0 0 28px 0;">${link(eventUrl, "View event details")}</p>
${note ? `<p style="margin:0 0 28px 0;">${multiline(note)}</p>` : ""}
<p style="margin:0;">${escapeHtml(questions)}</p>`,
    siteUrl,
  });

  return { subject, html, text };
}

// The page around every event email: black header band with the logo, navy
// rule, gold accent, content, footer. `footer` adds lines under the address.
function frame(parts: {
  subject: string;
  preheader: string;
  content: string;
  siteUrl: string;
  footer?: string;
}): string {
  const { subject, preheader, content, siteUrl, footer } = parts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${WHITE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${WHITE};">
<tr><td align="center" style="padding:0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="background-color:${BLACK};padding:24px 32px;">
<img src="${escapeHtml(`${siteUrl}/assets/solutiq-logo-white-email.png`)}" width="42" height="32" alt="SOLUTIQ" style="display:block;border:0;outline:none;color:${WHITE};font-family:${HEADING_FONT};font-size:16px;font-weight:700;">
</td></tr>
<tr><td style="background-color:${NAVY};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:40px 32px 32px 32px;font-family:${BODY_FONT};font-size:16px;line-height:1.6;color:${BLACK};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:40px;height:2px;line-height:2px;font-size:0;background-color:${GOLD};">&nbsp;</td></tr></table>
${content}
</td></tr>
<tr><td style="padding:24px 32px 40px 32px;border-top:1px solid #E4E2E1;font-family:${BODY_FONT};font-size:13px;line-height:1.6;color:${MUTED};">
SOLUTIQ · Technology · Talent · Partnership<br>
<a href="https://solutiq.africa" style="color:${MUTED};text-decoration:none;">solutiq.africa</a>${footer ?? ""}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Bulk messages. The team writes the subject and body as plain text with
// {{variables}}; fillVariables runs per recipient before rendering.

export const MESSAGE_VARIABLES = [
  "firstName",
  "eventTitle",
  "eventDate",
  "venueName",
  "registrationLink",
] as const;

export type MessageVariables = Record<(typeof MESSAGE_VARIABLES)[number], string>;

// Known {{variables}} are replaced; anything else is left as typed, so a
// typo shows up in the test email instead of vanishing.
export function fillVariables(template: string, vars: MessageVariables): string {
  return template.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (match, name: string) =>
    name in vars ? vars[name as keyof MessageVariables] : match,
  );
}

// Escaped text with http(s) links made clickable. Trailing punctuation stays
// outside the link.
const linkified = (value: string) =>
  multiline(value).replace(/https?:\/\/[^\s<]+/g, (url) => {
    const trimmed = url.replace(/[.,;:!?)\]]+$/, "");
    return `<a href="${trimmed}" style="color:${BLACK};text-decoration:underline;">${trimmed}</a>${url.slice(trimmed.length)}`;
  });

export type MessageContent = {
  subject: string; // variables already filled
  body: string; // variables already filled
  title: string;
  siteUrl: string;
  // Present on marketing (non-service) emails only.
  unsubscribeUrl?: string;
};

export function renderMessage(content: MessageContent): RenderedEmail {
  const { subject, title, siteUrl, unsubscribeUrl } = content;
  const body = content.body.replace(/\r\n?/g, "\n").trim();
  const unsubscribe = "Don't want SOLUTIQ event invitations?";

  const text = [
    body,
    "",
    "--",
    "SOLUTIQ · Technology · Talent · Partnership",
    "solutiq.africa",
    ...(unsubscribeUrl ? ["", `${unsubscribe} Unsubscribe: ${unsubscribeUrl}`] : []),
  ].join("\n");

  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px 0;">${linkified(paragraph)}</p>`)
    .join("\n");

  const html = frame({
    subject,
    preheader: body.split("\n")[0] ?? title,
    content: `<h1 style="margin:20px 0 24px 0;font-family:${HEADING_FONT};font-size:26px;line-height:1.25;font-weight:700;color:${BLACK};">${escapeHtml(title)}</h1>
${paragraphs}`,
    siteUrl,
    footer: unsubscribeUrl
      ? `<br><br>${escapeHtml(unsubscribe)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a>`
      : undefined,
  });

  return { subject, html, text };
}
