import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums } from "../../../lib/supabase/database.types";

// A professional's own `professional_profiles` row: the listing content, the
// rates, and the public-listing switch.
//
// Nothing in this app wrote this table before. Bio, rates and socials were
// edited into the local `user` object and persisted to localStorage only —
// `profiles` has no such columns — so a professional's listing content existed
// on exactly one device and no server ever saw it.

export type PaymentModality = Enums<"payment_modality">;

export interface ProfessionalProfile {
  bio: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  x: string | null;
  specialty: string | null;
  location: string | null;
  monthlyRate: number | null;
  consultationRate: number | null;
  paymentModalities: PaymentModality[];
  /** Read-only here. Written only by set_public_listing(). */
  listedPublicly: boolean;
  /** Read-only mirror of business_employees, maintained by a trigger. */
  affiliatedBusinessId: string | null;
}

/** The subset a client may write. Deliberately excludes the two above. */
export type ProfessionalProfilePatch = Partial<
  Omit<ProfessionalProfile, "listedPublicly" | "affiliatedBusinessId">
>;

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again.";
  }
  if (code === "42501") {
    return "That field can't be edited from here.";
  }
  return "Could not save your profile. Try again.";
}

type Row = {
  bio: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  x: string | null;
  specialty: string | null;
  location: string | null;
  monthly_rate: number | null;
  consultation_rate: number | null;
  payment_modalities: PaymentModality[] | null;
  listed_publicly: boolean;
  affiliated_business_id: string | null;
};

// One unbroken literal on purpose: supabase-js infers the row type from this
// string, and splitting it across a concatenation collapses that inference to
// GenericStringError and forces a cast at every call site.
const COLUMNS =
  "bio, website, instagram, facebook, x, specialty, location, monthly_rate, consultation_rate, payment_modalities, listed_publicly, affiliated_business_id";

const toProfile = (r: Row): ProfessionalProfile => ({
  bio: r.bio,
  website: r.website,
  instagram: r.instagram,
  facebook: r.facebook,
  x: r.x,
  specialty: r.specialty,
  location: r.location,
  monthlyRate: r.monthly_rate,
  consultationRate: r.consultation_rate,
  paymentModalities: r.payment_modalities ?? [],
  listedPublicly: r.listed_publicly,
  affiliatedBusinessId: r.affiliated_business_id,
});

export type ProfileResult =
  | { ok: true; profile: ProfessionalProfile | null }
  | { ok: false; message: string };

/**
 * The caller's own row, or null when they have never saved one.
 *
 * Null is a real answer, not an error: no professional has a row today, since
 * nothing ever inserted one. The toggle depends on telling those apart —
 * `set_public_listing()` raises "professional profile not found" against a
 * missing row, and a switch that errors because the user has not filled in a
 * form yet should say so rather than fail.
 */
export async function fetchMyProfile(userId: string): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from("professional_profiles")
    .select(COLUMNS)
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[professional-profile] Could not read profile:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, profile: data ? toProfile(data as Row) : null };
}

const toRow = (patch: ProfessionalProfilePatch) => ({
  ...(patch.bio !== undefined && { bio: patch.bio }),
  ...(patch.website !== undefined && { website: patch.website }),
  ...(patch.instagram !== undefined && { instagram: patch.instagram }),
  ...(patch.facebook !== undefined && { facebook: patch.facebook }),
  ...(patch.x !== undefined && { x: patch.x }),
  ...(patch.specialty !== undefined && { specialty: patch.specialty }),
  ...(patch.location !== undefined && { location: patch.location }),
  ...(patch.monthlyRate !== undefined && { monthly_rate: patch.monthlyRate }),
  ...(patch.consultationRate !== undefined && { consultation_rate: patch.consultationRate }),
  ...(patch.paymentModalities !== undefined && { payment_modalities: patch.paymentModalities }),
});

export type SaveResult = { ok: true; profile: ProfessionalProfile } | { ok: false; message: string };

