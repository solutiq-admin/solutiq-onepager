"use server";

import config from "@payload-config";
import { after } from "next/server";
import { getPayload } from "payload";

import { sendConfirmation } from "@/lib/email/confirmation";
import { CONSENT_VERSION, PHOTO_CONSENT_OPTIONS, type PhotoConsent } from "@/lib/events/consent";
import { EVENT_COPY } from "@/lib/events/copy";
import { getPublicEvent, registrationState, sharedLinkFull } from "@/lib/events/event";
import { STANDARD_FIELDS } from "@/fields/standardFields";
import { getFormOptions } from "@/lib/events/form-options";
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

    // Validate the event's questions and consent. Email, first and last
    // name are always required; the other standard fields only when the
    // event asks them. Choices must be active options from the right list.
    const fieldErrors: Record<string, string> = {};
    const questions = event.extraFields ?? [];
    const asked = new Map(questions.flatMap((question) => (question.standard ? [[question.standard, question]] : [])));
    const isRequired = (field: keyof typeof STANDARD_FIELDS) => Boolean(asked.get(field)?.required);

    const options = await getFormOptions();
    const optionId = (list: keyof typeof options, raw: unknown) =>
      options[list].find((option) => String(option.id) === raw)?.id;
    const textOf = (field: "firstName" | "lastName" | "jobTitle" | "organisation") =>
      asked.has(field) ? text(formData, field).slice(0, STANDARD_FIELDS[field].maxLength) || undefined : undefined;

    const salutationOption = asked.has("salutation") ? optionId("salutation", text(formData, "salutation")) : undefined;
    const firstName = text(formData, "firstName").slice(0, STANDARD_FIELDS.firstName.maxLength);
    const lastName = text(formData, "lastName").slice(0, STANDARD_FIELDS.lastName.maxLength);
    const email = text(formData, "email").toLowerCase();
    const jobTitle = textOf("jobTitle");
    const organisation = textOf("organisation");
    const industryOption = asked.has("industry") ? optionId("industry", text(formData, "industry")) : undefined;
    const attendanceGoalOptions = asked.has("attendanceGoals")
      ? [...new Set(formData.getAll("attendanceGoals").map((raw) => optionId("attendance-goal", raw)))].filter(
          (id): id is number => id !== undefined,
        )
      : [];

    if (!firstName) fieldErrors.firstName = "Please add your first name.";
    if (!lastName) fieldErrors.lastName = "Please add your last name.";
    if (!token && (!EMAIL.test(email) || email.length > 254)) {
      fieldErrors.email = "Please add a valid email address.";
    }
    if (isRequired("salutation") && !salutationOption) fieldErrors.salutation = "Please choose one.";
    if (isRequired("jobTitle") && !jobTitle) fieldErrors.jobTitle = "Please add your job title.";
    if (isRequired("organisation") && !organisation) fieldErrors.organisation = "Please add your organisation's name.";
    if (isRequired("industry") && !industryOption) fieldErrors.industry = "Please choose one.";
    if (isRequired("attendanceGoals") && attendanceGoalOptions.length === 0) {
      fieldErrors.attendanceGoals = "Please choose at least one.";
    }
    if (formData.get("consent") !== "on") {
      fieldErrors.consent = "Please confirm you agree so we can register you.";
    }
    const futureEventsConsent = formData.get("futureEvents") === "on";
    let photoConsent: PhotoConsent | undefined;
    if (event.askPhotoConsent) {
      photoConsent = PHOTO_CONSENT_OPTIONS.find((option) => option.value === text(formData, "photoConsent"))?.value;
      if (!photoConsent) fieldErrors.photoConsent = "Please choose one.";
    }

    const responses: Record<string, string | boolean> = {};
    for (const question of questions) {
      if (question.standard || !question.name) continue;
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

    // Labels are copied from the options by the Guestlist and People hooks.
    const profile = { salutationOption, firstName, lastName, jobTitle, organisation, industryOption };

    const now = new Date().toISOString();
    const registration = {
      status: "registered" as const,
      registeredAt: now,
      ...profile,
      attendanceGoalOptions,
      responses,
      consentVersion: CONSENT_VERSION,
      consentedAt: now,
      photoConsent,
    };

    // Opting in from a public form only ever turns consent on. Withdrawing
    // goes through unsubscribe, so nobody can switch it off for someone else.
    // A personal link also fills in details the person record is missing,
    // never overwriting them. The shared link can't prove who is registering,
    // so it leaves an existing person's details alone.
    const updatePerson = async (person: Person | number, fillProfile: boolean) => {
      const id = typeof person === "object" ? person.id : person;
      let data: Partial<Person> = {};
      if (fillProfile) {
        const current = await payload.findByID({ collection: "people", id, depth: 0 });
        data = Object.fromEntries(
          Object.entries(profile).filter(([key, value]) => value !== undefined && !current[key as keyof typeof profile]),
        );
      }
      if (futureEventsConsent) data.futureEventsConsent = true;
      if (Object.keys(data).length > 0) await payload.update({ collection: "people", id, data });
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
      await updatePerson(entry.person, true);
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
        await updatePerson(existing.person, false);
        confirm(existing.id);
      }
      // Registered already, or cancelled by the team: change nothing.
      return success;
    }

    if (await sharedLinkFull(event)) return failure(EVENT_COPY.full);

    // An existing person keeps their stored details.
    const person = found ?? (await createPerson(payload, email, profile));
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
    await updatePerson(person, false);
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

type Profile = Pick<
  Person,
  "salutationOption" | "firstName" | "lastName" | "jobTitle" | "organisation" | "industryOption"
>;

async function createPerson(payload: Payload, email: string, profile: Profile): Promise<Person> {
  try {
    return await payload.create({
      collection: "people",
      data: {
        ...profile,
        fullName: `${profile.firstName} ${profile.lastName}`,
        email,
        type: "guest",
        createdVia: "shared-link",
      },
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
