// Hand-written iCalendar (RFC 5545) for event invites. One VEVENT per file,
// UID stable per event, so a later update or cancel with a higher SEQUENCE
// replaces the original in the guest's calendar.
//
// No imports on purpose: the unit tests run this file directly with Node.

export type IcsMethod = "REQUEST" | "CANCEL";

export type IcsInput = {
  method: IcsMethod;
  eventId: number | string;
  sequence: number;
  start: Date | string;
  end: Date | string;
  summary: string;
  location?: string;
  description?: string;
  url?: string;
  organizer: { email: string; name?: string };
  attendee: { email: string; name?: string };
  now?: Date;
};

const CRLF = "\r\n";
const MAX_OCTETS = 75;

export const eventUid = (eventId: number | string) => `event-${eventId}@solutiq.africa`;

// 20260924T160000Z. Dates are stored in UTC; SAST has no DST, so UTC is exact.
export function toIcsUtc(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date for calendar invite");
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// TEXT values: backslash, semicolon, comma and newlines are escaped.
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// Parameter values (CN) are quoted; a double quote or control character
// cannot appear inside one, so they are dropped.
const quoteParam = (value: string) => `"${value.replace(/["\x00-\x1f\x7f]/g, "")}"`;

const mailto = (email: string) => `mailto:${email.replace(/[\s"<>]/g, "")}`;

// Lines longer than 75 octets are split with CRLF + space. The leading space
// counts towards the next line's 75, and multi-byte characters are never cut.
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  let limit = MAX_OCTETS;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > limit) {
      parts.push(current);
      current = "";
      octets = 0;
      limit = MAX_OCTETS - 1;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

export function buildIcs(input: IcsInput): string {
  const cancelled = input.method === "CANCEL";
  const person = (label: string, who: { email: string; name?: string }, params = "") =>
    `${label}${who.name ? `;CN=${quoteParam(who.name)}` : ""}${params}:${mailto(who.email)}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SOLUTIQ//Events//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${input.method}`,
    "BEGIN:VEVENT",
    `UID:${eventUid(input.eventId)}`,
    `SEQUENCE:${Math.max(0, Math.floor(input.sequence))}`,
    `DTSTAMP:${toIcsUtc(input.now ?? new Date())}`,
    `DTSTART:${toIcsUtc(input.start)}`,
    `DTEND:${toIcsUtc(input.end)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    input.location && `LOCATION:${escapeText(input.location)}`,
    input.description && `DESCRIPTION:${escapeText(input.description)}`,
    input.url && `URL:${input.url.replace(/\s/g, "")}`,
    person("ORGANIZER", input.organizer),
    person(
      "ATTENDEE",
      input.attendee,
      ";CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE",
    ),
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => Boolean(line));

  return lines.map(foldLine).join(CRLF) + CRLF;
}
