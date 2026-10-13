import { hostedImageUrl, storagePath } from "../venues/venueLogic";

// The business cover (business_profiles.cover_url). Pure, so both writers
// (onboarding Step 1 and the Business Profile page) and their tests share one
// rule.
//
// THE BUCKET. Database 20261120040000 added the public `business-covers`
// bucket (5 MB, JPEG / PNG / WebP), keyed <owner_uid>/<file>: segment 1 is the
// BUSINESS OWNER's uid even when somebody else uploads, because
// storage_object_owner() charges the file to that uid and the erasure sweep
// removes it with that account. Writes are allowed to an insider with the
// `marketing` permission (may_write_business_file).
//
// OLD COVERS KEEP DISPLAYING. Before that bucket existed covers went into
// `business-logos` as <uid>/cover-<id>.jpg. A stored value is read as it was
// written: a full http(s) URL is drawn as it is, a path whose file name starts
// with "cover-" is the old business-logos object, anything else is
// business-covers. New covers are <owner_uid>/<uuid>.jpg, never "cover-…".
// Venue covers (gyms.cover_url, gym-covers) are a different picture and are
// not handled here.

export const BUSINESS_COVER_BUCKET = "business-covers";
/** Where covers went before business-covers existed (<uid>/cover-<id>.jpg). */
export const LEGACY_COVER_BUCKET = "business-logos";

/** Which bucket a stored cover path lives in. */
export function coverBucketFor(path: string): typeof BUSINESS_COVER_BUCKET | typeof LEGACY_COVER_BUCKET {
  const file = path.split("/").pop() ?? "";
  return file.startsWith("cover-") ? LEGACY_COVER_BUCKET : BUSINESS_COVER_BUCKET;
}

/** A new cover's object path: <owner_uid>/<file>. */
export function coverObjectPath(ownerUid: string, fileId: string): string {
  return `${ownerUid}/${fileId}.jpg`;
}

/**
 * How to draw a stored cover: a hosted URL as it is, else the public URL of
 * the path in the bucket it was written to. `publicUrl` is the storage
 * client's getPublicUrl, passed in so this stays pure.
 */
export function coverUrlFor(value: string | null | undefined, publicUrl: (bucket: string, path: string) => string): string | null {
  const hosted = hostedImageUrl(value);
  if (hosted) return hosted;
  const p = storagePath(value);
  return p ? publicUrl(coverBucketFor(p), p) : null;
}

/**
 * The object a replaced or removed cover leaves behind, or null. A new-bucket
 * cover is removable under the OWNER's prefix (the insider delete policy); an
 * old business-logos cover only under the caller's own (that bucket's policy
 * is own-prefix). Never the object just written.
 */
export function coverToRemove(
  previous: string | null | undefined,
  owner: { ownerUid: string; callerUid: string },
  next = ""
): { bucket: string; path: string } | null {
  const p = storagePath(previous);
  if (!p || p === next) return null;
  const bucket = coverBucketFor(p);
  const first = p.split("/")[0];
  if (bucket === LEGACY_COVER_BUCKET ? first !== owner.callerUid : first !== owner.ownerUid) return null;
  return { bucket, path: p };
}
