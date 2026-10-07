import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { prepareForumPhoto } from "../forum/photo";
import { SCREENSHOT_BUCKET, SCREENSHOT_TOO_LARGE, screenshotPath, screenshotProblem } from "./screenshotRules";

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

/**
 * Readies a picked screenshot: the bucket's type and size checks, then the
 * forum photo's re-draw (services/forum/photo), which re-encodes it as a JPEG
 * with every byte of metadata removed and its long edge capped at 2048 px. A
 * screenshot rarely carries location, but a photo picked by mistake does, and
 * a bug report is read by staff. Refused rather than sent when that fails.
 */
export async function prepareBugScreenshot(file: File): Promise<{ ok: true; file: File } | { ok: false; message: string }> {
  const problem = screenshotProblem(file);
  if (problem) return { ok: false, message: problem };
  const prepared = await prepareForumPhoto(file);
  if (!prepared.ok) {
    return {
      ok: false,
      message: /under 5 MB/.test(prepared.message)
        ? SCREENSHOT_TOO_LARGE
        : "This screenshot couldn't be prepared safely, so it wasn't added. Try a different image.",
    };
  }
  return { ok: true, file: new File([prepared.file], "screenshot.jpg", { type: "image/jpeg" }) };
}

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
  if (code === "23514") return "That report couldn't be sent. Please shorten it and try again.";
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
 * NOTHING ELSE IS COLLECTED AUTOMATICALLY. No console log, no page content —
 * in this app both would carry lab results or medications, turning a bug
 * report into a medical-data disclosure sent to whoever reads this table. A
 * screenshot is sent only when the person picks one themselves (Stage A1),
 * re-drawn without its metadata by the caller first.
 *
 * THE SCREENSHOT GOES FIRST, THEN THE ROW. `screenshot_path` has an INSERT
 * grant and no UPDATE (a report's screenshot is set once), so the row has to
 * be inserted already carrying the path. If the row then fails, the uploaded
 * object is removed so nothing is left in the person's folder with no report
 * pointing at it. The path is never returned to the caller or shown: only
 * admins read the bucket, through a signed URL.
 */
export async function submitBugReport(params: {
  userId: string;
  description: string;
  route: string | null;
  userAgent: string | null;
  /** Already validated and stripped of metadata (prepareBugScreenshot). */
  screenshot?: File | null;
}): Promise<BugReportResult> {
  const description = params.description.trim();
  if (!description) return { ok: false, message: "Add a short description first." };
  if (description.length > MAX_DESCRIPTION) {
    return { ok: false, message: "That report is too long. Please shorten it." };
  }

  let path: string | null = null;
  if (params.screenshot) {
    const problem = screenshotProblem(params.screenshot);
    if (problem) return { ok: false, message: problem };
    path = screenshotPath(params.userId, crypto.randomUUID());
    const { error: upErr } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .upload(path, params.screenshot, { contentType: params.screenshot.type, upsert: false });
    if (upErr) {
      // The status only: never the path.
      const e = upErr as { statusCode?: string; status?: number };
      console.error("[bug-reports] Screenshot upload refused:", e.statusCode ?? e.status ?? upErr.name);
      return {
        ok: false,
        message: isOffline(upErr)
          ? OFFLINE_MESSAGE
          : "The screenshot couldn't be uploaded. Try again, or remove it to send the report without it.",
      };
    }
  }

  // The advanced-monitoring plan's route is never reported, wherever the
  // sheet was opened from: a bug report is read by staff, and the route alone
  // would tell them the setting is on.
  const route = params.route && /^\/app\/health\/checks(?=$|[/?#])/.test(params.route) ? null : params.route;
  // ONE NARROW CAST: the generated types come from production, where
  // bug_reports.screenshot_path (Stage A1) isn't yet.
  const row = {
    user_id: params.userId,
    description,
    route: clamp(route),
    user_agent: clamp(params.userAgent),
    screenshot_path: path,
  } as unknown as { user_id: string; description: string };
  const { error } = await supabase.from("bug_reports").insert(row);

  if (error) {
    console.error("[bug-reports] Could not file report:", error.message);
    if (path) {
      const { error: rmErr } = await supabase.storage.from(SCREENSHOT_BUCKET).remove([path]);
      if (rmErr) console.warn("[bug-reports] Could not remove the unsent screenshot:", rmErr.name);
    }
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
