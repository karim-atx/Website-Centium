// The Dashboard's data shapes, with no runtime imports, so the pure model
// (dashboardModel.ts) and its node:test file never load the Supabase client.

import type { CalendarEvent } from "../../types";
import type { DashGym } from "./gymToday";

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

export interface DashSeats {
  blocks: number;
  perUnit: number;
  capacity: number;
  used: number;
}

/** B11 · a store's Today block (DA1-011): store_orders_page rows and store_low_stock. */
export interface DashOrder {
  id: string;
  number: number;
  fulfilment: "pickup" | "delivery";
  itemCount: number;
  /** The server's label ("Member #0042", a shared first name, "Guest"). */
  label: string;
  status: "placed" | "packed" | "out_for_delivery" | "ready_for_pickup" | "completed" | "cancelled" | "returned";
  placedAt: string;
}

export interface DashStore {
  orders: DashOrder[];
  /** store_orders_page total_count: every order the store has had. */
  totalOrders: number;
  lowStock: { id: string; name: string; stock: number; category: string | null }[];
}

/** B15 · business_activity kinds (DI-03): each visible only to the permission its subject needs. */
export type ActivityKind = "booking" | "cancel" | "join" | "end" | "check_in" | "order" | "payment" | "appointment" | "review";

/** B15 · one business_activity row (realtime payload or business_recent_activity). No person id, by design. */
export interface ActivityRow {
  id: number;
  kind: ActivityKind;
  /** Masked by the server: a shared first name, "Member #0042", or "Guest". Rendered as given. */
  label: string;
  isMinor: boolean | null;
  refKind: string | null;
  refId: string | null;
  summary: string | null;
  at: string;
}

/** B15 · business_glance(): one metric the caller may hold. */
export interface GlanceFigure {
  value: number | null;
  early: boolean;
}

/** B15 · business_attention(): an item the caller can act on, never zero. */
export interface AttentionRow {
  item: string;
  count: number;
  severity: "high" | "medium" | "low";
}

export interface DashRaw {
  /** null: this account has no business_profiles row yet (a new business). */
  business: DashBusiness | null;
  classes: DashClass[];
  bookings: DashBooking[];
  members: DashMember[];
  plansCount: number;
  productsCount: number;
  /** Products shown on Explore (business_offerings.visible), for Live listings. */
  liveProductsCount: number;
  discountsCount: number;
  seats: DashSeats | null;
  team: Record<string, string>;
  events: DashEvent[];
  accessQr: boolean;
  storeDeliveryOrPickup: boolean;
  dismissed: boolean;
  /** Waitlist entries per class for today's classes (venue_class_roster). */
  waitlists: Record<string, number>;
  /** B11 store orders and low stock; null when not a store, or B11 is not on this database. */
  store: DashStore | null;
  /** B10 front desk at the selected venue (gym kind only); null when not a gym, no venue, or B10 is not on this database. */
  gym?: DashGym | null;
  /** Renewals to chase in the next 7 days (venue_renewals_due, B7 MB-05: not renewed, not ending), null without a venue. */
  renewalsDue: number | null;
  /** B15 business_glance(today) by metric (only what the caller may hold); null when the read failed. */
  glance: Record<string, GlanceFigure> | null;
  /** B15 business_glance(same weekday last week): only for the Average fill delta. */
  glanceLastWeek: Record<string, GlanceFigure> | null;
  /** B15 business_attention(); null when the read failed. */
  attention: AttentionRow[] | null;
  /** Reads that failed but did not stop the page (shown as pending, never as zero). */
  partial: string[];
}

export type DashLoad = { ok: true; raw: DashRaw } | { ok: false; message: string };
