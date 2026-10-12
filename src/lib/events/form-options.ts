import config from "@payload-config";
import { getPayload } from "payload";
import { cache } from "react";

import type { FormOptionList } from "@/collections/FormOptions";

// Active options for the registration form, in admin order. Read by the
// event pages and re-read by registerForEvent to check what was submitted.

export type FormOption = { id: number; label: string };
export type FormOptions = Record<FormOptionList, FormOption[]>;

export const getFormOptions = cache(async (): Promise<FormOptions> => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "form-options",
    where: { active: { equals: true } },
    sort: "sortOrder",
    depth: 0,
    pagination: false,
    select: { label: true, list: true },
  });
  const options: FormOptions = { salutation: [], industry: [], "attendance-goal": [] };
  for (const doc of docs) options[doc.list].push({ id: doc.id, label: doc.label });
  return options;
});
