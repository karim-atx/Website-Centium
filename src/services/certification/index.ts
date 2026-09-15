import { supabase } from "../../../lib/supabase/client";
import { deletePrivateFile, signedUrlFor, uploadPrivateFile } from "../storage";

// A professional's qualification document.
//
// PRIVATE, UNLIKE THE AVATAR, and that is the whole reason this does not look
// like services/avatar. A profile picture is meant to be seen by strangers, so
// it lives in the one public bucket and the column holds a permanent URL.
// A certification is a named individual's professional credential — often a
// scan carrying their full legal name, a registration number and an awarding
// body — and nobody outside this account and whoever reviews it has any
// business fetching it. So it goes in a private bucket, the column holds a
// PATH rather than a URL, and every read mints a short-lived signed URL. That
// is the lab-report and medical-imaging shape, and this follows it exactly.
//
// WHAT WAS HERE BEFORE: nothing, twice over. Both entry points read the file
// with FileReader and put a `data:` URL into local state, so the document
// lived in one browser's localStorage and professional_profiles.
// certification_url was never written. Measured before this was built:
// uploading a certificate produced zero requests to /storage/v1, left the
// column null and the bucket empty — while the sheet displayed "Pending
// confirmation & approval by administrators" over a file no administrator
// could open.

const BUCKET = "certifications" as const;

export type CertificationResult =
  | { ok: true; path: string }
  | { ok: false; message: string };

/**
 * Whether a stored value is a pre-Storage local-only document.
 *
 * Both entry points used to write a base64 `data:` URL into the same field the
 * real path now uses, so anything starting with `data:` is a leftover from
 * before this existed. It is NOT a path and must never be handed to
 * signedUrlFor or deletePrivateFile — see the read path in CertificationSheet,
 * which shows it inline and says it is not stored.
 */
export function isLocalOnlyCertification(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("data:");
}

/**
 * Uploads a qualification document and points the professional's row at it.
 *
 * A FRESH PATH EVERY TIME, for the reason the avatar upload documents: the
 * object name carries a uuid, so nothing overwrites and nothing is served
 * from a cache keyed to a reused name. It matters less here than for a public
 * CDN-backed avatar — signed URLs are minted per read and expire in minutes —
 * but the reasoning that made the avatar's fresh path necessary applies to any
 * replace-a-file flow, and having two different conventions for the same act
 * is how one of them ends up wrong.
 *
 * ORDER: upload, then the row, then the old file. Identical to the avatar and
 * to services/labs: the row write is what makes the new document the
 * professional's certification, so nothing is deleted until it lands, and the
 * object just uploaded is removed if it does not.
 */
export async function uploadCertification(
  userId: string,
  file: File,
  previousPath?: string | null
): Promise<CertificationResult> {
  // validateFileFor runs inside uploadPrivateFile and is the check that
  // matters; the capture flows call it early as a convenience, and these two
  // entry points inherit the same treatment by going through here.
  const upload = await uploadPrivateFile({ bucket: BUCKET, userId, file });
  if (!upload.ok || !upload.path) {
    return { ok: false, message: upload.message ?? "That file couldn't be uploaded." };
  }

  const written = await setCertificationPath(userId, upload.path);
  if (!written.ok) {
    // Unreferenced the moment the row write failed, so it goes rather than
    // counting against the account's storage forever.
    const cleanup = await deletePrivateFile(BUCKET, upload.path);
    if (!cleanup.ok) {
      console.error("[certification] ORPHANED OBJECT after row write failure:", upload.path);
    }
    return { ok: false, message: written.message };
  }

  // Last, and only on success. Storage does not cascade, so an unreferenced
  // object is nobody's job but this one's — and a `data:` leftover resolves to
  // no path, which is correct, because there was never a file.
  if (previousPath && !isLocalOnlyCertification(previousPath) && previousPath !== upload.path) {
    const removed = await deletePrivateFile(BUCKET, previousPath);
    // Logged rather than surfaced: the professional's certification changed,
    // which is what they asked for. A leftover file is an internal problem.
    if (!removed.ok) console.warn("[certification] Could not remove the previous file.");
  }

  return { ok: true, path: upload.path };
}

