import { supabase } from "../../../lib/supabase/client";

// The marketing site's contact form, which is the only thing in this app that
// writes on behalf of somebody with no account.
//
// EVERYTHING GOES THROUGH THE EDGE FUNCTION. `contact_submissions` has no
// insert grant for anon — it could not, since an anonymous insert path is an
// open mailbox for anyone who reads the bundle. The function holds the
// Turnstile secret, hashes the IP, applies two rate limits and only then
// inserts with the service role. None of that can live here.
//
// A SERVICE RATHER THAN A FETCH IN THE COMPONENT, matching every other
// Supabase call in this app: the component decides what to say to the visitor,
// and this decides what happened.

export type ContactTopic = "general" | "professional" | "business" | "press";

export interface ContactSubmission {
  topic: ContactTopic;
  name: string;
  email: string;
  message: string;
  turnstileToken: string;
  /**
   * The honeypot. Always "" for a real visitor.
   *
   * Sent rather than omitted because the function reads it: a non-empty value
   * gets 200 `{ ok: true }` with no row and no id, so a bot is told the same
   * thing a person is and learns nothing. That also means `ok: true` is not by
   * itself proof a row exists — it is proof for a submission whose honeypot
   * was empty, which is every submission this form makes.
   */
  website: string;
}

/**
 * The function's own error codes, plus the one this side invents.
 *
 * "" is a failure with no response at all — offline, DNS, a blocked request,
 * the function not running. It is deliberately not folded into server_error:
 * the visitor's message is still on their screen either way, but only one of
 * these is worth retrying immediately.
 */
export type ContactResult = { ok: true } | { ok: false; code: string };

interface FnError {
  error?: unknown;
}

/**
 * supabase-js rejects into `error` for any non-2xx, but the CODE is in the
 * body, reachable only through `FunctionsHttpError.context` — a Response.
 * Same shape as services/calling's invokeFn, and for the same reason: read it
 * once here rather than at the call site.
 */
export async function submitContact(submission: ContactSubmission): Promise<ContactResult> {
  try {
    const { data, error } = await supabase.functions.invoke<FnError & { ok?: boolean }>(
      "submit-contact",
      { body: submission }
    );

    if (error) {
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        try {
          const parsed = (await context.clone().json()) as FnError;
          if (typeof parsed.error === "string" && parsed.error) {
            return { ok: false, code: parsed.error };
          }
        } catch {
          /* Not JSON, or a body already consumed. Fall through to "". */
        }
      }
      return { ok: false, code: "" };
    }

    // A 2xx that is not `ok: true` should not exist, and treating it as success
    // would tell somebody their message was sent on the strength of a shape
    // nobody promised.
    return data?.ok === true ? { ok: true } : { ok: false, code: "server_error" };
  } catch {
    // invoke throws rather than rejects into `error` when the request never
    // reaches a response at all.
    return { ok: false, code: "" };
  }
}
