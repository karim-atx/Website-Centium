import { supabase } from "../../../lib/supabase/client";
import { stripPrivateExif } from "./exif";

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

/**
 * Buckets whose path starts with the owner's id: `<uid>/...`.
 *
 * The distinction below is not filing, it is which policy shape applies, and
 * the type system is used to enforce it because a path built for the wrong
 * shape fails at the server with a generic error — or worse, succeeds at a
 * path whose segment 1 is not who the policy expects.
 */
type OwnerScopedBucket = "lab-reports" | "medical-imaging";

/**
 * Buckets whose path starts with a THREAD id: `<thread_id>/<uploader_id>/...`.
 *
 * The extra segment exists because a Storage policy cannot verify "this file
 * belongs to a message I am about to send" — the message row does not exist
 * yet at upload time. Gating only on thread membership would let either
 * participant write anywhere in the shared folder, overwriting a name the
 * other party is using or planting a file they appear to have sent. See the
 * policy notes in the storage migration.
 */
type ThreadScopedBucket = "message-attachments";

export type PrivateBucket = OwnerScopedBucket | ThreadScopedBucket;

/**
 * Mirrors the bucket definitions in the storage migration.
 *
 * Duplicated here ON PURPOSE, and it must be kept in step by hand. The server
 * rejects an oversized or wrong-typed upload either way; the point of checking
 * first is that the server's rejection arrives as a generic storage error,
 * while this one can say which file and which limit.
 *
 * `accepts` is written per bucket rather than derived from `mimeTypes`,
 * because the list a user should be told about is not always the list the
 * bucket takes — message-attachments accepts audio that no file picker ever
 * offers, since voice notes are recorded rather than chosen.
 */
const BUCKETS: Record<
  PrivateBucket,
  { maxBytes: number; mimeTypes: string[]; label: string; accepts: string }