/**
 * Clears the certification — the row first, then the file.
 *
 * ROW FIRST, the opposite order to upload, and both are right for the same
 * reason: the row is the truth. Clearing it first means the worst case is an
 * orphaned object nobody references; deleting the object first would mean the
 * worst case is a professional whose profile claims a document that 404s on
 * review.
 */
export async function removeCertification(
  userId: string,
  currentPath: string | null | undefined
): Promise<{ ok: boolean; message?: string }> {
  const written = await setCertificationPath(userId, null);
  if (!written.ok) return { ok: false, message: written.message };

  if (currentPath && !isLocalOnlyCertification(currentPath)) {
    const removed = await deletePrivateFile(BUCKET, currentPath);
    if (!removed.ok) console.warn("[certification] Could not delete the stored file.");
  }
  return { ok: true };
}

/**
 * A short-lived URL for viewing the stored document.
 *
 * MINTED PER VIEW, NEVER STORED. signedUrlFor caps its own TTL, and a URL held
 * in state past that cap is just a broken image with extra steps. Callers ask
 * when they open the viewer and not before.
 */
export async function certificationUrl(path: string): Promise<{ ok: boolean; url?: string; message?: string }> {
  if (isLocalOnlyCertification(path)) {
    // A pre-Storage `data:` value is already viewable as-is; signing it would
    // be meaningless and the request would fail.
    return { ok: true, url: path };
  }
  return await signedUrlFor(BUCKET, path);
}

/**
 * The stored object path for this professional, or null.
 *
 * WITHOUT THIS THE FEATURE WOULD BE HALF-BUILT in exactly the way the upload
 * audit called out: a write with no read. fetchProfile does not carry this
 * column — services/profile documents certificationUrl among the fields
 * `profiles` has no concept of, which was true while it was a fake local
 * field and stops being true here — and fetchMyProfile's column list does not
 * include it either. So a professional who uploads on one device would open
 * the sheet on another and be told they have no certification, over a file
 * that is sitting in the bucket.
 */
export async function fetchCertificationPath(
  userId: string
): Promise<{ ok: boolean; path: string | null }> {
  const { data, error } = await supabase
    .from("professional_profiles")
    .select("certification_url")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[certification] Could not read the stored path:", error.message);
    return { ok: false, path: null };
  }
  // No row is an ordinary state, not a failure: a professional who has never
  // filled anything in has no professional_profiles row at all.
  return { ok: true, path: data?.certification_url ?? null };
}

/**
 * Writes professional_profiles.certification_url.
 *
 * UPDATE THEN INSERT, not upsert, matching saveMyProfile in
 * services/professional-profile. A professional reaching this during
 * onboarding may have no row yet; one who has edited their listing does. An
 * upsert would compile to ON CONFLICT DO UPDATE across every column in the
 * payload, which is the shape that has already cost this project two
 * column-grant refusals.
 */
async function setCertificationPath(
  userId: string,
  path: string | null
): Promise<{ ok: boolean; message: string }> {
  const updated = await supabase
    .from("professional_profiles")
    .update({ certification_url: path })
    .eq("profile_id", userId)
    .select("profile_id");

  if (updated.error) {
    console.error("[certification] Could not update the row:", updated.error.message);
    return { ok: false, message: "Couldn't save your certification. Try again." };
  }
  if (updated.data && updated.data.length > 0) return { ok: true, message: "" };

  const inserted = await supabase
    .from("professional_profiles")
    .insert({ profile_id: userId, certification_url: path })
    .select("profile_id")
    .single();

  if (inserted.error) {
    console.error("[certification] Could not create the row:", inserted.error.message);
    return { ok: false, message: "Couldn't save your certification. Try again." };
  }
  return { ok: true, message: "" };
}
