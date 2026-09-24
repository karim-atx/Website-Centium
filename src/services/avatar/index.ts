import { supabase } from "../../../lib/supabase/client";
import { stripPrivateExif } from "../storage/exif";
import { updateAvatarUrl } from "../profile";

// Profile pictures: the one PUBLIC bucket, and the reason this is its own
// module rather than another branch of services/storage.
//
// EVERYTHING ABOUT THE PUBLIC BUCKET IS DIFFERENT. services/storage is built
// around private buckets: it hands back an object PATH for a row to reference
// and mints short-lived signed URLs to read it, and its types exist to stop a
// caller writing to the wrong path shape. Avatars hand back a permanent
// public URL that anyone may fetch without a session, and the URL itself is
// what goes in the column. Widening PrivateBucket to cover that would put two
// opposite contracts behind one return type, and the first mistake it invited
// would be signing a URL that never needed signing — or worse, treating a
// world-readable object as though a signed URL were protecting it.
//
// WHAT WAS HERE BEFORE: nothing. Both upload screens read the file with
// FileReader and put the resulting `data:` URL straight into local state, so a
// profile picture lived in one browser's localStorage and profiles.avatar_url
// was never written at all. It showed up on the three screens reading local
// state and nowhere else — not to a coach, not in a thread, not on a second
// device, and not on the same device after signing out. The avatars bucket
// and its four policies have existed since the storage migration, unused.

const BUCKET = "avatars";

/**
 * Mirrors the bucket definition in the storage migration, by hand, for the
 * reason services/storage gives: the server rejects a bad upload either way,
 * but only a local check can name the limit.
 */
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * The longest edge of the stored image.
 *
 * 512 IS FOR THE LARGEST PLACE IT IS SHOWN, which is the profile header at
 * roughly 80 CSS pixels — so this is already generous at 3x. It matters far
 * more than it looks: every surface that renders an avatar fetches this file,
 * and the list is long (a coach's client list, every thread row, the public
 * directory). Storing the camera's original would put several megabytes
 * behind each of those, over and over.
 *
 * It also makes the bucket's 5 MB ceiling unreachable in practice rather than
 * a thing users meet — measured before this existed, a 7.5 MB phone photo
 * became a 10 MB base64 string in localStorage, which is both over the
 * bucket's limit and over Safari's storage quota.
 */
const MAX_EDGE_PX = 512;

/** Re-encode quality. High enough that a face at 512px shows no artefacts. */
const JPEG_QUALITY = 0.85;

/**
 * The `accept` attribute for a file input feeding this bucket.
 *
 * DERIVED FROM MIME_TYPES, for the reason services/storage's acceptFor gives
 * and for the same failure it was written to end: both avatar pickers used
 * `accept="image/*"`, which offers HEIC, GIF, SVG, BMP, TIFF and AVIF — none
 * of which the check below accepts. An iPhone shooting High Efficiency hands
 * back a HEIC the picker had just said yes to, and the rejection arrives
 * after the pick rather than instead of it.
 *
 * Extension hints alongside the MIME types, because some pickers match one
 * and not the other. NOT A CONTROL: `accept` is a hint, most OS dialogs offer
 * a way past it, and a file's reported type can be wrong regardless — the
 * check inside uploadAvatar is what actually decides.
 */
export const AVATAR_ACCEPT = [...MIME_TYPES, ".jpg", ".jpeg", ".png", ".webp"].join(",");

export type AvatarResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Whether an avatar value is a local-only picture that never reached Storage.
 *
 * THE DEDUP KEY FOR THE ONE-TIME MIGRATION, and it is the same trick the
 * custom-meal and routine uploads use: rather than a flag that can drift out
 * of step with reality, the value's own shape says whether it has been
 * uploaded. `data:` means it only ever lived in this browser; anything else
 * is a URL the server gave us. A migrated avatar cannot look like a candidate
 * again, because migrating it is what replaces the value.
 */
export function isLocalOnlyAvatar(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith("data:");
}

/**
 * The object path inside `avatars` that a public URL points at, or null.
 *
 * Used only to delete the file an account is replacing. Verified to sit under
 * the caller's own folder before it is returned: the bucket's policies would
 * refuse anything else anyway, but building a delete for someone else's path
 * and letting the server say no is not a thing to do on purpose.
 */
