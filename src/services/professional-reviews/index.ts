import { supabase } from "../../../lib/supabase/client";

// Reviews clients leave for professionals: the real professional_reviews rows.
//
// WHAT THIS REPLACES. `professionalReviews` was a localStorage array keyed by
// whatever string the calling screen happened to use. ProfessionalDetail keyed
// on the directory id; the client's "Your professional" card keyed on the
// literal string "me", and the professional's own Profile read that SAME "me"
// key back — from their own device. So the feature only appeared to work when
// the client and the professional were the same browser profile. A client
// rating their coach was writing a note to themselves.
//
// "my-business" IS GONE and was never real: nothing in the app ever wrote it,
// so the business dashboard's rating tile read undefined forever. Business
// reviews are out of scope here by decision, not by oversight.
//
// THE GATE IS THE DATABASE'S, NOT THIS FILE'S. The INSERT policy calls
// can_review_professional(auth.uid(), professional_id), which requires a
// professional_clients row joining the two — deliberately WITHOUT a
// disconnected_at filter, so somebody who has since left can still review the
// person they worked with. A stranger's insert is refused by RLS, and this
// file's job is to turn that refusal into a sentence rather than a code.
//
// ONE REVIEW PER PAIR: professional_reviews_one_per_pair_idx is unique on
// (professional_id, reviewer_id), so a second insert is 23505. Callers edit
// the existing row instead, which is what the screens already offer.
//
// REVIEWER NAMES ARE NOT AVAILABLE, and that is structural rather than a gap
// this file can work around. `profiles` is own-row only,
// public_profile_summary covers professional and business accounts and
// deliberately excludes customers, and related_profile_summary covers only
// your own current relationships. A client browsing a listing therefore cannot
// resolve another client's first name by any path, and a professional can
// resolve only their still-connected clients. Reviews are attributed to
// "A client" where a name will not resolve — inventing one, or falling back to
// a mock name, would be putting words in a stranger's mouth. Showing real
// first names to strangers would need a new view or a widened grant, which is
// a schema decision.

export interface ReviewRow {
  id: string;
  professionalId: string;
  reviewerId: string;
  rating: number;
  /** Null when never written, and also when the review has been redacted. */
  body: string | null;
  createdAt: string;
  /** Set by a trigger on the first rating/body change — never written here. */
  editedAt: string | null;
  redactedAt: string | null;
  redactionReason: string | null;
  /** Resolved where the reader is allowed to; null means "A client". */
  reviewerName: string | null;
}

export type ReviewsResult = { ok: true; reviews: ReviewRow[] } | { ok: false; message: string };
export type WriteResult = { ok: true; review: ReviewRow } | { ok: false; message: string };

// redacted_body and redacted_by are absent on purpose: no client role holds a
// SELECT grant on either, so asking for them turns the whole read into a 42501.
const COLUMNS =
  "id, professional_id, reviewer_id, rating, body, created_at, edited_at, redacted_at, redaction_reason";

type Row = {
  id: string;
  professional_id: string;
  reviewer_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  redacted_at: string | null;
  redaction_reason: string | null;
};

type PgError = { message: string; code?: string } | null;
type OneRow = PromiseLike<{ data: Row | null; error: PgError }>;
type ManyRows = PromiseLike<{ data: Row[] | null; error: PgError }>;

/**
 * The table as this file uses it.
 *
 * professional_reviews IS ABSENT FROM database.types.ts ENTIRELY — the table
 * is newer than the last regeneration, exactly as calendar_event_invitees and
 * ambassador_grants are. The queries are real; only the typing is missing, so
 * the client is cast here rather than the generated file being hand-edited,
 * which the next regeneration would silently undo. Only the call shapes this
 * file actually makes are described, so a typo in a chain is still a compile
 * error rather than an `any` swallowing it.
 */
