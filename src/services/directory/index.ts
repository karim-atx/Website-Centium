import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums } from "../../../lib/supabase/database.types";
import type { PaymentModality } from "../professional-profile";

// The client-facing Explore directory.
//
// The one genuinely PUBLIC read in this app. Everything else a professional
// can see about a client is relationship-gated; this is the opposite
// direction — a professional choosing to be found by strangers — and
// `public_professional_directory` is granted to `anon` accordingly.
//
// What makes that safe is the view, not this file. It returns only rows with
// `listed_publicly = true`, a column that defaults to false and cannot be set
// by an affiliated professional, and it excludes `phone`,
// `affiliated_business_id` and `certification_url` entirely. Before that
// migration the same view had no WHERE clause at all and published every
// professional's contact details to anyone holding the anon key — which ships
// in this bundle. Nothing here should ever reach past the view to
// `professional_profiles` directly.

export interface DirectoryListing {
  /** profiles.id — the real account, and what ProfessionalDetail routes on. */
  profileId: string;
  name: string;
  avatarUrl: string | null;
  subtype: Enums<"professional_subtype"> | null;
  specialty: string | null;
  location: string | null;
  bio: string | null;
  monthlyRate: number | null;
  consultationRate: number | null;
  paymentModalities: PaymentModality[];
  /** From professional_rating_summary, via the view. Null until reviewed. */
  averageRating: number | null;
  reviewCount: number;
}

const LISTING_COLUMNS =
  "profile_id, first_name, avatar_url, professional_subtype, specialty, location, bio, monthly_rate, consultation_rate, payment_modalities, average_rating, review_count";

/**
 * The view's row as it actually is.
 *
 * average_rating and review_count ARE NOT IN database.types.ts: the view
 * gained them when professional_rating_summary was added, and the generated
 * file predates that. The columns are real — the view is security_invoker
 * =false and owned by postgres, which is how `anon` reads an aggregate over a
 * table it holds no grant on — so the response is cast here rather than the
 * generated file being hand-edited, which the next regeneration would undo.
 * Same treatment calendar_events.attachment_path already gets.
 */
type DirectoryRow = {
  profile_id: string | null;
  first_name: string | null;
  avatar_url: string | null;
  subtype?: never;
  professional_subtype: Enums<"professional_subtype"> | null;
  specialty: string | null;
  location: string | null;
  bio: string | null;
  monthly_rate: number | null;
  consultation_rate: number | null;
  payment_modalities: PaymentModality[] | null;
  average_rating: number | null;
  review_count: number | null;
};

const toListing = (r: DirectoryRow & { profile_id: string }): DirectoryListing => ({
  profileId: r.profile_id,
  name: r.first_name?.trim() || "Professional",
  avatarUrl: r.avatar_url,
  subtype: r.professional_subtype,
  specialty: r.specialty,
  location: r.location,
  bio: r.bio,
  monthlyRate: r.monthly_rate,
  consultationRate: r.consultation_rate,
  paymentModalities: r.payment_modalities ?? [],
  averageRating: r.average_rating,
  reviewCount: r.review_count ?? 0,
});

export type DirectoryResult =
  | { ok: true; listings: DirectoryListing[] }
  | { ok: false; message: string };

function describe(error: PostgrestError): string {
  if (/jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to browse professionals.";
  }
  return "Could not load professionals right now.";
}

/**
 * Every professional who has opted into being listed.
 *
 * Returns `ok: false` on failure rather than an empty array, because the two
 * mean opposite things to the screen: an empty directory is the expected
 * steady state until professionals opt in and deserves a calm empty state,
 * while a failed request deserves to say so. Collapsing them would render
 * "no professionals yet" over a network error.
 */
export async function fetchPublicDirectory(): Promise<DirectoryResult> {
  const { data, error } = await supabase
    .from("public_professional_directory")
    .select(LISTING_COLUMNS)
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[directory] Could not read the directory:", error.message);
    return { ok: false, message: describe(error) };
  }

  const listings: DirectoryListing[] = ((data ?? []) as unknown as DirectoryRow[])
    // Every column on a view is nullable to the type generator. profile_id is
    // the one that must be real — it is the route target — so a row without
    // one is dropped rather than rendered as an unclickable card.
    .filter((r): r is DirectoryRow & { profile_id: string } => !!r.profile_id)
    .map(toListing);

  return { ok: true, listings };
}

/**
 * One listing by account id, for the detail screen.
 *
 * A TARGETED READ, not a scan of the whole directory as it used to be. That
 * mattered little when a listing was static, but average_rating and
 * review_count move: the detail screen re-reads this after every review write
 * to show the new aggregate, and pulling every professional in the country to
 * find one of them each time is not the shape for that.
 *
 * Still no ok/err distinction here, matching the caller's existing handling:
 * this screen treats a missing listing and a failed read the same way, because
 * both end at "Professional not found" and the row may genuinely not exist.
 */
export async function fetchListing(profileId: string): Promise<DirectoryListing | null> {
  const { data, error } = await supabase
    .from("public_professional_directory")
    .select(LISTING_COLUMNS)
    .eq("profile_id", profileId)
    .maybeSingle();

  const row = data as unknown as DirectoryRow | null;
  if (error || !row?.profile_id) {
    if (error) console.error("[directory] Could not read the listing:", error.message);
    return null;
  }
  return toListing(row as DirectoryRow & { profile_id: string });
}