> = {
  "lab-reports": {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    label: "lab report",
    accepts: "a JPEG, PNG, WebP or PDF",
  },
  "medical-imaging": {
    maxBytes: 25 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    label: "imaging file",
    accepts: "a JPEG, PNG, WebP or PDF",
  },
  // 10 MB, matching the migration. Audio is here because a recorded voice
  // note arrives through this same function as an audio/* blob; it is NOT
  // offered by acceptFor, which see.
  "message-attachments": {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "audio/mpeg",
      "audio/mp4",
      "audio/aac",
      "audio/ogg",
      "audio/webm",
    ],
    label: "attachment",
    accepts: "an image or a voice note",
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
const PREFIXES: Record<OwnerScopedBucket, string | null> = {
  "lab-reports": "panels",
  "medical-imaging": null,
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  // `.weba` rather than `.webm`, deliberately. Anything deciding how to render
  // a stored file reads the extension — FileViewerSheet already does — and
  // `webm` sits one letter from the `webp` in this same map, so an audio-only
  // WebM would be a single typo away from being treated as an image. `.weba`
  // is the registered audio-only convention and cannot be confused with it.
  "audio/webm": "weba",
};

export interface UploadResult {
  ok: boolean;
  /** Object path within the bucket, to store on the owning row. */
  path?: string;
  message?: string;
  /**
   * Why it failed, for callers that need to say something specific.
   *
   * `refused` means a policy rejected the write — on message-attachments that
   * is `thread_allows_attachments()` saying the participants have no live
   * relationship. It exists because that failure is otherwise indistinguishable
   * from a network problem at this layer, and telling someone to check their
   * connection when the server has made a permanent decision is the ATX04
   * mistake repeated: every retry fails identically and nothing about their
   * connection was ever wrong.
   */
  reason?: "cap" | "refused" | "unknown";
}

function humanSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  // GB only above a gigabyte, so every existing per-file message is unchanged.
  // One decimal under 10 GB, because the cap is 2 GB and rounding whole would
  // report "2 GB used of 2 GB" to someone with 300 MB of headroom left.
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb >= 10 ? Math.round(gb) : Math.round(gb * 10) / 10} GB`;
  }
  if (bytes >= 1024 * 1024) return `${Math.round(mb)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ---------------------------------------------------------------------------
// The aggregate cap
// ---------------------------------------------------------------------------

export interface StorageUsage {
  usedBytes: number;
  capBytes: number;
  remainingBytes: number;
  /** 0–1. Convenience for a meter; derived here so callers agree on it. */
  fraction: number;
}

export type StorageUsageResult =
  | { ok: true; usage: StorageUsage }
  | { ok: false; message: string };

/**
 * How much Storage this account holds, against its cap.
 *
 * Reads `storage_usage()`, which resolves the caller from auth.uid() and
 * returns used, cap and headroom. Nothing else in the app can compute this:
 * `profiles.storage_bytes_used` is maintained by a trigger on storage.objects
 * and is in no client UPDATE grant, which is what makes it trustworthy.
 */
export async function getStorageUsage(): Promise<StorageUsageResult> {
  const { data, error } = await supabase.rpc("storage_usage");
  if (error) {
    console.error("[storage] Could not read usage:", error.message);
    return { ok: false, message: "Couldn't load your storage usage." };
  }
  const row = data?.[0];
  if (!row) return { ok: false, message: "Couldn't load your storage usage." };

  const usedBytes = Number(row.used_bytes);
  const capBytes = Number(row.cap_bytes);
  return {
    ok: true,
    usage: {
      usedBytes,
      capBytes,
      remainingBytes: Number(row.remaining_bytes),
      fraction: capBytes > 0 ? Math.min(1, usedBytes / capBytes) : 0,
    },
  };
}

/**
 * SQLSTATE raised by the cap trigger, and a message prefix kept for later.
 *
 * FOUR BRANCHES, AND A REAL CAP VIOLATION CHANGED WHICH ONE MATTERS. The
 * convention elsewhere is to match the code and never the text —
 * `error.code === "ATX03"` in professional-profile — which works because those
 * errors come back through PostgREST, and PostgREST puts the SQLSTATE on
 * `PostgrestError.code`.
 *
 * An upload does not go through PostgREST. It goes to the Storage API, whose
 * client returns a `StorageError` whose `code` holds the Storage API's own
 * vocabulary ("AccessDenied" and the like) and never the Postgres SQLSTATE.
 *
 * WHAT ACTUALLY FIRES IS `message.includes("ATX04")`. Verified against a real
 * violation triggered on staging: the Storage API discards the trigger's
 * message and substitutes its own — "database error, code: ATX04" — which
 * carries the code as plain text. So the SQLSTATE does reach this function,
 * just in the message rather than on a field named for it.
 *
 * `CAP_MESSAGE_PREFIX` IS UNREACHABLE TODAY AND KEPT DELIBERATELY. The
 * trigger's own wording ("storage cap exceeded: this upload needs N bytes…")
 * does not survive that substitution, so this branch never runs — which is
 * intent, not oversight, and not dead code to be tidied away. It costs one
 * comparison on a path that has already failed, and it starts working the day
 * the Storage API stops rewriting messages: precisely the change nobody would
 * notice until a user was shown the wrong error. The `code` and `statusCode`
 * checks are the same hedge pointing the other way — unreachable now, correct
 * the moment a SQLSTATE is propagated properly.
 *
 * What no branch matches is the byte counts, which change on every call. Only
 * the constant code string is treated as a contract. `redemption` does the
 * same belt-and-braces for ATX02.
 *
 * FOR ANYONE RE-DERIVING THIS FROM A PROBE: an RLS violation through this same
 * API forwards its Postgres message verbatim ("new row violates row-level
 * security policy"), which makes it look as though messages are passed
 * through. They are not, uniformly — errors the Storage API recognises and
 * errors it does not are handled differently, and ATX04 is in the second
 * group. An earlier version of this comment reasoned from that probe and got
 * the conclusion backwards, arguing against the branch that turned out to be
 * the working one.
 */
const CAP_ERRCODE = "ATX04";
const CAP_MESSAGE_PREFIX = "storage cap exceeded";

function isCapViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { code?: unknown; statusCode?: unknown; message?: unknown };
  if (e.code === CAP_ERRCODE || e.statusCode === CAP_ERRCODE) return true;
  const message = typeof e.message === "string" ? e.message : "";
  return message.includes(CAP_ERRCODE) || message.toLowerCase().includes(CAP_MESSAGE_PREFIX);
}

/**
 * Whether Storage refused this write on policy grounds.
 *
 * DELIBERATELY BROAD, AND THE BREADTH IS THE POINT. The Storage API does not
 * surface a SQLSTATE for an RLS `with check` failure the way PostgREST does —
 * there is no ATX05 to match on, only an HTTP status and prose. So this keys
 * on the status first, which is structural, and treats the wording as
 * corroboration rather than the test.
 *
 * Being broad is the safe direction here. A false positive says "you can't
 * attach to this conversation" when the real cause was something else; a false
 * negative says "check your connection" about a permanent refusal, sending
 * someone into a retry loop that cannot succeed. The first is a worse
 * sentence, the second is a worse experience, and only the second is
 * unrecoverable from the user's side.
 *
 * Ordering matters: capacity is checked first by the caller, because ATX04
 * also arrives as a 4xx and is a different, actionable problem.
 */
