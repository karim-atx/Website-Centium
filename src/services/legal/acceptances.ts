import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import { isSessionRefusal } from "../profile/profileGate";

/**
 * Database stage B5 (HANDOVER_API.md "legal_acceptances"): which version of
 * our Terms, Privacy policy or health disclaimer an account accepted. SELECT
 * and INSERT only; a new version adds a row (never an upsert), and the same
 * (profile, document, version) twice is refused by a unique index, which is
 * treated here as "already recorded".
 *
 * The version is the documents' "Last updated" date, as a YYYY-MM-DD string:
 * the website's Legal page shows it month first ("September 6, 2026",
 * src/marketing/legal/anchors.ts legalDateFor). Move it when the documents
 * (src/marketing/legal/text.ts) change.
 */


export type LegalDocument = "terms" | "privacy" | "health_disclaimer";
export const LEGAL_VERSION = "2026-11-08";

/**
 * `session` (Karim, 2026-11-09): the insert was not signed in as this account.
 * A member may insert only their own acceptance (profile_id = auth.uid()) and
 * anon has no INSERT grant, so this insert fails ONLY that way: 42501 for
 * anon or another account's JWT, 401 / PGRST301 for an expired one. It is the
 * first write of every finish, which is where the iPhone report's finish
 * stopped (no row was ever recorded); onboarding shows it as the account-load
 * problem rather than "try again".
 */
export async function recordLegalAcceptances(
  profileId: string,
  documents: LegalDocument[],
  version: string = LEGAL_VERSION
): Promise<{ ok: true } | { ok: false; offline: boolean; session: boolean }> {
  if (documents.length === 0) return { ok: true };
  try {
    for (const document of documents) {
      const { error, status } = await supabase.from("legal_acceptances").insert({ profile_id: profileId, document, version });
      if (error && error.code !== "23505") {
        console.error("[legal] Could not record the acceptance:", error.code, error.message);
        const offline = isOffline(error);
        return { ok: false, offline, session: !offline && isSessionRefusal({ code: error.code, status }) };
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, offline: isOffline(e), session: false };
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
