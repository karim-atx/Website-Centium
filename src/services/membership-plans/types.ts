import type { Database } from "../../../lib/supabase/database.types";

// The plan types, kept free of Supabase so pure modules (plans/planModel.ts
// and its node test) can import them without pulling the client in.

export type MembershipBilling = Database["public"]["Enums"]["billing_period"];

/**
 * v6 plan types (OP1-042 / BU2-11). Until B7 adds a plan type column the type
 * is read from today's columns: billing "daily" is a Day pass, anything else a
 * Membership. Class pack, Intro offer and Drop-in need B7.
 */
export type PlanKind = "membership" | "day_pass" | "class_pack" | "intro_offer" | "drop_in";

/**
 * v6 plan status (OP1-037 row 4). Every row is "active" until B7 adds the
 * status column (pause, hide, archive).
 */
export type PlanStatus = "active" | "paused" | "hidden" | "archived";

export interface MembershipPlanRow {
  id: string;
  name: string;
  /** Formatted for display ("$45"); the column is numeric. */
  price: string;
  /** The stored number, for the editor. */
  priceValue: number;
  billing: MembershipBilling;
  /**
   * The payment type as shown. V6-46: rows that say "Card" (or nothing) read
   * as "Cash" (BR-04: Whish or cash only).
   */
  paymentType: string;
  kind: PlanKind;
  status: PlanStatus;
}
