// Website viewport v1: which sidebar row and which secondary layout a path
// belongs to (pure, so the sidebars and the layout share one answer).

export const NAV_ON = "#8F68F6";
export const NAV_OFF = "#9A94B3";
export const navInk = (on: boolean) => (on ? NAV_ON : NAV_OFF);

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

export type ClientNavKey =
  | "home" | "food" | "workout" | "health"
  | "mind" | "professionals" | "community" | "explore" | "calendar" | "messages" | "referral" | "premium" | "settings" | "more"
  | "profile";

/** Which client destination a path belongs to (one at a time). */
export function clientSidebarActive(pathname: string): ClientNavKey | null {
  if (pathname === "/app") return "home";
  if (under(pathname, "/app/food")) return "food";
  if (under(pathname, "/app/workout")) return "workout";
  if (under(pathname, "/app/health") || pathname === "/app/cycle" || pathname === "/app/contraception") return "health";
  if (under(pathname, "/app/mind")) return "mind";
  if (under(pathname, "/app/professionals")) return "professionals";
  if (under(pathname, "/app/forum")) return "community";
  if (under(pathname, "/app/marketplace")) return "explore";
  if (under(pathname, "/app/calendar")) return "calendar";
  if (under(pathname, "/app/messages")) return "messages";
  if (under(pathname, "/app/subscription")) return "premium";
  if (under(pathname, "/app/settings") || pathname === "/app/get-support") return "settings";
  if (under(pathname, "/app/profile")) return "profile";
  if (under(pathname, "/app/more") || pathname === "/app/notifications" || under(pathname, "/app/weekly-review")) return "more";
  return null;
}


export type BusinessShortcut = "messages" | "calendar" | "members" | "team" | "settings" | "more" | "profile";

/** The secondary destinations first (each has its own page), then the four tabs. */
export function businessShortcutActive(pathname: string): BusinessShortcut | null {
  if (under(pathname, "/app/messages")) return "messages";
  if (under(pathname, "/app/business/calendar")) return "calendar";
  if (under(pathname, "/app/business/members") || under(pathname, "/app/business/analytics/members/codes")) return "members";
  if (under(pathname, "/app/business/employees")) return "team";
  if (under(pathname, "/app/settings")) return "settings";
  if (under(pathname, "/app/business/profile")) return "profile";
  if (under(pathname, "/app/more") || under(pathname, "/app/business/more") || under(pathname, "/app/business/services") || under(pathname, "/app/subscription"))
    return "more";
  return null;
}


export type SecondaryKind = "business-more" | "business-settings";


/** Which secondary layout a path opens in, if any. */
export function secondaryLayoutFor(pathname: string, isBusiness: boolean): SecondaryKind | null {
  if (!isBusiness) return null;
  if (pathname === "/app/more" || under(pathname, "/app/business/more")) {
    // The help centre and business terms are reached from Settings › General.
    if (under(pathname, "/app/business/more/help") || under(pathname, "/app/business/more/business-terms")) return "business-settings";
    if (under(pathname, "/app/business/more/security") || under(pathname, "/app/business/more/deactivate")) return "business-settings";
    // Locations and hours and the team list belong to Business Profile and Team.
    if (under(pathname, "/app/business/more/locations") || under(pathname, "/app/business/more/employees") || under(pathname, "/app/business/more/business-id")) return null;
    return "business-more";
  }
  if (under(pathname, "/app/settings")) return "business-settings";
  return null;
}


/** The business Settings sections, one designed pane each (ST Settings Web). */
export const BIZ_SETTINGS_SECTIONS = ["appearance", "permissions", "security", "data", "general"] as const;
export type BizSettingsSection = (typeof BIZ_SETTINGS_SECTIONS)[number];

/** The business Settings section /app/settings shows: ?section=, Appearance by default. */
export function bizSettingsSection(search: string): BizSettingsSection {
  const s = new URLSearchParams(search).get("section");
  return (BIZ_SETTINGS_SECTIONS as readonly string[]).includes(s ?? "") ? (s as BizSettingsSection) : "appearance";
}
