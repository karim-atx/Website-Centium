// When the app reports itself active (report_app_active, Round C Release 2).
// Pure, so it is tested without the Supabase client.

/** Inside the contract's 30–45 seconds. */
export const PRESENCE_INTERVAL_MS = 35_000;

/** Whether this tab should be reporting: shown and in front. */
export const presenceWanted = (visibility: string, focused: boolean): boolean => visibility === "visible" && focused;

/**
 * Report away the moment the app leaves the screen (Database
 * 20261227080000 report_app_away(), which deletes this account's stamp):
 * the server skips a message push for 60 s after the last report_app_active,
 * so without it a message sent just after the app was backgrounded or closed
 * arrived with no notification.
 *
 * A step of the presence state: `active` (reporting every
 * PRESENCE_INTERVAL_MS), `away` (told the server), `unknown` (nothing said
 * yet). Whatever says the app is in front (visible and focused, or the
 * phone's resume) makes it active at once; whatever says it left (hidden,
 * blurred, closed, the phone's pause) makes it away, said once.
 */
export type PresenceState = "unknown" | "active" | "away";
export type PresenceSignal = "front" | "left";
export type PresenceAction = "active" | "away" | null;

export function presenceStep(state: PresenceState, signal: PresenceSignal): { next: PresenceState; action: PresenceAction } {
  if (signal === "front") return state === "active" ? { next: "active", action: null } : { next: "active", action: "active" };
  // Away once; from "unknown" too, so a page that opens hidden says so.
  return state === "away" ? { next: "away", action: null } : { next: "away", action: "away" };
}

/** The browser's own signals as one: shown and in front, or not. */
export const presenceSignal = (visibility: string, focused: boolean): PresenceSignal => (presenceWanted(visibility, focused) ? "front" : "left");

/**
 * A missing function is not an error worth a word: before the Database
 * migration is live the call answers PGRST202 (or 404), and the stamp then
 * lapses after 60 s as before. Deploy order doesn't matter.
 */
export const presenceErrorIgnorable = (e: { code?: string; status?: number; message?: string } | null): boolean =>
  !e || e.code === "PGRST202" || e.status === 404 || /could not find the function/i.test(e.message ?? "");
