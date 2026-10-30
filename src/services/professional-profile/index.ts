import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { playlistSaveError } from "../music/playlistLink";
import { moderationRefusal } from "../moderation/text";
import type { Enums } from "../../../lib/supabase/database.types";
import { contactRefusal } from "../moderation/text";
import { tk } from "../../i18n/core";

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
  /**
   * The area shown on the clients' map, or null when it is off (Database
   * dd274ee). Read-only here: written only by set_approximate_location() and
   * cleared by clear_approximate_location(). Stored to two decimal places by
   * the column type, about 1 km, so a precise point is never kept.
   */
  mapArea: { lat: number; lng: number; label: string | null } | null;
}

/** The subset a client may write. Deliberately excludes the two above. */
export type ProfessionalProfilePatch = Partial<
  Omit<ProfessionalProfile, "listedPublicly" | "affiliatedBusinessId" | "mapArea">
>;

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return tk("Your session expired. Sign in again.");
  }
  if (code === "42501") {
    return tk("That field can't be edited from here.");
  }
  return moderationRefusal(error) ?? tk("Could not save your profile. Try again.");
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
  approx_lat: number | null;
  approx_lng: number | null;
  area_label: string | null;
};

// One unbroken literal on purpose: supabase-js infers the row type from this
// string, and splitting it across a concatenation collapses that inference to
// GenericStringError and forces a cast at every call site.
const COLUMNS =
  "bio, website, instagram, facebook, x, specialty, location, monthly_rate, consultation_rate, payment_modalities, listed_publicly, affiliated_business_id, approx_lat, approx_lng, area_label";

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
  mapArea:
    r.approx_lat !== null && r.approx_lng !== null
      ? { lat: Number(r.approx_lat), lng: Number(r.approx_lng), label: r.area_label }
      : null,
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
  // Round C Release 2: contact details belong in messages, said at save time.
  const contact = contactRefusal(patch.bio);
  if (contact) return { ok: false, message: contact };
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
      message: inserted.error ? describe(inserted.error) : tk("Could not save your profile."),
    };
  }
  return { ok: true, profile: toProfile(inserted.data as Row) };
}

// ---------------------------------------------------------------------------
// Round E · the profile's playlist (professional_profiles.playlist_url,
// 20261224030000): public wherever the profile is (the directory view and
// professional_by_handle, listed only, like the cover). Kept out of COLUMNS
// above, whose literal drives the generated row type: the column is newer
// than the types, so these two read and write through an untyped view.

const untyped = supabase as unknown as SupabaseClient;

