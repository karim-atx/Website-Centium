// Round D · the client's own injuries (public.injuries, 20261222050000).
// The client reads and writes their own rows straight through RLS (select,
// insert, update, delete where user_id = me); a professional reads them under
// the client's medical_history consent, never writes them. A form answer
// reaches this table only when the client confirms it
// (confirm_form_profile_proposal). A health-data reset clears it.
//
// Listeners: the History tab's list reloads when a sheet saves or a form
// answer is confirmed (notifyInjuriesChanged), without a shared store.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { injuryColumns, sortInjuries, type Injury, type InjuryDraft, type InjuryStatus } from "./model";

export type { Injury, InjuryDraft, InjuryStatus };

const from = () => supabase.from("injuries" as never);

type Result = { ok: true } | { ok: false; message: string };
const fail = (error: unknown, fallback: string): Result => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : fallback });

const listeners = new Set<() => void>();
export function onInjuriesChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function notifyInjuriesChanged(): void {
  for (const fn of listeners) fn();
}

interface InjuryRow {
  id: string;
  description: string;
  body_area: string | null;
  since: string | null;
  status: InjuryStatus;
  created_at: string;
}

export async function fetchMyInjuries(me: string): Promise<{ ok: true; data: Injury[] } | { ok: false; offline: boolean }> {
  const { data, error } = await from().select("id, description, body_area, since, status, created_at").eq("user_id", me);
  if (error) return { ok: false, offline: isOffline(error) };
  return {
    ok: true,
    data: sortInjuries(((data ?? []) as unknown as InjuryRow[]).map((r) => ({ id: r.id, description: r.description, bodyArea: r.body_area, since: r.since, status: r.status, createdAt: r.created_at }))),
  };
}

export async function addInjury(me: string, d: InjuryDraft): Promise<Result> {
  const { error } = await from().insert({ user_id: me, ...injuryColumns(d) } as never);
  if (error) return fail(error, "Couldn't save that injury. Try again.");
  notifyInjuriesChanged();
  return { ok: true };
}

export async function updateInjury(id: string, d: InjuryDraft): Promise<Result> {
  const { error } = await from().update(injuryColumns(d) as never).eq("id", id);
  if (error) return fail(error, "Couldn't save that injury. Try again.");
  notifyInjuriesChanged();
  return { ok: true };
}

/** "Mark as healed" (resolved) or back to current (active). */
export async function setInjuryStatus(id: string, status: InjuryStatus): Promise<Result> {
  const { error } = await from().update({ status } as never).eq("id", id);
  if (error) return fail(error, "Couldn't save that injury. Try again.");
  notifyInjuriesChanged();
  return { ok: true };
}

export async function removeInjury(id: string): Promise<Result> {
  const { error } = await from().delete().eq("id", id);
  if (error) return fail(error, "Couldn't remove that injury. Try again.");
  notifyInjuriesChanged();
  return { ok: true };
}
