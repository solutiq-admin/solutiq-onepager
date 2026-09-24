"use server";

import config from "@payload-config";
import { after } from "next/server";
import { getPayload } from "payload";

import { sendConfirmation } from "@/lib/email/confirmation";
import { CONSENT_VERSION } from "@/lib/events/consent";
import { EVENT_COPY } from "@/lib/events/copy";
import { getPublicEvent, registrationState, sharedLinkFull } from "@/lib/events/event";
import type { Guestlist, Person } from "@/payload-types";

// Public registration for both links. Everything is re-checked here against
// the saved event; nothing the browser sends about the form is trusted.
// Public writes use the Local API, which overrides access.

export type RegisterState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SECONDS_ON_PAGE = 3;
const MAX_TEXT = 500;
const MAX_TEXTAREA = 5000;

const success: RegisterState = { status: "success", message: EVENT_COPY.success };
const failure = (message: string = EVENT_COPY.error): RegisterState => ({ status: "error", message });

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export async function registerForEvent(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  // Bots: a filled honeypot, or an instant submit on the shared link, gets
  // the normal success message and nothing is stored. Personal links skip
  // the timer: the token is the gate, and a prefilled form can be quick.
  const token = text(formData, "token");
  const startedAt = Number(text(formData, "startedAt"));
  const tooFast = !(startedAt > 0) || Date.now() - startedAt < MIN_SECONDS_ON_PAGE * 1000;
  if (text(formData, "website") || (!token && tooFast)) return success;

  const payload = await getPayload({ config });

  try {
    const event = await getPublicEvent(text(formData, "slug"));
    if (!event) return failure(token ? EVENT_COPY.invalidLink : EVENT_COPY.error);

    const state = registrationState(event);
    if (state === "cancelled") return failure(EVENT_COPY.cancelled);
    if (state === "closed") return failure(EVENT_COPY.closed);

    // Validate the fixed fields, consent and the event's own questions.
    const fieldErrors: Record<string, string> = {};
    const fullName = text(formData, "fullName").slice(0, 200);
    const email = text(formData, "email").toLowerCase();
    if (!token) {
      if (!fullName) fieldErrors.fullName = "Please add your name.";
      if (!EMAIL.test(email) || email.length > 254) fieldErrors.email = "Please add a valid email address.";
    }
    if (formData.get("consent") !== "on") {
      fieldErrors.consent = "Please confirm you agree so we can register you.";
    }
    const futureEventsConsent = formData.get("futureEvents") === "on";

    const responses: Record<string, string | boolean> = {};
    for (const question of event.extraFields ?? []) {
      const key = `q.${question.name}`;
      if (question.type === "checkbox") {
        const checked = formData.get(key) === "on";
        if (question.required && !checked) fieldErrors[key] = "Please tick this box.";
        responses[question.name] = checked;
        continue;
      }
      const value = text(formData, key);
      if (question.required && !value) {
        fieldErrors[key] = "Please answer this question.";
        continue;
      }
      if (question.type === "select" && value && !(question.options ?? []).includes(value)) {
        fieldErrors[key] = "Please choose one of the options.";
        continue;
      }
      responses[question.name] = value.slice(0, question.type === "textarea" ? MAX_TEXTAREA : MAX_TEXT);
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { status: "error", message: "Please check the highlighted fields.", fieldErrors };
    }

    const now = new Date().toISOString();
    const registration = {
      status: "registered" as const,
      registeredAt: now,
      responses,
      consentVersion: CONSENT_VERSION,
      consentedAt: now,
    };

    // Opting in from a public form only ever turns consent on. Withdrawing
    // goes through unsubscribe, so nobody can switch it off for someone else.
    const recordFutureConsent = async (person: Person | number) => {
      if (!futureEventsConsent) return;
      const id = typeof person === "object" ? person.id : person;
      await payload.update({
        collection: "people",
        id,
        data: { futureEventsConsent: true },
      });
    };

    // Only a registration that actually happens here gets a confirmation;
    // sendConfirmation itself refuses a second one for the same entry.
    const confirm = (entryId: number) => after(() => sendConfirmation(entryId));

    // Personal link: the entry, and so the person and email, come from the token.
    if (token) {
      const { docs } = await payload.find({
        collection: "guestlist",
        where: { token: { equals: token }, event: { equals: event.id } },
        limit: 1,
        depth: 0,
      });
      const entry = docs[0];
      if (!entry || entry.status === "cancelled") return failure(EVENT_COPY.invalidLink);
      if (entry.status === "registered") return success; // idempotent

      await payload.update({ collection: "guestlist", id: entry.id, data: registration });
      await recordFutureConsent(entry.person);
      confirm(entry.id);
      return success;
    }

    // Shared link.
    if (!event.openRegistration) return failure(EVENT_COPY.inviteOnly);

    const found = await findPerson(payload, email);
    const existing = found ? await findEntry(payload, event.id, found.id) : undefined;

    if (existing) {
      // Already on the guestlist: upgrade in place, keep its source.
      if (existing.status === "invited") {
        await payload.update({ collection: "guestlist", id: existing.id, data: registration });
        await recordFutureConsent(existing.person);
        confirm(existing.id);
      }
      // Registered already, or cancelled by the team: change nothing.
      return success;
    }

    if (await sharedLinkFull(event)) return failure(EVENT_COPY.full);

    // An existing person keeps their stored name.
    const person = found ?? (await createPerson(payload, email, fullName));
    let created: Guestlist;
    try {
      created = await payload.create({
        collection: "guestlist",
        data: { event: event.id, person: person.id, source: "shared-link", ...registration },
      });
    } catch (error) {
      // A simultaneous submit created the entry first; that one stands.
      if (await findEntry(payload, event.id, person.id)) return success;
      throw error;
    }
    await recordFutureConsent(person);
    confirm(created.id);
    return success;
  } catch (error) {
    payload.logger.error({ err: error, msg: "registerForEvent failed" });
    return failure();
  }
}

type Payload = Awaited<ReturnType<typeof getPayload>>;

async function findPerson(payload: Payload, email: string): Promise<Person | undefined> {
  const { docs } = await payload.find({
    collection: "people",
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  });
  return docs[0];
}

async function createPerson(payload: Payload, email: string, fullName: string): Promise<Person> {
  try {
    return await payload.create({
      collection: "people",
      data: { fullName, email, type: "guest", createdVia: "shared-link" },
    });
  } catch (error) {
    // A simultaneous submit created the person first; use that record.
    const raced = await findPerson(payload, email);
    if (raced) return raced;
    throw error;
  }
}

async function findEntry(payload: Payload, eventId: number, personId: number): Promise<Guestlist | undefined> {
  const { docs } = await payload.find({
    collection: "guestlist",
    where: { event: { equals: eventId }, person: { equals: personId } },
    limit: 1,
    depth: 0,
  });
  return docs[0];
}