function isPolicyRefusal(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { status?: unknown; statusCode?: unknown; message?: unknown };
  const status = String(e.status ?? e.statusCode ?? "");
  const message = (typeof e.message === "string" ? e.message : "").toLowerCase();
  const refusedStatus = status === "400" || status === "401" || status === "403";
  const refusedWording =
    message.includes("row-level security") ||
    message.includes("row level security") ||
    message.includes("violates") ||
    message.includes("unauthorized") ||
    message.includes("access denied");
  return refusedStatus || refusedWording;
}

/**
 * The sentence shown when an upload is refused for want of space.
 *
 * The figures come from `storage_usage()` rather than from the error text.
 * The error does carry them, but parsing numbers out of a message is exactly
 * the coupling the SQLSTATE convention exists to avoid, and a second round
 * trip on a path that has already failed costs nothing.
 */
async function capExceededMessage(): Promise<string> {
  const usage = await getStorageUsage();
  if (!usage.ok) {
    return "You're out of storage space. Remove a file you no longer need, then try again.";
  }
  return `You're out of storage space — ${humanSize(usage.usage.usedBytes)} of ${humanSize(
    usage.usage.capBytes
  )} used. Remove a file you no longer need, then try again.`;
}

/**
 * The `accept` attribute for a file input feeding this bucket.
 *
 * DERIVED FROM BUCKETS RATHER THAN TYPED OUT, because the two drifted. Both
 * capture flows used `accept="image/*"`, which offers the user HEIC, GIF, SVG,
 * BMP, TIFF and AVIF — none of which any bucket accepts. The picker said yes
 * and the upload said no, which is the worst order to learn it in.
 *
 * `imagesOnly` is for camera inputs, which are narrower than the bucket by
 * nature: a camera cannot produce a PDF, so offering one is noise.
 *
 * NOT A CONTROL. `accept` is a picker hint — most OS dialogs offer a way past
 * it, and a file's reported type can be wrong regardless. It exists to make
 * the common path pleasant; validateFileFor is what actually decides.
 */
export function acceptFor(bucket: PrivateBucket, imagesOnly = false): string {
  const types = BUCKETS[bucket].mimeTypes.filter(
    (t) =>
      // Audio is never offered by a picker, on any bucket. message-attachments
      // accepts it so a RECORDED voice note can be uploaded; there is no flow
      // anywhere that picks an audio file off disk, and listing the types here
      // would invent one. This is the same call MessagesTab's own file input
      // already made before it was deleted.
      !t.startsWith("audio/") && (!imagesOnly || t.startsWith("image/"))
  );
  // Extension hints alongside the MIME types: some pickers match one and not
  // the other. Derived from the same map that names the uploaded file.
  return [...types, ...types.map((t) => `.${EXTENSIONS[t]}`)].join(",");
}

export interface FileCheckResult {
  ok: boolean;
  message?: string;
}

/**
 * Whether this file may go in this bucket, by type and size.
 *
 * DELIBERATELY CALLED TWICE. The capture flows call it the moment a file is
 * picked, so a file that cannot be uploaded never enters the review flow —
 * previously the only check ran inside uploadPrivateFile, at the END of
 * capture, data-URL read, parse and results review, so the user did all of
 * that work before being told the type was wrong.
 *
 * uploadPrivateFile still calls it too, and that call is the one that matters.
 * The early check is a convenience and can be skipped by anything that does
 * not go through the UI; the upload-time check cannot. Neither is the security
 * boundary — the bucket's own file_size_limit and allowed_mime_types are, and
 * they reject on the server no matter what any of this says.
 */
