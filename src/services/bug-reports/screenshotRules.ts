// The bug-report screenshot's checks (Stage A1, bucket `bug-screenshots`).
// Pure, so they are tested on their own; the upload is in index.ts.
//
// MIRRORS THE BUCKET: private, 5 MB, image/jpeg|png|webp. The server refuses
// the same files either way; checking first is what lets the row say which
// limit and why, instead of a generic storage error after the upload.

export const SCREENSHOT_BUCKET = "bug-screenshots";
export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;
export const SCREENSHOT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const SCREENSHOT_ACCEPT = SCREENSHOT_TYPES.join(",");

export const SCREENSHOT_WRONG_TYPE = "Choose a JPEG, PNG or WebP image.";
export const SCREENSHOT_TOO_LARGE = "This screenshot is too large. Choose one under 5 MB.";

/** Why a picked file can't be attached, or null when it can. */
export function screenshotProblem(file: { type: string; size: number }): string | null {
  if (!(SCREENSHOT_TYPES as readonly string[]).includes(file.type)) return SCREENSHOT_WRONG_TYPE;
  if (file.size > SCREENSHOT_MAX_BYTES) return SCREENSHOT_TOO_LARGE;
  return null;
}

/**
 * `<uid>/<file>`, the shape the column CHECK and the storage policies require
 * (the first segment IS the authorisation). The file name is generated, never
 * the user's own: a picked file's name can carry personal details.
 */
export function screenshotPath(userId: string, id: string, extension = "jpg"): string {
  return `${userId}/${id}.${extension}`;
}

/** The column CHECK, `^[0-9a-f-]{36}/[^/]{1,200}$`, so a malformed path is caught before the insert. */
export const SCREENSHOT_PATH_SHAPE = /^[0-9a-f-]{36}\/[^/]{1,200}$/;
