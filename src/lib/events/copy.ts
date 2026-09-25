// Public registration page messages, kept in one place for review.
// DRAFT: functional wording, not signed-off brand copy.

export const EVENT_COPY = {
  inviteOnly:
    "Registration for this event is by personal invitation. If you were invited, please use the link in your invitation.",
  full: "Registration for this event is full.",
  closed: "Registration for this event has closed.",
  cancelled: "This event has been cancelled.",
  invalidLink: "This link is not valid. Please contact the host.",
  registered: "You're registered for this event.",
  success: "Thank you. Your registration has been received.",
  error: "Something went wrong. Please try again.",
} as const;

// /unsubscribe page. DRAFT: functional wording, not signed-off brand copy.
export const UNSUBSCRIBE_COPY = {
  invalid: "This link is not valid.",
  invalidDetail: "If you want to stop receiving SOLUTIQ event emails, reply to any of them and we'll take you off the list.",
  confirm: "Unsubscribe from SOLUTIQ event emails?",
  confirmDetail:
    "You'll stop receiving event invitations and announcements. If you've registered for an event, we'll still tell you if its time or place changes, or if it's cancelled.",
  button: "Unsubscribe",
  done: "You're unsubscribed.",
  doneDetail:
    "You won't receive further event invitations from SOLUTIQ. If you've registered for an event, we'll still tell you if its time or place changes, or if it's cancelled.",
} as const;
