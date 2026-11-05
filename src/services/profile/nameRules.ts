/**
 * Round I · FB: a first name is one line of plain text (Database
 * 20261226440000, CHECK profiles_first_name_single_line). The server refuses
 * control characters (line breaks, tabs, C1 such as U+0085) and bidi
 * embeddings, overrides and isolates (U+202A–U+202E, U+2066–U+2069) with
 * 23514. The zero-width joiner and non-joiner (U+200C/U+200D) stay: Arabic and
 * Persian names use them. Pure, so it is tested without a server.
 */

import { tk } from "../../i18n/core";

const NOT_IN_A_NAME = /[\p{Cc}‪-‮⁦-⁩]+/gu;

/** The name as the server will take it: each run of refused characters becomes one space, trimmed. */
export function singleLineName(raw: string): string {
  return raw.replace(NOT_IN_A_NAME, " ").replace(/ {2,}/g, " ").trim();
}

export const NAME_CHARACTERS = "Use letters, spaces and punctuation only.";

export const NAME_MISSING = tk("Add your name.");
export const NAME_TOO_LONG = tk("Keep your name to 60 characters or fewer.");

/**
 * Round J · FI: one rule for every place a first name is changed (Settings ›
 * Account, the professional's Name sheet): one line, 1–60 characters.
 */
export function checkFirstName(raw: string): { ok: true; name: string } | { ok: false; message: string } {
  const name = singleLineName(raw);
  if (name.length < 1) return { ok: false, message: NAME_MISSING };
  if ([...name].length > 60) return { ok: false, message: NAME_TOO_LONG };
  return { ok: true, name };
}

/** The sentence for the server's single-line refusal, or null for any other error. */
export function describeNameError(error: { code?: string; message?: string } | null | undefined): string | null {
  return error?.code === "23514" && /profiles_first_name_single_line/.test(error.message ?? "") ? NAME_CHARACTERS : null;
}
