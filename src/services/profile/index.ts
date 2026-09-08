import { supabase } from "../../../lib/supabase/client";
import type { TablesInsert, TablesUpdate } from "../../../lib/supabase/database.types";
import { ageFromDateOfBirth } from "../../utils/date";
import type {
  AccountType,
  ActivityLevel,
  CustomerSubtype,
  Goal,
  ProfessionalSubtype,
  Sex,
  TrackPreference,
  UserProfile,
} from "../../types";

// Writes to public.profiles. Split in two deliberately:
//
//   1. ensureProfileRow() runs the moment a session exists, inserting the
//      bare minimum (just the id, which is all the table requires).
//   2. updateProfileFromOnboarding() fills in the rest at the end of the
//      flow, once accountType/subtype/goals/etc. actually exist.
//
// The split is forced by the shape of onboarding: the auth step runs BEFORE
// the account-type step, so there is no accountType to write at sign-in
// time. It also means a user who abandons onboarding halfway still has a
// valid, queryable profiles row rather than an auth.users entry pointing at
// nothing.

/**
 * Inserts a profiles row for a freshly-authenticated user, or does nothing
 * if one already exists.
 *
 * `ignoreDuplicates: true` compiles to ON CONFLICT DO NOTHING, which is what
 * makes this safe to call on every single auth event — a returning user
 * signing in for the hundredth time will not have their onboarding data
 * overwritten by a blank row.
 */
export async function ensureProfileRow(userId: string, email: string | null): Promise<void> {
  const row: TablesInsert<"profiles"> = { id: userId, email };
  const { error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id", ignoreDuplicates: true });

  if (error) {
    // Non-fatal: the user is authenticated either way, and the row gets
    // another chance on the next auth event. Logged rather than surfaced
    // because there is no user action that would fix it.
    console.error("[profile] Could not ensure profiles row:", error.message);
  }
}

export interface FetchedProfile {
  onboarded: boolean;
  profile: Partial<UserProfile>;
}

/**
 * Reads the signed-in user's profile row.
 *
 * This is the source of truth for `onboarded`. It used to be read from
 * localStorage, which is per-browser and not keyed by account — so signing
 * out (which resets local state to the seeded demo profile) and back in as
 * a genuinely onboarded user sent them through onboarding again.
 *
 * Returns only the columns `profiles` actually owns. Fields the table has no
 * concept of — linkedProfessional*, businessId, certificationUrl and the
 * rest — are left to the caller to preserve, so hydrating never blanks them.
 */
export async function fetchProfile(userId: string): Promise<FetchedProfile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, first_name, email, phone, date_of_birth, sex, height_cm, weight_kg, goals, tracking_preferences, activity_level, account_type, customer_subtype, professional_subtype, avatar_url, onboarded"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("[profile] Could not read profile:", error.message);
      return null;
    }

    const profile: Partial<UserProfile> = {
      id: data.id,
      onboarded: data.onboarded,
      accountType: data.account_type,
    };
    // Only overwrite what the server actually holds. A null column means
    // "not set", not "set to empty" — clobbering local values with nulls
    // would wipe details the row simply doesn't carry yet.
    if (data.first_name) profile.firstName = data.first_name;
    if (data.email) profile.email = data.email;
    if (data.phone) profile.phone = data.phone;
    if (data.sex) profile.sex = data.sex;
    if (data.height_cm != null) profile.heightCm = data.height_cm;
    if (data.weight_kg != null) profile.weightKg = data.weight_kg;
    if (data.goals?.length) profile.goals = data.goals as UserProfile["goals"];
    if (data.tracking_preferences?.length)
      profile.tracking = data.tracking_preferences as UserProfile["tracking"];
    if (data.activity_level) profile.activityLevel = data.activity_level;
    if (data.customer_subtype) profile.customerSubtype = data.customer_subtype;
    // The database enum carries a "doctor" value the app's own
    // ProfessionalSubtype union does not. Rather than cast it away, fold it
    // into "other" — the app has no doctor-specific behaviour, and silently
    // widening the union here would push an unhandled value into every
    // subtype switch in the UI.
    if (data.professional_subtype) {
      profile.professionalSubtype =
        data.professional_subtype === "doctor"
          ? "other"
          : (data.professional_subtype as ProfessionalSubtype);
    }
    if (data.avatar_url) profile.avatarUrl = data.avatar_url;
    // The date is the stored truth; age is recomputed from it on every
    // hydration, so it stays correct as birthdays pass.
    if (data.date_of_birth) profile.dateOfBirth = data.date_of_birth;
    const age = ageFromDateOfBirth(data.date_of_birth);
    if (age !== undefined) profile.age = age;

    return { onboarded: data.onboarded, profile };
  } catch (e) {
    console.error("[profile] Could not read profile:", e);
    return null;
  }
}

export interface OnboardingProfileData {
  email: string;
  firstName: string;
  // A real collected date now, not derived from an age. Written straight to
  // profiles.date_of_birth. Optional because a user can skip the field.
  dateOfBirth?: string;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goals: Goal[];
  activityLevel: ActivityLevel;
  tracking: TrackPreference[];
  accountType: AccountType;
  customerSubtype?: CustomerSubtype;
  professionalSubtype?: ProfessionalSubtype;
}

/**
 * Updates just the date of birth, for the Profile tab's editor.
 *
 * Narrow on purpose. The onboarding writer sets fifteen columns at once,
 * which is right at the end of a flow that collected all of them — but wrong
 * for editing one field later, where sending the rest would overwrite server
 * values with whatever the local cache happened to hold.
 *
 * Unlike onboarding's best-effort write, this one reports failure: the user
 * is deliberately changing one value and watching for it to stick, so a
 * silent no-op would be worse than an error.
 */
export async function updateDateOfBirth(
  userId: string,
  dateOfBirth: string
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({ date_of_birth: dateOfBirth || null })
    .eq("id", userId);

  if (error) {
    console.error("[profile] Could not save date of birth:", error.message);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/**
 * Fills in the profiles row at the end of onboarding. Best-effort: a failure
 * here must not strand the user on the last step, since the local app state
 * has already been written and is what the UI reads today.
 */
export async function updateProfileFromOnboarding(
  userId: string,
  data: OnboardingProfileData
): Promise<{ ok: boolean; message?: string }> {
  const patch: TablesUpdate<"profiles"> = {
    email: data.email || null,
    first_name: data.firstName,
    date_of_birth: data.dateOfBirth || null,
    sex: data.sex,
    height_cm: data.heightCm,
    weight_kg: data.weightKg,
    goals: data.goals,
    tracking_preferences: data.tracking,
    activity_level: data.activityLevel,
    account_type: data.accountType,
    customer_subtype: data.customerSubtype ?? null,
    professional_subtype: data.professionalSubtype ?? null,
    onboarded: true,
  };

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);

  if (error) {
    console.error("[profile] Could not save onboarding profile:", error.message);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
