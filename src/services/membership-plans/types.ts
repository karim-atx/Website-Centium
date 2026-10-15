// The plan types, kept free of Supabase so pure modules (plans/planModel.ts
// and its node test) can import them without pulling the client in.
//
// B7 MB-03 (membership_plans on the local stack): plan_type, status,
// visits_per_period, sessions_in_pack, valid_for_days, minimum_term_months,
// notice_days, allowed_class_types, includes, payment_methods,
// visible_on_explore, show_on_card, converts_to_plan_id; billing_period
// gains quarterly and semiannually. These columns are newer than
// lib/supabase/database.types.ts (generated from production), so the types
// are written out here.

export type MembershipBilling = "daily" | "monthly" | "quarterly" | "semiannually" | "annually";

/** membership_plans.plan_type (OP1-042). */
export type PlanKind = "membership" | "day_pass" | "class_pack" | "intro_offer" | "drop_in";

/** membership_plans.status. Paused = not sold; members keep their plan and renewals continue (V6-47). */
export type PlanDbStatus = "active" | "paused" | "archived";

/**
 * What the screens show (OP1-037 row 4): the stored status, with "hidden" for
 * an active plan whose visible_on_explore is off.
 */
export type PlanStatus = "active" | "paused" | "hidden" | "archived";

/** venue_payment_method: cash | whish (no card, BR-04). */
export type PlanPayment = "cash" | "whish";

export interface MembershipPlanRow {
  id: string;
  name: string;
  /** Formatted for display ("$45"); the column is numeric. */
  price: string;
  /** The stored number, for the editor. */
  priceValue: number;
  billing: MembershipBilling;
  /** "Cash", "Whish Money" or "Cash or Whish Money", from payment_methods (legacy payment_type "Card" reads as Cash, V6-46). */
  paymentType: string;
  paymentMethods: PlanPayment[];
  kind: PlanKind;
  /** Display status (see PlanStatus). */
  status: PlanStatus;
  dbStatus: PlanDbStatus;
  visibleOnExplore: boolean;
  showOnCard: boolean;
  /** Null = no limit (zero is refused by the database). */
  visitsPerPeriod: number | null;
  sessionsInPack: number | null;
  validForDays: number | null;
  minimumTermMonths: number | null;
  noticeDays: number | null;
  /** Null = every class type. */
  allowedClassTypes: string[] | null;
  includes: string[] | null;
  convertsToPlanId: string | null;
}