/**
 * Update-then-insert, NOT `.upsert()`.
 *
 * PostgREST compiles upsert to INSERT ... ON CONFLICT DO UPDATE and writes
 * every column of the payload on the conflict path — including `profile_id`,
 * which identifies the row and is deliberately absent from the column-scoped
 * UPDATE grant. Postgres would refuse the whole statement with 42501 the
 * moment a row already existed, so the first save would appear to work and
 * every later one would fail. The same shape bit `setGrant` in
 * services/consent; see the note there.
 *
 * `listed_publicly` and `affiliated_business_id` are never sent. On INSERT the
 * guard trigger forces both to the truth anyway — false, and whatever
 * business_employees actually says — so sending them would be at best ignored
 * and at worst an attempt to walk around the gate.
 */
export async function saveMyProfile(
  userId: string,
  patch: ProfessionalProfilePatch
): Promise<SaveResult> {
  const row = toRow(patch);

  const updated = await supabase
    .from("professional_profiles")
    .update(row)
    .eq("profile_id", userId)
    .select(COLUMNS);

  if (updated.error) {
    console.error("[professional-profile] Could not update profile:", updated.error.message);
    return { ok: false, message: describe(updated.error) };
  }
  if (updated.data && updated.data.length > 0) {
    return { ok: true, profile: toProfile(updated.data[0] as Row) };
  }

  const inserted = await supabase
    .from("professional_profiles")
    .insert({ profile_id: userId, ...row })
    .select(COLUMNS)
    .single();

  if (inserted.error || !inserted.data) {
    console.error("[professional-profile] Could not create profile:", inserted.error?.message);
    return {
      ok: false,
      message: inserted.error ? describe(inserted.error) : "Could not save your profile.",
    };
  }
  return { ok: true, profile: toProfile(inserted.data as Row) };
}

export interface Affiliation {
  businessId: string;
  businessName: string;
}

/**
 * Which business the caller is affiliated with, if any.
 *
 * Read from `professional_profiles.affiliated_business_id` — the trigger-
 * maintained mirror of `business_employees` — and NOT by asking
 * `professional_is_affiliated()`, which is revoked from `authenticated` and
 * cannot be called from a browser. The business name comes from
 * `business_profiles`, which is readable by anon and authenticated alike.
 *
 * This is for EXPLAINING the disabled toggle, never for deciding whether the
 * write is allowed. That decision belongs to the database, which makes it
 * again on every write regardless of what this returned.
 */
export async function fetchMyAffiliation(businessId: string | null): Promise<Affiliation | null> {
  if (!businessId) return null;

  const { data, error } = await supabase
    .from("business_profiles")
    .select("id, business_name")
    .eq("id", businessId)
    .maybeSingle();

  if (error || !data) {
    console.error("[professional-profile] Could not read business name:", error?.message);
    // The affiliation is real even when its name will not load, so the toggle
    // must still be blocked — just without the name in the sentence.
    return { businessId, businessName: "your business" };
  }
  return { businessId: data.id, businessName: data.business_name };
}

export type SetListingResult =
  | { status: "ok"; listed: boolean }
  | { status: "affiliated" }
  | { status: "no_profile" }
  | { status: "error"; message: string };

/**
 * Publishes or unpublishes the caller's directory listing.
 *
 * `listed_publicly` is in no UPDATE grant, so this RPC is the only write path
 * a client has. ATX03 is the database refusing because the caller is
 * affiliated with a business — mapped to its own status rather than surfaced
 * as an error string, because the UI owes that case a real explanation naming
 * the business, not a raised exception rendered verbatim.
 *
 * The UI also checks affiliation before offering the switch. This handles the
 * case that check cannot: a business adding the professional between the read
 * and the write.
 */
export async function setPublicListing(listed: boolean): Promise<SetListingResult> {
  const { data, error } = await supabase.rpc("set_public_listing", { p_listed: listed });

  if (error) {
    if (error.code === "ATX03") return { status: "affiliated" };
    // ATX08 since migration 6360dc2. This used to match the message text, which
    // was the only signal there was; the code is the signal now and the regex is
    // gone rather than kept beside it, because that migration changed no wording
    // — so a fallback would only ever match what the code already matches.
    if (error.code === "ATX08") return { status: "no_profile" };
    console.error("[professional-profile] Could not set listing:", error.code, error.message);
    return { status: "error", message: "Could not update your listing. Try again." };
  }

  const row = data as unknown as { listed_publicly: boolean } | null;
  return { status: "ok", listed: row?.listed_publicly ?? listed };
}
