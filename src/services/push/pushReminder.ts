// Batch D GA (neutral health links) · /app?reminder=<uuid>. Pure, so it is
// tested on its own (pushReminder.test.ts).
//
// NOTHING ABOUT HEALTH IS IN THE PUSH. Contraception (pill, ring_removal,
// ring_insertion, patch_change, injection_due, device_replacement) and
// medication pushes carry only /app?reminder=<the push's own reminder_sends
// id>: opaque, not a medication or method id. The page is asked of the
// server once the member is signed in (push_destination(p_reminder_id),
// granted to signed-in members only: anon gets 42501), and the app lands on
// it with a replace, so ?reminder= never stays in history.
//
// Anything else (no answer, an error, a malformed id, the function not on
// this Database yet): stay on /app, show nothing, and drop the param. A
// malformed id never reaches the server.
import { appPathFrom } from "../../platform/openPathModel";

export const REMINDER_PARAM = "reminder";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ?reminder= in a search string: absent, malformed (id null), or a uuid. */
export function reminderFrom(search: string): { id: string | null } | null {
  const raw = new URLSearchParams(search).get(REMINDER_PARAM);
  if (raw === null) return null;
  const id = raw.trim();
  return { id: UUID.test(id) ? id.toLowerCase() : null };
}

/** The same search without ?reminder= ("" when nothing is left). */
export function withoutReminder(search: string): string {
  const p = new URLSearchParams(search);
  p.delete(REMINDER_PARAM);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** push_destination's answer as a page: an /app path, or null (stay on /app). */
export function reminderLanding(answer: { data: unknown; error: unknown | null } | null): string | null {
  if (!answer || answer.error) return null;
  return appPathFrom(answer.data);
}

export type PushDestinationRpc = (reminderId: string) => Promise<{ data: unknown; error: unknown | null } | null>;

/**
 * Where /app{search} goes: null when there is no ?reminder= (nothing to do),
 * else the path to replace the current entry with. Asks the server only for a
 * well-formed id; a failure of any kind is /app without the param.
 */
export async function resolveReminder(search: string, rpc: PushDestinationRpc): Promise<string | null> {
  const r = reminderFrom(search);
  if (!r) return null;
  const stay = `/app${withoutReminder(search)}`;
  if (!r.id) return stay;
  let answer: Awaited<ReturnType<PushDestinationRpc>> = null;
  try {
    answer = await rpc(r.id);
  } catch {
    answer = null;
  }
  return reminderLanding(answer) ?? stay;
}
