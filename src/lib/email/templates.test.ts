import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fillVariables, renderMessage } from "./templates.ts";

const vars = {
  firstName: "Thandi",
  eventTitle: "Builders' Breakfast",
  eventDate: "Thursday 1 October 2026 · 08:00–10:00 SAST",
  venueName: "The Centre",
  registrationLink: "https://solutiq.africa/events/breakfast/r/abc123",
};

describe("fillVariables", () => {
  it("replaces known variables, with or without spaces", () => {
    assert.equal(fillVariables("Hi {{firstName}}, see {{ registrationLink }}", vars), `Hi Thandi, see ${vars.registrationLink}`);
  });

  it("leaves unknown variables as typed", () => {
    assert.equal(fillVariables("Hi {{fristName}}", vars), "Hi {{fristName}}");
  });
});

describe("renderMessage", () => {
  const base = { subject: "Join us", title: "Builders' Breakfast" };

  it("shows the logo from the inline attachment, never a hosted URL", () => {
    const { html } = renderMessage({ ...base, body: "Hello" });
    assert.match(html, /<img src="cid:solutiq-logo"/);
    assert.match(html, />SOLUTIQ<\/td>/);
  });

  it("escapes the body and links URLs without trailing punctuation", () => {
    const { html, text } = renderMessage({ ...base, body: `Register <here>: ${vars.registrationLink}.` });
    assert.match(html, /Register &lt;here&gt;:/);
    assert.match(html, new RegExp(`<a href="${vars.registrationLink}"[^>]*>${vars.registrationLink}</a>\\.`));
    assert.match(text, /^Register <here>:/);
  });

  it("adds the unsubscribe link only when given", () => {
    const url = "https://solutiq.africa/unsubscribe?u=tok";
    const withLink = renderMessage({ ...base, body: "Hello", unsubscribeUrl: url });
    assert.ok(withLink.html.includes(url));
    assert.ok(withLink.text.includes(url));

    const without = renderMessage({ ...base, body: "Hello" });
    assert.ok(!without.html.includes("Unsubscribe"));
    assert.ok(!without.text.includes("Unsubscribe"));
  });

  it("turns blank lines into paragraphs", () => {
    const { html } = renderMessage({ ...base, body: "One\n\nTwo\nlines" });
    assert.match(html, /<p[^>]*>One<\/p>\n<p[^>]*>Two<br>lines<\/p>/);
  });
});
