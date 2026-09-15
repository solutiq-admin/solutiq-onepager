"use client";

import { FormEvent, ReactNode, useState } from "react";

type ContactFormData = {
  name: string;
  email: string;
  organisation: string;
  message: string;
};

type FieldErrors = {
  name?: string;
  email?: string;
  message?: string;
  _server?: string;
};

const emptyForm: ContactFormData = { name: "", email: "", organisation: "", message: "" };

const inputClass =
  "w-full rounded-[4px] border border-[rgba(255,255,255,0.18)] bg-[#211F27] px-4 py-[13px] font-[family-name:var(--font-body)] text-[15px] leading-[1.6] text-white outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#B3AFAE]/60 focus:border-[#F9B630] focus:shadow-[0_0_0_3px_rgba(249,182,48,0.12)]";

export default function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!formData.name.trim()) errors.name = "Please add your name";
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email.trim()))
      errors.email = "Please add an email";
    if (!formData.message.trim()) errors.message = "Tell us a little about it";
    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const firstKey = Object.keys(errors)[0] as keyof ContactFormData;
      (event.currentTarget.elements.namedItem(firstKey) as HTMLElement | null)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          organisation: formData.organisation.trim(),
          message: formData.message.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setFieldErrors({ _server: payload?.error || "Something didn't send. Please try again." });
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setFieldErrors({ _server: "Something didn't send. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" style={{ background: "#000000" }}>
      <div className="mx-auto grid max-w-[1280px] px-6 pt-16 pb-20 sm:px-12 sm:pt-24 sm:pb-[112px] md:grid-cols-2">

        {/* Left panel */}
        <div className="flex flex-col pb-14 md:pb-0 md:pr-20 md:border-r md:border-r-[rgba(249,182,48,0.3)]">
          <div>
            <div className="mb-6 font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.25em] uppercase text-[#F9B630]">
              Contact
            </div>
            <h1 className="contact-h1 mb-6 font-[family-name:var(--font-heading)] text-[49px] font-bold leading-[1.1] tracking-[-0.01em] text-white">
              Start the conversation.
            </h1>
            <p className="max-w-none text-[20px] leading-[1.7] text-[#B3AFAE] md:max-w-[420px]">
              Not a proposal. Not a pitch. A genuine conversation about where you are, where you want to go, and how we build the path between — together.
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-6 md:mt-[72px]">
            <div className="flex flex-col gap-[6px]">
              <span className="font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.25em] uppercase text-[#F9B630]">Email</span>
              <a href="mailto:hello@solutiq.africa" className="text-[16px] text-[#B3AFAE] transition-colors hover:text-white">hello@solutiq.africa</a>
            </div>
            <div className="flex flex-col gap-[6px]">
              <span className="font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.25em] uppercase text-[#F9B630]">Phone</span>
              <a href="tel:+27657143355" className="text-[16px] text-[#B3AFAE] transition-colors hover:text-white">+27 65 714 3355</a>
            </div>
            <div className="flex flex-col gap-[6px]">
              <span className="font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.25em] uppercase text-[#F9B630]">Location</span>
              <span className="text-[16px] text-[#B3AFAE]">Johannesburg, South Africa</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="md:pl-20 md:mt-0 mt-14">
          {submitted ? (
            <div className="pt-2">
              <div className="mb-6 h-[2px] w-10 bg-[#F9B630]" />
              <div className="flex items-center gap-[14px]">
                <svg viewBox="0 0 26 26" fill="none" className="h-[26px] w-[26px] shrink-0">
                  <path d="M6 13.5L11 18.5L20 8" stroke="#F9B630" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-[20px] leading-[1.7] text-white">Thanks — we&apos;ll be in touch shortly.</p>
              </div>
              <p className="mt-3 max-w-[400px] text-[15px] text-[#B3AFAE]">
                We reply to every genuine enquiry within one business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <FieldRow label="Name" name="name" error={fieldErrors.name}>
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClass}
                />
              </FieldRow>

              <FieldRow label="Email" name="email" error={fieldErrors.email}>
                <input
                  type="email"
                  name="email"
                  placeholder="you@organisation.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={inputClass}
                />
              </FieldRow>

              <FieldRow label="Organisation" name="organisation">
                <input
                  type="text"
                  name="organisation"
                  placeholder="Where you work"
                  value={formData.organisation}
                  onChange={(e) => updateField("organisation", e.target.value)}
                  className={inputClass}
                />
              </FieldRow>

              <FieldRow label="Message" name="message" error={fieldErrors.message}>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Where are you, and where do you want to go?"
                  value={formData.message}
                  onChange={(e) => updateField("message", e.target.value)}
                  className={inputClass + " resize-vertical"}
                />
              </FieldRow>

              {fieldErrors._server && (
                <p className="mb-4 text-[13px] text-[#F9B630]">{fieldErrors._server}</p>
              )}

              <div className="mt-2 flex items-center gap-5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="whitespace-nowrap rounded-[4px] border-none bg-[#F9B630] px-[34px] py-[14px] font-[family-name:var(--font-body)] text-[15px] font-semibold tracking-[0.01em] text-[#000000] transition-colors duration-150 hover:bg-[#C9920F] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </section>
  );
}

function FieldRow({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-7">
      <label
        htmlFor={name}
        className="mb-2 flex items-baseline justify-between gap-3 text-[13px] tracking-[0.02em] text-[#B3AFAE]"
      >
        {label}
        {error && <span className="text-[12px] text-[#F9B630]">{error}</span>}
      </label>
      {children}
    </div>
  );
}
