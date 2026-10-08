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

// v6 (MO1.2 #17-#39, MO1.2.1.5.2 #3, #9, #36): the handover's own dark
// column for the two drawn families. Purple: name, headline, type line and
// pill ink #C3B3FB on the pill #303141. Teal: name and pill ink #93C1B9 on
// #293339, the headline / type line / pill icons #4F7F78 as drawn (2.9:1 on
// the card: kept literal, QA flag only, V6-94). The filled action keeps the
// app's dark primary fill with #0D0B1A ink (MO1.2.1.5.2 #22: #A991FE).
// "Other" is not drawn: it keeps the earlier derived pair (R20, batch D).
const DARK = {
  purple: { pill: "rgb(var(--th-303141))", ink: "rgb(var(--th-c3b3fb))", main: "rgb(var(--th-c3b3fb))", cta: "rgb(var(--c-primary-fill))" },
  teal: { pill: "rgb(var(--th-293339))", ink: "rgb(var(--th-93c1b9))", main: "rgb(var(--th-4f7f78))", cta: "rgb(var(--th-93c1b9))" },
  other: { pill: "rgb(var(--th-27273d))", ink: "rgb(var(--th-9388bf))", main: "rgb(var(--th-9388bf))", cta: "rgb(var(--th-9388bf))" },
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
  const { pill, ink, main, cta } = DARK[family];
  // In dark the action fill is the lifted hue with near-black ink, as the
  // app's primary-fill does; View Profile is the pill (MO1.2 #25 / #38: the
  // drawn #EAE6F7* / #E1EFEC* are light leaks, V6-92).
  return { main, deep: ink, pill, onMain: "#0D0B1A", button: pill, cta };
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
  // v6 MO1.2.1.5.2 #13 / #14: the drawn dark border and star #E0B360; the
  // fill and ink keep the app's dark gold (the drawn #FBF3E2* / #9A7424* are
  // light leaks, V6-92).
  return { bg, border: "#E0B360", ink: liftTo("#D9A441", bg, 4.5), star: "#E0B360" };
}

/** Initials for an avatar with no photo (B4): "Rami Khoury" → "RK", "Noor" → "N". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
