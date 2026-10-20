import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import type { Database } from "../../../lib/supabase/database.types";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { fetchMyCv, saveLicence, licenceStatus, type Licence, type LicenceDraft, type LicenceStatus } from "../professional-cv";
import type { LicenceReviewRow } from "../professional-cv/licenceStatus";

// The professional onboarding lane's writes (Database B5, HANDOVER_API "## B5"
// "The professional lanes"): the new professional_profiles columns, the
// "Other" log, the registration licence and the Get set up items. The Terms
// acceptance goes through services/legal/acceptances (the shell's).
// Typed by lib/supabase/database.types.ts as generated from the local stack
// (Release 2; production has Release 1 only, so not by npm run gen:types).
const db = supabase;

export type Ok<T = object> = { ok: true } & T;
export type Fail = { ok: false; message: string };

function describe(error: PostgrestError | null, fallback: string): string {
  if (error && isOffline(error)) return OFFLINE_MESSAGE;
  const code = error?.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error?.message ?? "")) return "Your session expired. Sign in again.";
  if (code === "23514") return "Check the details: one of them is outside what we can save.";
  return fallback;
}

// ---------------------------------------------------------------------------
// professional_profiles: the lane's columns
// ---------------------------------------------------------------------------

export interface ProLaneColumns {
  other_discipline?: string | null;
  /** professional_group (fitness / clinical / nutrition / other), Database 20261120020000. */
  closest_group?: Database["public"]["Enums"]["professional_group"] | null;
  work_mode?: "in_person" | "online" | "both" | null;
  home_visit_km?: number | null;
  specialties?: string[];
  session_formats?: string[];
  session_lengths?: number[];
  /** Database 20261120020000: at_gym, home_visit, in_clinic, outdoors, messages_between_sessions. */
  session_places?: string[];
  /** The singular column three public readers still select (kept by B5). */
  specialty?: string | null;
}

/**
 * Writes the lane's answers to the caller's professional_profiles row.
 * Update-then-insert, never upsert: profile_id is outside the UPDATE grant, so
 * an upsert's conflict path would be refused (the same reason as
 * services/professional-profile saveMyProfile). Only UPDATE-granted columns
 * are sent (npm run audit:grants).
 */
export async function saveProLaneColumns(userId: string, cols: ProLaneColumns): Promise<Ok | Fail> {
  const updated = await db.from("professional_profiles").update(cols).eq("profile_id", userId).select("profile_id");
  if (updated.error) {
    console.error("[professional-onboarding] Could not save the lane answers:", updated.error.code, updated.error.message);
    return { ok: false, message: describe(updated.error, "Couldn't save this step. Check your connection and try again.") };
  }
  if (updated.data && updated.data.length > 0) return { ok: true };
  const mirror = await mirroredDocument(userId);
  const inserted = await db
    .from("professional_profiles")
    .insert({ profile_id: userId, ...(mirror ? { certification_url: mirror } : null), ...cols })
    .select("profile_id")
    .single();
  if (inserted.error) {
    console.error("[professional-onboarding] Could not create the profile row:", inserted.error.code, inserted.error.message);
    return { ok: false, message: describe(inserted.error, "Couldn't save this step. Check your connection and try again.") };
  }
  return { ok: true };
}

/**
 * Licence #1's document, if a licence was saved before the profile row
 * existed. INSERTING professional_profiles fires professional_profiles_
 * mirror_to_licence, which copies certification_url onto licence #1, so a row
 * created with a null certification_url would wipe that licence's document
 * (found in Batch 3 testing: a Physiotherapist's proof of registration). The
 * insert therefore carries the document the mirror already has.
 */
async function mirroredDocument(userId: string): Promise<string | null> {
  const { data } = await db
    .from("professional_licences")
    .select("document_path")
    .eq("professional_id", userId)
    .eq("mirrors_certification_url", true)
    .maybeSingle();
  return (data as { document_path: string | null } | null)?.document_path ?? null;
}

/**
 * Makes sure the caller has a professional_profiles row before any licence is
 * written (see mirroredDocument), creating it with the mirror's document when
 * one exists. Idempotent.
 */
