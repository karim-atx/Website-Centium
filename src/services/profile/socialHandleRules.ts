// The member's own Instagram and X handles (profiles.instagram / profiles.x,
// Stage A1). Pure, so the format rules and the error sentences are tested on
// their own; the reads and writes are in socialHandles.ts.
//
// THE SAME PATTERNS AS THE COLUMN CHECKS (profiles_instagram_shape_check,
// profiles_x_shape_check). Checked here first so the field that is wrong can
// say why, instead of a generic refusal for the whole save. Stored WITHOUT the
// "@": the popup draws its own fixed prefix.

export const INSTAGRAM_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
export const X_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

export const INSTAGRAM_FORMAT = "Use up to 30 letters, numbers, dots or underscores.";
export const X_FORMAT = "Use up to 15 letters, numbers or underscores.";

export type SocialKind = "instagram" | "x";

export interface SocialHandles {
  instagram: string | null;
  x: string | null;
}

/** Trimmed, any leading "@" removed; "" means "not set". */
export const bareHandle = (handle: string | null | undefined): string => (handle ?? "").trim().replace(/^@+/, "");

/** The sentence for a malformed handle, or null when it is fine (an empty one is fine: it clears the field). */
export function handleProblem(kind: SocialKind, handle: string): string | null {
  const value = bareHandle(handle);
  if (!value) return null;
  if (kind === "instagram") return INSTAGRAM_PATTERN.test(value) ? null : INSTAGRAM_FORMAT;
  return X_PATTERN.test(value) ? null : X_FORMAT;
}

/** The value to store: bare, or null when empty. Assumes handleProblem() passed. */
export const storedHandle = (handle: string | null | undefined): string | null => bareHandle(handle) || null;

/**
 * Which field a refused save belongs to, and what to say.
 *
 * 23514 is a CHECK: the constraint name in the message says which column, so
 * the right field turns red. The UI blocks both shapes before the round trip,
 * so reaching this means the two drifted apart.
 */
export function describeHandleSaveError(
  code: string | undefined,
  message: string | undefined
): { field: SocialKind | null; message: string } {
  if (code === "23514") {
    if (/profiles_x_shape_check/.test(message ?? "")) return { field: "x", message: X_FORMAT };
    if (/profiles_instagram_shape_check/.test(message ?? "")) return { field: "instagram", message: INSTAGRAM_FORMAT };
  }
  if (code === "PGRST301" || /jwt|not authenticated/i.test(message ?? "")) {
    return { field: null, message: "Your session expired. Sign in again to save your handles." };
  }
  return { field: null, message: "Couldn't save your Instagram and X. Try again." };
}

/**
 * The one-time move of handles that were kept only on this device.
 *
 * Returns what to write to the account, or null when nothing should be
 * written. The account wins: if it already holds either handle, the device
 * copy is stale and is simply dropped. A malformed device value (the popup
 * validated before saving, so this is only an old or hand-edited cache) is
 * dropped rather than sent to be refused.
 */
export function legacyHandlesToMove(
  server: SocialHandles,
  local: { instagramHandle?: string | null; xHandle?: string | null }
): SocialHandles | null {
  if (server.instagram || server.x) return null;
  const instagram = handleProblem("instagram", local.instagramHandle ?? "") ? null : storedHandle(local.instagramHandle);
  const x = handleProblem("x", local.xHandle ?? "") ? null : storedHandle(local.xHandle);
  return instagram || x ? { instagram, x } : null;
}

/** https links for a client's handles, shown to their professional. */
export const instagramUrl = (handle: string) => `https://instagram.com/${encodeURIComponent(handle)}`;
export const xUrl = (handle: string) => `https://x.com/${encodeURIComponent(handle)}`;
