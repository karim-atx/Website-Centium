// Release 3 · Professional UI: the three lanes ("subtypes" in the handover)
// and everything that is chosen by lane in the navigation.
//
// THE LANE IS DERIVED, NEVER STORED (DECISIONS_PROFESSIONAL, Admin and data):
// it comes from profiles.professional_subtype through the database's pure
// function subtype_for_type (Database DB-1). LANE_FOR_TYPE is its TypeScript
// mirror, kept equal to the SQL by subtypeLanes.test.ts. `other` is Full
// coaching and never consults closest_group (FINAL_PLAN 2.0).
//
// subtypeLabels.ts (components/professionals) holds the TYPE labels; the lane
// labels are here (FINAL_PLAN 2.0 re-base table).
//
// No React and no Supabase here, so the node test project loads it.

import type { ProfessionalSubtype } from "../../types";

export type ProLane = "full_coaching" | "nutrition" | "clinical_overview";

/** subtype_for_type(professional_subtype), 20261124000000 (DB-1). */
export const LANE_FOR_TYPE: Record<ProfessionalSubtype, ProLane> = {
  trainer: "full_coaching",
  physiotherapist: "full_coaching",
  coach_instructor: "full_coaching",
  other: "full_coaching",
  dietitian: "nutrition",
  nutritionist: "nutrition",
  doctor: "clinical_overview",
};

/** The lane for a type. No type yet (a profile still loading) reads as Full coaching, as `other` does. */
export function laneForType(type: ProfessionalSubtype | null | undefined): ProLane {
  return (type && LANE_FOR_TYPE[type]) || "full_coaching";
}

export function isProLane(v: unknown): v is ProLane {
  return v === "full_coaching" || v === "nutrition" || v === "clinical_overview";
}

/** HANDOVER d: the lane names (board "Full coaching", "Nutrition", "Clinical overview"). */
export const LANE_LABEL: Record<ProLane, string> = {
  full_coaching: "Full coaching",
  nutrition: "Nutrition",
  clinical_overview: "Clinical overview",
};

// ---------------------------------------------------------------------------
// Routes (FINAL_PLAN W1). Every professional screen lives under /app/pro, with
// the More pages under /app/more.
// ---------------------------------------------------------------------------

export const PRO_ROUTES = {
  home: "/app/pro",
  clients: "/app/pro/clients",
  calendar: "/app/pro/calendar",
  library: "/app/pro/library",
  mealPlans: "/app/pro/meal-plans",
  insights: "/app/pro/insights",
  more: "/app/more",
} as const;

/** One client's page, on a tab. */
export const proClientPath = (clientId: string, tab?: string): string =>
  `${PRO_ROUTES.clients}/${encodeURIComponent(clientId)}${tab ? `/${tab}` : ""}`;

/**
 * Navbar slot 4 by lane (HANDOVER d "Navbar per subtype", decision 4: Library
 * everywhere for Full coaching). Library and Meal plans reuse the client
 * Workout and Food glyphs; Insights the client Health heart (NV1).
 */
export type Slot4Glyph = "workout" | "food" | "heart";
export const SLOT4: Record<ProLane, { label: string; to: string; glyph: Slot4Glyph }> = {
  full_coaching: { label: "Library", to: PRO_ROUTES.library, glyph: "workout" },
  nutrition: { label: "Meal plans", to: PRO_ROUTES.mealPlans, glyph: "food" },
  clinical_overview: { label: "Insights", to: PRO_ROUTES.insights, glyph: "heart" },
};

// ---------------------------------------------------------------------------
// Tabs (the `:tab` of each route). The first entry is the default tab.
// ---------------------------------------------------------------------------

/** TR1 / NU1 (Full coaching): Library › Programmes, Meal plans. */
export const LIBRARY_TABS = ["programmes", "meal-plans"] as const;
/** NU1 (Nutrition): the Meal plans tab's areas. */
export const MEAL_PLAN_TABS = ["plans", "journals", "recipes", "targets"] as const;
/** TR (Clinical overview): Insights as its navbar tab. */
export const INSIGHTS_TABS = ["activity", "nutrition", "vitals", "biomarkers"] as const;

/**
 * CL2 client page tabs, "the frames' tab lists win" (FINAL_PLAN W3). History is
 * the CL4 sheet, not a tab.
 */
export const CLIENT_TABS: Record<ProLane, readonly string[]> = {
  full_coaching: ["overview", "plan", "progress", "sessions", "notes", "files"],
  nutrition: ["overview", "plan", "progress", "sessions", "notes", "files"],
  clinical_overview: ["overview", "care-plan", "health-records", "trends", "appointments", "notes"],
};

/** The tab to show: the requested one when the lane has it, else the lane's first. */
export function pickTab<T extends string>(tabs: readonly T[], requested: string | undefined): T {
  return (tabs as readonly string[]).includes(requested ?? "") ? (requested as T) : tabs[0];
}

/**
 * Where an old professional route goes for one release (FINAL_PLAN W1,
 * professional accounts only). Clients keep /app/professionals as their
 * directory; /app/professionals/:id, /:id/reviews and /verification stay.
 */
export function legacyProRedirect(oldPath: string, lane: ProLane): string {
  switch (oldPath) {
    case "/app/professionals":
      return PRO_ROUTES.clients;
    case "/app/professionals/calendar":
      return PRO_ROUTES.calendar;
    case "/app/professionals/templates":
      return lane === "full_coaching" ? `${PRO_ROUTES.library}/programmes` : SLOT4[lane].to;
    case "/app/professionals/meal-plans":
      return lane === "full_coaching" ? `${PRO_ROUTES.library}/meal-plans` : SLOT4[lane].to;
    case "/app/professionals/health-metrics":
      // FINAL_PLAN W6: Clinical overview to Insights, the others to Practice insights.
      return lane === "clinical_overview" ? PRO_ROUTES.insights : `${PRO_ROUTES.more}/practice-insights`;
    default:
      return PRO_ROUTES.home;
  }
}

/**
 * Where a lane's own slot-4 route sends a lane that doesn't have it (hidden
 * means not rendered and not fetched, HANDOVER d capability matrix):
 * Library is Full coaching's, Meal plans Nutrition's (Full coaching has it
 * inside Library), Insights Clinical overview's (the others see Insights
 * inside the client page).
 */
export function slotRouteFor(lane: ProLane, area: "library" | "meal-plans" | "insights", tab?: string): string | null {
  if (area === "library") {
    if (lane === "full_coaching") return null;
    return lane === "nutrition" && tab === "meal-plans" ? PRO_ROUTES.mealPlans : SLOT4[lane].to;
  }
  if (area === "meal-plans") {
    if (lane === "nutrition") return null;
    return lane === "full_coaching" ? `${PRO_ROUTES.library}/meal-plans` : SLOT4[lane].to;
  }
  return lane === "clinical_overview" ? null : PRO_ROUTES.clients;
}
