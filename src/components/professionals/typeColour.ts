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
  /**
   * The directory card's View Profile fill (MO1.2, measured: #EAE6F7 purple,
   * #E1EFEC teal). New in the redesign, so the handover's own colours
   * (decision 22). "Other" is not drawn: its pill (unspecified).
   */
  button: string;
  /**
   * The filled pinned action, white ink (MO1.2.1 / MO1.2.1.1: #9A8CD6;
   * MO1.2.1.4: #6F9993, sampled): Hire and Write a review. "Other" is not
   * drawn: its main (unspecified).
   */
  cta: string;
}

const FAMILIES = {
  purple: {
    main: "rgb(var(--th-7d6bb5))",
    deep: "rgb(var(--th-5f5093))",
    pill: "rgb(var(--th-f0edf9))",
    button: "rgb(var(--th-eae6f7))",
    cta: "rgb(var(--th-9a8cd6))",
  },
  teal: {
    main: "rgb(var(--th-4f7f78))",
    deep: "rgb(var(--th-3c6b65))",
    pill: "#E7F2F0",
    button: "rgb(var(--th-e1efec))",
    cta: "rgb(var(--th-6f9993))",
  },
  other: {
    main: "rgb(var(--th-5b4a9e))",
    deep: "rgb(var(--th-463a80))",
    pill: "rgb(var(--th-e9e5f6))",
    button: "rgb(var(--th-e9e5f6))",
    cta: "rgb(var(--th-5b4a9e))",
  },
} as const;

const DARK_CARD = "#1C1F28";

// R20 (batch D): the dark pill and ink were computed from the hex above at
// runtime (tintOn, liftTo), which a theme variable cannot feed. They are the
// theme colours of their Centium results instead, so Centium is unchanged and
// the other themes map them like every other shade.
const DARK = {
  purple: { pill: "rgb(var(--th-2d2d41))", ink: "rgb(var(--th-9c8fc7))" },
  teal: { pill: "rgb(var(--th-253036))", ink: "rgb(var(--th-799e98))" },
  other: { pill: "rgb(var(--th-27273d))", ink: "rgb(var(--th-9388bf))" },
} as const;

export function typeFamily(subtype: DirectoryListing["subtype"] | string | null | undefined): keyof typeof FAMILIES {
  if (subtype === "trainer" || subtype === "physiotherapist") return "purple";
  if (subtype === "dietitian" || subtype === "doctor") return "teal";
  return "other";
}

export function typeColours(subtype: DirectoryListing["subtype"] | string | null | undefined, dark: boolean): TypeColours {
  const family = typeFamily(subtype);
  const f = FAMILIES[family];
  if (!dark) return { ...f, onMain: "#FFFFFF" };
  const { pill, ink } = DARK[family];
  // In dark the action fill is the lifted hue with near-black ink, as the
  // app's primary-fill does.
  return { main: ink, deep: ink, pill, onMain: "#0D0B1A", button: pill, cta: ink };
}

/**
 * A map pin's ground behind the initials or photo (MO1.2.2, sampled from the
 * frame: #E7E2F6 for the purple family, #E1EEEB for teal — a step deeper than
 * the pill so the pin reads on the tinted map). The avatar pins are new in
 * the redesign, so they take the handover's colours (decision 22). "Other"
 * isn't drawn on a pin and keeps its pill; dark keeps the dark pill.
 */
export function pinGround(subtype: DirectoryListing["subtype"] | string | null | undefined, dark: boolean): string {
  if (dark) return typeColours(subtype, true).pill;
  const family = typeFamily(subtype);
  if (family === "purple") return "rgb(var(--th-e7e2f6))";
  if (family === "teal") return "rgb(var(--th-e1eeeb))";
  return FAMILIES.other.pill;
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