function pathFromPublicUrl(url: string | null | undefined, userId: string): string | null {
  if (!url || url.startsWith("data:")) return null;
  const marker = `/object/public/${BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  // Query strings are not part of the object name. Storage appends none
  // today, but a cache-busting parameter on a stored URL is exactly the kind
  // of thing that gets added later and silently breaks a string match.
  const path = decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
  return path.startsWith(`${userId}/`) ? path : null;
}

/**
 * Re-encodes an image to at most MAX_EDGE_PX on its longest side.
 *
 * CANVAS RE-ENCODING ALSO DROPS EXIF, since it rasterises pixels and writes a
 * fresh JPEG — the metadata never reaches the new file. stripPrivateExif
 * still runs below, and not as superstition: this function returns the
 * ORIGINAL file whenever it cannot do its job, and that path is exactly where
 * the original bytes, GPS and all, would otherwise reach a world-readable
 * bucket.
 *
 * NEVER THROWS, matching stripPrivateExif's rule and for the same reason: a
 * decode failure on an unusual image should cost the picture its resizing,
 * not cost the user their upload.
 */
async function downscale(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    // Already small enough: re-encoding would only lose quality.
    if (scale === 1 && file.type === "image/jpeg") {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } catch (e) {
    console.warn("[avatar] Could not resize the image, uploading as picked:", e);
    return file;
  }
}

function validate(file: File): string | null {
  if (!MIME_TYPES.includes(file.type)) {
    return "Profile pictures need to be a JPEG, PNG or WebP.";
  }
  if (file.size > MAX_BYTES) {
    return "That image is too large. Pick one under 5 MB.";
  }
  return null;
}

/**
 * Uploads a new profile picture and points the account's row at it.
 *
 * A FRESH FILENAME EVERY TIME, NEVER `<userId>/avatar.jpg`. The bucket is
 * public, so the URL is served through a CDN and cached by it and by every
 * browser that has seen it. Reusing one path would mean the row updates, the
 * database is right, and the old face keeps appearing for everyone until some
 * cache somewhere decides otherwise — the exact bug this feature is being
 * built to fix, reintroduced one layer down and much harder to see.
 *
 * ORDER: upload, then the row, then the old file. The row write is the thing
 * that makes the new picture real, so nothing is deleted until it succeeds;
 * if it fails, the object just uploaded is removed rather than left orphaned,
 * which is the same compensating delete services/storage documents.
 *
 * `previousUrl` is whatever the account is currently showing. A `data:` URL
 * from before this existed resolves to no path and nothing is deleted, which
 * is correct — there was never a file.
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  previousUrl?: string | null
): Promise<AvatarResult> {
  const invalid = validate(file);
  if (invalid) return { ok: false, message: invalid };

  const resized = await downscale(file);
  const stripped = await stripPrivateExif(resized);

  const extension = stripped.type === "image/png" ? "png" : stripped.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, stripped, {
    contentType: stripped.type,
    // A uuid collision would mean something is very wrong; overwriting is
    // never the right response to it.
    upsert: false,
  });
  if (uploadError) {
    console.error("[avatar] Upload failed:", uploadError.message);
    return {
      ok: false,
      message: "That picture couldn't be uploaded. Check your connection and try again.",
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const written = await updateAvatarUrl(userId, publicUrl);
  if (!written.ok) {
    // The row is what makes the file the account's picture. Without it the
    // object is unreferenced, so it goes rather than sitting in the bucket
    // counting against the account forever.
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, message: written.message ?? "Couldn't save your new picture." };
  }

  // LAST, AND ONLY ON SUCCESS. Storage does not cascade and the row no longer
  // references this object, so nothing else will ever clean it up — but
  // deleting it before the row moved would have left the account pointing at
  // a file that was gone.
  const previousPath = pathFromPublicUrl(previousUrl, userId);
  if (previousPath && previousPath !== path) {
    const { error } = await supabase.storage.from(BUCKET).remove([previousPath]);
    // Logged, not surfaced: the user's picture changed, which is what they
    // asked for. A leftover file is an internal tidiness problem.
    if (error) console.warn("[avatar] Could not remove the previous picture:", error.message);
  }

  return { ok: true, url: publicUrl };
}

/**
 * Removes the account's picture — the row first, then the file.
 *
 * ROW FIRST, the opposite order to upload, and for the same reason both are
 * right: the row is the truth. Clearing it first means the worst case is an
 * orphaned file nobody references; deleting the object first would mean the
 * worst case is every surface in the app showing a broken image.
 */
export async function removeAvatar(
  userId: string,
  currentUrl: string | null | undefined
): Promise<{ ok: boolean; message?: string }> {
  const written = await updateAvatarUrl(userId, null);
  if (!written.ok) {
    return { ok: false, message: written.message ?? "Couldn't remove your picture." };
  }

  const path = pathFromPublicUrl(currentUrl, userId);
  if (path) {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.warn("[avatar] Could not delete the stored picture:", error.message);
  }
  return { ok: true };
}

/**
 * Carries a pre-Storage `data:` avatar up to the bucket, once.
 *
 * WHY THESE EXIST AT ALL: before this module, picking a picture produced a
 * base64 string in localStorage and nothing else. Those users have a real
 * picture they chose, visible to them, that no one else can see — and it
 * disappears the first time they sign out, because signOut clears
 * `centium-state:*`. This gets it to the server before that happens.
 *
 * ONE-TIME BY CONSTRUCTION, not by a flag. isLocalOnlyAvatar answers from the
 * value itself, and a successful migration replaces that value with an https
 * URL — so the candidate test can never match the same picture twice. The
 * caller adds a per-account "already tried this page life" guard for the
 * failure case, the same shape the custom-meal and routine uploads use.
 */
export async function migrateLocalAvatar(userId: string, dataUrl: string): Promise<AvatarResult> {
  if (!isLocalOnlyAvatar(dataUrl)) {
    return { ok: false, message: "That picture is already stored." };
  }
  try {
    // A data: URL is already in memory; fetch() is just the shortest correct
    // way to turn one into bytes, and it makes no network request.
    const blob = await (await fetch(dataUrl)).blob();
    // Pre-Storage avatars were whatever the camera produced, so the type may
    // be one the bucket refuses. downscale() re-encodes to JPEG regardless;
    // naming it here keeps validate() from rejecting the file before it gets
    // the chance.
    const type = MIME_TYPES.includes(blob.type) ? blob.type : "image/jpeg";
    const file = new File([blob], "avatar", { type });
    // No previousUrl: a data: URL has no object behind it to delete.
    return await uploadAvatar(userId, file);
  } catch (e) {
    console.warn("[avatar] Could not migrate the local picture:", e);
    return { ok: false, message: "Couldn't move your saved picture to your account." };
  }
}
