// Round G2 · EG phase 1: the public directory is read through the Database's
// counting functions (directory_professionals, directory_professional_cv,
// directory_venues, directory_classes; DB_G2_HANDOVER "Directory reads are
// counted"), with the same rows the views give, so screens don't change.
//
// THE FUNCTION FIRST. Each reader passes today's view read as `fallback`,
// which runs on any failure of the function except ATX02 ("too many directory
// requests -- try again in N minutes", once the Database turns its limit on),
// which directoryErrorText words calmly. Missing, refused or failing, the
// view still answers until the Database's phase 2 revokes it.
//
// supabase-js calls .rpc() by POST, which the counting needs (a GET is
// read-only and goes through uncounted). professional_by_handle,
// venues_in_area, professionals_ranked and professionals_in_area are called
// with plain .rpc() already, so by POST.

import { supabase } from "../../../lib/supabase/client";
import { directoryFallback, directoryLimitText } from "../premium/g2";

export type DirErr = { code?: string; message: string; details?: string | null; hint?: string | null };
export type DirRead<T> = { data: T | null; error: DirErr | null };

type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: DirErr | null }>;
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc).call(supabase, fn, args);

/**
 * Calls a counting directory function; `fallback` (today's view read, marked
 * at each reader) runs on any failure except ATX02.
 */
export async function directoryCall<T>(fn: "directory_professionals" | "directory_professional_cv" | "directory_venues" | "directory_classes", args: Record<string, unknown>, fallback: () => PromiseLike<DirRead<T>>): Promise<DirRead<T>> {
  try {
    const r = await rpc(fn, args);
    if (r.error && directoryFallback(r.error)) return await fallback();
    return { data: (r.data ?? null) as T | null, error: r.error };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
  }
}

/** ATX02 from a directory function, in calm words; null for any other error. */
export const directoryErrorText = (e: { code?: string; message?: string } | null | undefined): string | null => (e?.code === "ATX02" ? directoryLimitText(e.message) : null);

/** One professional's row from directory_professionals(p_profile_id) (an array of one, or none). */
export const firstRow = <T>(data: T[] | T | null): T | null => (Array.isArray(data) ? (data[0] ?? null) : data);

/** The CV object directory_professional_cv returns; each list ordered by position. */
export interface DirectoryCv {
  licences: unknown[];
  experience: unknown[];
  education: unknown[];
  languages: unknown[];
  awards: unknown[];
  publications: unknown[];
  volunteering: unknown[];
  links: unknown[];
}

export function parseDirectoryCv(data: unknown): DirectoryCv {
  const o = (data && typeof data === "object" && !Array.isArray(data) ? data : {}) as Record<string, unknown>;
  const list = (k: string) => (Array.isArray(o[k]) ? (o[k] as unknown[]) : []);
  return {
    licences: list("licences"),
    experience: list("experience"),
    education: list("education"),
    languages: list("languages"),
    awards: list("awards"),
    publications: list("publications"),
    volunteering: list("volunteering"),
    links: list("links"),
  };
}

/**
 * directory_professionals rows for these profile ids: one call each for a
 * few, or one call for the whole directory filtered here for many (each call
 * counts). `fallback` (today's view read, marked at the reader) runs on any
 * failure except ATX02.
 */
export async function professionalsByIds<T extends { profile_id?: string | null }>(ids: string[], fallback: () => PromiseLike<DirRead<T[]>>): Promise<DirRead<T[]>> {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (uniq.length === 0) return { data: [], error: null };
  if (uniq.length > 8) {
    const all = await directoryCall<T[]>("directory_professionals", { p_profile_id: null }, fallback);
    const want = new Set(uniq);
    return all.error ? all : { data: (all.data ?? []).filter((r) => !!r.profile_id && want.has(r.profile_id)), error: null };
  }
  let fellBack = false;
  const once = () => {
    fellBack = true;
    return fallback();
  };
  const first = await directoryCall<T[]>("directory_professionals", { p_profile_id: uniq[0] }, once);
  // The fallback reads every id at once.
  if (first.error || fellBack || uniq.length === 1) return first;
  const rest = await Promise.all(uniq.slice(1).map((id) => directoryCall<T[]>("directory_professionals", { p_profile_id: id }, fallback)));
  const failed = rest.find((r) => r.error);
  if (failed) return failed;
  return { data: [first, ...rest].flatMap((r) => r.data ?? []), error: null };
}
