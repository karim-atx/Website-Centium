import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { ImageSurface } from "./imageCopy";
import { latestApproval, parseApprovals, type ImageApproval } from "./imageModel";

// Every image others can see waits for an admin (Round C Release 2, Database
// 20261221040000). The one way an image reaches a public surface now:
//
//   1. upload to IMAGE-STAGING, a private bucket, at <your id>/<...>/<file>
//      (a venue photo at <your id>/<business id>/<file>);
//   2. submit_image(surface, record, path) opens a pending approval;
//   3. the record keeps its approved image (or none) until an admin approves;
//      then publish-approved-images copies the file into the surface's public
//      bucket at the same path and writes the column itself.
//
// So no caller writes an image column any more, and the uploader is shown
// their pending image from image-staging with a signed URL (my_image_approvals).
// Forum photos are the exception: attaching one opens its approval by itself.

const BUCKET = "image-staging";
const SIGN_SECONDS = 10 * 60;

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> };
const rpc = () => supabase as unknown as Rpc;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

const newName = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** A fresh staging path: <uid>/<surface>/<uuid>.<ext>, or <uid>/<business>/<uuid>.<ext> for a venue photo. */
export function stagingPath(uid: string, surface: ImageSurface, blob: Blob, businessId?: string): string {
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const folder = surface === "venue_photo" ? (businessId ?? "") : surface;
  return `${uid}/${folder}/${newName()}.${ext}`;
}

/** submit_image()'s refusals, as sentences. */
export function describeImageError(error: { code?: string; message?: string } | null | undefined): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  switch (error?.code ?? "") {
    case "ATX09":
      return "You can't change this photo. Ask the account's owner.";
    case "ATX02":
      return "You've sent a lot of photos in the last hour. Try again later.";
    case "ATX08":
      return "That photo didn't finish uploading. Choose it again.";
    default:
      return "Couldn't send that photo. Try again.";
  }
}

/** Step 1: the file into the caller's own folder of image-staging. */
export async function uploadToStaging(path: string, blob: Blob): Promise<Result<string>> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false, cacheControl: "3600" });
  if (error) {
    console.error("[images] Could not stage the photo:", error.message);
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't upload that photo. Try again." };
  }
  return { ok: true, value: path };
}

/** Step 2: open the approval. A newer submission replaces a pending one. */
export async function submitImage(surface: ImageSurface, recordId: string, path: string): Promise<Result<string>> {
  const { data, error } = await rpc().rpc("submit_image", { p_surface: surface, p_record_id: recordId, p_staging_path: path });
  if (error) {
    console.error("[images] submit_image refused:", error.code, error.message);
    return { ok: false, message: describeImageError(error), code: error.code };
  }
  return { ok: true, value: String(data) };
}

/**
 * Both steps, for a record that exists. The staged file is left in place on a
 * refused submit: it is private, and the 30-day sweep only covers decided
 * rows, so it is removed here.
 */
export async function stageAndSubmit(
  uid: string,
  surface: ImageSurface,
  recordId: string,
  blob: Blob,
  opts: { businessId?: string; path?: string } = {}
): Promise<Result<{ approvalId: string; path: string }>> {
  const path = opts.path ?? stagingPath(uid, surface, blob, opts.businessId);
  const up = await uploadToStaging(path, blob);
  if (!up.ok) return up;
  const sub = await submitImage(surface, recordId, path);
  if (!sub.ok) {
    void supabase.storage.from(BUCKET).remove([path]);
    return sub;
  }
  return { ok: true, value: { approvalId: sub.value, path } };
}

/** The caller's own submissions for one record (or surface), newest first. */
export async function myImageApprovals(surface: ImageSurface, recordId?: string | null): Promise<ImageApproval[]> {
  const { data, error } = await rpc().rpc("my_image_approvals", { p_surface: surface, p_record_id: recordId ?? null });
  if (error) {
    console.error("[images] Could not read my approvals:", error.message);
    return [];
  }
  return parseApprovals(data);
}

/** A signed URL for the uploader's own staged image (pending or rejected), or null. */
export async function stagedUrl(path: string): Promise<string | null> {
  // A preview that can't be signed is no preview: the badge and note still show.
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_SECONDS);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** The state an owner screen shows for one record's image, with the staged preview when there is one. */
export async function imageStateFor(surface: ImageSurface, recordId: string) {
  const a = latestApproval(await myImageApprovals(surface, recordId));
  if (!a || (a.status !== "pending" && a.status !== "rejected")) return null;
  return { ...a, url: await stagedUrl(a.stagingPath) };
}
