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
// REVIEWER NAMES ARE OPT-IN NOW, which is the change migration 20260918200000
// made and the reason this file was rewritten. It used to be that no name
// could reach a stranger at all: `profiles` is own-row only,
// public_profile_summary excludes customers, and related_profile_summary
// covers only your own current relationships. That still holds — but
// reviewer_name_visible plus review_author_names() gives an author a way to
// put their own first name on a specific review, and only the ones they chose.
//
// THE TOGGLE IS NOT ANONYMITY, and the UI says so rather than implying
// otherwise. A professional can still resolve an active client's name through
// the relationship, so what the toggle controls is whether the name appears to
// everyone ELSE reading the listing. Calling it "post anonymously" would be a
// promise this schema does not keep.

export interface ReviewRow {
  id: string;
  professionalId: string;
  rating: number;
  /** Null when never written, and also when the review has been redacted. */
  body: string | null;
  createdAt: string;
  /** Set by a trigger on the first rating/body change — never written here. */
  editedAt: string | null;
  redactedAt: string | null;
  redactionReason: string | null;
  /**
   * Null for a reader who is neither the author nor the reviewed
   * professional — see the view note below. Distinct from "no review".
   */
  reviewerId: string | null;
  /** The author chose to show their first name on this review. */
  reviewerNameVisible: boolean;
  /** Resolved where the reader is allowed to; null means "A client". */
  reviewerName: string | null;
}

export type ReviewsResult = { ok: true; reviews: ReviewRow[] } | { ok: false; message: string };
export type WriteResult = { ok: true; review: ReviewRow } | { ok: false; message: string };

// READ COLUMNS, FROM THE VIEW. reviewer_id is in here because the VIEW
// computes it per caller; naming it against the base table is what broke.
// redacted_body and redacted_by stay out for the original reason: no client
// role holds a SELECT grant on either.
const READ_COLUMNS =
  "id, professional_id, reviewer_id, rating, body, reviewer_name_visible, created_at, edited_at, redacted_at, redaction_reason";

// WHAT A WRITE MAY ASK FOR BACK, which is not the same list. A write goes to
// the base table, and `reviewer_id` is no longer in that table's SELECT grant
// — so a returning clause naming it fails with 42501 even though the INSERT
// itself is allowed to set it. The caller is the author, so the id is filled
// in from what they already know rather than asked for.
const WRITE_RETURN_COLUMNS =
  "id, professional_id, rating, body, reviewer_name_visible, created_at, edited_at, redacted_at, redaction_reason";

type Row = {
  id: string;
  professional_id: string;
  /** Absent on a write's returning clause; per-caller on the view. */
  reviewer_id?: string | null;
  rating: number;
  body: string | null;
  reviewer_name_visible: boolean;
  created_at: string;
  edited_at: string | null;
  redacted_at: string | null;
  redaction_reason: string | null;
};

type PgError = { message: string; code?: string } | null;
type OneRow = PromiseLike<{ data: Row | null; error: PgError }>;
type ManyRows = PromiseLike<{ data: Row[] | null; error: PgError }>;

/**
 * READS GO TO THE VIEW, WRITES GO TO THE TABLE, and the split is not a style
 * choice — it is the whole fix.
 *
 * Migration 20260918200000 revoked the role-wide SELECT on
 * professional_reviews.reviewer_id to narrow reviewer anonymity. Every read in
 * this file named that column, and one of them filtered on it, so the entire
 * read/write path started failing with 42501 — including the returning clause
 * on inserts, which is why writes broke too despite reviewer_id still being in
 * the INSERT grant.
 *
 * professional_reviews_readable exposes the same column names, but reviewer_id
 * comes from review_reviewer_id(id): a SECURITY DEFINER function that returns
 * the id only to the review's author or the reviewed professional, and NULL to
 * everyone else. The view itself is security_invoker = true, so row visibility
 * is still decided by professional_reviews_select_visible on the base table —
 * the same policy as before. Only the column's resolution changed.
 *
 * NEITHER IS IN database.types.ts, as with the base table before them, so both
 * are cast to exactly the call shapes this file makes.
 */
type ReviewsView = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string
    ) => {
      eq: (column: string, value: string) => { maybeSingle: () => OneRow };
      order: (column: string, options: { ascending: boolean }) => ManyRows;
    };
  };
};

type ReviewsTable = {
  insert: (row: {
    professional_id: string;
    reviewer_id: string;
    rating: number;
    body: string | null;
    reviewer_name_visible: boolean;
  }) => { select: (columns: string) => { single: () => OneRow } };
  update: (row: { rating: number; body: string | null; reviewer_name_visible: boolean }) => {
    eq: (column: string, value: string) => { select: (columns: string) => { single: () => OneRow } };
  };
  delete: () => { eq: (column: string, value: string) => PromiseLike<{ error: PgError }> };
};

/** Reads only. */
const reviewsReadable = (): ReviewsView =>
  (
    supabase as unknown as { from: (view: "professional_reviews_readable") => ReviewsView }
  ).from("professional_reviews_readable");

/** Writes only. */
const reviews = (): ReviewsTable =>
  (supabase as unknown as { from: (table: "professional_reviews") => ReviewsTable }).from(
    "professional_reviews"
  );

const toReview = (
  r: Row,
  name: string | null = null,
  reviewerId: string | null = r.reviewer_id ?? null
): ReviewRow => ({
  id: r.id,
  professionalId: r.professional_id,
  reviewerId,
  rating: r.rating,
  body: r.body,
  createdAt: r.created_at,
  editedAt: r.edited_at,
  redactedAt: r.redacted_at,
  redactionReason: r.redaction_reason,
  reviewerNameVisible: r.reviewer_name_visible,
  reviewerName: name,
});

