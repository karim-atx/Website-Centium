import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";

/**
 * B5: profiles.preferred_activities (closed set, max 10; in the profiles
 * UPDATE grant). Newer than the generated types, so written untyped. Called
 * after the onboarding save; the activities are optional, so a failure is
 * logged and does not undo onboarding.
 */
const supabase = typed as unknown as SupabaseClient;

export async function savePreferredActivities(userId: string, activities: string[]): Promise<boolean> {
  try {
    const { error } = await supabase.from("profiles").update({ preferred_activities: activities }).eq("id", userId);
    if (error) {
      console.error("[profile] Could not save preferred activities:", error.code, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[profile] Could not save preferred activities:", e);
    return false;
  }
}
