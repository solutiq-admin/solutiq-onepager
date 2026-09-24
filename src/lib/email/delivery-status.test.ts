import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { allowedFrom, isHardBounce, statusForEvent } from "./delivery-status.ts";

describe("allowedFrom", () => {
  it("moves forward only", () => {
    assert.deepEqual(allowedFrom("sent"), ["queued"]);
    assert.deepEqual(allowedFrom("delayed"), ["queued", "sent"]);
    assert.deepEqual(allowedFrom("delivered"), ["queued", "sent", "delayed"]);
  });

  it("never moves back from delivered or a problem status", () => {
    for (const next of ["sent", "delayed", "delivered"] as const) {
      for (const current of ["delivered", "bounced", "complained", "failed"] as const) {
        if (current === next) continue;
        assert.ok(!allowedFrom(next).includes(current), `${current} -> ${next} must be refused`);
      }
    }
  });

  it("lets bounced, complained and failed override anything else", () => {
    assert.ok(allowedFrom("bounced").includes("delivered"));
    assert.ok(allowedFrom("complained").includes("delivered"));
    assert.ok(allowedFrom("complained").includes("bounced"));
    assert.ok(allowedFrom("failed").includes("sent"));
  });

  it("treats a repeat of the same status as a no-op", () => {
    for (const status of ["sent", "delayed", "delivered", "bounced", "complained", "failed"] as const) {
      assert.ok(!allowedFrom(status).includes(status), status);
    }
    assert.deepEqual(allowedFrom("queued"), []);
  });
});

describe("statusForEvent", () => {
  it("maps the subscribed Resend events", () => {
    assert.equal(statusForEvent("email.sent"), "sent");
    assert.equal(statusForEvent("email.delivery_delayed"), "delayed");
    assert.equal(statusForEvent("email.delivered"), "delivered");
    assert.equal(statusForEvent("email.bounced"), "bounced");
    assert.equal(statusForEvent("email.complained"), "complained");
    assert.equal(statusForEvent("email.failed"), "failed");
  });

  it("ignores tracking and unrelated events", () => {
    assert.equal(statusForEvent("email.opened"), undefined);
    assert.equal(statusForEvent("email.clicked"), undefined);
    assert.equal(statusForEvent("contact.created"), undefined);
  });
});

describe("isHardBounce", () => {
  it("is true only for permanent bounces", () => {
    assert.equal(isHardBounce("Permanent"), true);
    assert.equal(isHardBounce("permanent"), true);
    assert.equal(isHardBounce("Transient"), false);
    assert.equal(isHardBounce("Undetermined"), false);
    assert.equal(isHardBounce(undefined), false);
  });
});
