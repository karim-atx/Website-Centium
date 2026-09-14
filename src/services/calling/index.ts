import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { Database } from "../../../lib/supabase/database.types";

/**
 * Placing, answering and ending 1:1 calls.
 *
 * EVERY WRITE GOES THROUGH AN EDGE FUNCTION, and that is the schema's decision
 * rather than a preference here. `public.calls` grants `select` to
 * `authenticated` and nothing else — no insert, no update, no delete, and no
 * security-definer RPC writes it either. Its own table comment says so: "No
 * client write grant -- writes run as service_role behind
 * public.thread_allows_calls()." So this module reads rows directly and asks a
 * function for anything that changes one.
 *
 * THE THREE FUNCTIONS, and why each exists separately rather than one
 * "call action" endpoint:
 *   mint-call-token  the caller opens a call. Creates the room, writes the
 *                    ringing row, mints for the caller.
 *   join-call-token  the callee answers. Mints for the SAME room the ringing
 *                    row already names, and stamps started_at. A second
 *                    mint-call-token call would have opened a second call in
 *                    the opposite direction, in a different room.
 *   end-call         either party stops it. The terminal status is derived
 *                    server-side from state and actor; this client does not
 *                    and cannot choose it.
 *
 * THE ROW IS THE SIGNALLING CHANNEL. Nothing here polls for the other side's
 * answer — useCallRealtime watches `calls` through postgres_changes and the
 * row transitions are what both clients react to.
 */

export type CallRow = Database["public"]["Tables"]["calls"]["Row"];
export type CallKind = Database["public"]["Enums"]["call_kind"];

/** What a successful mint or join hands back: everything needed to connect. */
export interface CallCredentials {
  callId: string;
  token: string;
  roomName: string;
  kind: CallKind;
  capSeconds: number;
  livekitUrl: string;
  /** Present on join (the server stamps it); absent on mint, since nobody has answered yet. */
  startedAt: string | null;
}

export type CallStartResult =
  | { status: "ok"; credentials: CallCredentials }
  | { status: "not_entitled"; message: string }
  | { status: "unavailable"; message: string }
  | { status: "already_resolved"; message: string }
  | { status: "error"; message: string };

export type EndCallResult =
  | { status: "ok"; terminalStatus: string; durationSec: number | null }
  | { status: "error"; message: string };

/**
 * Maps an Edge Function's error code to a sentence.
 *
 * THE CODES ARE THE CONTRACT, not the HTTP status and not the message text —
 * the same decision the ATX SQLSTATE work reached for RPCs. Every branch below
 * is a literal from mint-call-token, join-call-token or end-call.
 */
function describeCode(code: string): string {
  switch (code) {
    case "not_entitled":
      return "You can only call someone you're actively working with.";
    case "callee_unavailable":
    case "callee_not_found":
      return "That account is no longer available.";
    case "callee_deletion_pending":
      return "That account is being closed and can't take calls.";
    case "already_resolved":
      return "That call has already ended.";
    case "not_the_callee":
      return "That call isn't for you.";
    case "call_not_found":
      return "That call no longer exists.";
    case "unauthenticated":
      return "Your session expired. Sign in again to call.";
    case "not_configured":
      return "Calling isn't switched on yet.";
    default:
      return "Couldn't connect the call. Try again.";
  }
}

/** Shape every function returns on failure. */
interface FnError {
  error?: string;
  status?: string;
}

/**
 * Calls an Edge Function and normalises the two ways it can fail.
 *
 * supabase-js's `invoke` rejects into `error` for a non-2xx, but the BODY is
 * what carries the code — and it is only readable through
 * `FunctionsHttpError.context`, a Response. Reading it is the difference
 * between "not_entitled" and a generic failure, so it is done here once rather
 * than at each call site.
 */
async function invokeFn<T>(
  name: string,
  body: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; code: string; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke<T>(name, { body });

    if (!error) return { ok: true, data: data as T };

    // The useful part is in the response body, not error.message.
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const parsed = (await context.clone().json()) as FnError;
        const code = typeof parsed.error === "string" ? parsed.error : "";
        if (code) {
          console.error(`[calling] ${name} refused:`, code);
          return { ok: false, code, message: describeCode(code) };
        }
      } catch {
        /* Body was not JSON; fall through to the generic path. */
      }
    }

    console.error(`[calling] ${name} failed:`, error.message);
    return {
      ok: false,
      code: "",
      message: isOffline(error) ? OFFLINE_MESSAGE : describeCode(""),
    };
  } catch (e) {
    console.error(`[calling] ${name} threw:`, e);
    return {
      ok: false,
      code: "",
      message: isOffline(e) ? OFFLINE_MESSAGE : describeCode(""),
    };
  }
}

