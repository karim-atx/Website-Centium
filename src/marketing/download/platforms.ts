// The landing page's "Download the app" button (Task O, then FM:
// design-handover/task-fm-fj/PLAN.md). One config of download links, a pure
// platform detection that reads only what the browser reports (nothing
// stored, nothing sent), and what to render for each platform.

import { tk } from "../../i18n/core";
import { isDesktop } from "../../platform/desktop";

export type LinkedPlatform = "windows" | "mac" | "ios" | "android";
export type Platform = LinkedPlatform | "chromeos" | "linux" | "unknown";
/** The Windows installer's architecture (FM, D8). */
export type WindowsArch = "x64" | "arm64";

/** Windows has one installer per architecture. */
export type WindowsLinks = Record<WindowsArch, string>;

export interface DownloadLinks {
  windows: WindowsLinks | null;
  mac: string | null;
  ios: string | null;
  android: string | null;
}

/** Where the Desktop session publishes the Windows app: stable "latest"
 *  addresses (downloads.centium.atraxia.org goes live with the first desktop
 *  release). */
const DOWNLOADS = "https://downloads.centium.atraxia.org/windows/";

/** Each platform's link, null until it ships. Filling one in is a one-line
 *  change: the button and the "Other platforms" list switch over on their
 *  own. Where a platform has none, its visitors see Get Started alone. */
export const DOWNLOAD_LINKS: DownloadLinks = {
  windows: { x64: `${DOWNLOADS}Centium-setup-x64.exe`, arm64: `${DOWNLOADS}Centium-setup-arm64.exe` },
  mac: null, // https://downloads.centium.atraxia.org/mac/… (when the Mac app ships)
  ios: null, // https://apps.apple.com/app/id<id>
  android: null, // https://play.google.com/store/apps/details?id=org.atraxia.centium
};

/** `{ "latest": "1.0.0", "versions": [...] }` (CORS allows this site, no-cache). */
export const WINDOWS_VERSIONS_URL = `${DOWNLOADS}versions.json`;
/** `<sha256>  Centium_<v>_x64-setup.exe` and `…_arm64-setup.exe`, one per line. */
export const WINDOWS_SUMS_URL = `${DOWNLOADS}SHA256SUMS.txt`;

/** The navigator fields detection reads, and nothing else. */
export interface NavLike {
  userAgentData?: { platform?: string; getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }> } | null;
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

/** The landing's desktop download layout (the two buttons, everything else
 *  in the panel): 1024px and wider, as before, or a computer at any width.
 *  The width alone missed computers whose CSS width is under 1024px: browser
 *  zoom (1024px at 110% is 931px), Windows display scaling (1366px at 150%
 *  is 910px) or a window that is not maximised. A computer here is a desktop
 *  system (not iPhone, iPad or Android) whose main pointer is a mouse or
 *  trackpad that can hover; phones and tablets keep the layout below 1024px. */
export function desktopLayout(wide: boolean, finePointer: boolean, platform: Platform): boolean {
  return wide || (finePointer && (platform === "windows" || platform === "mac" || platform === "linux" || platform === "chromeos"));
}

/** ARM64 when the browser reports an ARM CPU, x64 otherwise (D8). */
export function pickArch(architecture: string | null | undefined): WindowsArch {
  return architecture === "arm" ? "arm64" : "x64";
}

/** Windows' architecture, from Chromium's userAgentData.getHighEntropyValues
 *  (approved, D8: browser-reported, nothing stored). Any failure, or a
 *  browser without it, is x64. */
export async function detectWindowsArch(nav: NavLike): Promise<WindowsArch> {
  try {
    const v = await nav.userAgentData?.getHighEntropyValues?.(["architecture"]);
    return pickArch(v?.architecture);
  } catch {
    return "x64";
  }
}

/** The one label, on every system with a download (FM 1). */
export const DOWNLOAD_THE_APP = tk("Download the app");

export interface DownloadOption {
  id: LinkedPlatform;
  /** English key; render with t(). */
  label: string;
  href: string;
  /** Windows: the installer's architecture, and the other one's link ("Other download"). */
  arch?: WindowsArch;
  other?: { arch: WindowsArch; href: string };
}

const otherArch = (a: WindowsArch): WindowsArch => (a === "x64" ? "arm64" : "x64");

