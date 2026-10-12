"use client";

import { type FormEvent, type ReactNode, startTransition, useActionState, useEffect, useRef } from "react";

import { registerForEvent, type RegisterState } from "@/app/(site)/events/actions";
import { CONSENT_TEXT, FUTURE_EVENTS_TEXT, PHOTO_CONSENT_OPTIONS, PHOTO_CONSENT_TEXT, PRIVACY_URL } from "@/lib/events/consent";
import type { Question } from "@/fields/questions";
import { STANDARD_FIELDS, type StandardField } from "@/fields/standardFields";
import type { FormOption, FormOptions } from "@/lib/events/form-options";

// One form for both links: the event's questions in order, then consent.
// Standard fields keep fixed input names (e.g. `firstName`) and take their
// choices from Form options; custom questions are named `q.<name>`.
// Personal links pass `token` plus whatever is stored for the guest. Their
// email is shown locked, and the server takes it from the guestlist entry,
// never from this form; the other details are prefilled and can be corrected.

export type GuestDefaults = {
  email: string;
  salutation?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  organisation?: string | null;
  industry?: number | null;
};

type Props = {
  slug: string;
  questions: Question[];
  options: FormOptions;
  askPhotoConsent: boolean;
  token?: string;
  guest?: GuestDefaults;
};

const inputClass =
  "w-full rounded-[4px] border border-[rgba(255,255,255,0.18)] bg-[#211F27] px-4 py-[13px] font-[family-name:var(--font-body)] text-[15px] leading-[1.6] text-white outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#B3AFAE]/60 focus:border-[#F9B630] focus:shadow-[0_0_0_3px_rgba(249,182,48,0.12)] read-only:cursor-not-allowed read-only:border-dashed read-only:text-[#B3AFAE] aria-[invalid=true]:border-[#e5484d]";

const checkboxClass = "mt-[3px] h-[18px] w-[18px] shrink-0 accent-white";

const initialState: RegisterState = { status: "idle" };

