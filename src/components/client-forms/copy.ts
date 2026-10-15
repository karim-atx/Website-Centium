// Release 3 · W7 client forms: strings shared by the sheet and its tests.
//
// The "talk to a doctor" follow-up reuses the client's Mood check-in wording
// and its warning-signs button, word for word (FINAL_PLAN 3 §6.2 "New (CU6)";
// components/health-checks/CheckInSheet.tsx). logic.test.ts checks they still
// match that file.

export const DOCTOR_FOLLOW_UP = "It may help to talk to a doctor about how you've been feeling.";
export const SEE_WARNING_SIGNS = "See warning signs";

/** FINAL_PLAN 3 §6.2 (CU6, decision 6): the fixed consent line above Send. */
export const consentLine = (pro: string, kind: "intake" | "check_in") =>
  `Your answers go to ${pro} when you send. ${pro} sees your photos and measurements with this ${kind === "check_in" ? "check-in" : "form"} only.`;

/** FINAL_PLAN 3 §6.2: no service promise. */
export const thanksLine = (pro: string) => `Thanks. ${pro} will review it.`;