export async function ensureProProfileRow(userId: string): Promise<Ok | Fail> {
  const found = await db.from("professional_profiles").select("profile_id").eq("profile_id", userId).maybeSingle();
  if (found.error) return { ok: false, message: describe(found.error, "Couldn't load your details. Try again.") };
  if (found.data) return { ok: true };
  const mirror = await mirroredDocument(userId);
  const ins = await db.from("professional_profiles").insert({ profile_id: userId, ...(mirror ? { certification_url: mirror } : null) });
  if (ins.error && ins.error.code !== "23505") return { ok: false, message: describe(ins.error, "Couldn't load your details. Try again.") };
  return { ok: true };
}

/** The caller's own lane columns, for resuming on another device. */
export async function fetchProLaneColumns(userId: string): Promise<Ok<{ row: (ProLaneColumns & { listed_publicly: boolean }) | null }> | Fail> {
  const { data, error } = await db
    .from("professional_profiles")
    .select("other_discipline, closest_group, work_mode, home_visit_km, specialties, session_formats, session_lengths, specialty, listed_publicly")
    .eq("profile_id", userId)
    .maybeSingle();
  if (error) return { ok: false, message: describe(error, "Couldn't load your details. Try again.") };
  return { ok: true, row: (data as (ProLaneColumns & { listed_publicly: boolean }) | null) ?? null };
}

/**
 * D10: what somebody typed into "What do you do?", so the next catalogue is
 * written from real demand. INSERT-only, no read-back. Best-effort: the log
 * is for us, and a failed insert must never stop someone onboarding.
 */
export async function logOtherDiscipline(userId: string, value: string): Promise<void> {
  const v = value.trim();
  if (v.length < 2) return;
  const { error } = await db.from("professional_other_entries").insert({ profile_id: userId, field: "discipline", value: v.slice(0, 80) });
  if (error) console.warn("[professional-onboarding] Could not log the Other entry:", error.code);
}

// ---------------------------------------------------------------------------
// Licences
// ---------------------------------------------------------------------------

const blankDraft = (over: Partial<LicenceDraft>): LicenceDraft => ({
  name: null,
  issuingBody: null,
  issued: null,
  expires: null,
  noExpiry: false,
  credentialId: null,
  credentialUrl: null,
  showWhenExpired: false,
  ...over,
});

const draftOf = (l: Licence): LicenceDraft => ({
  name: l.name,
  issuingBody: l.issuingBody,
  issued: l.issued,
  expires: l.expires,
  noExpiry: l.noExpiry,
  credentialId: l.credentialId,
  credentialUrl: l.credentialUrl,
  showWhenExpired: l.showWhenExpired,
});

/** The licence the Credentials step's "Proof of registration" writes, and the certificate (licence #1). */
export interface CredentialRows {
  registration: Licence | null;
  /** Licence #1, the one mirrored to certification_url (Fitness / Other "Certificate"). */
  certificate: Licence | null;
  /** A regulated professional's optional "Degree or certificate": another licence with a document. */
  degree: Licence | null;
  /** Every licence, for the position of a new one. */
  count: number;
}

/**
 * The registration licence is the one carrying a credential id. It may also be
 * licence #1 (the database makes the first licence with a document the
 * certification_url mirror), so the certificate is the mirror only when it is
 * not the registration, and a regulated professional's degree is kept as its
 * own licence rather than through certification_url, which would overwrite
 * the mirror's document (the registration proof).
 */
export async function fetchCredentialRows(userId: string, registrationId?: string | null): Promise<Ok<CredentialRows> | Fail> {
  const cv = await fetchMyCv(userId);
  if (!cv.ok) return cv;
  const licences = cv.cv.licences;
  // The id the onboarding draft kept wins: a proof uploaded before the number
  // was typed has no credential id yet.
  const registration = licences.find((l) => !!registrationId && l.id === registrationId) ?? licences.find((l) => !!l.credentialId) ?? null;
  return {
    ok: true,
    registration,
    certificate: licences.find((l) => l.mirrorsCertification && l.id !== registration?.id) ?? null,
    degree: licences.find((l) => l.id !== registration?.id && !!l.documentPath) ?? null,
    count: licences.length,
  };
}

