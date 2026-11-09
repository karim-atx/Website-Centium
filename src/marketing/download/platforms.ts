// Task O (design-handover/task-o/PLAN.md): the landing page's download
// button. One config of store / download links, a pure platform detection
// that reads only what the browser reports (nothing stored, nothing sent),
// and what to render for each platform.

import { tk } from "../../i18n/core";

export type LinkedPlatform = "windows" | "mac" | "ios" | "android";
export type Platform = LinkedPlatform | "chromeos" | "linux" | "unknown";

/** Each platform's link, null until it ships. Filling one in is a one-line
 *  change: the button and the "Other platforms" list switch over on their own. */
export const DOWNLOAD_LINKS: Record<LinkedPlatform, string | null> = {
  windows: null, // https://apps.microsoft.com/detail/<product id>
  mac: null, // https://centium.atraxia.org/download/Centium.dmg (or wherever the build lives)
  ios: null, // https://apps.apple.com/app/id<id>
  android: null, // https://play.google.com/store/apps/details?id=org.atraxia.centium
};

/** The navigator fields detection reads, and nothing else (no
 *  getHighEntropyValues: userAgentData.platform is a low-entropy hint). */
export interface NavLike {
  userAgentData?: { platform?: string } | null;
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}

/** The visitor's system, in PLAN.md §4's order: iPhone/iPod, iPad (iPadOS
 *  reports "Macintosh" with touch), Android, Windows, Mac, ChromeOS, Linux. */
export function detectPlatform(nav: NavLike): Platform {
  const hint = nav.userAgentData?.platform ?? "";
  const ua = nav.userAgent ?? "";
  const plat = nav.platform ?? "";
  const touch = nav.maxTouchPoints ?? 0;
  if (/iPhone|iPod/.test(ua) || /^(iPhone|iPod)/.test(plat) || hint === "iOS") return "ios";
  if (/iPad/.test(ua) || plat === "iPad" || ((/Macintosh/.test(ua) || plat === "MacIntel") && touch > 1)) return "ios";
  if (hint === "Android" || /Android/.test(ua)) return "android";
  if (hint === "Windows" || /Windows/.test(ua) || /^Win/.test(plat)) return "windows";
  if (hint === "macOS" || /Macintosh|Mac OS X/.test(ua) || /^Mac/.test(plat)) return "mac";
  if (hint === "Chrome OS" || hint === "ChromeOS" || /CrOS/.test(ua)) return "chromeos";
  if (hint === "Linux" || /Linux|X11/.test(ua) || /Linux/.test(plat)) return "linux";
  return "unknown";
}

export interface DownloadOption {
  /** The config key, or "browser" for the fallback. */
  id: LinkedPlatform | "browser";
  /** English key; render with t(). */
  label: string;
  href: string;
}

/** The one fallback everywhere (decision 6), Linux and ChromeOS included. */
export const BROWSER_OPTION: DownloadOption = { id: "browser", label: tk("Open Centium in your browser"), href: "/app" };

// Store badges come later (decision 7): until then iOS and Android with a
// link set get a plain button in the same style as the others, and the
// official App Store / Google Play badges replace it when the apps are live.
const LABEL: Record<LinkedPlatform, string> = {
  windows: tk("Download for Windows"),
  mac: tk("Download for Mac"),
  ios: tk("Download on the App Store"),
  android: tk("Get it on Google Play"),
};

/** One platform's option: its link, or the browser fallback while it has none. */
export function optionFor(p: LinkedPlatform, links: Record<LinkedPlatform, string | null>): DownloadOption {
  const href = links[p];
  return href ? { id: p, label: LABEL[p], href } : BROWSER_OPTION;
}

/** What the button shows for a platform. Unknown shows both desktop options,
 *  each falling back on its own; two identical fallbacks show once. */
export function downloadOptions(platform: Platform, links: Record<LinkedPlatform, string | null>): DownloadOption[] {
  switch (platform) {
    case "windows":
    case "mac":
    case "ios":
    case "android":
      return [optionFor(platform, links)];
    case "chromeos":
    case "linux":
      return [BROWSER_OPTION];
    default: {
      const both = [optionFor("windows", links), optionFor("mac", links)];
      return both[0].href === both[1].href ? [both[0]] : both;
    }
  }
}

export interface PlatformEntry {
  /** English key for the row's name. */
  name: string;
  /** The row's link, or null while the platform has none ("Coming soon", plain text). */
  option: DownloadOption | null;
}

/** "Coming soon" in the list, for a platform with no link yet (existing key, Arabic «قريبًا»). */
export const COMING_SOON = tk("Coming soon");

/** The "Other platforms" list (Karim, 2026-11-09): the four platforms, each
 *  with its link or "Coming soon", then one Browser row to /app. ChromeOS
 *  and Linux have no rows of their own: they use the Browser row. */
export function platformList(links: Record<LinkedPlatform, string | null>): PlatformEntry[] {
  const row = (p: LinkedPlatform, name: string): PlatformEntry => ({ name, option: links[p] ? optionFor(p, links) : null });
  return [
    row("windows", tk("Windows")),
    row("mac", tk("Mac")),
    row("ios", tk("iPhone and iPad")),
    row("android", tk("Android")),
    { name: tk("Browser"), option: BROWSER_OPTION },
  ];
}
