import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { FreePeriodFacts } from "./freePeriodCopy";

export type MyProfessionalPlanResult =
  | { ok: true; plan: FreePeriodFacts | null }
  | { ok: false; message: string };

/**
 * Task G: this professional's plan as my_professional_plan()
 * (20261005000000) reports it — self only, no argument.
 *
 * ZERO ROWS MEANS "NOT A PROFESSIONAL", not an error, and comes back as a
 * null plan so the professional-only copy shows nothing.
 *
 * mayConnectClients IS WHAT THE UI IS DRAWN FROM. It is the same predicate
 * redeem_client_code and accept_client_request refuse with (ATX49), so a
 * button drawn from it cannot disagree with what happens when it is pressed.
 * free_period_ended is deliberately not carried: it is only "has the date
 * passed", and is true for a paid professional too.
 */
export async function fetchMyProfessionalPlan(): Promise<MyProfessionalPlanResult> {
  try {
    const { data, error } = await supabase.rpc("my_professional_plan");
    if (error) {
      return {
        ok: false,
        message: isOffline(error) ? OFFLINE_MESSAGE : "Could not load your plan. Try again.",
      };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { ok: true, plan: null };
    return {
      ok: true,
      plan: {
        source: row.source,
        freePeriodEndsAt: row.free_period_ends_at,
        mayConnectClients: row.may_connect_clients,
      },
    };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Could not load your plan. Try again." };
  }
}