/** The licence's display name, as the Background step's frame lists it ("Physiotherapy licence PT-00000"). */
export function registrationName(kind: "physio" | "diet" | "doctor", number: string): string {
  const n = number.trim();
  const name = kind === "physio" ? "Physiotherapy licence" : kind === "doctor" ? "Medical licence" : "Dietitian registration";
  return name + (n ? ` ${n}` : "");
}

/**
 * Saves the registering body and number, and the proof file when one was
 * picked. A new document opens a review in the existing licence review queue
 * (trigger professional_licences_open_review); the number and body are
 * private columns no public view publishes.
 */
export async function saveRegistration(
  userId: string,
  kind: "physio" | "diet" | "doctor",
  fields: { body: string; number: string },
  existing: Licence | null,
  file: File | null,
  position: number
): Promise<Ok<{ licence: Licence }> | Fail> {
  const body = fields.body.trim();
  const number = fields.number.trim();
  const draft = existing
    ? { ...draftOf(existing), issuingBody: body.length >= 2 ? body : existing.issuingBody, credentialId: number || existing.credentialId, name: registrationName(kind, number || existing.credentialId || "") }
    : blankDraft({ name: registrationName(kind, number), issuingBody: body.length >= 2 ? body : null, credentialId: number || null });
  const r = await saveLicence(userId, draft, existing, file, existing ? existing.position : position);
  if (!r.ok) return r;
  return { ok: true, licence: r.licence };
}

/** Sets who issued the certificate (licence #1's issuing body), Fitness and Other lanes. */
export async function saveCertificateIssuer(userId: string, certificate: Licence, issuer: string): Promise<Ok | Fail> {
  const v = issuer.trim();
  if ((certificate.issuingBody ?? "") === v) return { ok: true };
  if (v.length === 1) return { ok: false, message: "Use at least 2 characters." };
  const r = await saveLicence(userId, { ...draftOf(certificate), issuingBody: v || null }, certificate, null, certificate.position);
  return r.ok ? { ok: true } : r;
}

async function fetchReviewRows(userId: string, licenceId?: string): Promise<Ok<{ rows: LicenceReviewRow[] }> | Fail> {
  let q = supabase
    .from("professional_licence_reviews")
    .select("id, licence_id, document_path, submitted_at, approved_at, rejected_at, rejection_reason")
    .eq("professional_id", userId);
  if (licenceId) q = q.eq("licence_id", licenceId);
  const { data, error } = await q;
  if (error) return { ok: false, message: describe(error, "Couldn't load your review status. Try again.") };
  return {
    ok: true,
    rows: (data ?? []).map((r) => ({
      id: r.id,
      licenceId: r.licence_id,
      documentPath: r.document_path,
      submittedAt: r.submitted_at,
      approvedAt: r.approved_at,
      rejectedAt: r.rejected_at,
      rejectionReason: r.rejection_reason,
    })),
  };
}

/** The review status of one licence (pending / verified / rejected with the reviewer's reason). */
export async function fetchLicenceStatus(userId: string, licence: Licence): Promise<Ok<{ status: LicenceStatus }> | Fail> {
  const r = await fetchReviewRows(userId, licence.id);
  if (!r.ok) return r;
  return { ok: true, status: licenceStatus(licence, r.rows) };
}

/**
 * The licence a professional goes live on, and its review status. EVERY LANE
 * is listed on Explore only once it is verified (user decision, 14 Oct 2026;
 * before it, Fitness / Other were listed at submit).
 *
 * Physiotherapist / Dietitian: the registration (the licence carrying a
 * credential id). Fitness / Other: the certificate (licence #1, the
 * certification_url mirror) or, without one, the first licence with a
 * document; any verified licence of theirs counts.
 *
 * The database decides in the end: set_public_listing() refuses a new
 * listing with ATXC6 unless professional_verification_is_current() is true
 * (a verified unexpired licence, or an approved certificate whose approved
 * file is still the one on the profile). Its answer overrides the row
 * reading below, which cannot see expiry or the certificate path. Approval
 * is of a FILE: a re-upload reads as pending again here.
 */
