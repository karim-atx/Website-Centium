import { Home, UtensilsCrossed, Dumbbell, HeartPulse, MoreHorizontal, Sparkles, Users, Store, User as UserIcon, CalendarDays, ClipboardList, MessageCircle, MessageSquare, Building2, UserPlus, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Primary items shown in the mobile bottom nav.
// Iteration 6 "Team": Home moves to the centre slot, where BottomNav
// renders it as the Centium mark instead of this icon/label pair.
export const primaryNavItems: NavItem[] = [
  { to: "/app/food", label: "Food", icon: UtensilsCrossed },
  { to: "/app/workout", label: "Workout", icon: Dumbbell },
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/health", label: "Health", icon: HeartPulse },
  { to: "/app/more", label: "More", icon: MoreHorizontal },
];

// V5 (QA 5.0): professionals have no personal Home/Food/Workout/Health
// tracking — "My Clients" (the "/professionals" route, which renders
// ProfessionalDashboard for this account type) is their main page instead.
// V6 (QA 6.0): Calendar, Templates (Workout Template Builder) and Messages
// replace the Home/Food/Workout/Health tabs the professional doesn't use —
// Meal Plans and Health Metrics live in More alongside the rest.
// V7 (QA 7.0): Meal Plans now takes the bottom-nav slot Messages used to
// hold — Messages moved into More instead.
export const professionalPrimaryNavItems: NavItem[] = [
  { to: "/app/professionals", label: "Clients", icon: Users },
  { to: "/app/professionals/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/professionals/templates", label: "Training", icon: ClipboardList },
  { to: "/app/professionals/meal-plans", label: "Nutrition", icon: UtensilsCrossed },
  { to: "/app/more", label: "More", icon: MoreHorizontal },
];

// Full set shown in the desktop sidebar.
export const sidebarNavItems: NavItem[] = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/food", label: "Food", icon: UtensilsCrossed },
  { to: "/app/workout", label: "Workout", icon: Dumbbell },
  { to: "/app/health", label: "Health", icon: HeartPulse },
  { to: "/app/mind", label: "Mind", icon: Sparkles },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/professionals", label: "Professionals", icon: Users },
  { to: "/app/forum", label: "Forum", icon: MessageSquare },
  // The sidebar is the only navigation at lg and above — the bottom nav is
  // `lg:hidden`, and More is reachable only from it. So a missing entry here
  // is not a longer route to a screen, it is no route at all: until this was
  // added, a signed-in client on a desktop viewport could not reach their own
  // conversations from anywhere in the UI.
  { to: "/app/messages", label: "Messages", icon: MessageCircle },
  { to: "/app/marketplace", label: "Explore", icon: Store },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
];

export const professionalSidebarNavItems: NavItem[] = [
  { to: "/app/professionals", label: "My Clients", icon: Users },
  { to: "/app/professionals/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/professionals/templates", label: "Training", icon: ClipboardList },
  { to: "/app/professionals/meal-plans", label: "Nutrition", icon: UtensilsCrossed },
  // The "Business messages" entry is gone with the device-only mock behind it;
  // real conversations, including any with an affiliated business, are here.
  { to: "/app/messages", label: "Messages", icon: MessageCircle },
  { to: "/app/professionals/health-metrics", label: "Health Metrics", icon: HeartPulse },
  // The shared forum, where a verified professional posts under their name
  // with the Professional badge. Removed for an under-18 in Sidebar.
  { to: "/app/forum", label: "Forum", icon: MessageSquare },
  { to: "/app/marketplace", label: "Explore", icon: Store },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
];

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
  classes: { to: BUSINESS_OPERATIONS_ROUTE, label: "Schedule", glyph: "schedule" },
  gym: { to: BUSINESS_OPERATIONS_ROUTE, label: "Front desk", glyph: "front-desk" },
  store: { to: BUSINESS_OPERATIONS_ROUTE, label: "Orders", glyph: "orders" },
  appointments: { to: BUSINESS_OPERATIONS_ROUTE, label: "Appointments", glyph: "appointments" },
  unknown: { to: BUSINESS_OPERATIONS_ROUTE, label: "Operations", glyph: "operations" },
};

const isStoreKind = (k: BusinessNavKind) => k === "store" || k === "appointments";

/** The bar's five tabs, left to right (Dashboard is the centre slot). */
export function businessTabs(kind: BusinessNavKind): BusinessTab[] {
  return [
    { to: "/app/business/analytics", label: "Analytics", glyph: "analytics" },
    OPERATIONS_TAB[kind],
    { to: "/app", label: "Dashboard", glyph: "mark" },
    isStoreKind(kind)
      ? { to: BUSINESS_PRODUCTS_ROUTE, label: "Products", glyph: "products" }
      : { to: "/app/business/marketplace", label: "Marketplace", glyph: "marketplace" },
    { to: "/app/more", label: "More", glyph: "more" },
  ];
}

/** Pages reached from the Operations slot today; they keep it lit. */
const OPERATIONS_PAGES = [
  BUSINESS_OPERATIONS_ROUTE,
  "/app/business/venue",
  "/app/business/gym",
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

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

export function isBusinessTabActive(tab: BusinessTab, pathname: string): boolean {
  if (tab.to === "/app") return pathname === "/app";
  if (tab.to === "/app/more") return BUSINESS_MORE_PAGES.some((p) => under(pathname, p));
  if (tab.to === BUSINESS_OPERATIONS_ROUTE) return OPERATIONS_PAGES.some((p) => under(pathname, p));
  return under(pathname, tab.to);
}

/** Team and access wording per type (COPY.md vocabulary map, Staff row). */
const TEAM_LABEL: Record<BusinessNavKind, string> = {
  classes: "Instructors",
  gym: "Team",
  store: "Staff",
  appointments: "Staff",
  unknown: "Team",
};

export interface BusinessShortcut extends NavItem {
  /** Shows the unread badge (keyed on the route, not the translated label). */
  unread?: boolean;
}

/** OURS-NAV-desktop-sidebar row 5: the More shortcuts under the five tabs. */
export function businessSidebarShortcuts(kind: BusinessNavKind): BusinessShortcut[] {
  return [
    { to: "/app/messages", label: "Messages", icon: MessageCircle, unread: true },
    { to: "/app/business/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/app/business/members", label: "Members", icon: UserPlus },
    { to: "/app/business/employees", label: TEAM_LABEL[kind], icon: Users },
    { to: "/app/business/profile", label: "Business Profile", icon: Building2 },
    { to: "/app/settings", label: "Settings", icon: Settings },
  ];
}
