import { tk } from "../../i18n/core";
// Who may use which part of the business console (B6 roles, B7 enforcement).
// Pure: no Supabase, so the node tests import it directly.
//
// THE MODEL (HANDOVER_API "B7 · B6's permissions become real"):
// - The owner (business_profiles.profile_id = auth.uid()) can do everything,
//   which is business_can()'s first branch.
// - An employee holds an ACCEPTED business_employees row and a permissions
//   array. Each console area asks business_can(business, <permission>):
//   members (members, codes, plans, invites, the team list), schedule
//   (classes, opening hours), front_desk (class bookings, enrolling), store
//   (store listings and items), marketing (offerings, discounts), revenue,
//   messages and venues (edit a venue's details).
// - Still the owner's alone: adding or deleting a venue, renaming the
//   business or anything else on business_profiles (the listing switch, the
//   profile, photos on it), and every direct business_employees write. The
//   team is changed through invite_employee() / set_employee_terms(), which
//   consult business_can themselves.

export const CONSOLE_PERMISSIONS = ["schedule", "front_desk", "members", "messages", "revenue", "store", "marketing", "venues"] as const;
export type ConsolePermission = (typeof CONSOLE_PERMISSIONS)[number];

/** One business this account can open the console for. */
export interface ConsoleSeat {
  businessId: string;
  businessName: string;
  isOwner: boolean;
  /** Every permission for the owner; the employment's array for staff. */
  permissions: ConsolePermission[];
  /** business_employees.role for staff; null for the owner. */
  role: string | null;
  /** business_profiles.business_type (gym, studio, a store type), for the addresses a seat opens. */
  businessType: string | null;
}

export interface ConsoleAccess {
  /** The business the console is showing: the owner's own, else the chosen staff seat. */
  current: ConsoleSeat | null;
  /** Every seat: the owned business first, then accepted employments with at least one permission. */
  seats: ConsoleSeat[];
}

export const NO_ACCESS: ConsoleAccess = { current: null, seats: [] };

/** The Team page's names for each permission (PersonTerms PERMISSIONS titles), for "ask for access" lines. */
export const PERMISSION_LABEL: Record<ConsolePermission, string> = {
  schedule: tk("Edit the schedule"),
  front_desk: tk("Front desk"),
  members: tk("Members and team"),
  messages: tk("Message booked members"),
  revenue: tk("See Revenue"),
  store: tk("Store"),
  marketing: tk("Marketing"),
  venues: tk("Venues"),
};

export const isConsolePermission =(p: string): p is ConsolePermission => (CONSOLE_PERMISSIONS as readonly string[]).includes(p);

/** Unknown strings are dropped, so a future server value never widens what the client shows. */
export const cleanPermissions = (raw: readonly string[] | null | undefined): ConsolePermission[] =>
  [...new Set((raw ?? []).filter(isConsolePermission))];

export interface OwnedRow {
  id: string;
  business_name: string | null;
  business_type?: string | null;
}
export interface EmploymentRow {
  business_id: string;
  permissions: string[] | null;
  accepted_at: string | null;
  role: string | null;
}

/**
 * The seats from the two reads. The owned business wins: an owner who is also
 * on somebody else's team keeps their own console (the business account's
 * whole app is built around it). Staff seats need an ACCEPTED employment (B6:
 * an unaccepted one is no key to anything). A seat with no permissions is
 * kept (it opens nothing, but the console's no-access card can then name the
 * business and send the person to its owner); a seat that opens something is
 * preferred when none was chosen.
 */
export function buildAccess(
  owned: OwnedRow | null,
  employments: EmploymentRow[],
  names: Map<string, { name: string; type: string | null }>,
  chosen: string | null
): ConsoleAccess {
  const seats: ConsoleSeat[] = [];
  if (owned) {
    seats.push({ businessId: owned.id, businessName: owned.business_name?.trim() || "Your business", isOwner: true, permissions: [...CONSOLE_PERMISSIONS], role: null, businessType: owned.business_type ?? null });
  }
  for (const e of employments) {
    if (!e.accepted_at || e.business_id === owned?.id) continue;
    const permissions = cleanPermissions(e.permissions);
    const n = names.get(e.business_id);
    seats.push({ businessId: e.business_id, businessName: n?.name ?? "A business", isOwner: false, permissions, role: e.role, businessType: n?.type ?? null });
  }
  const current = owned ? seats[0] : (seats.find((s) => s.businessId === chosen) ?? seats.find((s) => s.permissions.length > 0) ?? seats[0] ?? null);
  return { current, seats };
}

export const seatCan = (seat: ConsoleSeat | null, p: ConsolePermission): boolean => !!seat && (seat.isOwner || seat.permissions.includes(p));

/** What a console area needs: one permission, or "owner" for the areas B7 leaves with the owner. */
export type ConsoleNeed = ConsolePermission | "owner";

export const seatMeets = (seat: ConsoleSeat | null, need: ConsoleNeed): boolean => (need === "owner" ? !!seat?.isOwner : seatCan(seat, need));

/** The console areas a staff seat can open, in the order the professional's Your businesses page lists them. */
export interface StaffArea {
  key: string;
  label: string;
  desc: string;
  to: string;
  need: ConsolePermission;
}

/**
 * The areas per permission. Business type decides some addresses (a gym's
 * Front desk is Operations; a classes business's Schedule is Operations too),
 * so the caller passes the type it knows; unknown falls back to the pages
 * that exist for every type.
 */
/** The console lane for a business type: studio is Classes, gym is Gym, the store types are Store. */
export const laneOf = (businessType: string | null): "gym" | "classes" | "store" | "unknown" =>
  businessType === "gym" ? "gym" : businessType === "studio" ? "classes" : businessType ? "store" : "unknown";

export function staffAreas(seat: ConsoleSeat, type: "gym" | "classes" | "store" | "unknown" = laneOf(seat.businessType)): StaffArea[] {
  const out: StaffArea[] = [];
  const add = (a: StaffArea) => seatCan(seat, a.need) && out.push(a);
  add({ key: "members", label: type === "classes" ? "Clients" : type === "store" ? "Customers" : "Members", desc: "Members, member codes and plans", to: "/app/business/analytics/members", need: "members" });
  if (type === "gym") add({ key: "frontdesk", label: tk("Front desk"), desc: "Check members in and see passes", to: "/app/business/operations", need: "front_desk" });
  if (type !== "store") add({ key: "schedule", label: "Schedule", desc: "Classes, times and instructors", to: "/app/business/classes", need: "schedule" });
  if (type === "store") add({ key: "store", label: "Products and orders", desc: "Your store's products and orders", to: "/app/business/products", need: "store" });
  add({ key: "marketing", label: "Marketplace", desc: "Offers, discounts and promotions", to: type === "store" ? "/app/business/products?tab=promotions" : "/app/business/marketplace", need: "marketing" });
  if (type !== "store") add({ key: "team", label: type === "classes" ? "Instructors" : "Team", desc: "Who works here and what they can do", to: "/app/business/employees", need: "members" });
  add({ key: "venues", label: "Locations", desc: "Venue names, addresses and time zones", to: "/app/business/more/locations", need: "venues" });
  add({ key: "revenue", label: "Revenue", desc: "Payments recorded at the desk", to: "/app/business/analytics/revenue", need: "revenue" });
  return out;
}