export function RegistrationForm({ slug, questions, options, askPhotoConsent, token, guest }: Props) {
  const [state, formAction, pending] = useActionState(registerForEvent, initialState);
  // Set after hydration so the time-on-page check measures this visit, not
  // when the static page was generated.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Submit manually so React doesn't reset the form after a failed attempt.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("startedAt", String(startedAt.current));
    startTransition(() => formAction(data));
  };

  if (state.status === "success") {
    return (
      <div role="status" className="pt-2">
        <div className="mb-6 h-[2px] w-10 bg-[#F9B630]" />
        <div className="flex items-center gap-[14px]">
          <svg viewBox="0 0 26 26" fill="none" aria-hidden className="h-[26px] w-[26px] shrink-0">
            <path d="M6 13.5L11 18.5L20 8" stroke="#F9B630" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[20px] leading-[1.7] text-white">{state.message}</p>
        </div>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="slug" value={slug} />
      {token && <input type="hidden" name="token" value={token} />}
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {questions.map((question) => {
        if (question.standard) {
          return (
            <StandardInput
              key={question.standard}
              field={question.standard}
              label={question.label}
              required={Boolean(question.required)}
              options={options}
              guest={guest}
              error={errors[question.standard]}
            />
          );
        }
        const name = `q.${question.name}`;
        const id = `q-${question.name}`;
        const error = errors[name];
        const required = Boolean(question.required);
        switch (question.type) {
          case "checkbox":
            return (
              <CheckboxRow key={name} id={id} name={name} error={error} required={required}>
                {question.label}
                {required && <RequiredMark />}
              </CheckboxRow>
            );
          case "select":
            return (
              <Field key={name} label={question.label} htmlFor={id} error={error} required={required}>
                <select id={id} name={name} required={required} defaultValue="" aria-invalid={Boolean(error)} className={inputClass}>
                  <option value="">{required ? "Choose one" : "Choose one (optional)"}</option>
                  {(question.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            );
          case "textarea":
            return (
              <Field key={name} label={question.label} htmlFor={id} error={error} required={required}>
                <textarea id={id} name={name} rows={4} maxLength={5000} required={required} aria-invalid={Boolean(error)} className={`${inputClass} resize-y`} />
              </Field>
            );
          default:
            return (
              <Field key={name} label={question.label} htmlFor={id} error={error} required={required}>
                <input id={id} name={name} type="text" maxLength={500} required={required} aria-invalid={Boolean(error)} className={inputClass} />
              </Field>
            );
        }
      })}

      {askPhotoConsent && (
        <fieldset className="flex flex-col gap-3" aria-invalid={Boolean(errors.photoConsent)}>
          <legend className="mb-2 font-[family-name:var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.2em] text-[#B3AFAE]">
            Photography
            <RequiredMark />
          </legend>
          <p className="text-[15px] leading-[1.6] text-[#B3AFAE]">{PHOTO_CONSENT_TEXT}</p>
          {PHOTO_CONSENT_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.6] text-[#B3AFAE]">
              <input type="radio" name="photoConsent" value={option.value} required className={checkboxClass} />
              <span>{option.label}</span>
            </label>
          ))}
          {errors.photoConsent && <p className="pl-[30px] text-[13px] text-[#ff8a8a]">{errors.photoConsent}</p>}
        </fieldset>
      )}

      <div className="flex flex-col gap-4 border-t border-white/[0.08] pt-6">
        <CheckboxRow id="consent" name="consent" error={errors.consent} required>
          {CONSENT_TEXT}
          {PRIVACY_URL && (
            <>
              {" "}
              <a href={PRIVACY_URL} className="text-white underline underline-offset-2 hover:text-[#F9B630]">
                Privacy policy
              </a>
            </>
          )}
          <RequiredMark />
        </CheckboxRow>
        <CheckboxRow id="futureEvents" name="futureEvents">
          {FUTURE_EVENTS_TEXT}
        </CheckboxRow>
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-[15px] text-[#ff8a8a]">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[4px] border border-[#F9B630] bg-transparent px-7 py-[14px] font-[family-name:var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.08em] text-[#F9B630] transition-colors duration-150 hover:bg-[rgba(249,182,48,0.1)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(249,182,48,0.3)] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Registering…" : "Register"}
      </button>
    </form>
  );
}

function RequiredMark() {
  return (
    <span aria-hidden className="ml-1 text-[#B3AFAE]">
      *
    </span>
  );
}

function StandardInput({
  field,
  label,
  required,
  options,
  guest,
  error,
}: {
  field: StandardField;
  label: string;
  required: boolean;
  options: FormOptions;
  guest?: GuestDefaults;
  error?: string;
}) {
  const config: (typeof STANDARD_FIELDS)[StandardField] = STANDARD_FIELDS[field];
  switch (config.kind) {
    case "email":
      return (
        <Field
          label={label}
          htmlFor={field}
          error={error}
          required
          hint={guest ? "This invitation is linked to this address." : undefined}
        >
          <input
            id={field}
            name={field}
            type="email"
            autoComplete="email"
            required
            defaultValue={guest?.email}
            readOnly={Boolean(guest)}
            aria-invalid={Boolean(error)}
            className={inputClass}
          />
        </Field>
      );
    case "text":
      return (
        <Field label={label} htmlFor={field} error={error} required={required}>
          <input
            id={field}
            name={field}
            type="text"
            autoComplete={config.autoComplete}
            required={required}
            maxLength={config.maxLength}
            defaultValue={guestText(guest, field) ?? undefined}
            aria-invalid={Boolean(error)}
            className={inputClass}
          />
        </Field>
      );
    case "option":
      return (
        <OptionSelect
          name={field}
          label={label}
          required={required}
          options={options[config.list]}
          defaultValue={field === "salutation" ? guest?.salutation : field === "industry" ? guest?.industry : undefined}
          error={error}
        />
      );
    case "options":
      return (
        <fieldset className="flex flex-col gap-3" aria-invalid={Boolean(error)}>
          <legend className="mb-2 font-[family-name:var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.2em] text-[#B3AFAE]">
            {label}
            {required && <RequiredMark />}
          </legend>
          {options[config.list].map((option) => (
            <label key={option.id} className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.6] text-[#B3AFAE]">
              <input type="checkbox" name={field} value={option.id} className={checkboxClass} />
              <span>{option.label}</span>
            </label>
          ))}
          {error && <p className="pl-[30px] text-[13px] text-[#ff8a8a]">{error}</p>}
        </fieldset>
      );
  }
}

const guestText = (guest: GuestDefaults | undefined, field: StandardField) =>
  field === "firstName" || field === "lastName" || field === "jobTitle" || field === "organisation"
    ? guest?.[field]
    : undefined;

function OptionSelect({
  name,
  label,
  required,
  options,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  required: boolean;
  options: FormOption[];
  defaultValue?: number | null;
  error?: string;
}) {
  // A stored choice that has since been retired falls back to "Choose one".
  const initial = options.some((option) => option.id === defaultValue) ? String(defaultValue) : "";
  return (
    <Field label={label} htmlFor={name} error={error} required={required}>
      <select id={name} name={name} required={required} defaultValue={initial} aria-invalid={Boolean(error)} className={inputClass}>
        <option value="">{required ? "Choose one" : "Choose one (optional)"}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="font-[family-name:var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.2em] text-[#B3AFAE]">
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {hint && <p className="text-[13px] text-[#B3AFAE]">{hint}</p>}
      {error && <p className="text-[13px] text-[#ff8a8a]">{error}</p>}
    </div>
  );
}

function CheckboxRow({
  id,
  name,
  error,
  required,
  children,
}: {
  id: string;
  name: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.6] text-[#B3AFAE]">
        <input id={id} name={name} type="checkbox" required={required} aria-invalid={Boolean(error)} className={checkboxClass} />
        <span>{children}</span>
      </label>
      {error && <p className="pl-[30px] text-[13px] text-[#ff8a8a]">{error}</p>}
    </div>
  );
}