/**
 * First names for exactly the reviews being shown.
 *
 * TWO PATHS, AND THEY MEAN DIFFERENT THINGS.
 *
 * review_author_names(ids) is the opt-in one: SECURITY DEFINER, returning a
 * name only where the author set reviewer_name_visible on THAT review. It
 * answers for any authenticated caller, which is the point — opting in is what
 * makes the name public on that review, and it is scoped per review rather
 * than per person, so the same author stays unnamed on the ones they did not
 * opt into.
 *
 * related_profile_summary is the pre-existing one, and it is why the toggle's
 * label does not say "anonymous": a professional can still resolve an ACTIVE
 * client's name from the relationship itself. That only works when reviewerId
 * resolved at all, which the view now grants solely to the author and the
 * reviewed professional — so a stranger has no id to look up and gets nothing
 * from this path no matter who wrote the review.
 *
 * BATCHED OVER THE IDS ON SCREEN, matching how this file already resolved
 * names: one array in, one round trip, never a call per row.
 */
async function resolveNames(
  reviewIds: string[],
  reviewerIds: string[]
): Promise<{ byReview: Map<string, string>; byReviewer: Map<string, string> }> {
  const byReview = new Map<string, string>();
  const byReviewer = new Map<string, string>();
  if (reviewIds.length === 0) return { byReview, byReviewer };

  const rpc = supabase as unknown as {
    rpc: (
      fn: "review_author_names",
      args: { p_review_ids: string[] }
    ) => PromiseLike<{
      data: { review_id: string; first_name: string | null }[] | null;
      error: { message: string } | null;
    }>;
  };

  const opted = await rpc.rpc("review_author_names", { p_review_ids: reviewIds });
  if (opted.error) {
    // Not a failure of the read: the reviews still render, unnamed.
    console.warn("[reviews] Could not resolve opted-in names:", opted.error.message);
  }
  for (const row of opted.data ?? []) {
    const name = row.first_name?.trim();
    if (name) byReview.set(row.review_id, name);
  }

  if (reviewerIds.length > 0) {
    const { data } = await supabase
      .from("related_profile_summary")
      .select("id, first_name")
      .in("id", reviewerIds);
    for (const p of data ?? []) {
      const name = (p.first_name as string | null)?.trim();
      if (p.id && name) byReviewer.set(p.id as string, name);
    }
  }

  return { byReview, byReviewer };
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
  const { data, error } = await reviewsReadable()
    .select(READ_COLUMNS)
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reviews] Could not read reviews:", error.message);
    return { ok: false, message: "Couldn't load reviews right now." };
  }

  const rows = (data ?? []) as Row[];
  const { byReview, byReviewer } = await resolveNames(
    rows.map((r) => r.id),
    rows.map((r) => r.reviewer_id).filter((id): id is string => !!id)
  );

  return {
    ok: true,
    // The opt-in name wins where it exists; the relationship path fills in
    // only for a reader who could resolve the reviewer at all.
    reviews: rows.map((r) =>
      toReview(
        r,
        byReview.get(r.id) ?? (r.reviewer_id ? byReviewer.get(r.reviewer_id) ?? null : null)
      )
    ),
  };
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
  // THROUGH THE VIEW, INCLUDING THE FILTER. This .eq is the other half of the
  // break: filtering on reviewer_id against the base table needs SELECT on it,
  // which no client role has any more. On the view the column is the
  // per-caller function, and it resolves to exactly this account for exactly
  // this account's own review.
  const { data, error } = await reviewsReadable()
    .select(READ_COLUMNS)
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
  body: string,
  reviewerNameVisible: boolean
): Promise<WriteResult> {
  const { data, error } = await reviews()
    .insert({
      professional_id: professionalId,
      reviewer_id: reviewerId,
      rating,
      body: body.trim() || null,
      reviewer_name_visible: reviewerNameVisible,
    })
    .select(WRITE_RETURN_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[reviews] Could not create the review:", error?.message);
    return { ok: false, message: error ? describe(error) : "Couldn't save your review. Try again." };
  }
  // reviewerId is supplied rather than read back — the returning clause may
  // not name a column the caller has no SELECT on, and the caller is the
  // author, so it is the one id they can be certain of.
  return { ok: true, review: toReview(data as Row, null, reviewerId) };
}

/**
 * Edits an existing review.
 *
 * rating, body AND reviewer_name_visible ARE ALL THE UPDATE GRANT COVERS, and
 * all three are sent: the toggle is editable after the fact, so somebody can
 * take their name back off a review they already left. edited_at is stamped by
 * professional_reviews_stamp_edited_at when the rating or body actually
 * changes — the trigger ignores the toggle, so flipping only the name does not
 * mark the review as edited, which is right: the words did not change.
 */
export async function updateReview(
  reviewId: string,
  reviewerId: string,
  rating: number,
  body: string,
  reviewerNameVisible: boolean
): Promise<WriteResult> {
  const { data, error } = await reviews()
    .update({ rating, body: body.trim() || null, reviewer_name_visible: reviewerNameVisible })
    .eq("id", reviewId)
    .select(WRITE_RETURN_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[reviews] Could not update the review:", error?.message);
    return { ok: false, message: error ? describe(error) : "Couldn't save your review. Try again." };
  }
  return { ok: true, review: toReview(data as Row, null, reviewerId) };
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
