// Round G2 · EG: the public directory is read ONLY through the Database's
// counted functions (directory_professionals, directory_professional_cv,
// directory_venues, directory_classes; DB_G2_HANDOVER "Directory reads are
// counted"), with the same rows the views gave, so screens don't change.
//
// EG phase 2: no reader goes to the views any more, so the Database can
// revoke them. A function's error is the reader's error; ATX02 ("too many
// directory requests -- try again in N minutes") is worded calmly by
// directoryErrorText, and every other error keeps the reader's own message.
//
// Each call is counted (per account, per hour), so read once and filter here
// rather than calling once per row; professionalsByIds below does that.
// The calls themselves are in ./directoryRead (no Supabase, so tested).
//
// supabase-js calls .rpc() by POST, which the counting needs (a GET is
// read-only and goes through uncounted). professional_by_handle,
// venues_in_area, professionals_ranked and professionals_in_area are called
// with plain .rpc() already, so by POST.

import { supabase } from "../../../lib/supabase/client";
import { directoryLimitText } from "../premium/g2";
import { callDirectory, readProfessionalsByIds, type DirRead, type DirectoryFn, type Rpc } from "./directoryRead";

export type { DirErr, DirRead } from "./directoryRead";

const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc).call(supabase, fn, args);

/** Calls a counted directory function; its error (ATX02 included) is returned to the reader as is. */
export const directoryCall = <T>(fn: DirectoryFn, args: Record<string, unknown>): Promise<DirRead<T>> => callDirectory<T>(rpc, fn, args);

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
 * counts).
 */
export const professionalsByIds = <T extends { profile_id?: string | null }>(ids: string[]): Promise<DirRead<T[]>> => readProfessionalsByIds<T>(rpc, ids);
