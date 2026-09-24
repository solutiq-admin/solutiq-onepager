"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { canManage } from "@/access";
import { copyQuestions } from "@/fields/questions";

// Server actions behind the Event edit view's quick-add and "Save as
// template" panels. Every Local API call runs as the logged-in user
// (overrideAccess: false), so access.ts still decides what is allowed.

type Result = { ok: true; message: string } | { ok: false; message: string };

const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

async function authorise() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  return { payload, user: user && canManage(user) ? user : null };
}

export type QuickAddResult = Result & {
  added: number;
  skipped: number;
  invalid: string[];
};

export async function quickAddGuests(
  eventId: number | string,
  text: string,
): Promise<QuickAddResult> {
  const empty = { added: 0, skipped: 0, invalid: [] as string[] };
  const { payload, user } = await authorise();
  if (!user) return { ok: false, message: "You don't have permission to add guests.", ...empty };

  // "Full name, email" per line. Split on the last comma so names with
  // commas survive.
  const guests = new Map<string, string>();
  const invalid: string[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const comma = line.lastIndexOf(",");
    const fullName = comma > 0 ? line.slice(0, comma).trim() : "";
    const email = comma > 0 ? line.slice(comma + 1).trim().toLowerCase() : "";
    if (!fullName || !EMAIL.test(email)) invalid.push(line);
    else if (guests.has(email)) skipped++;
    else guests.set(email, fullName);
  }

  let added = 0;
  try {
    const event = await payload.findByID({
      collection: "events",
      id: eventId,
      depth: 0,
      user,
      overrideAccess: false,
    });

    for (const [email, fullName] of guests) {
      const found = await payload.find({
        collection: "people",
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        user,
        overrideAccess: false,
      });
      const person =
        found.docs[0] ??
        (await payload.create({
          collection: "people",
          data: { fullName, email, type: "guest", createdVia: "quick-add" },
          user,
          overrideAccess: false,
        }));

      const existing = await payload.count({
        collection: "guestlist",
        where: { event: { equals: event.id }, person: { equals: person.id } },
        user,
        overrideAccess: false,
      });
      if (existing.totalDocs > 0) {
        skipped++;
        continue;
      }

      await payload.create({
        collection: "guestlist",
        data: { event: event.id, person: person.id, status: "invited", source: "guestlist" },
        user,
        overrideAccess: false,
      });
      added++;
    }
  } catch (error) {
    payload.logger.error({ err: error, msg: "quick-add failed" });
    return {
      ok: false,
      message: `Something went wrong after adding ${added}. Nothing already added was lost; paste the list again to add the rest.`,
      added,
      skipped,
      invalid,
    };
  }

  return {
    ok: true,
    message: `Added ${added} · skipped ${skipped} already on the guestlist · ${invalid.length} invalid`,
    added,
    skipped,
    invalid,
  };
}

export async function saveEventAsTemplate(
  eventId: number | string,
  rawName: string,
): Promise<Result> {
  const name = rawName.trim();
  if (!name) return { ok: false, message: "Give the template a name." };

  const { payload, user } = await authorise();
  if (!user) return { ok: false, message: "You don't have permission to create templates." };

  try {
    // Reads the saved event, never the unsaved form state.
    const event = await payload.findByID({
      collection: "events",
      id: eventId,
      depth: 0,
      user,
      overrideAccess: false,
    });
    const questions = copyQuestions(event.extraFields);
    if (questions.length === 0) {
      return { ok: false, message: "This event has no saved questions to copy." };
    }

    const duplicate = await payload.count({
      collection: "form-templates",
      where: { name: { equals: name } },
      user,
      overrideAccess: false,
    });
    if (duplicate.totalDocs > 0) {
      return { ok: false, message: `A template called "${name}" already exists. Choose another name.` };
    }

    await payload.create({
      collection: "form-templates",
      data: {
        name,
        description: `Saved from the event "${event.title}".`,
        extraFields: questions,
      },
      user,
      overrideAccess: false,
    });
  } catch (error) {
    payload.logger.error({ err: error, msg: "save as template failed" });
    return { ok: false, message: "Couldn't save the template. Please try again." };
  }

  return { ok: true, message: `Saved as template "${name}".` };
}