/** One platform's option, or null while it has no link. */
export function optionFor(p: LinkedPlatform, links: DownloadLinks, arch: WindowsArch = "x64"): DownloadOption | null {
  if (p === "windows") {
    const w = links.windows;
    if (!w) return null;
    const o = otherArch(arch);
    return { id: p, label: DOWNLOAD_THE_APP, href: w[arch], arch, other: { arch: o, href: w[o] } };
  }
  const href = links[p];
  return href ? { id: p, label: DOWNLOAD_THE_APP, href } : null;
}

/** What the second button shows: the system's own download, Windows' (x64)
 *  for an unknown system (decision 6), nothing on ChromeOS and Linux, and
 *  nothing inside the desktop app (D1). null hides the button: Get Started
 *  stands alone (decision 1). */
export function downloadOption(platform: Platform, links: DownloadLinks, arch: WindowsArch = "x64", inDesktop: boolean = isDesktop()): DownloadOption | null {
  if (inDesktop) return null;
  switch (platform) {
    case "windows":
      return optionFor("windows", links, arch);
    case "unknown":
      return optionFor("windows", links, "x64");
    case "mac":
    case "ios":
    case "android":
      return optionFor(platform, links);
    default:
      return null;
  }
}

export interface PlatformEntry {
  id: LinkedPlatform;
  /** English key for the row's name. */
  name: string;
  /** The row's link, or null while the platform has none ("Coming soon", plain text). */
  option: DownloadOption | null;
}

/** "Coming soon" in the list, for a platform with no link yet (existing key, Arabic «قريبًا»). */
export const COMING_SOON = tk("Coming soon");

/** The "Other platforms" list: Windows, Mac, iPhone and iPad, Android, each
 *  with "Download the app" and its link, or "Coming soon" (decision 2: no
 *  Browser row; ChromeOS and Linux have no rows). Windows' row offers both
 *  installers; inside the desktop app it is left out (D1). */
export function platformList(links: DownloadLinks, arch: WindowsArch = "x64", inDesktop: boolean = isDesktop()): PlatformEntry[] {
  const row = (id: LinkedPlatform, name: string): PlatformEntry => ({ id, name, option: optionFor(id, links, arch) });
  return [
    ...(inDesktop ? [] : [row("windows", tk("Windows"))]),
    row("mac", tk("Mac")),
    row("ios", tk("iPhone and iPad")),
    row("android", tk("Android")),
  ];
}

/** versions.json's latest version, or null if it isn't there or isn't a
 *  plain dotted version (shown as "version X", so nothing else gets through). */
export function parseVersion(json: unknown): string | null {
  const v = json && typeof json === "object" ? (json as { latest?: unknown }).latest : null;
  return typeof v === "string" && /^\d{1,5}(\.\d{1,5}){0,3}$/.test(v) ? v : null;
}

export interface Checksum {
  arch: WindowsArch;
  file: string;
  sha256: string;
}

/** SHA256SUMS.txt's installer lines (`<sha256>  Centium_<v>_<arch>-setup.exe`),
 *  for `version` when it is known and listed, else every installer line.
 *  Anything else in the file is ignored. */
export function parseSums(text: string, version: string | null): Checksum[] {
  const all: (Checksum & { v: string })[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^([0-9a-fA-F]{64}) [ *]?(Centium_(\d{1,5}(?:\.\d{1,5}){0,3})_(x64|arm64)-setup\.exe)$/.exec(line.trim());
    if (m) all.push({ sha256: m[1].toLowerCase(), file: m[2], v: m[3], arch: m[4] as WindowsArch });
  }
  const mine = version ? all.filter((c) => c.v === version) : [];
  return (mine.length ? mine : all).map(({ arch, file, sha256 }) => ({ arch, file, sha256 }));
}

/** Reads a downloads file once per page load; null on any failure (quietly:
 *  the version and the checksums are simply not shown). */
const reads = new Map<string, Promise<string | null>>();
export function readOnce(url: string): Promise<string | null> {
  let r = reads.get(url);
  if (!r) {
    r = fetch(url, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" })
      .then((res) => (res.ok ? res.text() : null))
      .catch(() => null);
    reads.set(url, r);
  }
  return r;
}

export async function readWindowsVersion(): Promise<string | null> {
  const text = await readOnce(WINDOWS_VERSIONS_URL);
  if (text === null) return null;
  try {
    return parseVersion(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function readWindowsSums(version: string | null): Promise<Checksum[]> {
  const text = await readOnce(WINDOWS_SUMS_URL);
  return text === null ? [] : parseSums(text, version);
}
