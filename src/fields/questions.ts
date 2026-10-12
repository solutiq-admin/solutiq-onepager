import type { ArrayField } from "payload";

import { CORE_FIELDS, STANDARD_FIELDS, type StandardField, isStandardField } from "./standardFields";

// Registration questions. Defined once, used by Events and FormTemplates.
// A question is either standard (one of STANDARD_FIELDS, stored on the
// guest's record, its type and name set by code) or custom (stored in
// `responses`). Consent stays fixed in code and never appears here.

const QUESTION_NAME = /^[a-z][a-z0-9_]*$/;

export type Question = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  standard?: StandardField | null;
  required?: boolean | null;
  options?: string[] | null;
};

// Strips row ids so a copy never collides with the source rows.
export const copyQuestions = (rows: unknown): Question[] =>
  Array.isArray(rows)
    ? rows.map(({ name, label, type, standard, required, options }: Question) => ({
        name,
        label,
        type,
        standard: standard ?? null,
        required: Boolean(required),
        options: type === "select" && !standard ? (options ?? []) : [],
      }))
    : [];

const isCore = (standard: unknown) => CORE_FIELDS.includes(standard as StandardField);

const listOf = (labels: string[]) =>
  labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : labels[0];

const uniqueNames = (rows: unknown) => {
  if (!Array.isArray(rows)) return true;
  const names = rows.map((row) => (row as Question).name);
  const duplicate = names.find((name, i) => name && names.indexOf(name) !== i);
  return duplicate ? `Each question needs a unique name ("${duplicate}" is used twice).` : true;
};

export const questionsField: ArrayField = {
  name: "extraFields",
  label: "Registration questions",
  type: "array",
  labels: {
    singular: "Question",
    plural: "Questions",
  },
  admin: {
    description:
      "Standard fields save to the guest's record and take their choices from Form options. Every event must ask for business email, first name and last name. Changing questions after people have registered does not change their stored answers.",
    initCollapsed: true,
    components: {
      RowLabel: "@/components/admin/QuestionRowLabel#QuestionRowLabel",
    },
  },
  validate: uniqueNames,
  fields: [
    {
      name: "standard",
      label: "Standard field",
      type: "select",
      options: Object.entries(STANDARD_FIELDS).map(([value, { label }]) => ({ label, value })),
      admin: {
        description: "Leave empty for a custom question.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
          admin: {
            width: "60%",
            description: "The question as guests see it. Filled in for standard fields if left empty.",
          },
          hooks: {
            beforeValidate: [
              ({ value, siblingData }) =>
                !value && isStandardField(siblingData?.standard) ? STANDARD_FIELDS[siblingData.standard].label : value,
            ],
          },
        },
        {
          name: "name",
          type: "text",
          required: true,
          admin: {
            width: "40%",
            description: "Internal key, e.g. dietary_needs. Lowercase, numbers, underscores.",
            condition: (_, siblingData) => !siblingData?.standard,
          },
          hooks: {
            // A standard field's key is its name, so it can't be mistyped.
            beforeValidate: [
              ({ value, siblingData }) => (isStandardField(siblingData?.standard) ? siblingData.standard : value),
            ],
          },
          validate: (value: string | null | undefined, { siblingData }: { siblingData: Partial<Question> }) => {
            if (siblingData?.standard) return true;
            if (!value || !QUESTION_NAME.test(value)) {
              return "Start with a letter; use only lowercase letters, numbers and underscores.";
            }
            return isStandardField(value)
              ? `"${value}" is reserved for the ${STANDARD_FIELDS[value].label} standard field. Choose it above instead.`
              : true;
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "type",
          type: "select",
          required: true,
          defaultValue: "text",
          options: [
            { label: "Short text", value: "text" },
            { label: "Long text", value: "textarea" },
            { label: "Choice (dropdown)", value: "select" },
            { label: "Checkbox", value: "checkbox" },
          ],
          admin: {
            width: "50%",
            condition: (_, siblingData) => !siblingData?.standard,
          },
        },
        {
          name: "required",
          type: "checkbox",
          defaultValue: false,
          admin: {
            width: "50%",
            style: { alignSelf: "center" },
            condition: (_, siblingData) => !isCore(siblingData?.standard),
          },
          hooks: {
            beforeChange: [({ value, siblingData }) => (isCore(siblingData?.standard) ? true : value)],
          },
        },
      ],
    },
    {
      name: "options",
      type: "text",
      hasMany: true,
      admin: {
        description: "Type each choice and press Enter.",
        condition: (_, siblingData) => siblingData?.type === "select" && !siblingData?.standard,
      },
      validate: (value: string[] | null | undefined, { siblingData }: { siblingData: Partial<Question> }) =>
        siblingData?.type !== "select" || siblingData?.standard || (Array.isArray(value) && value.length > 0)
          ? true
          : "A choice question needs at least one option.",
    },
  ],
};

// Events also need the core fields, which create or find the guest's record.
export const eventQuestionsField: ArrayField = {
  ...questionsField,
  validate: (rows) => {
    const unique = uniqueNames(rows);
    if (unique !== true) return unique;
    const present = new Set((Array.isArray(rows) ? rows : []).map((row) => (row as Question).standard));
    const missing = CORE_FIELDS.filter((key) => !present.has(key)).map((key) => STANDARD_FIELDS[key].label);
    return missing.length > 0
      ? `Every event must ask for ${listOf(missing)}. Add them as standard fields, or apply the default template.`
      : true;
  },
};
