import type { ArrayField } from "payload";

// Extra registration questions. Defined once, used by Events and
// FormTemplates. Name and email are fixed in code and never appear here.

const QUESTION_NAME = /^[a-z][a-z0-9_]*$/;

export type Question = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  required?: boolean | null;
  options?: string[] | null;
};

// Strips row ids so a copy never collides with the source rows.
export const copyQuestions = (rows: unknown): Question[] =>
  Array.isArray(rows)
    ? rows.map(({ name, label, type, required, options }: Question) => ({
        name,
        label,
        type,
        required: Boolean(required),
        options: type === "select" ? (options ?? []) : [],
      }))
    : [];

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
      "Asked after name and email, which are always included. Changing questions after people have registered does not change their stored answers.",
    initCollapsed: true,
    components: {
      RowLabel: "@/components/admin/QuestionRowLabel#QuestionRowLabel",
    },
  },
  validate: (rows) => {
    if (!Array.isArray(rows)) return true;
    const names = rows.map((row) => (row as Question).name);
    const duplicate = names.find((name, i) => name && names.indexOf(name) !== i);
    return duplicate ? `Each question needs a unique name ("${duplicate}" is used twice).` : true;
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
          admin: {
            width: "60%",
            description: "The question as guests see it.",
          },
        },
        {
          name: "name",
          type: "text",
          required: true,
          admin: {
            width: "40%",
            description: "Internal key, e.g. dietary_needs. Lowercase, numbers, underscores.",
          },
          validate: (value: string | null | undefined) =>
            value && QUESTION_NAME.test(value)
              ? true
              : "Start with a letter; use only lowercase letters, numbers and underscores.",
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
          admin: { width: "50%" },
        },
        {
          name: "required",
          type: "checkbox",
          defaultValue: false,
          admin: { width: "50%", style: { alignSelf: "center" } },
        },
      ],
    },
    {
      name: "options",
      type: "text",
      hasMany: true,
      admin: {
        description: "Type each choice and press Enter.",
        condition: (_, siblingData) => siblingData?.type === "select",
      },
      validate: (value: string[] | null | undefined, { siblingData }: { siblingData: Partial<Question> }) =>
        siblingData?.type !== "select" || (Array.isArray(value) && value.length > 0)
          ? true
          : "A choice question needs at least one option.",
    },
  ],
};
