// When the app reports itself active (report_app_active, Round C Release 2).
// Pure, so it is tested without the Supabase client.

/** Inside the contract's 30–45 seconds. */
export const PRESENCE_INTERVAL_MS = 35_000;

/** Whether this tab should be reporting: shown and in front. */
export const presenceWanted = (visibility: string, focused: boolean): boolean => visibility === "visible" && focused;