type ReviewsTable = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string
    ) => {
      eq: (column: string, value: string) => { maybeSingle: () => OneRow };
      order: (column: string, options: { ascending: boolean }) => ManyRows;
    };
  };
  insert: (row: {
    professional_id: string;
    reviewer_id: string;
    rating: number;
    body: string | null;
  }) => { select: (columns: string) => { single: () => OneRow } };
  update: (row: { rating: number; body: string | null }) => {
    eq: (column: string, value: string) => { select: (columns: string) => { single: () => OneRow } };
  };
  delete: () => { eq: (column: string, value: string) => PromiseLike<{ error: PgError }> };
};

const reviews = (): ReviewsTable =>
  (supabase as unknown as { from: (table: "professional_reviews") => ReviewsTable }).from(
    "professional_reviews"
  );

const toReview = (r: Row, name: string | null = null): ReviewRow => ({
  id: r.id,
  professionalId: r.professional_id,
  reviewerId: r.reviewer_id,
  rating: r.rating,
  body: r.body,
  createdAt: r.created_at,
  editedAt: r.edited_at,
  redactedAt: r.redacted_at,
  redactionReason: r.redaction_reason,
  reviewerName: name,
});

/**
 * Whatever first names this reader is permitted to see.
 *
 * BEST EFFORT BY DESIGN. related_profile_summary answers only for people the
 * caller is currently connected to, so a professional gets their active
 * clients' names and nothing else, and a client browsing a listing gets none.
 * A failure here is not a failure of the read: the reviews still render, just
 * without names, which is the same thing that happens when the relationship
 * has ended.
 */
async function resolveNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("related_profile_summary").select("id, first_name").in("id", ids);
  return new Map(
    (data ?? [])
      .filter((p): p is { id: string; first_name: string } => !!p.id && !!p.first_name?.trim())
      .map((p) => [p.id, p.first_name.trim()])
  );
}

function describe(error: { message?: string; code?: string }): string {
  const code = error.code ?? "";
  // 42501 is the RLS refusal on insert, and it has exactly one cause here: the
  // WITH CHECK ran can_review_professional and got false.
  if (code === "42501") {
    return "You can only review a professional you've worked with.";
  }
  if (code === "23505") {
    return "You've already reviewed this professional — edit your review instead.";
  }
  if (code === "23514") {
    return "A review needs a rating from 1 to 5.";
  }
  if (/jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to leave a review.";
  }
  return "Couldn't save your review. Try again.";
}

/**
 * Whether the signed-in account may review this professional.
 *
 * ASKED BEFORE SHOWING THE CONTROL, so somebody who cannot review is not
 * offered a form that will be refused on submit. The same function backs the
 * INSERT policy, so this is a preview of the real decision rather than a
 * second, drifting copy of the rule — but the policy is still what enforces
 * it, and describe() above handles the case where the two disagree because
 * the relationship changed mid-session.
 */
export async function canReviewProfessional(reviewerId: string, professionalId: string): Promise<boolean> {
  const client = supabase as unknown as {
    rpc: (
      fn: "can_review_professional",
      args: { p_reviewer: string; p_professional: string }
    ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  };

  const { data, error } = await client.rpc("can_review_professional", {
    p_reviewer: reviewerId,
    p_professional: professionalId,
  });

  if (error) {
    console.warn("[reviews] Could not check review eligibility:", error.message);
    return false;
  }
  return data === true;
}

/**
 * Every review of this professional that the caller is allowed to see.
 *
 * THE POLICY DOES THE FILTERING, not a WHERE clause here.
 * professional_reviews_select_visible admits a row when the caller wrote it,
 * when the caller IS the professional, or when the review is unredacted and
 * the professional is listed publicly. So a stranger reading a listed
 * professional gets the public set with redacted rows already removed, and
 * asking for `redacted_at is null` on top would only hide a redaction from the
 * two people entitled to know about it.
 *
 * ANON GETS NOTHING FROM HERE, which is correct and worth stating: `anon` has
 * no grant on this table at all — not even SELECT — so a signed-out reader
 * sees the aggregate from public_professional_directory and no bodies. That
 * split is the grant's doing, not a branch in this code.
 */
export async function fetchReviewsFor(professionalId: string): Promise<ReviewsResult> {
  const { data, error } = await reviews()
    .select(COLUMNS)
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reviews] Could not read reviews:", error.message);
    return { ok: false, message: "Couldn't load reviews right now." };
  }

  const rows = (data ?? []) as Row[];
  const names = await resolveNames(rows.map((r) => r.reviewer_id));
  return { ok: true, reviews: rows.map((r) => toReview(r, names.get(r.reviewer_id) ?? null)) };
}

