"use client";

import { type FormEvent, type ReactNode, startTransition, useActionState, useEffect, useRef } from "react";

import { registerForEvent, type RegisterState } from "@/app/(site)/events/actions";
import { CONSENT_TEXT, FUTURE_EVENTS_TEXT, PHOTO_CONSENT_OPTIONS, PHOTO_CONSENT_TEXT, PRIVACY_URL } from "@/lib/events/consent";
import type { Question } from "@/fields/questions";

// One form for both links. Personal links pass `token` plus the guest's
// stored name and email, which are shown locked; the server takes both from
// the guestlist entry, never from this form.

type Props = {
  slug: string;
  questions: Question[];
  askPhotoConsent: boolean;
  token?: string;
  guest?: { fullName: string; email: string };
};

const inputClass =
  "w-full rounded-[4px] border border-[rgba(255,255,255,0.18)] bg-[#211F27] px-4 py-[13px] font-[family-name:var(--font-body)] text-[15px] leading-[1.6] text-white outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#B3AFAE]/60 focus:border-[#F9B630] focus:shadow-[0_0_0_3px_rgba(249,182,48,0.12)] read-only:cursor-not-allowed read-only:border-dashed read-only:text-[#B3AFAE] aria-[invalid=true]:border-[#e5484d]";

const checkboxClass = "mt-[3px] h-[18px] w-[18px] shrink-0 accent-white";

const initialState: RegisterState = { status: "idle" };

export function RegistrationForm({ slug, questions, askPhotoConsent, token, guest }: Props) {
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

      <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          maxLength={200}
          defaultValue={guest?.fullName}
          readOnly={Boolean(guest)}
          aria-invalid={Boolean(errors.fullName)}
          className={inputClass}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="email"
        error={errors.email}
        hint={guest ? "This invitation is linked to this address." : undefined}
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={guest?.email}
          readOnly={Boolean(guest)}
          aria-invalid={Boolean(errors.email)}
          className={inputClass}
        />
      </Field>

      {questions.map((question) => {
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
