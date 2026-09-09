import { supabase } from "../../../lib/supabase/client";

// Uploads and reads for the private Storage buckets.
//
// THE FIRST STORAGE CODE IN THIS REPO. Six columns have referenced bucket
// paths as inert text since the schema was written, and nothing has ever put
// a file behind one. The storage migration is explicit that it is a contract
// rather than a feature, and this module is the client half of it.
//
// EVERY POLICY DERIVES IDENTITY FROM THE PATH, which is the single most
// important thing to know here. There is no row to check: `storage.objects`
// policies match on the object's name, so `<uid>/...` is not a filing
// convention, it is the authorisation. A file written to the right bucket at
// the wrong path is either unreadable by its owner or readable by someone who
// should not see it, and nothing in the database will complain.
//
// THREE WAYS STORAGE IS WEAKER THAN TABLE RLS, carried over from the
// migration's own warnings because callers have to design around them:
//
//   1. NO CASCADE. Deleting a row does not delete the object it referenced,
//      and does not re-protect it. Row deletion and object deletion are two
//      calls and this app owns both -- see deletePrivateFile.
//   2. SIGNED URLS OUTLIVE REVOCATION. Consent is evaluated once, when the URL
//      is signed, not per request. A link minted while consent was active
//      keeps working until it expires. Hence the deliberately short default
//      TTL below, and the cap.
//   3. THE lab-reports PREFIX SPLIT IS LOAD-BEARING. `panels/` is
//      consent-readable and `extracted/` is not, and that prefix is the ONLY
//      thing keeping unreviewed machine output away from a professional. This
//      module will not write to `extracted/` at all -- see PREFIXES.

export type PrivateBucket = "lab-reports" | "medical-imaging";

/**
 * Mirrors the bucket definitions in the storage migration.
 *
 * Duplicated here ON PURPOSE, and it must be kept in step by hand. The server
 * rejects an oversized or wrong-typed upload either way; the point of checking
 * first is that the server's rejection arrives as a generic storage error,
 * while this one can say which file and which limit.
 */
const BUCKETS: Record<
  PrivateBucket,
  { maxBytes: number; mimeTypes: string[]; label: string }
> = {
  "lab-reports": {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    label: "lab report",
  },
  "medical-imaging": {
    maxBytes: 25 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    label: "imaging file",
  },
};

/**
 * The path segment after the user id, per the migration's path contract.
 *
 * lab-reports is the only bucket with a split, and only `panels` appears here.
 * `extracted` exists in the policy for unreviewed OCR output; nothing in this
 * app performs real extraction, so nothing may write there. Adding it to this
 * map is not a one-line change -- it moves files out of consent reach by
 * convention alone, and the decision belongs with whoever builds extraction.
 */
const PREFIXES: Record<PrivateBucket, string | null> = {
  "lab-reports": "panels",
  "medical-imaging": null,
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export interface UploadResult {
  ok: boolean;
  /** Object path within the bucket, to store on the owning row. */
  path?: string;
  message?: string;
}

function humanSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${Math.round(bytes / (1024 * 1024))} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Builds the object path for a file.
 *
 * THE FILENAME IS GENERATED, NEVER TAKEN FROM THE FILE. This is a security
 * decision, not tidiness. Policies read identity out of path segment 1, so a
 * name containing a slash shifts every segment along: a file called
 * "../x.jpg" or "a/b.jpg" produces a path whose first segment is no longer
 * the uploader's id, and the owner-only predicate stops matching the person
 * who uploaded it. Generating the name removes the class of problem rather
 * than sanitising for it, and it also stops two captures on the same day from
 * overwriting each other.
 *
 * The extension comes from the MIME type for the same reason: it is the value
 * the bucket already validated, rather than whatever the filename claimed.
 */
function objectPath(bucket: PrivateBucket, userId: string, mimeType: string): string {
  const prefix = PREFIXES[bucket];
  const ext = EXTENSIONS[mimeType] ?? "bin";
  const name = `${crypto.randomUUID()}.${ext}`;
  return prefix ? `${userId}/${prefix}/${name}` : `${userId}/${name}`;
}

/**
 * Uploads one file and returns the path to store on the row that references
 * it. The caller owns that row, and owns deleting this object if the row
 * write then fails — nothing cascades.
 */
export async function uploadPrivateFile(params: {
  bucket: PrivateBucket;
  userId: string;
  file: File;
}): Promise<UploadResult> {
  const { bucket, userId, file } = params;
  const config = BUCKETS[bucket];

  if (!config.mimeTypes.includes(file.type)) {
    return {
      ok: false,
      message: "That file type isn't supported. Use a JPEG, PNG, WebP or PDF.",
    };
  }
  if (file.size > config.maxBytes) {
    return {
      ok: false,
      message: `That ${config.label} is ${humanSize(file.size)}. The limit is ${humanSize(config.maxBytes)}.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, message: "That file is empty." };
  }

  const path = objectPath(bucket, userId, file.type);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    // Never overwrite. The path carries a fresh uuid, so a collision would
    // mean something is very wrong, and silently replacing a medical file is
    // the last behaviour this should have.
    upsert: false,
  });

  if (error) {
    console.error("[storage] Upload failed:", error.message);
    return { ok: false, message: "That file couldn't be uploaded. Check your connection and try again." };
  }
  return { ok: true, path };
}

export interface SignedUrlResult {
  ok: boolean;
  url?: string;
  message?: string;
}

/**
 * Mints a short-lived read URL.
 *
 * DELIBERATELY SHORT, and capped. Table consent is re-evaluated on every
 * query, so revoking access takes effect immediately; a signed Storage URL is
 * authorised once, at signing, and keeps working until it expires no matter
 * what the client does afterwards. On these two buckets that means a lab
 * report or a scan stays reachable for the whole TTL after consent is
 * withdrawn, so the TTL is the revocation delay. The migration asks for
 * minutes rather than days; this enforces it rather than trusting callers.
 */
export async function signedUrlFor(
  bucket: PrivateBucket,
  path: string,
  ttlSeconds = 120
): Promise<SignedUrlResult> {
  const ttl = Math.min(Math.max(30, Math.round(ttlSeconds)), 600);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) {
    console.error("[storage] Could not sign URL:", error?.message);
    return { ok: false, message: "That file couldn't be opened." };
  }
  return { ok: true, url: data.signedUrl };
}

/**
 * Removes an object.
 *
 * Must be called explicitly whenever the row referencing it goes away, and as
 * compensation when a row write fails after the upload succeeded. Storage does
 * not cascade: an object whose row is gone stays in the bucket, still readable
 * by whoever the path says may read it, which for `lab-reports/<uid>/panels/`
 * includes any professional the client has granted lab access.
 *
 * Reports failure rather than throwing, because the caller usually cannot do
 * anything about it beyond logging — but a caller that ignores this leaves an
 * orphan behind, so it is not `void`.
 */
export async function deletePrivateFile(
  bucket: PrivateBucket,
  path: string
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error("[storage] Could not delete object:", error.message);
    return { ok: false, message: "That file couldn't be removed." };
  }
  return { ok: true };
}