function toStartResult(
  r: { ok: true; data: unknown } | { ok: false; code: string; message: string }
): CallStartResult {
  if (!r.ok) {
    if (r.code === "not_entitled") return { status: "not_entitled", message: r.message };
    if (r.code === "already_resolved" || r.code === "not_the_callee") {
      return { status: "already_resolved", message: r.message };
    }
    if (
      r.code === "callee_unavailable" ||
      r.code === "callee_not_found" ||
      r.code === "callee_deletion_pending"
    ) {
      return { status: "unavailable", message: r.message };
    }
    return { status: "error", message: r.message };
  }

  const d = r.data as Partial<CallCredentials> & { startedAt?: string | null };
  if (!d?.callId || !d.token || !d.roomName || !d.livekitUrl) {
    console.error("[calling] Incomplete credentials from the server.");
    return { status: "error", message: "Couldn't connect the call. Try again." };
  }
  return {
    status: "ok",
    credentials: {
      callId: d.callId,
      token: d.token,
      roomName: d.roomName,
      kind: (d.kind ?? "voice") as CallKind,
      capSeconds: typeof d.capSeconds === "number" ? d.capSeconds : 0,
      livekitUrl: d.livekitUrl,
      startedAt: typeof d.startedAt === "string" ? d.startedAt : null,
    },
  };
}

/**
 * Opens a call to the other participant of a thread.
 *
 * calleeId is sent but is NOT what decides who is rung — mint-call-token reads
 * the callee off the thread and refuses a mismatch with `callee_mismatch`
 * rather than quietly correcting it. Sending it is a consistency check on this
 * client's own belief, which is why a mismatch is worth surfacing as an error.
 */
export async function startCall(
  threadId: string,
  calleeId: string,
  kind: CallKind
): Promise<CallStartResult> {
  return toStartResult(await invokeFn("mint-call-token", { threadId, calleeId, kind }));
}

/** Answers a ringing call. The server stamps started_at as part of the same transition. */
export async function answerCall(callId: string): Promise<CallStartResult> {
  return toStartResult(await invokeFn("join-call-token", { callId }));
}

/**
 * Ends a call, from either side.
 *
 * `reason` is a hint for the server's log, NOT a choice of outcome. end-call
 * derives the terminal status from state and actor — answered becomes
 * `completed`, a ringing call ended by the callee becomes `declined`, and one
 * ended by the caller becomes `missed`. Passing "declined" does not make it so.
 *
 * IDEMPOTENT BY CONTRACT: ending an already-terminal call answers 200 with
 * `alreadyResolved`, so a hangup racing the cap sweep or the other party's
 * decline is a success here rather than an error to show someone.
 */
export async function endCall(
  callId: string,
  reason: "declined" | "hangup"
): Promise<EndCallResult> {
  const r = await invokeFn<{
    status?: string;
    durationSec?: number | null;
    alreadyResolved?: boolean;
  }>("end-call", { callId, reason });

  if (!r.ok) return { status: "error", message: r.message };
  return {
    status: "ok",
    terminalStatus: r.data?.status ?? "unknown",
    durationSec: typeof r.data?.durationSec === "number" ? r.data.durationSec : null,
  };
}

/**
 * Whether this thread may carry a call at all.
 *
 * MIRRORS threadAllowsAttachments EXACTLY, including failing closed: an error
 * means no button. This is not the enforcement — mint-call-token re-checks
 * thread_allows_calls server-side — so a stale `true` costs a refused call
 * rather than an unauthorised one, and a stale `false` costs a hidden button
 * until the thread is reopened.
 *
 * The caller id is passed because thread_allows_calls takes it: unlike
 * thread_allows_attachments it also verifies the caller is a participant.
 */
export async function threadAllowsCalls(threadId: string, callerId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("thread_allows_calls", {
    p_thread_id: threadId,
    p_caller_id: callerId,
  });
  if (error) {
    console.error("[calling] Could not check call eligibility:", error.message);
    return false;
  }
  return data === true;
}
