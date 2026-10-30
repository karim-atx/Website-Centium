import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { t } from "../../i18n/core";
import { parseSharedPlan, type SharedPlan } from "./groupCardsModel";

// Round D · a meal plan shared in a group, opened by a member (Database
// 20261223060000, shared_meal_plan_detail(p_message_id)). A joined member and
// the sender read the template the card names; never calories or macros, and
// not the plan's own notes. A member who left, a deleted card or a plan that
// is no longer the sender's template: no rows.

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PostgrestError | null }> };

export type SharedPlanRead = { ok: true; plan: SharedPlan | null } | { ok: false; message: string };

export async function fetchSharedMealPlan(messageId: string): Promise<SharedPlanRead> {
  const { data, error } = await (supabase as unknown as Rpc).rpc("shared_meal_plan_detail", { p_message_id: messageId });
  if (error) {
    if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
    console.error("[shared plan] Could not read the plan:", error.code, error.message);
    return { ok: false, message: t("Couldn't open the plan. Try again.") };
  }
  return { ok: true, plan: parseSharedPlan(data) };
}
