// The Dashboard's data shapes, with no runtime imports, so the pure model
// (dashboardModel.ts) and its node:test file never load the Supabase client.

import type { CalendarEvent } from "../../types";

/** A calendar event as the week view reads it (services/calendar ClientCalendarEvent fits). */
export type DashEvent = CalendarEvent & { invite?: { status: string } };

export interface DashBusiness {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

export interface DashClass {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  cap: number;
  professionalId: string | null;
  createdAt: string;
}

export interface DashBooking {
  classId: string;
  clientId: string;
  createdAt: string;
}

export interface DashMember {
  id: string;
  memberId: string;
  /** The label from list_business_members (Q-05): a shared first name or "Member #0042"; null where the reader gives none. */
  label?: string | null;
  planId: string | null;
  invitedAt: string;
  respondedAt: string | null;
  accepted: boolean | null;
  endedAt: string | null;
}

export interface DashCode {
  redeemed: boolean;
  redeemedBy: string | null;
  expiresAt: string;
}

export interface DashSeats {
  blocks: number;
  perUnit: number;
  capacity: number;
  used: number;
}

export interface DashRaw {
  /** null: this account has no business_profiles row yet (a new business). */
  business: DashBusiness | null;
  classes: DashClass[];
  bookings: DashBooking[];
  members: DashMember[];
  planNames: Record<string, string>;
  codes: DashCode[];
  plansCount: number;
  productsCount: number;
  discountsCount: number;
  seats: DashSeats | null;
  team: Record<string, string>;
  events: DashEvent[];
  accessQr: boolean;
  storeDeliveryOrPickup: boolean;
  dismissed: boolean;
  /** Waitlist entries per class for today's classes (venue_class_roster). */
  waitlists: Record<string, number>;
  /** Renewals to chase in the next 7 days (venue_renewals_due, B7 MB-05: not renewed, not ending), null without a venue. */
  renewalsDue: number | null;
  /** Reads that failed but did not stop the page (shown as pending, never as zero). */
  partial: string[];
}

export type DashLoad = { ok: true; raw: DashRaw } | { ok: false; message: string };
