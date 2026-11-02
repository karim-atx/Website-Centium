// Release 3 · W7 client forms: strings shared by the sheet and its tests.
//
// The "talk to a doctor" follow-up reuses the client's Mood check-in wording
// and its warning-signs button, word for word (FINAL_PLAN 3 §6.2 "New (CU6)";
// components/health-checks/CheckInSheet.tsx). logic.test.ts checks they still
// match that file.

import type { SupportPlace } from "../../services/moderation/support";
import { t, tk } from "../../i18n/core";

// Round G (EH3b): the constants are English keys (tk); screens show them
// through t(). The functions return the active language.
export const DOCTOR_FOLLOW_UP = tk("It may help to talk to a doctor about how you've been feeling.");
export const SEE_WARNING_SIGNS = tk("See warning signs");

/**
 * FINAL_PLAN 3 §6.2 (CU6, decision 6): the fixed consent line above Send.
 * In recovery-sensitive mode (J12, form_question_hidden_in_recovery since
 * 20261124190000) both the measurement and the photo questions are hidden and
 * never sent, so the line names neither: the answers themselves are what the
 * professional sees, with this check-in only.
 */
export const consentLine = (pro: string, kind: "intake" | "check_in", bodyHidden = false) => {
  if (kind === "check_in") {
    return bodyHidden
      ? t("Your answers go to {pro} when you send. {pro} sees them with this check-in only.", { pro })
      : t("Your answers go to {pro} when you send. {pro} sees your photos and measurements with this check-in only.", { pro });
  }
  return bodyHidden
    ? t("Your answers go to {pro} when you send. {pro} sees them with this form only.", { pro })
    : t("Your answers go to {pro} when you send. {pro} sees your photos and measurements with this form only.", { pro });
};

/**
 * Release A (save_form_response p_consent, not drawn): the required box
 * above Send. The fallback name ("Your professional") reads mid-sentence.
 */
export const consentBox = (pro: string) =>
  t("Share these answers with {pro}", { pro: pro === "Your professional" || pro === t("Your professional") ? t("your professional") : pro });

/**
 * 20261222080000: a support prompt's line when the form gives none (the
 * approved templates don't), above its private Get support link.
 */
export const SUPPORT_PROMPT = tk("If things are hard right now, you can talk to someone. Only you see this.");
export const GET_SUPPORT = tk("Get support");
/**
 * Under an urgent prompt: the numbers its message names (Round F, Karim A13
 * and the Database's C5): in Lebanon the Red Cross on 140, or 112; elsewhere
 * the message says "call your local emergency number" and no number is offered.
 */
export const urgentNumbers = (place: SupportPlace): string[] => (place === "lebanon" ? ["140", "112"] : []);

/** FINAL_PLAN 3 §6.2: no service promise. */
export const thanksLine = (pro: string) => t("Thanks. {pro} will review it.", { pro });
