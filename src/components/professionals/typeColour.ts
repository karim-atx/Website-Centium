import { liftTo, tintOn } from "../../data/folderColors";
import type { DirectoryListing } from "../../services/directory";

// MO1.2's type colours (B3): "PT & Physio: #7D6BB5 (deep #5F5093, pill
// #F0EDF9). Dietitian & Doctor/GP: #4F7F78 (deep #3C6B65, pill #E7F2F0).
// Others: #5B4A9E (deep #463A80, pill #E9E5F6)." They colour the directory
// card, the profile, its pinned actions and the map pins.
//
// DARK: the pill is the hue at 18% on the dark card, and both inks are the
// hue lifted until they reach 4.5:1 on that pill, so no light patch is left
// and the text still reads.

export interface TypeColours {
  /** Headline, type label, section labels, the primary action's fill. */
  main: string;
  /** The name and text on the pill. */
  deep: string;
  /** Pills, the secondary action and the avatar ground. */
  pill: string;
  /** Text on `main` (the primary action). */
  onMain: string;
}

const FAMILIES = {
  purple: { main: "#7D6BB5", deep: "#5F5093", pill: "#F0EDF9" },
  teal: { main: "#4F7F78", deep: "#3C6B65", pill: "#E7F2F0" },
  other: { main: "#5B4A9E", deep: "#463A80", pill: "#E9E5F6" },
} as const;

const DARK_CARD = "#1C1F28";

export function typeFamily(subtype: DirectoryListing["subtype"] | string | null | undefined): keyof typeof FAMILIES {
  if (subtype === "trainer" || subtype === "physiotherapist") return "purple";
  if (subtype === "dietitian" || subtype === "doctor") return "teal";
  return "other";
}

export function typeColours(subtype: DirectoryListing["subtype"] | string | null | undefined, dark: boolean): TypeColours {
  const f = FAMILIES[typeFamily(subtype)];
  if (!dark) return { ...f, onMain: "#FFFFFF" };
  const pill = tintOn(f.main, 0.18, DARK_CARD);
  const ink = liftTo(f.main, pill, 4.5);
  // In dark the action fill is the lifted hue with near-black ink, as the
  // app's primary-fill does.
  return { main: ink, deep: ink, pill, onMain: "#0D0B1A" };
}

/** The reviews pill (MO1.2.1: "#D9A441 / #FBF3E2 / #9A7424"); dark keeps the gold on a dark tint (B7). */
export function goldPill(dark: boolean): { bg: string; border: string; ink: string; star: string } {
  if (!dark) return { bg: "#FBF3E2", border: "#D9A441", ink: "#9A7424", star: "#D9A441" };
  const bg = tintOn("#D9A441", 0.16, DARK_CARD);
  return { bg, border: "rgba(217,164,65,0.55)", ink: liftTo("#D9A441", bg, 4.5), star: "#D9A441" };
}

/** Initials for an avatar with no photo (B4): "Rami Khoury" → "RK", "Noor" → "N". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
