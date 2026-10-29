// Text moderation on our side (Round C Release 2). Pure.
//
// The word lists live in the database: a blocked word is refused with ATX60
// (DETAIL = the category, NEVER the word, and we never say which word
// matched), a held word hides the item until our team checks it, a flagged
// one changes nothing for the author. Contact details on a public surface
// are a hold on the server; here they are explained at save time instead,
// so the person can move them to a message before anything is held.

export const BLOCKED_TEXT = "That contains a word this community doesn't allow. Edit it and try again.";

export const CONTACT_TEXT =
  "Phone numbers and email addresses can't be shared here. Send them in a message instead.";

/** ATX60 → the one sentence every surface shows; null for any other error. */
export function moderationRefusal(error: { code?: string | null } | null | undefined): string | null {
  return error?.code === "ATX60" ? BLOCKED_TEXT : null;
}

// An email address, written normally.
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/u;
// A phone number: 7 or more digits, allowing spaces, dots, dashes, slashes,
// brackets and a leading +, in one run ("+961 3 123 456", "03/123456").
const PHONE = /(?:\+|\b)\d(?:[\s().\/-]{0,2}\d){6,}/;
// Things that are numbers but not contact details: dates, and amounts with a unit after them.
const NOT_PHONE = /^\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}$/;
const UNIT_AFTER = /^\s*(lbp|ll\b|l\.l|lira|usd|\$|€|eur|kcal|cal\b|steps|k?g\b|ml\b|%)/i;

/**
 * Whether the text holds a phone number or an email address. Deliberately
 * narrow (no links or handles: a link is a server hold, and "@name" is how
 * people mention each other); a false alarm here stops a save.
 */
export function hasContactDetails(text: string | null | undefined): boolean {
  const s = (text ?? "").normalize("NFKC");
  if (!s.trim()) return false;
  if (EMAIL.test(s)) return true;
  for (const m of s.matchAll(new RegExp(PHONE.source, "g"))) {
    const run = m[0];
    const after = s.slice((m.index ?? 0) + run.length);
    if (NOT_PHONE.test(run.trim()) || UNIT_AFTER.test(after)) continue;
    if (run.replace(/\D/g, "").length >= 7) return true;
  }
  return false;
}

/** CONTACT_TEXT when any of the texts holds contact details, else null. */
export function contactRefusal(...texts: (string | null | undefined)[]): string | null {
  return texts.some(hasContactDetails) ? CONTACT_TEXT : null;
}

/** Whether a sentence on screen is one of ours (so it carries the guidelines link). */
export const isModerationMessage = (m: string | null | undefined): boolean => m === BLOCKED_TEXT || m === CONTACT_TEXT;
