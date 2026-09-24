// POPIA consent for event registration. One versioned constant: every
// registration stores CONSENT_VERSION, so change the version whenever the
// wording changes.
//
// DRAFT WORDING: needs sign-off before launch. Not legal advice.

export const CONSENT_VERSION = "2026-09-v1";

export const CONSENT_TEXT =
  "I agree that SOLUTIQ may store and use the details I give here to manage my registration for this event and to contact me about it, in line with the Protection of Personal Information Act (POPIA).";

export const FUTURE_EVENTS_TEXT = "Keep me informed about future SOLUTIQ events";

// TODO(privacy): no /privacy page exists yet. Set this to "/privacy" once
// the privacy policy is published; the consent line links to it when set.
export const PRIVACY_URL: string | null = null;