/**
 * Reviews written ABOUT the signed-in professional.
 *
 * The same table read from the other side: the SELECT policy's
 * `auth.uid() = professional_id` branch, which carries no redaction filter —
 * a professional can see that one of their reviews was redacted even though
 * its body is gone.
 */
export async function fetchReviewsAboutMe(userId: string): Promise<ReviewsResult> {
  return fetchReviewsFor(userId);
}

/** This account's own review of one professional, or null. */
export async function fetchMyReviewOf(
  reviewerId: string,
  professionalId: string
): Promise<{ ok: true; review: ReviewRow | null } | { ok: false; message: string }> {
  const { data, error } = await reviews()
    .select(COLUMNS)
    .eq("professional_id", professionalId)
    .eq("reviewer_id", reviewerId)
    .maybeSingle();

  if (error) {
    console.error("[reviews] Could not read your review:", error.message);
    return { ok: false, message: "Couldn't load your review right now." };
  }
  return { ok: true, review: data ? toReview(data as Row) : null };
}

/**
 * Leaves a review.
 *
 * reviewer_id IS IN THE PAYLOAD because the INSERT grant includes it and the
 * policy checks `auth.uid() = reviewer_id` — the column has no default, so
 * omitting it is a NOT NULL violation rather than an implicit self-reference.
 * An empty body is stored as null: the body CHECK requires at least one
 * non-blank character when it is present, so "" would be rejected outright.
 */
export async function createReview(
  reviewerId: string,
  professionalId: string,
  rating: number,
  body: string
): Promise<WriteResult> {
  const { data, error } = await reviews()
    .insert({
      professional_id: professionalId,
      reviewer_id: reviewerId,
      rating,
      body: body.trim() || null,
    })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    console.error("[reviews] Could not create the review:", error?.message);
    return { ok: false, message: error ? describe(error) : "Couldn't save your review. Try again." };
  }
  return { ok: true, review: toReview(data as Row) };
}

/**
 * Edits an existing review.
 *
 * ONLY rating AND body ARE SENT, which is all the UPDATE grant covers.
 * edited_at is stamped by professional_reviews_stamp_edited_at when either
 * actually changes — so the "edited" label the UI shows is the database's
 * judgement about whether something changed, not the client's.
 */
export async function updateReview(reviewId: string, rating: number, body: string): Promise<WriteResult> {
  const { data, error } = await reviews()
    .update({ rating, body: body.trim() || null })
    .eq("id", reviewId)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    console.error("[reviews] Could not update the review:", error?.message);
    return { ok: false, message: error ? describe(error) : "Couldn't save your review. Try again." };
  }
  return { ok: true, review: toReview(data as Row) };
}

/**
 * Deletes this account's own review.
 *
 * Filtered by id alone: the DELETE policy already requires
 * `auth.uid() = reviewer_id`, so somebody else's review matches nothing.
 */
export async function deleteReview(reviewId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await reviews().delete().eq("id", reviewId);
  if (error) {
    console.error("[reviews] Could not delete the review:", error.message);
    return { ok: false, message: "Couldn't delete your review. Try again." };
  }
  return { ok: true };
}
