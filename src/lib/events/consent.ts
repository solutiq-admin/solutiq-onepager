// POPIA and photography consent for event registration. One versioned
// constant covers all the wording in this file: every registration stores
// CONSENT_VERSION, so change the version whenever any of it changes.
//
// DRAFT WORDING: needs sign-off before launch. Not legal advice.

export const CONSENT_VERSION = "2026-10-v2";

export const CONSENT_TEXT =
  "I agree that SOLUTIQ may store and use the details I give here to manage my registration for this event and to contact me about it, in line with the Protection of Personal Information Act (POPIA).";

// Asked only when the event has askPhotoConsent on. Either answer registers
// the guest; the answer is stored on the guestlist entry as photoConsent.
export const PHOTO_CONSENT_TEXT =
  "SOLUTIQ may take photographs and video at this event and use them on its website, social media and in its communications.";

export const PHOTO_CONSENT_OPTIONS = [
  { value: "yes", label: "I'm happy to appear in photographs and video" },
  { value: "no", label: "Please don't include me in photographs or video" },
] as const;

export type PhotoConsent = (typeof PHOTO_CONSENT_OPTIONS)[number]["value"];

export const FUTURE_EVENTS_TEXT = "Keep me informed about future SOLUTIQ events";

// TODO(privacy): no /privacy page exists yet. Set this to "/privacy" once
// the privacy policy is published; the consent line links to it when set.
export const PRIVACY_URL: string | null = null;