export function validateFileFor(bucket: PrivateBucket, file: File): FileCheckResult {
  const config = BUCKETS[bucket];

  if (!config.mimeTypes.includes(file.type)) {
    return {
      ok: false,
      // Named per bucket rather than hardcoded. This sentence used to say
      // "JPEG, PNG, WebP or PDF" for every bucket, which was true while there
      // were only two and both took the same set — and became wrong the
      // moment a bucket took audio and no PDF.
      message: `That file type isn't supported. Use ${config.accepts}.`,
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
  return { ok: true };
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
function objectPath(params: UploadParams, mimeType: string): string {
  const ext = EXTENSIONS[mimeType] ?? "bin";
  const name = `${crypto.randomUUID()}.${ext}`;

  // Thread-scoped: `<thread_id>/<uploader_id>/<name>`. The uploader is at
  // segment 2 here, not segment 1 — message_attachments_insert_own checks
  // exactly that, so building this with the owner shape would be refused by
  // the server rather than silently misfiled.
  if (params.bucket === "message-attachments") {
    return `${params.threadId}/${params.userId}/${name}`;
  }

  const prefix = PREFIXES[params.bucket];
  return prefix ? `${params.userId}/${prefix}/${name}` : `${params.userId}/${name}`;
}

/**
 * What an upload needs, which is not the same for every bucket.
 *
 * A UNION RATHER THAN AN OPTIONAL `threadId`, so the compiler refuses both
 * mistakes instead of one: omitting the thread id for message-attachments,
 * and passing one to a bucket whose policy reads segment 1 as the owner. With
 * an optional field, forgetting it would build `<uid>/<name>` for a bucket
 * whose policy expects the uploader at segment 2 — an upload that fails at
 * the server with a message that explains none of this.
 */
export type UploadParams =
  | { bucket: OwnerScopedBucket; userId: string; file: File }
  | { bucket: ThreadScopedBucket; userId: string; file: File; threadId: string };

/**
 * Uploads one file and returns the path to store on the row that references
 * it. The caller owns that row, and owns deleting this object if the row
 * write then fails — nothing cascades.
 *
 * EXCEPT ON message-attachments, WHERE IT CANNOT. That bucket has no DELETE
 * policy, matching `messages` having none: a sent attachment is as permanent
 * as the message carrying it. So the compensating delete every other caller
 * performs after a failed row write is impossible there, and a failed insert
 * leaves an orphan for good. Accepted deliberately — the object is unreferenced
 * and unreachable by anyone who does not already share the thread. See
 * deletePrivateFile, which will not accept that bucket at all.
 */
export async function uploadPrivateFile(params: UploadParams): Promise<UploadResult> {
  const { bucket, file } = params;

  // Kept even though the capture flows now check at pick time. That check is a
  // UX convenience on one path; this one covers every caller, including any
  // future one that never touches a file input.
  const check = validateFileFor(bucket, file);
  if (!check.ok) return { ok: false, message: check.message };

  // HERE RATHER THAN IN THE CAPTURE FLOWS, for the same reason validateFileFor
  // is called here: both live upload paths — BiomarkerCaptureFlow and
  // ImagingCaptureFlow — get it without knowing about it, and no future caller
  // can forget to. Doing it at the two call sites would mean writing it twice
  // and leaving a third one able to skip it.
  //
  // AFTER validation and BEFORE the upload. Validating first means an
  // oversized or wrong-typed file is refused without paying to parse it, and
  // stripping before the upload is the only ordering that works at all —
  // Storage has no in-place rewrite, so anything sent unstripped stays that
  // way until it is re-uploaded and its row re-pointed.
  //
  // Never throws and never blocks: see stripPrivateExif.
  const toUpload = await stripPrivateExif(file);

  const path = objectPath(params, file.type);
  const { error } = await supabase.storage.from(bucket).upload(path, toUpload, {
    contentType: file.type,
    // Never overwrite. The path carries a fresh uuid, so a collision would
    // mean something is very wrong, and silently replacing a medical file is
    // the last behaviour this should have.
    upsert: false,
  });

  if (error) {
    console.error("[storage] Upload failed:", error.message);
    // Being out of space is not a network problem, and saying it is makes the
    // failure permanent from the user's side: the generic message asks them to
    // retry, and every retry fails identically because nothing about their
    // connection was ever wrong.
    if (isCapViolation(error)) {
      return { ok: false, reason: "cap", message: await capExceededMessage() };
    }
    // Checked AFTER the cap, because ATX04 also arrives as a 4xx and has its
    // own, actionable answer. Whoever calls this owns the wording — Storage
    // has no idea a "policy refusal" here means "you have not hired them".
    if (isPolicyRefusal(error)) {
      return {
        ok: false,
        reason: "refused",
        message: "That file couldn't be attached to this conversation.",
      };
    }
    return {
      ok: false,
      reason: "unknown",
      message: "That file couldn't be uploaded. Check your connection and try again.",
    };
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
  // OwnerScopedBucket, not PrivateBucket, and the narrowing is the point:
  // message-attachments has no DELETE policy, so this would fail there every
  // time. Compensation logic that silently never works is worse than none —
  // it reads as cleanup while leaving the orphan behind. Refusing it at the
  // type level says so at the call site instead of at runtime.
  bucket: OwnerScopedBucket,
  path: string
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error("[storage] Could not delete object:", error.message);
    return { ok: false, message: "That file couldn't be removed." };
  }
  return { ok: true };
}
