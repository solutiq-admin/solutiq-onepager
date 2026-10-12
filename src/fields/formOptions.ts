import type { FieldHook, RowField } from "payload";

import type { FormOptionList } from "../collections/FormOptions";

// A link to a form option plus a copy of its label, side by side. Used on
// People and Guestlist. The copy keeps the answer readable after an option
// is renamed or retired.

type Id = number | string;

const idOf = (value: unknown): Id | null => {
  const id = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  return typeof id === "number" || typeof id === "string" ? id : null;
};

const idsOf = (value: unknown): Id[] =>
  (Array.isArray(value) ? value : [value]).map(idOf).filter((id): id is Id => id !== null);

const sameIds = (a: unknown, b: unknown) => {
  const x = idsOf(a).map(String).sort();
  const y = idsOf(b).map(String).sort();
  return x.length === y.length && x.every((id, i) => id === y[i]);
};

// Refreshes the label copy only when the chosen option changes, so a later
// save never rewrites an old answer from a renamed option.
const snapshotLabels =
  (relationName: string, hasMany: boolean): FieldHook =>
  async ({ value, siblingData, previousSiblingDoc, req }) => {
    if (!(relationName in siblingData)) return value;
    const chosen = (siblingData as Record<string, unknown>)[relationName];
    const previous = (previousSiblingDoc as Record<string, unknown> | undefined)?.[relationName];
    if (previousSiblingDoc && sameIds(chosen, previous)) return value;

    const ids = idsOf(chosen);
    if (ids.length === 0) return hasMany ? [] : null;
    const { docs } = await req.payload.find({
      collection: "form-options",
      where: { id: { in: ids } },
      sort: "sortOrder",
      depth: 0,
      pagination: false,
      select: { label: true },
      req,
    });
    const labels = docs.map((doc) => doc.label);
    return hasMany ? labels : (labels[0] ?? null);
  };

export const optionFields = ({
  list,
  relationName,
  labelName,
  label,
  hasMany = false,
}: {
  list: FormOptionList;
  relationName: string;
  labelName: string;
  label: string;
  hasMany?: boolean;
}): RowField => ({
  type: "row",
  fields: [
    {
      name: relationName,
      label,
      type: "relationship",
      relationTo: "form-options",
      hasMany,
      // List only, not active: past answers may point at retired options.
      filterOptions: { list: { equals: list } },
      admin: { width: "50%", allowCreate: false },
    },
    {
      name: labelName,
      label: `${label} (as answered)`,
      type: "text",
      hasMany,
      admin: {
        width: "50%",
        readOnly: true,
        description: "Copied from the option when it's chosen.",
      },
      hooks: { beforeChange: [snapshotLabels(relationName, hasMany)] },
    },
  ],
});