export async function fetchMyPlaylist(userId: string): Promise<{ ok: true; url: string | null } | { ok: false; message: string }> {
  const { data, error } = await untyped.from("professional_profiles").select("playlist_url").eq("profile_id", userId).maybeSingle();
  if (error) {
    console.error("[professional-profile] Could not read the playlist:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, url: (data as { playlist_url: string | null } | null)?.playlist_url ?? null };
}

/** Sets or clears (null) the profile's playlist. Update first; a profile with no row yet gets one. */
export async function saveMyPlaylist(userId: string, url: string | null): Promise<{ ok: true; url: string | null } | { ok: false; message: string }> {
  const refused = (error: PostgrestError) => {
    console.error("[professional-profile] Could not save the playlist:", error.code, error.message);
    return { ok: false as const, message: playlistSaveError(error.code) ?? describe(error) };
  };
  const updated = await untyped.from("professional_profiles").update({ playlist_url: url }).eq("profile_id", userId).select("playlist_url");
  if (updated.error) return refused(updated.error);
  if (updated.data && updated.data.length > 0) return { ok: true, url: (updated.data[0] as { playlist_url: string | null }).playlist_url };
  const inserted = await untyped.from("professional_profiles").insert({ profile_id: userId, playlist_url: url }).select("playlist_url").single();
  if (inserted.error) return refused(inserted.error);
  return { ok: true, url: (inserted.data as { playlist_url: string | null }).playlist_url };
}

export type LeaveAffiliationResult = { ok: true } | { ok: false; message: string };

/**
 * Leaves the business the caller is affiliated with.
 *
 * LEAVING IS POSSIBLE FROM HERE; JOINING IS NOT, and the asymmetry is the
 * schema's, not a gap in this file. `business_employees_insert_business_owner`
 * requires `auth.uid()` to be the BUSINESS's `profile_id`, so a professional
 * cannot add themselves to a team — the business does it. But
 * `business_employees_delete_professional` is `auth.uid() = professional_id`,
 * so they can always walk away from one. Any UI offering a professional a way
 * to "enter a business ID and join" is describing a write the database will
 * never accept.
 *
 * WRITES THE SOURCE, NOT THE MIRROR. `professional_profiles.affiliated_
 * business_id` is maintained by `business_employees_sync_affiliation` and is
 * not in that table's update grant — `grant update (specialty, location)` is
 * the whole of it. So the row is deleted from `business_employees` and the
 * trigger clears the mirror. Trying to null the mirror directly earns a 42501.
 *
 * NO owner_id FILTER, because `business_employees_delete_professional` already
 * scopes this to the caller's own rows — a filter would restate the policy
 * rather than narrow it, the same reasoning fetchHideReadReceipts records.
 *
 * ZERO ROWS IS NOT AN ERROR. Leaving a business you are not in is the state
 * the caller wanted either way, and a stale button is the likeliest cause.
 */
export async function leaveAffiliation(businessId: string): Promise<LeaveAffiliationResult> {
  // ONE BUSINESS (B0, Release 2): a professional may work for several, so
  // leaving is scoped to the business named; the policy still limits the
  // delete to the caller's own rows.
  try {
    const { error } = await supabase.from("business_employees").delete().eq("business_id", businessId);
    if (error) {
      console.error("[professional-profile] Could not leave business:", error.code, error.message);
      return { ok: false, message: describe(error) };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : tk("Could not leave that business."),
    };
  }
}

/** The one sentence for both public surfaces: the directory listing and the map area. */
export const UNDER_18_LISTING = tk("Accounts under 18 can't be listed publicly.");
/** ATX48: fixed by adding a date of birth. */
export const NEEDS_DOB = tk("Add your date of birth to appear in the directory.");
/** ATXC6: fixed once a licence or certificate is verified. */
export const NEEDS_VERIFICATION = tk("You can be listed once your licence or certificate is verified.");

export type SetListingResult =
  | { status: "ok"; listed: boolean }
  | { status: "no_profile" }
  /** ATX48: no date of birth on file. One field, then it works. */
  | { status: "needs_dob" }
  /** ATXC6: no current verified licence or certificate. */
  | { status: "needs_verification" }
  | { status: "error"; message: string };

/**
 * Publishes or unpublishes the caller's directory listing.
 *
 * `listed_publicly` is in no UPDATE grant, so this RPC is the only write path
 * a client has. Database #38 retired its affiliation refusal (ATX03): every
 * Team professional stays listed and can switch their own listing.
 */
export async function setPublicListing(listed: boolean): Promise<SetListingResult> {
  const { data, error } = await supabase.rpc("set_public_listing", { p_listed: listed });

  if (error) {
    // ATX08 since migration 6360dc2. This used to match the message text, which
    // was the only signal there was; the code is the signal now and the regex is
    // gone rather than kept beside it, because that migration changed no wording
    // — so a fallback would only ever match what the code already matches.
    if (error.code === "ATX08") return { status: "no_profile" };
    // ATX47 (Database dd274ee): an account under 18 cannot be publicly
    // discoverable. Turning a listing OFF is never refused.
    if (error.code === "ATX47") return { status: "error", message: UNDER_18_LISTING };
    // ATX48 (Database 16f2f43): no date of birth on file. Different from ATX47
    // on purpose: this one is fixed by filling in one field.
    if (error.code === "ATX48") return { status: "needs_dob" };
    // ATXC6 (Database, 14 Oct): a NEW listing needs a current verified
    // licence or certificate. Anyone already listed keeps their listing.
    if (error.code === "ATXC6") return { status: "needs_verification" };
    console.error("[professional-profile] Could not set listing:", error.code, error.message);
    return { status: "error", message: tk("Could not update your listing. Try again.") };
  }

  const row = data as unknown as { listed_publicly: boolean } | null;
  return { status: "ok", listed: row?.listed_publicly ?? listed };
}

export type MapAreaResult =
  | { ok: true; mapArea: ProfessionalProfile["mapArea"] }
  | { ok: false; message: string; needsDob?: boolean };

function mapAreaFrom(data: unknown): ProfessionalProfile["mapArea"] {
  const row = data as { approx_lat: number | null; approx_lng: number | null; area_label: string | null } | null;
  return row && row.approx_lat !== null && row.approx_lng !== null
    ? { lat: Number(row.approx_lat), lng: Number(row.approx_lng), label: row.area_label }
    : null;
}

/**
 * Shows the professional on the clients' map at an approximate area. The
 * point is rounded here to two decimals as well, though the column type would
 * round it anyway; the label is the professional's own words for the area.
 *
 * Release B (20261217020000): p_country_code, the ISO code the device works
 * out for the area (services/geo/country: countryOfArea for a picked area,
 * countryNear for a pin). Left out when unknown, which stores unknown and
 * keeps the professional findable from anywhere. Not in the generated types
 * yet (they read production), hence the cast.
 */
export async function setMapArea(lat: number, lng: number, label: string | null, countryCode?: string | null): Promise<MapAreaResult> {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const args = {
    p_lat: round2(lat),
    p_lng: round2(lng),
    p_label: label?.trim() ? label.trim().slice(0, 80) : undefined,
    p_country_code: countryCode ?? undefined,
  };
  const { data, error } = await supabase.rpc("set_approximate_location", args as never);
  if (error) {
    console.error("[professional-profile] Could not set the map area:", error.code, error.message);
    if (error.code === "ATX47") return { ok: false, message: UNDER_18_LISTING };
    if (error.code === "ATX48") return { ok: false, needsDob: true, message: NEEDS_DOB };
    if (error.code === "ATX08") return { ok: false, message: tk("Save your details first. There's nothing to list yet.") };
    return { ok: false, message: describe(error) === tk("Your session expired. Sign in again.") ? describe(error) : tk("Couldn't save your area. Try again.") };
  }
  return { ok: true, mapArea: mapAreaFrom(data) };
}

/** Takes the professional off the map. They stay in the directory. Never refused. */
export async function clearMapArea(): Promise<MapAreaResult> {
  const { error } = await supabase.rpc("clear_approximate_location");
  if (error) {
    console.error("[professional-profile] Could not clear the map area:", error.code, error.message);
    return { ok: false, message: tk("Couldn't turn that off. Try again.") };
  }
  return { ok: true, mapArea: null };
}

/**
 * True when the caller is ALREADY published (listed, or sharing a map area)
 * without a date of birth on file (Database 16f2f43). They keep their listing;
 * this drives a non-blocking prompt, not an error.
 */
export async function listingNeedsDateOfBirth(): Promise<boolean> {
  const { data, error } = await supabase.rpc("listing_needs_date_of_birth");
  if (error) {
    console.error("[professional-profile] Could not check the date of birth:", error.message);
    return false;
  }
  return data === true;
}
