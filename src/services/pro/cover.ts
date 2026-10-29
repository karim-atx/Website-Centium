import { supabase } from "../../../lib/supabase/client";
import { stripPrivateExif } from "../storage/exif";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { stageAndSubmit } from "../moderation/images";

// Release B · the professional's cover photo (W6C-3, MO14 "Photo and cover";
// Database 20261217070000): the PUBLIC bucket professional-covers (5 MB,
// JPEG / PNG / WebP) and professional_profiles.cover_url (500 max, in the
// owner's UPDATE grant; professional_public_profile and professional_by_handle
// return it).
//
// ROUND C RELEASE 2 (Database 20261221040000): a new cover waits for an
// admin. It is resized and EXIF-stripped here as before, then staged in the
// private image-staging bucket and submitted as professional_cover; on
// approval the Database copies it into professional-covers at the same path
// and writes cover_url itself. This module only writes cover_url to clear it
// (Remove cover). The size is the cover's own: drawn full width, so up to
// 1600 px on its long edge.

const BUCKET = "professional-covers";
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

/** The `accept` attribute for a cover picker (a hint; submitCover decides). */
export const COVER_ACCEPT = [...MIME_TYPES, ".jpg", ".jpeg", ".png", ".webp"].join(",");

export type CoverResult = { ok: true } | { ok: false; message: string };

const from = (table: string) => supabase.from(table as never);

/** The caller's cover_url, or null (none, or no professional_profiles row yet). */
export async function fetchMyCoverUrl(me: string): Promise<{ ok: true; url: string | null } | { ok: false; offline: boolean }> {
  try {
    const { data, error } = await from("professional_profiles").select("cover_url").eq("profile_id", me).maybeSingle();
    if (error) return { ok: false, offline: isOffline(error) };
    const url = (data as { cover_url?: string | null } | null)?.cover_url ?? null;
    return { ok: true, url: url || null };
  } catch (e) {
    return { ok: false, offline: isOffline(e) };
  }
}

/** The object path a public cover URL points at, only inside the caller's own folder. */
function pathFromPublicUrl(url: string | null | undefined, me: string): string | null {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const path = decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
  return path.startsWith(`${me}/`) ? path : null;
}

/** At most MAX_EDGE_PX on the long edge, re-encoded as JPEG. Never throws: a decode failure keeps the original (EXIF is still stripped after). */
async function downscale(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
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
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    return blob ? new File([blob], "cover.jpg", { type: "image/jpeg" }) : file;
  } catch (e) {
    console.warn("[cover] Could not resize the image, uploading as picked:", e);
    return file;
  }
}

export function validateCover(file: Pick<File, "type" | "size">): string | null {
  if (!MIME_TYPES.includes(file.type)) return "Cover photos need to be a JPEG, PNG or WebP.";
  if (file.size > MAX_BYTES) return "That image is too large. Pick one under 5 MB.";
  return null;
}

/** Clears cover_url on the caller's own row; false when there is no row to write. */
async function clearCoverUrl(me: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { data, error } = await from("professional_profiles").update({ cover_url: null } as never).eq("profile_id", me).select("profile_id");
    if (error) return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't save your cover photo. Try again." };
    if (!(data ?? []).length) return { ok: false, message: "Finish setting up your profile first, then add a cover." };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't save your cover photo. Try again." };
  }
}

/**
 * Sends a new cover for approval (submit_image 'professional_cover', the
 * record being the caller's own professional_profiles row, which must exist).
 * cover_url is left alone: the approved cover stays up until this one is
 * approved, and a newer submission replaces a pending one.
 */
export async function submitCover(me: string, file: File): Promise<CoverResult> {
  const invalid = validateCover(file);
  if (invalid) return { ok: false, message: invalid };

  const stripped = await stripPrivateExif(await downscale(file));
  // A thrown error (a dropped connection, an unreadable answer) is a failed
  // upload too, never a picker stuck on "Uploading…".
  try {
    const r = await stageAndSubmit(me, "professional_cover", me, stripped);
    return r.ok ? { ok: true } : { ok: false, message: r.message };
  } catch (e) {
    console.error("[cover] Could not send the cover:", e);
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "That photo couldn't be uploaded. Check your connection and try again." };
  }
}

/** Removes the cover: the row first (the truth), then the file. */
export async function removeCover(me: string, currentUrl: string | null | undefined): Promise<{ ok: true } | { ok: false; message: string }> {
  const written = await clearCoverUrl(me);
  if (!written.ok) return written;
  const path = pathFromPublicUrl(currentUrl, me);
  if (path) {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.warn("[cover] Could not delete the stored cover:", error.message);
  }
  return { ok: true };
}
