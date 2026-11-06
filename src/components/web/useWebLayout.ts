import { useSyncExternalStore } from "react";

// Website viewport v1 (handover section 0 and 2): the web layouts apply from
// 1024px wide and only there. Below it every screen renders exactly as the
// mobile app does (431 to 1023px included). The full sidebar (256) is drawn at
// 1440 and the rail (80) at 1024; between the two designed sizes the rail stays
// until the content beside the full sidebar is as wide as the 1024 frame's.
export const WEB_QUERY = "(min-width: 1024px)";
export const FULL_SIDEBAR_QUERY = "(min-width: 1280px)";

export const SIDEBAR_W = 256;
export const RAIL_W = 80;
/**
 * Section 2.1 (wide screens, every UI): above 1440 the content area grows to
 * about 1600 beside the sidebar instead of stopping at 1280; text-heavy pages
 * (Settings, forms, profiles, More panes) keep a reading width of about 1280.
 * At 1440 and 1024 both caps are wider than the content area, so the designed
 * frames are unchanged.
 */
export const WEB_CONTENT_MAX = 1600;
export const WEB_READING_MAX = 1280;

function subscribe(query: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  };
}

const matches = (query: string) => () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;

const subWeb = subscribe(WEB_QUERY);
const subFull = subscribe(FULL_SIDEBAR_QUERY);
const isWeb = matches(WEB_QUERY);
const isFull = matches(FULL_SIDEBAR_QUERY);
const no = () => false;

export interface WebLayout {
  /** At least 1024px wide: the web shell and the web pages apply. */
  web: boolean;
  /** The sidebar is the 80px rail (1024 to 1279px). */
  rail: boolean;
  /** The sidebar's width in px (0 below 1024). */
  sidebarW: number;
}

export function useWebLayout(): WebLayout {
  const web = useSyncExternalStore(subWeb, isWeb, no);
  const full = useSyncExternalStore(subFull, isFull, no);
  const rail = web && !full;
  return { web, rail, sidebarW: web ? (rail ? RAIL_W : SIDEBAR_W) : 0 };
}

/** Only the boolean, for a branch between a mobile and a web component. */
export function useIsWeb(): boolean {
  return useSyncExternalStore(subWeb, isWeb, no);
}

/** Section 2.1: at 1920 and wider, widget and card grids add a column (3 per row at 1440, 4 at 1920). */
export const WIDE_QUERY = "(min-width: 1920px)";
const subWide = subscribe(WIDE_QUERY);
const isWide = matches(WIDE_QUERY);
export function useIsWide(): boolean {
  return useSyncExternalStore(subWide, isWide, no);
}
