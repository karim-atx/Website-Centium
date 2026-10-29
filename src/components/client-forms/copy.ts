// Release 3 · W7 client forms: strings shared by the sheet and its tests.
//
// The "talk to a doctor" follow-up reuses the client's Mood check-in wording
// and its warning-signs button, word for word (FINAL_PLAN 3 §6.2 "New (CU6)";
// components/health-checks/CheckInSheet.tsx). logic.test.ts checks they still
// match that file.

export const DOCTOR_FOLLOW_UP = "It may help to talk to a doctor about how you've been feeling.";
export const SEE_WARNING_SIGNS = "See warning signs";

/**
 * FINAL_PLAN 3 §6.2 (CU6, decision 6): the fixed consent line above Send.
 * In recovery-sensitive mode (J12, form_question_hidden_in_recovery since
 * 20261124190000) both the measurement and the photo questions are hidden and
 * never sent, so the line names neither: the answers themselves are what the
 * professional sees, with this check-in only.
 */
export const consentLine = (pro: string, kind: "intake" | "check_in", bodyHidden = false) => {
  const what = kind === "check_in" ? "check-in" : "form";
  return bodyHidden
    ? `Your answers go to ${pro} when you send. ${pro} sees them with this ${what} only.`
    : `Your answers go to ${pro} when you send. ${pro} sees your photos and measurements with this ${what} only.`;
};

/**
 * Release A (save_form_response p_consent, not drawn): the required box
 * above Send. The fallback name ("Your professional") reads mid-sentence.
 */
export const consentBox = (pro: string) => `Share these answers with ${pro === "Your professional" ? "your professional" : pro}`;

/**
 * 20261222080000: a support prompt's line when the form gives none (the
 * approved templates don't), above its private Get support link.
 */
export const SUPPORT_PROMPT = "If things are hard right now, you can talk to someone. Only you see this.";
export const GET_SUPPORT = "Get support";
/** Under an urgent prompt: the number its message names. */
export const URGENT_NUMBER = "112";

/** FINAL_PLAN 3 §6.2: no service promise. */
export const thanksLine = (pro: string) => `Thanks. ${pro} will review it.`;
