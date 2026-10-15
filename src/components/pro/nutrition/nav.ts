// Release 3 · W5 Meal plans: where each NU screen lives.
//
// Nutrition has Meal plans as its navbar tab: /app/pro/meal-plans/:area, the
// areas being MEAL_PLAN_TABS (plans, journals, recipes, targets; the NU1
// boxes open the last three). Full coaching has it inside Library:
// /app/pro/library/meal-plans with the area in ?area= (Library owns the
// :tab). The screen inside an area is chosen by the query: ?plan= (NU2
// builder), ?client= (NU8 targets / NU5 a client's journal), ?day= (NU6).
// No React here, so the client page and Home can build links too.

import { MEAL_PLAN_TABS, PRO_ROUTES, type ProLane } from "../subtypeLanes";

export type NuArea = (typeof MEAL_PLAN_TABS)[number];

export interface NuParams {
  plan?: string;
  client?: string;
  day?: string;
}

export function isNuArea(v: string | null | undefined): v is NuArea {
  return !!v && (MEAL_PLAN_TABS as readonly string[]).includes(v);
}

export function mealPlansHref(lane: ProLane, area: NuArea, params: NuParams = {}): string {
  const q = new URLSearchParams();
  if (lane !== "nutrition" && area !== "plans") q.set("area", area);
  if (params.plan) q.set("plan", params.plan);
  if (params.client) q.set("client", params.client);
  if (params.day) q.set("day", params.day);
  const qs = q.toString();
  const base = lane === "nutrition" ? `${PRO_ROUTES.mealPlans}/${area}` : `${PRO_ROUTES.library}/meal-plans`;
  return qs ? `${base}?${qs}` : base;
}

/**
 * True when a Meal plans URL shows one of the inner screens (builder,
 * journals, recipes, targets) rather than the library list. Library.tsx can
 * use it to hide its own title and tabs on those screens.
 */
export function isMealPlansSubview(search: string): boolean {
  const q = new URLSearchParams(search);
  return !!(q.get("plan") || q.get("client") || (q.get("area") && q.get("area") !== "plans"));
}
