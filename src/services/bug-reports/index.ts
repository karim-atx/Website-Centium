import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

// Filing a bug report. One direction only.
//
// THERE IS NO READ FUNCTION HERE AND THERE SHOULD NOT BE. `bug_reports` grants
// the client INSERT and nothing else, and has no SELECT policy, so a fetch
// would return an empty list rather than an error — which is the worst kind of
// failure to add: a "your reports" screen that silently shows none. Reports are
// reviewed by querying the table with service_role.
//
// NOTHING IS NOTIFIED BY THIS. No mail provider, queue or webhook exists in
// this project, so a filed report waits until someone looks. The sheet's copy
// says reports are read rather than answered, and that wording is load-bearing:
// it is the only thing stopping this from being a promise the product cannot
// keep.

export interface BugReportResult {
  ok: boolean;
  message?: string;
}

/** Matches the CHECK on the column, so the UI can refuse before the round trip. */
export const MAX_DESCRIPTION = 4000;

/**
 * Trimmed to at most `max` characters, or null when there is nothing to store.
 *
 * The route and user agent are captured automatically, so they are the two
 * values a user never sees and never approves. Truncating rather than
 * rejecting is right for them: a 600-character user agent is a real browser
 * being verbose, not an error, and failing someone's bug report over it would
 * be absurd. The column CHECKs are the backstop.
 */
function clamp(value: string | null | undefined, max = 500): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to send this report.";
  }
  // 23514 is the description CHECK. The UI blocks empty and over-long text
  // before this point, so reaching it means the two drifted apart.
  if (code === "23514") return "That report couldn't be sent — please shorten it and try again.";
  return "That report couldn't be sent. Check your connection and try again.";
}

/**
 * Files one report.
 *
 * CONTEXT IS CAPTURED, NOT ASKED FOR. Route and user agent are the difference
 * between a report someone can act on and "it broke somewhere", and asking a
 * user to supply either is asking them to do the app's job. Both are read at
 * call time from the caller rather than here, so a caller in another
 * environment is not forced to fake a `window`.
 *
 * NOTHING ELSE IS COLLECTED. No screenshot, no console log, no page content —
 * in this app all three would carry lab results or medications, turning a bug
 * report into a medical-data disclosure sent to whoever reads this table.
 */
export async function submitBugReport(params: {
  userId: string;
  description: string;
  route: string | null;
  userAgent: string | null;
}): Promise<BugReportResult> {
  const description = params.description.trim();
  if (!description) return { ok: false, message: "Add a short description first." };
  if (description.length > MAX_DESCRIPTION) {
    return { ok: false, message: "That report is too long — please shorten it." };
  }

  const { error } = await supabase.from("bug_reports").insert({
    user_id: params.userId,
    description,
    route: clamp(params.route),
    user_agent: clamp(params.userAgent),
  });

  if (error) {
    console.error("[bug-reports] Could not file report:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
