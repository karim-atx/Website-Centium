// Whose onboarding draft is this? Pure (no React, no storage), so it is
// tested in node.
//
// The draft lives in localStorage so a sign-up can leave for the email
// confirmation and come back to the step it left. It used to be one
// ownerless key, so a second sign-up in the same browser resumed the first
// person's answers: name, sex, height, weight, goals and the date of birth,
// which LOCKS once saved (Database 20261009000000) and then needs support to
// correct. Now every saved draft records its owner, and a draft is only ever
// shown to that owner.

/** What is saved: the answers, the step by name, and whose they are. */
export interface StoredDraft<D> {
  /** The user id the draft belongs to; null = started before any account existed. */
  owner: string | null;
  /** True for a draft saved before owners were recorded (no owner known at all). */
  legacy: boolean;
  draft: Partial<D>;
  step: string | null;
}

/** Who is looking: the signed-in account, or nobody. */
export interface Viewer {
  userId: string | null;
  email: string | null;
}

export type Resolution<D> =
  | { use: true; draft: Partial<D>; step: string | null; owner: string | null }
  | { use: false };

const sameEmail = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Whether `viewer` may resume `stored`, and as whose.
 *
 * SIGNED OUT: only a draft started signed out (owner null) in this browser.
 * An account's draft, or an old ownerless one, is never shown to nobody.
 *
 * SIGNED IN:
 *   - their own draft (owner = their id): resumed.
 *   - another account's: never, discarded.
 *   - one started before an account existed (owner null): it carries into
 *     this account, which is the sign-up it was for, unless it names a
 *     DIFFERENT email than the one they signed in with.
 *   - an old ownerless draft from before this change: adopted ONLY when its
 *     email is this account's email. The auth step has always copied the
 *     signed-in email into the draft, so the user's own old draft carries
 *     it; one without an email, or with someone else's, is discarded. That is
 *     stricter than "nothing says it is someone else's", on purpose: the
 *     date of birth locks, so a wrong adoption costs a support ticket, while
 *     a wrong discard costs one re-typed form.
 */
export function resolveDraft<D extends { email?: string }>(
  stored: StoredDraft<D> | null,
  viewer: Viewer
): Resolution<D> {
  if (!stored) return { use: false };
  if (!viewer.userId) {
    return stored.owner === null && !stored.legacy
      ? { use: true, draft: stored.draft, step: stored.step, owner: null }
      : { use: false };
  }
  if (stored.owner !== null) {
    return stored.owner === viewer.userId
      ? { use: true, draft: stored.draft, step: stored.step, owner: viewer.userId }
      : { use: false };
  }
  const draftEmail = stored.draft.email;
  if (stored.legacy) {
    return sameEmail(draftEmail, viewer.email)
      ? { use: true, draft: stored.draft, step: stored.step, owner: viewer.userId }
      : { use: false };
  }
  if (draftEmail && draftEmail.trim() && !sameEmail(draftEmail, viewer.email)) return { use: false };
  return { use: true, draft: stored.draft, step: stored.step, owner: viewer.userId };
}

/** Parses the saved record; anything malformed reads as no draft. */
export function parseStoredDraft<D>(raw: string | null): StoredDraft<D> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<StoredDraft<D>> & { v?: number };
    if (v.v !== 2 || typeof v.draft !== "object" || v.draft === null) return null;
    return {
      owner: typeof v.owner === "string" ? v.owner : null,
      legacy: false,
      draft: v.draft,
      step: typeof v.step === "string" ? v.step : null,
    };
  } catch {
    return null;
  }
}

/** A draft saved by the old ownerless keys, as a legacy record. */
export function legacyStoredDraft<D>(rawDraft: string | null, rawStep: string | null): StoredDraft<D> | null {
  if (!rawDraft) return null;
  try {
    const draft = JSON.parse(rawDraft) as Partial<D>;
    if (typeof draft !== "object" || draft === null) return null;
    return { owner: null, legacy: true, draft, step: rawStep };
  } catch {
    return null;
  }
}
