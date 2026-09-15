import { supabase } from "../../../lib/supabase/client";
import type { Database, TablesInsert } from "../../../lib/supabase/database.types";

// A business's own business_profiles row: the listing content clients see on
// Explore.
//
// WHAT THIS REPLACES. BusinessProfileTab edited `businessListing`, a
// usePersistentState object, on every keystroke. Nothing reached the database,
// so a gym's bio, location, branch and contact details existed on exactly one
// device — while public_professional_directory and every client-facing surface
// read the real columns, which stayed empty. The same shape as the
// professional's listing before services/professional-profile was written.
//
// SIX COLUMNS, NOT ELEVEN. `authenticated` may UPDATE eleven — active, bio,
// branch_type, business_name, business_type, location, members_reached, perk,
// public_email, public_phone, public_website — but this screen shows six, and
// the patch is built only from the keys a caller actually passes. `perk`,
// `active` and `members_reached` belong to other surfaces, and the business
// name is deliberately not editable here (V9: "You should not be able to
// change the business name"). A screen that writes a field it does not show
// is how two editors of one row start overwriting each other.
//
// id, profile_id, created_at AND updated_at ARE NOT IN THE GRANT and are never
// in a payload here: the row is addressed by `.eq("profile_id", ...)` rather
// than by carrying an identity column, and the two timestamps are the
// database's to keep.

export interface BusinessProfile {
  businessName: string;
  businessType: string;
  branchType: string | null;
  bio: string | null;
  location: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  publicWebsite: string | null;
}

/** Exactly what this screen may change. */
export type BusinessProfilePatch = Partial<
  Pick<BusinessProfile, "branchType" | "bio" | "location" | "publicEmail" | "publicPhone" | "publicWebsite">
>;

export type BusinessProfileResult =
  | { ok: true; profile: BusinessProfile | null }
  | { ok: false; message: string };

export type BusinessSaveResult =
  | { ok: true; profile: BusinessProfile }
  | { ok: false; message: string };

const COLUMNS =
  "business_name, business_type, branch_type, bio, location, public_email, public_phone, public_website";

// business_type is an enum column, not free text. The local BusinessType in
// src/types is the same seven values, so a caller can pass its own union
// straight through — but a service that takes the database's own generated
// type is the one that keeps compiling when an eighth value is added there.
type BusinessTypeEnum = Database["public"]["Enums"]["business_type"];

type Row = {
  business_name: string;
  business_type: BusinessTypeEnum;
  branch_type: string | null;
  bio: string | null;
  location: string | null;
  public_email: string | null;
  public_phone: string | null;
  public_website: string | null;
};

/**
 * The six columns a patch may touch — deliberately NOT Partial<Row>.
 *
 * Partial<Row> would let business_name and business_type into an update
 * payload, which is exactly the accident this screen must not have: the name
 * is read-only here by decision, and both are NOT NULL identity columns that
 * only the creating insert should ever set.
 */
type PatchRow = Pick<Row, "branch_type" | "bio" | "location" | "public_email" | "public_phone" | "public_website">;

const toProfile = (r: Row): BusinessProfile => ({
  businessName: r.business_name,
  businessType: r.business_type,
  branchType: r.branch_type,
  bio: r.bio,
  location: r.location,
  publicEmail: r.public_email,
  publicPhone: r.public_phone,
  publicWebsite: r.public_website,
});

/**
 * Builds the row from the keys actually present.
 *
 * NOT A FULL OBJECT WITH UNDEFINEDS, and the difference matters: sending a
 * key the caller never set would write null over a value another surface owns.
 * An empty string is normalised to null so a cleared field reads as absent
 * rather than as the empty string, which every consumer would then have to
 * test for separately.
 */
function toRow(patch: BusinessProfilePatch): Partial<PatchRow> {
  const row: Partial<PatchRow> = {};
  const set = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

  if ("branchType" in patch) row.branch_type = set(patch.branchType);
  if ("bio" in patch) row.bio = set(patch.bio);
  if ("location" in patch) row.location = set(patch.location);
  if ("publicEmail" in patch) row.public_email = set(patch.publicEmail);
  if ("publicPhone" in patch) row.public_phone = set(patch.publicPhone);
  if ("publicWebsite" in patch) row.public_website = set(patch.publicWebsite);
  return row;
}

