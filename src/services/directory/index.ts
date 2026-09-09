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
}

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
    .select(
      "profile_id, first_name, avatar_url, professional_subtype, specialty, location, bio, monthly_rate, consultation_rate, payment_modalities"
    )
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[directory] Could not read the directory:", error.message);
    return { ok: false, message: describe(error) };
  }

  const listings: DirectoryListing[] = (data ?? [])
    // Every column on a view is nullable to the type generator. profile_id is
    // the one that must be real — it is the route target — so a row without
    // one is dropped rather than rendered as an unclickable card.
    .filter((r): r is typeof r & { profile_id: string } => !!r.profile_id)
    .map((r) => ({
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
    }));

  return { ok: true, listings };
}

/** One listing by account id, for the detail screen. */
export async function fetchListing(profileId: string): Promise<DirectoryListing | null> {
  const result = await fetchPublicDirectory();
  if (!result.ok) return null;
  return result.listings.find((l) => l.profileId === profileId) ?? null;
}
