import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { Enums } from "../../../lib/supabase/database.types";

// What a client may read about a professional they have actually hired.
//
// SEPARATE FROM services/directory, WHICH IS DISCOVERY. That one reads
// `public_professional_directory` and answers "who could I hire", which only
// contains professionals with `listed_publicly = true`. This answers "who did
// I hire", and connection is its own basis for access — a professional who
// never advertises is still the one this client is sharing health data with.
// Reading a connected professional from the directory would show a bio for the
// ones who happen to advertise and nothing for the rest.
//
// The view carries no phone, website, socials or rates. Those are what the
// directory gate deliberately un-published, and being connected is not a
// reason to hand them back. See the migration for the full reasoning.

export interface ConnectedProfessional {
  id: string;
  firstName: string | null;
  avatarUrl: string | null;
  subtype: Enums<"professional_subtype"> | null;
  bio: string | null;
  specialty: string | null;
  location: string | null;
}

export type ConnectedProfessionalResult =
  | { ok: true; professional: ConnectedProfessional | null }
  | { ok: false; message: string };

/**
 * Whether the caller is currently an active client of this professional.
 *
 * A STRICT BOOLEAN, WHICH IS WHY IT DOES NOT REUSE fetchConnectedProfessional.
 * That one reads `connected_professional_summary`, whose null result means
 * either "not connected" OR "connected, but they have no professional_profiles
 * row" — the view inner-joins it. For rendering a profile that ambiguity is
 * harmless, because both cases render the same sheet. For deciding whether
 * someone is a client it is exactly the wrong shape: it would report an active
 * relationship as absent whenever the professional had never filled anything
 * in.
 *
 * `active_professional_clients` has no such join. It is
 * `professional_clients WHERE disconnected_at IS NULL`, so a row means active
 * and no row means not, with nothing else able to remove one.
 *
 * SCOPED BY RLS, NOT BY A client_id FILTER. The view is already restricted to
 * the caller's own relationships, which is why this filters on
 * professional_id alone — adding `client_id = auth.uid()` here would duplicate
 * a policy in a predicate and quietly diverge from it later.
 *
 * `head: true` WITH AN EXACT COUNT, because the row's contents are not wanted.
 * The unique partial index on (professional_id, client_id) where
 * disconnected_at is null means the answer is 0 or 1.
 *
 * FAILS TO FALSE, AND THAT DIRECTION IS DELIBERATE. A failed check renders the
 * page as not-connected, which understates the relationship rather than
 * asserting one that may not exist — showing "Client since" or a review card
 * on the strength of a request that did not answer is the worse error.
 */
export async function isActiveClientOf(professionalId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("active_professional_clients")
    .select("id", { count: "exact", head: true })
    .eq("professional_id", professionalId);

  if (error) {
    console.error("[connected-professional] Could not check relationship:", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

/**
 * Profile detail for one professional the caller is an active client of.
 *
 * `professional: null` MEANS "NO ROW", NOT "FAILED". The view returns nothing
 * when the relationship is not active, and also when the professional has no
 * `professional_profiles` row at all — an account can be a professional
 * without ever having filled anything in. Both are ordinary states rather than
 * errors, and the caller renders the sheet either way; only the detail is
 * missing.
 */
export async function fetchConnectedProfessional(
  professionalId: string
): Promise<ConnectedProfessionalResult> {
  const { data, error } = await supabase
    .from("connected_professional_summary")
    .select("id, first_name, avatar_url, professional_subtype, bio, specialty, location")
    .eq("id", professionalId)
    .maybeSingle();

  if (error) {
    console.error("[connected-professional] Could not load profile:", error.message);
    return {
      ok: false,
      message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't load their profile.",
    };
  }
  if (!data) return { ok: true, professional: null };

  return {
    ok: true,
    professional: {
      id: data.id!,
      firstName: data.first_name,
      avatarUrl: data.avatar_url,
      subtype: data.professional_subtype,
      bio: data.bio,
      specialty: data.specialty,
      location: data.location,
    },
  };
}
