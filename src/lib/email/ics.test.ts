import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildIcs, escapeText, eventUid, foldLine, toIcsUtc, type IcsInput } from "./ics.ts";

const octets = (value: string) => new TextEncoder().encode(value).length;

const base: IcsInput = {
  method: "REQUEST",
  eventId: 42,
  sequence: 3,
  // 18:00–21:00 SAST (UTC+2)
  start: "2026-10-15T16:00:00.000Z",
  end: "2026-10-15T19:00:00.000Z",
  summary: "Leadership Breakfast",
  location: "The Venue, 1 Main Road, Johannesburg",
  description: "Doors open at 17:30.\nParking on site.",
  url: "https://solutiq.africa/events/leadership-breakfast",
  organizer: { email: "host@solutiq.africa", name: "SOLUTIQ Events" },
  attendee: { email: "guest@example.com", name: "Thandi Mokoena" },
  now: new Date("2026-09-24T10:00:00.000Z"),
};

// Undo folding so property values can be checked whole.
const unfold = (ics: string) => ics.replace(/\r\n /g, "");
const property = (ics: string, name: string) =>
  unfold(ics)
    .split("\r\n")
    .find((line) => line.startsWith(`${name}:`) || line.startsWith(`${name};`));

describe("toIcsUtc", () => {
  it("formats an ISO string as UTC basic format", () => {
    assert.equal(toIcsUtc("2026-10-15T16:00:00.000Z"), "20261015T160000Z");
  });

  it("converts a SAST offset to UTC", () => {
    assert.equal(toIcsUtc("2026-10-15T18:00:00+02:00"), "20261015T160000Z");
  });

  it("rolls the date back across midnight", () => {
    assert.equal(toIcsUtc("2026-01-01T01:30:00+02:00"), "20251231T233000Z");
  });

  it("accepts a Date", () => {
    assert.equal(toIcsUtc(new Date(Date.UTC(2026, 0, 2, 3, 4, 5))), "20260102T030405Z");
  });

  it("rejects an invalid date", () => {
    assert.throws(() => toIcsUtc("not a date"));
  });
});

describe("escapeText", () => {
  it("escapes backslash, semicolon and comma", () => {
    assert.equal(escapeText("a\\b;c,d"), "a\\\\b\\;c\\,d");
  });

  it("escapes every newline style", () => {
    assert.equal(escapeText("one\ntwo\r\nthree\rfour"), "one\\ntwo\\nthree\\nfour");
  });

  it("escapes the backslash before adding new ones", () => {
    assert.equal(escapeText("\\n"), "\\\\n");
  });

  it("leaves colons alone", () => {
    assert.equal(escapeText("Time: 18:00"), "Time: 18:00");
  });
});