export async function fetchGoLiveStatus(userId: string, regulated: boolean): Promise<Ok<{ licence: Licence | null; status: LicenceStatus }> | Fail> {
  const [local, server] = await Promise.all([goLiveFromRows(userId, regulated), db.rpc("professional_verification_is_current", { p_professional_id: userId })]);
  if (!local.ok || server.error || typeof server.data !== "boolean") return local;
  if (server.data && local.status.kind !== "verified") return { ok: true, licence: local.licence, status: { kind: "verified" } };
  if (!server.data && local.status.kind === "verified") return { ok: true, licence: local.licence, status: { kind: "none" } };
  return local;
}

async function goLiveFromRows(userId: string, regulated: boolean): Promise<Ok<{ licence: Licence | null; status: LicenceStatus }> | Fail> {
  const cv = await fetchMyCv(userId);
  if (!cv.ok) return cv;
  const licences = cv.cv.licences;
  const primary = regulated
    ? licences.find((l) => !!l.credentialId) ?? null
    : licences.find((l) => l.mirrorsCertification && !!l.documentPath) ?? licences.find((l) => !!l.documentPath) ?? null;
  if (!primary) return { ok: true, licence: null, status: { kind: "none" } };
  const reviews = await fetchReviewRows(userId);
  if (!reviews.ok) return reviews;
  if (!regulated) {
    const verified = licences.find((l) => licenceStatus(l, reviews.rows).kind === "verified");
    if (verified) return { ok: true, licence: verified, status: { kind: "verified" } };
  }
  return { ok: true, licence: primary, status: licenceStatus(primary, reviews.rows) };
}

// ---------------------------------------------------------------------------
// Get set up checklist (BU1-08): the one item no row can derive
// ---------------------------------------------------------------------------

/** onboarding_progress items for an owner: done / dismissed by item key. */
export async function fetchOwnerProgress(userId: string): Promise<Ok<{ items: Record<string, { done: boolean; dismissed: boolean }> }> | Fail> {
  const { data, error } = await db.from("onboarding_progress").select("item, done_at, dismissed_at").eq("owner_id", userId);
  if (error) return { ok: false, message: describe(error, "Couldn't load your checklist. Try again.") };
  const items: Record<string, { done: boolean; dismissed: boolean }> = {};
  for (const r of (data ?? []) as { item: string; done_at: string | null; dismissed_at: string | null }[]) {
    items[r.item] = { done: !!r.done_at, dismissed: !!r.dismissed_at };
  }
  return { ok: true, items };
}

/** Marks an owner checklist item done (insert, or update the existing row). */
export async function markOwnerItemDone(userId: string, item: string): Promise<Ok | Fail> {
  const now = new Date().toISOString();
  const updated = await db.from("onboarding_progress").update({ done_at: now }).eq("owner_id", userId).eq("item", item).select("id");
  if (updated.error) return { ok: false, message: describe(updated.error, "Couldn't save that. Try again.") };
  if (updated.data && updated.data.length > 0) return { ok: true };
  const inserted = await db.from("onboarding_progress").insert({ owner_id: userId, item, done_at: now });
  if (inserted.error && inserted.error.code !== "23505") return { ok: false, message: describe(inserted.error, "Couldn't save that. Try again.") };
  return { ok: true };
}

/** Marks an owner checklist item dismissed (handled), keeping its done date. */
export async function markOwnerItemDismissed(userId: string, item: string): Promise<Ok | Fail> {
  const { error } = await db.from("onboarding_progress").update({ dismissed_at: new Date().toISOString() }).eq("owner_id", userId).eq("item", item);
  if (error) return { ok: false, message: describe(error, "Couldn't save that. Try again.") };
  return { ok: true };
}

/** A regulated professional's optional degree or certificate, as its own licence (never through certification_url). */
export async function saveDegree(userId: string, existing: Licence | null, file: File, position: number): Promise<Ok<{ licence: Licence }> | Fail> {
  const r = await saveLicence(userId, existing ? draftOf(existing) : blankDraft({}), existing, file, existing ? existing.position : position);
  if (!r.ok) return r;
  return { ok: true, licence: r.licence };
}
