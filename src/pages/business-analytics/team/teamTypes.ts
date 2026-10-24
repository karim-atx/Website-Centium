// The AN5 Team shapes, with no runtime imports: model.ts and its node test
// import these, so nothing here may reach lib/supabase or a DOM module
// (tsconfig.test.json has no DOM lib). teamData.ts re-exports them and checks
// BusinessRole against the Team service's own union.

import type { SubscriptionPeriod } from "../../../services/centium-billing/period";

/** business_employees.role (Database B6). Kept equal to services/business-team/team.ts BusinessRole (checked in teamData.ts). */
export type BusinessRole = "instructor" | "trainer" | "front_desk" | "manager" | "staff" | "shop_assistant";

export interface TeamPerson {
  id: string;
  name: string;
  role: BusinessRole;
  acceptedAt: string | null;
  createdAt: string;
  payRate: number | null;
  /** The seat answer (employee_credentials.uses_seat: a Centium hire uses none), null for an invitation. */
  usesSeat: boolean | null;
  /** Seat order: accepted first (by acceptance), then pending invites. Drives the avatar colour. */
  seat: number;
}

export interface SeatInfo {
  /** Included seats + blocks × seats per block; 0 with no active plan. */
  capacity: number;
  planActive: boolean;
  blocks: number;
  perBlock: number;
  /** Seat block price for `period` (never hard-coded); null when there is none ("Not available"). */
  blockPrice: number | null;
  /** Batch 2: the plan's billing period the block price is for; monthly when not known. */
  period?: SubscriptionPeriod;
}

export interface TeamData {
  people: TeamPerson[];
  seats: SeatInfo;
  requests: number;
}

export interface ClassRow {
  id: string;
  title: string;
  classType: string;
  date: string;
  start: string;
  end: string;
  capacity: number;
  professionalId: string | null;
  booked: number;
}