describe("foldLine", () => {
  it("leaves a 75-octet line alone", () => {
    const line = "X".repeat(75);
    assert.equal(foldLine(line), line);
  });

  it("folds at 75 octets with CRLF and a space", () => {
    const folded = foldLine("X".repeat(76));
    assert.equal(folded, `${"X".repeat(75)}\r\n X`);
  });

  it("keeps every physical line within 75 octets, including the leading space", () => {
    const folded = foldLine(`DESCRIPTION:${"abcdefghij".repeat(40)}`);
    for (const line of folded.split("\r\n")) assert.ok(octets(line) <= 75, `${octets(line)} octets`);
    assert.equal(folded.replace(/\r\n /g, ""), `DESCRIPTION:${"abcdefghij".repeat(40)}`);
  });

  it("never splits a multi-byte character", () => {
    const value = `SUMMARY:${"Ĉ€😀".repeat(30)}`;
    const folded = foldLine(value);
    for (const line of folded.split("\r\n")) {
      assert.ok(octets(line) <= 75);
      assert.ok(!line.includes("�"));
    }
    assert.equal(folded.replace(/\r\n /g, ""), value);
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(base);

  it("uses CRLF line endings throughout and ends with one", () => {
    assert.ok(ics.endsWith("\r\n"));
    assert.equal(ics.replace(/\r\n/g, "").includes("\n"), false);
    assert.equal(ics.replace(/\r\n/g, "").includes("\r"), false);
  });

  it("keeps every line within 75 octets", () => {
    const long = buildIcs({ ...base, description: "Long ".repeat(100) });
    for (const line of long.split("\r\n")) assert.ok(octets(line) <= 75);
  });

  it("wraps one VEVENT in a VCALENDAR", () => {
    const lines = ics.trimEnd().split("\r\n");
    assert.equal(lines[0], "BEGIN:VCALENDAR");
    assert.equal(lines.at(-1), "END:VCALENDAR");
    assert.equal(lines.filter((line) => line === "BEGIN:VEVENT").length, 1);
    assert.equal(property(ics, "VERSION"), "VERSION:2.0");
  });

  it("sets METHOD:REQUEST and a confirmed status", () => {
    assert.equal(property(ics, "METHOD"), "METHOD:REQUEST");
    assert.equal(property(ics, "STATUS"), "STATUS:CONFIRMED");
  });

  it("uses a stable UID per event", () => {
    assert.equal(property(ics, "UID"), "UID:event-42@solutiq.africa");
    assert.equal(eventUid(42), "event-42@solutiq.africa");
    assert.equal(property(buildIcs({ ...base, sequence: 9 }), "UID"), property(ics, "UID"));
  });

  it("writes the sequence given", () => {
    assert.equal(property(ics, "SEQUENCE"), "SEQUENCE:3");
    assert.equal(property(buildIcs({ ...base, sequence: 0 }), "SEQUENCE"), "SEQUENCE:0");
  });

  it("never writes a negative or fractional sequence", () => {
    assert.equal(property(buildIcs({ ...base, sequence: -1 }), "SEQUENCE"), "SEQUENCE:0");
    assert.equal(property(buildIcs({ ...base, sequence: 2.7 }), "SEQUENCE"), "SEQUENCE:2");
  });

  it("writes start, end and stamp in UTC", () => {
    assert.equal(property(ics, "DTSTART"), "DTSTART:20261015T160000Z");
    assert.equal(property(ics, "DTEND"), "DTEND:20261015T190000Z");
    assert.equal(property(ics, "DTSTAMP"), "DTSTAMP:20260924T100000Z");
  });

  it("escapes text properties", () => {
    assert.equal(property(ics, "LOCATION"), "LOCATION:The Venue\\, 1 Main Road\\, Johannesburg");
    assert.equal(property(ics, "DESCRIPTION"), "DESCRIPTION:Doors open at 17:30.\\nParking on site.");
  });

  it("writes the URL unescaped", () => {
    assert.equal(property(ics, "URL"), "URL:https://solutiq.africa/events/leadership-breakfast");
  });

  it("writes the organiser and an attendee asked to RSVP", () => {
    assert.equal(property(ics, "ORGANIZER"), 'ORGANIZER;CN="SOLUTIQ Events":mailto:host@solutiq.africa');
    const attendee = property(ics, "ATTENDEE") ?? "";
    assert.ok(attendee.startsWith('ATTENDEE;CN="Thandi Mokoena";'));
    assert.ok(attendee.includes(";RSVP=TRUE"));
    assert.ok(attendee.endsWith(":mailto:guest@example.com"));
  });

  it("strips quotes and control characters from names", () => {
    const tricky = buildIcs({ ...base, attendee: { email: "guest@example.com", name: 'A "B"\r\nC' } });
    assert.ok((property(tricky, "ATTENDEE") ?? "").startsWith('ATTENDEE;CN="A BC";'));
  });

  it("leaves out optional properties that are empty", () => {
    const bare = buildIcs({ ...base, location: undefined, description: "", url: undefined });
    assert.equal(property(bare, "LOCATION"), undefined);
    assert.equal(property(bare, "DESCRIPTION"), undefined);
    assert.equal(property(bare, "URL"), undefined);
  });

  it("cancels with the same UID, METHOD:CANCEL and a higher sequence", () => {
    const cancel = buildIcs({ ...base, method: "CANCEL", sequence: base.sequence + 1 });
    assert.equal(property(cancel, "METHOD"), "METHOD:CANCEL");
    assert.equal(property(cancel, "STATUS"), "STATUS:CANCELLED");
    assert.equal(property(cancel, "UID"), property(ics, "UID"));
    assert.equal(property(cancel, "SEQUENCE"), "SEQUENCE:4");
  });
});
