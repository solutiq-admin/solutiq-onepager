import type { FormOptionList } from "../collections/FormOptions";

// RSVP questions that code knows how to store. A question marked with one of
// these keys saves into its own column on Guestlist and People instead of
// `responses`. Choice lists come live from Form options, never from the
// question itself. Shared by the admin config and the public form.

type StandardFieldConfig =
  | { label: string; kind: "text"; autoComplete: string; maxLength: number }
  | { label: string; kind: "email" }
  | { label: string; kind: "option" | "options"; list: FormOptionList };

export const STANDARD_FIELDS = {
  salutation: { label: "Salutation", kind: "option", list: "salutation" },
  firstName: { label: "First name", kind: "text", autoComplete: "given-name", maxLength: 100 },
  lastName: { label: "Last name", kind: "text", autoComplete: "family-name", maxLength: 100 },
  email: { label: "Business email", kind: "email" },
  jobTitle: { label: "Job title", kind: "text", autoComplete: "organization-title", maxLength: 200 },
  organisation: { label: "Organisation name", kind: "text", autoComplete: "organization", maxLength: 200 },
  industry: { label: "Describe your organisation's industry", kind: "option", list: "industry" },
  attendanceGoals: { label: "What do you hope to achieve by attending", kind: "options", list: "attendance-goal" },
} as const satisfies Record<string, StandardFieldConfig>;

export type StandardField = keyof typeof STANDARD_FIELDS;

export const STANDARD_FIELD_KEYS = Object.keys(STANDARD_FIELDS) as StandardField[];

// They create or find the guest's People record, so every event asks them
// and they are always required.
export const CORE_FIELDS: StandardField[] = ["email", "firstName", "lastName"];

export const isStandardField = (value: unknown): value is StandardField =>
  typeof value === "string" && value in STANDARD_FIELDS;
