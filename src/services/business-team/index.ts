import { supabase } from "../../../lib/supabase/client";

// A business's affiliated professionals: the real business_employees rows.
//
// WHAT THIS REPLACES. `businessEmployees` was a
// Record<businessId, BusinessEmployee[]> in localStorage that nothing ever
// wrote to — there is no add-employee flow anywhere in the app — so the list
// was permanently empty, and the only action on it, removeBusinessEmployee,
// deleted from a map no row had ever entered.
//
// THE BUSINESS ID ON THE SCREEN IS NOT THIS ID, which is the trap here.
// `user.businessId` is a four-character display code minted at onboarding as
// `BIZ-${Math.random().toString(36).slice(2, 6).toUpperCase()}` and kept in
// local state; business_employees.business_id is business_profiles.id, a uuid.
// Keying a server read on the display code would return nothing forever and
// look exactly like "no employees yet".

export interface TeamMember {
  professionalId: string;
  name: string;
  subtype: string | null;
}

export type TeamResult =
  | { ok: true; businessId: string | null; members: TeamMember[] }
  | { ok: false; message: string };

/**
 * The business_profiles row this account owns, or null.
 *
 * A business account without one is an ordinary state rather than an error:
 * business_profiles is written when the listing is first edited, and a brand
 * new business has not been there yet. It simply has no team.
 */
async function myBusinessId(userId: string): Promise<{ ok: boolean; id: string | null }> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[business-team] Could not read the business profile:", error.message);
    return { ok: false, id: null };
  }
  return { ok: true, id: data?.id ?? null };
}

/**
 * Everyone affiliated with this account's business.
 *
 * NAMES COME FROM public_profile_summary, not from related_profile_summary
 * and not from profiles. The first is own-row only; the second covers
 * professional-CLIENT relationships and pending requests and says nothing
 * about employment, so a business owner reading it would get their own
 * employees back as zero rows. public_profile_summary exposes id, first_name,
 * avatar_url and account_type for every professional and business account and
 * is granted to authenticated — which is exactly the shape this needs.
 *
 * THE SUBTYPE IS NOT AVAILABLE TO A BUSINESS AT ALL, and that is structural
 * rather than a gap worth working around. It lives on
 * profiles.professional_subtype, readable only by its owner. The one view
 * carrying it is public_professional_directory, which requires
 * `listed_publicly` — and affiliating a professional with a business TURNS
 * THAT OFF: a trigger sets listed_publicly false and affiliated_business_id
 * on insert into business_employees, because an affiliated professional is
 * not advertising for their own clients. Measured, after this code first
 * shipped with a directory lookup that would have been an empty round trip on
 * every load for every employee, forever.
 *
 * So the card shows a name and the generic icon. Giving a business the
 * subtype would need a new view or a widened grant, which is a schema
 * decision rather than something this service can reach for.
 */
export async function fetchMyTeam(userId: string): Promise<TeamResult> {
  const business = await myBusinessId(userId);
  if (!business.ok) {
    return { ok: false, message: "Couldn't load your team. Check your connection and try again." };
  }
  if (!business.id) return { ok: true, businessId: null, members: [] };

  const rows = await supabase
    .from("business_employees")
    .select("professional_id")
    .eq("business_id", business.id);

  if (rows.error) {
    console.error("[business-team] Could not read employees:", rows.error.message);
    return { ok: false, message: "Couldn't load your team. Check your connection and try again." };
  }

  const ids = (rows.data ?? []).map((r) => r.professional_id).filter((id): id is string => !!id);
  if (ids.length === 0) return { ok: true, businessId: business.id, members: [] };

  const names = await supabase.from("public_profile_summary").select("id, first_name").in("id", ids);

  const nameById = new Map(
    (names.data ?? []).map((p) => [p.id as string, (p.first_name as string | null)?.trim() || "Unnamed"])
  );

  return {
    ok: true,
    businessId: business.id,
    members: ids.map((id) => ({
      professionalId: id,
      // A professional whose name will not resolve is still on the team, and
      // dropping the row would hide somebody with access to this business.
      name: nameById.get(id) ?? "Unnamed professional",
      subtype: null,
    })),
  };
}

/**
 * Removes a professional from the business.
 *
 * TWO POLICIES ADMIT THIS DELETE and only one of them applies here:
 * business_employees_delete_business_owner, keyed on owning the
 * business_profiles row. The other, _delete_professional, is how a
 * professional leaves on their own — already built as leaveAffiliation() in
 * services/professional-profile. Both sides can end an affiliation; neither
 * can start one from the wrong side.
 */
export async function removeTeamMember(
  businessId: string,
  professionalId: string
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase
    .from("business_employees")
    .delete()
    .eq("business_id", businessId)
    .eq("professional_id", professionalId);

  if (error) {
    console.error("[business-team] Could not remove the employee:", error.message);
    return { ok: false, message: "Couldn't remove them. Try again." };
  }
  return { ok: true };
}
