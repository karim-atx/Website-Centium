import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";

/**
 * Database stage B5 (HANDOVER_API.md "legal_acceptances"): which version of
 * our Terms, Privacy policy or health disclaimer an account accepted. SELECT
 * and INSERT only; a new version adds a row (never an upsert), and the same
 * (profile, document, version) twice is refused by a unique index, which is
 * treated here as "already recorded".
 *
 * The version is the documents' "Last updated" date, as a YYYY-MM-DD string:
 * src/marketing/pages/Legal.tsx LEGAL_UPDATED_DATE ("6 September 2026"). Keep
 * the two in step when the documents change.
 */

// B5 is newer than lib/supabase/database.types.ts (generated from production): untyped here.
const supabase = typed as unknown as SupabaseClient;

export type LegalDocument = "terms" | "privacy" | "health_disclaimer";
export const LEGAL_VERSION = "2026-09-06";

export async function recordLegalAcceptances(
  profileId: string,
  documents: LegalDocument[],
  version: string = LEGAL_VERSION
): Promise<{ ok: true } | { ok: false; offline: boolean }> {
  if (documents.length === 0) return { ok: true };
  try {
    for (const document of documents) {
      const { error } = await supabase.from("legal_acceptances").insert({ profile_id: profileId, document, version });
      if (error && error.code !== "23505") {
        console.error("[legal] Could not record the acceptance:", error.code, error.message);
        return { ok: false, offline: isOffline(error) };
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, offline: isOffline(e) };
  }
}

/** The documents this account has accepted at `version`. Null when the read failed. */
export async function acceptedDocuments(profileId: string, version: string = LEGAL_VERSION): Promise<Set<LegalDocument> | null> {
  try {
    const { data, error } = await supabase
      .from("legal_acceptances")
      .select("document")
      .eq("profile_id", profileId)
      .eq("version", version);
    if (error) return null;
    return new Set(((data ?? []) as { document: LegalDocument }[]).map((r) => r.document));
  } catch {
    return null;
  }
}
