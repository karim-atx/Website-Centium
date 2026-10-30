import { Home, UtensilsCrossed, Dumbbell, HeartPulse, MoreHorizontal, Users, Store, User as UserIcon, CalendarDays, MessageCircle, MessageSquare, Building2, UserPlus, Settings, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { tk } from "../../i18n/core";
import { PRO_ROUTES, SLOT4, type ProLane, type Slot4Glyph } from "../pro/subtypeLanes";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Primary items shown in the mobile bottom nav.
// Iteration 6 "Team": Home moves to the centre slot, where BottomNav
// renders it as the Centium mark instead of this icon/label pair.
export const primaryNavItems: NavItem[] = [
  { to: "/app/food", label: tk("Food"), icon: UtensilsCrossed },
  { to: "/app/workout", label: tk("Workout"), icon: Dumbbell },
  { to: "/app", label: tk("Home"), icon: Home },
  { to: "/app/health", label: tk("Health"), icon: HeartPulse },
  { to: "/app/more", label: tk("More"), icon: MoreHorizontal },
];

// (The client desktop sidebar list went with the client sidebar: the client app
// is one phone column at every width, Handover 2026-09-29. The Sidebar renders
// for business and professional accounts only.)


// ---------------------------------------------------------------------------
// Release 3 · Professional UI (HANDOVER d "Navbar per subtype", NV1): one
// bar for every lane. Clients, Calendar, Home as the Centium mark in the
// centre, slot 4 by lane (Library, Meal plans or Insights), More.
// ---------------------------------------------------------------------------

export type ProGlyphKey = "clients" | "calendar" | "mark" | Slot4Glyph | "more";

export interface ProTab {
  to: string;
  label: string;
  glyph: ProGlyphKey;
}

/** The bar's five tabs, left to right (Home is the centre slot). */
export function proTabs(lane: ProLane): ProTab[] {
  const slot4 = SLOT4[lane];
  return [
    { to: PRO_ROUTES.clients, label: tk("Clients"), glyph: "clients" },
    { to: PRO_ROUTES.calendar, label: tk("Calendar"), glyph: "calendar" },
    { to: PRO_ROUTES.home, label: tk("Home"), glyph: "mark" },
    { to: slot4.to, label: slot4.label, glyph: slot4.glyph },
    { to: PRO_ROUTES.more, label: tk("More"), glyph: "more" },
  ];
}

/**
 * More is lit on More, its sub-pages and every page reached from it: the
 * shared account pages, Messages, Explore, Community, the teams this
 * professional is on (and the business console pages a staff seat opens,
 * which keep this bar), and the client directory a professional can still
 * open from Explore.
 */
export const PRO_MORE_PAGES = [
  "/app/more",
  "/app/profile",
  "/app/subscription",
  "/app/settings",
  "/app/messages",
  "/app/marketplace",
  // Market + Share 3.0 (D-39): More › Explore opens the professional's
  // Marketplace; P-MA.1–P-MA.6 draw the bar with More lit.
  "/app/pro/marketplace",
  "/app/forum",
  "/app/businesses",
  "/app/business",
  "/app/store",
  "/app/appointments",
  "/app/professionals",
];

export function isProTabActive(tab: ProTab, pathname: string): boolean {
  if (tab.to === PRO_ROUTES.home) return pathname === PRO_ROUTES.home;
  if (tab.to === PRO_ROUTES.more) return PRO_MORE_PAGES.some((p) => under(pathname, p));
  return under(pathname, tab.to);
}

/** The desktop sidebar's More rows under the five tabs (MO1 v7 destinations that have a page). */
export function proSidebarShortcuts(): BusinessShortcut[] {
  return [
    { to: "/app/messages", label: tk("Messages"), icon: MessageCircle, unread: true },
    { to: "/app/marketplace", label: tk("Explore"), icon: Store },
    { to: "/app/forum", label: tk("Community"), icon: MessageSquare },
    { to: `${PRO_ROUTES.more}/practice-insights`, label: tk("Practice insights"), icon: TrendingUp },
    { to: `${PRO_ROUTES.more}/businesses`, label: tk("Businesses"), icon: Building2 },
    { to: "/app/profile", label: tk("Profile"), icon: UserIcon },
    { to: "/app/settings", label: tk("Settings"), icon: Settings },
  ];
}

// ---------------------------------------------------------------------------
// v6 Business UI (X-31, V6-54, NAV-001 rows 7-8, S2): one bar per business
// type. A business account's main page ("/app") renders BusinessDashboard,
// drawn as the Centium mark in the centre slot.
// - Classes (business_type `studio`): Analytics · Schedule · [Dashboard] · Marketplace · More
// - Gym: Analytics · Front desk · [Dashboard] · Marketplace · More
// - Store (every store sub-type): Analytics · Orders · [Dashboard] · Products · More
// - Wellness Service with appointments only: the Orders slot becomes Appointments
// - Type not known yet: the generic Operations / Marketplace pair
// The Operations slot keeps one route for every type (NAV-001 row 8); the
// pages it opens today (venue console, gym plans, employees, classes) light
// it too. Store Products is its own route.
// ---------------------------------------------------------------------------

export type BusinessNavKind = "classes" | "gym" | "store" | "appointments" | "unknown";

const STORE_TYPES = new Set(["store", "supplement_store", "equipment_seller", "wellness_service", "clothing_store", "meal_prep_service"]);

export function businessNavKind(
  businessType: string | null | undefined,
  storeSettings: { sells_products: boolean; offers_appointments: boolean } | null
): BusinessNavKind {
  if (businessType === "studio") return "classes";
  if (businessType === "gym") return "gym";
  if (businessType === "wellness_service" && storeSettings?.offers_appointments && !storeSettings.sells_products) return "appointments";
  if (businessType && STORE_TYPES.has(businessType)) return "store";
  return "unknown";
}

export type BusinessGlyphKey = "mark" | "analytics" | "operations" | "schedule" | "front-desk" | "orders" | "appointments" | "marketplace" | "products" | "more";

export interface BusinessTab {
  to: string;
  label: string;
  glyph: BusinessGlyphKey;
}

export const BUSINESS_OPERATIONS_ROUTE = "/app/business/operations";
export const BUSINESS_PRODUCTS_ROUTE = "/app/business/products";

const OPERATIONS_TAB: Record<BusinessNavKind, BusinessTab> = {
  classes: { to: BUSINESS_OPERATIONS_ROUTE, label: tk("Schedule"), glyph: "schedule" },
  gym: { to: BUSINESS_OPERATIONS_ROUTE, label: tk("Front desk"), glyph: "front-desk" },
  store: { to: BUSINESS_OPERATIONS_ROUTE, label: tk("Orders"), glyph: "orders" },
  appointments: { to: BUSINESS_OPERATIONS_ROUTE, label: tk("Appointments"), glyph: "appointments" },
  unknown: { to: BUSINESS_OPERATIONS_ROUTE, label: tk("Operations"), glyph: "operations" },
};

const isStoreKind = (k: BusinessNavKind) => k === "store" || k === "appointments";

/** The bar's five tabs, left to right (Dashboard is the centre slot). */
export function businessTabs(kind: BusinessNavKind): BusinessTab[] {
  return [
    { to: "/app/business/analytics", label: tk("Analytics"), glyph: "analytics" },
    OPERATIONS_TAB[kind],
    { to: "/app", label: tk("Dashboard"), glyph: "mark" },
    isStoreKind(kind)
      ? { to: BUSINESS_PRODUCTS_ROUTE, label: tk("Products"), glyph: "products" }
      : { to: "/app/business/marketplace", label: tk("Marketplace"), glyph: "marketplace" },
    { to: "/app/more", label: tk("More"), glyph: "more" },
  ];
}

/** Pages reached from the Operations slot today; they keep it lit. */
const OPERATIONS_PAGES = [
  BUSINESS_OPERATIONS_ROUTE,
  "/app/business/venue",
  "/app/business/classes",
  // v6 Batch 4: Store order / return detail and the appointment pages.
  "/app/business/orders",
  "/app/business/appointments",
];

/**
 * NAV-001 S2, kept: More is lit on More, Profile, Subscription, Settings,
 * Business Profile, Messages, Calendar and every More sub-page.
 */
export const BUSINESS_MORE_PAGES = [
  "/app/more",
  "/app/profile",
  "/app/subscription",
  "/app/settings",
  "/app/business/profile",
  "/app/business/more",
  // V6-54: the team lives under More › Team and access.
  "/app/business/employees",
  "/app/messages",
  "/app/business/calendar",
  // v6 Batch 4 (V6-158): services and free slots are set up under More.
  "/app/business/services",
];

/**
 * Pages that light Marketplace (Products for a store) though they live
 * outside it: Memberships (B-MA.5 / B-MA.5.1) and Redeem a voucher (B-MA.4),
 * reached from the Marketplace, and Hiring (B-MA.8, W4); the boards draw the bar with Marketplace lit
 * (W3 lead decision, R1 polish). The front-desk routes keep Front desk lit.
 */
// B-MA.9 (W5 gate): the business notifications page is drawn with Marketplace lit.
const MARKETPLACE_PAGES = ["/app/business/gym", "/app/business/redeem", "/app/business/hiring", "/app/business/notifications"];

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

export function isBusinessTabActive(tab: BusinessTab, pathname: string): boolean {
  if (tab.to === "/app") return pathname === "/app";
  if (tab.to === "/app/more") return BUSINESS_MORE_PAGES.some((p) => under(pathname, p));
  if (tab.to === BUSINESS_OPERATIONS_ROUTE) return OPERATIONS_PAGES.some((p) => under(pathname, p));
  if (tab.to === "/app/business/marketplace" || tab.to === BUSINESS_PRODUCTS_ROUTE) return under(pathname, tab.to) || MARKETPLACE_PAGES.some((p) => under(pathname, p));
  return under(pathname, tab.to);
}

/** Team and access wording per type (COPY.md vocabulary map, Staff row). */
const TEAM_LABEL: Record<BusinessNavKind, string> = {
  classes: tk("Instructors"),
  gym: tk("Team"),
  store: tk("Staff"),
  appointments: tk("Staff"),
  unknown: tk("Team"),
};

export interface BusinessShortcut extends NavItem {
  /** Shows the unread badge (keyed on the route, not the translated label). */
  unread?: boolean;
}

/** OURS-NAV-desktop-sidebar row 5: the More shortcuts under the five tabs. */
export function businessSidebarShortcuts(kind: BusinessNavKind): BusinessShortcut[] {
  return [
    { to: "/app/messages", label: tk("Messages"), icon: MessageCircle, unread: true },
    { to: "/app/business/calendar", label: tk("Calendar"), icon: CalendarDays },
    { to: "/app/business/members", label: tk("Members"), icon: UserPlus },
    { to: "/app/business/employees", label: TEAM_LABEL[kind], icon: Users },
    { to: "/app/business/profile", label: tk("Business Profile"), icon: Building2 },
    { to: "/app/settings", label: tk("Settings"), icon: Settings },
  ];
}
