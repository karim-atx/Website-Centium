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