/**
 * This account's listing, or null when it has never been saved.
 *
 * ADDRESSED BY profile_id, NOT BY THE BIZ- CODE. business_profiles.id is a
 * uuid and `user.businessId` is a four-character display code minted at
 * onboarding — the mismatch that would have made BusinessEmployeesTab read an
 * empty team forever. This screen never needs either: the policy is
 * `auth.uid() = profile_id`, so the owner's own id addresses the row directly.
 */
export async function fetchMyBusinessProfile(userId: string): Promise<BusinessProfileResult> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select(COLUMNS)
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[business-profile] Could not read the listing:", error.message);
    return { ok: false, message: "Couldn't load your listing. Check your connection and try again." };
  }
  return { ok: true, profile: data ? toProfile(data as Row) : null };
}

/**
 * Saves the listing, creating the row on first use.
 *
 * UPDATE THEN INSERT, matching saveMyProfile in services/professional-profile
 * and for the same reason an upsert is wrong here: PostgREST compiles
 * `.upsert()` to ON CONFLICT DO UPDATE SET every column in the payload, and
 * the payload would have to carry profile_id to conflict on — a column the
 * UPDATE grant does not include, so the write would be refused with 42501.
 *
 * THE INSERT NEEDS A NAME AND A TYPE, which UPDATE never does: both columns
 * are NOT NULL and nothing in the app has created this row before, so the
 * first save is also the row's creation. They come from the caller because
 * the only place they exist today is the local onboarding state — and a
 * business with neither is told to finish setting up rather than handed a
 * NOT NULL violation.
 */
export async function saveMyBusinessProfile(
  userId: string,
  patch: BusinessProfilePatch,
  identity?: { businessName?: string; businessType?: BusinessTypeEnum }
): Promise<BusinessSaveResult> {
  const row = toRow(patch);

  const updated = await supabase
    .from("business_profiles")
    .update(row)
    .eq("profile_id", userId)
    .select(COLUMNS);

  if (updated.error) {
    console.error("[business-profile] Could not update the listing:", updated.error.message);
    return { ok: false, message: "Couldn't save your listing. Try again." };
  }
  if (updated.data && updated.data.length > 0) {
    return { ok: true, profile: toProfile(updated.data[0] as Row) };
  }

  const businessName = identity?.businessName?.trim();
  const businessType = identity?.businessType;
  if (!businessName || !businessType) {
    return {
      ok: false,
      message: "Finish setting up your business before editing your listing.",
    };
  }

  const insert: TablesInsert<"business_profiles"> = {
    profile_id: userId,
    business_name: businessName,
    business_type: businessType,
    ...row,
  };

  const inserted = await supabase.from("business_profiles").insert(insert).select(COLUMNS).single();

  if (inserted.error || !inserted.data) {
    console.error("[business-profile] Could not create the listing:", inserted.error?.message);
    return { ok: false, message: "Couldn't save your listing. Try again." };
  }
  return { ok: true, profile: toProfile(inserted.data as Row) };
}

/**
 * The business_profiles.id this account owns, or null when it has no row yet.
 *
 * THE ONE PIECE EVERY BUSINESS-OWNED TABLE NEEDS. business_classes,
 * business_offerings, business_discounts and membership_plans each carry a
 * `business_id` in the payload itself — unlike this table, which is addressed
 * by `profile_id` in the filter and so never needs the uuid at all. Their RLS
 * policies all read the same way: the business_id must belong to a
 * business_profiles row whose profile_id is auth.uid().
 *
 * WHICH MAKES THIS THE EXACT SPOT THE BIZ- CODE TRAP LIVES. `user.businessId`
 * is a four-character display code minted at onboarding
 * (`BIZ-${Math.random().toString(36).slice(2, 6).toUpperCase()}`) and kept in
 * local state; it is not this id and never was. Sending it as a business_id
 * fails the uuid cast, and using it as a filter returns nothing forever while
 * looking exactly like "you haven't created anything yet" — the shape that
 * already cost this project two rounds on business_employees. Every caller
 * goes through here so there is one place to get it wrong.
 *
 * NO ROW IS AN ORDINARY STATE, not an error: business_profiles is created the
 * first time an owner saves their listing, so a brand new business has none —
 * and therefore cannot own a class, offering, discount or plan yet either.
 * Callers are expected to say so rather than show an empty list.
 */
export async function resolveMyBusinessId(
  userId: string
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[business-profile] Could not resolve the business id:", error.message);
    return { ok: false };
  }
  return { ok: true, id: data?.id ?? null };
}
