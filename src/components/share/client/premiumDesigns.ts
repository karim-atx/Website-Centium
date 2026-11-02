// Round G4 · the three Premium share-card designs (member_share_card_designs():
// bold, gradient, premium_badge), drawn in code like today's backgrounds: one
// set of card colours for the DOM card (ClientShareCard) and one painter for
// the PNG (paintPremium in drawClientCard), so the preview and the export are one design.
//
// The card is an image, so like today's Centium and pattern backgrounds its
// colours are fixed (the same card whatever the app's mode); the sheet's
// chips follow light and dark (marketPalette). Type keeps the app's card
// font stack (Manrope, then IBM Plex Sans Arabic: loadArabicForCanvas runs in
// paintDom before any text is drawn).
//
// Today's three backgrounds (Centium, the metric pattern, Your photo) stay
// free (Karim's plan keeps today's styles free); the Database lists them as
// centium, pattern and photo (FREE_BACKGROUND).

import type { CardColours } from "./clientCardModel";
import { FREE_DESIGNS, PREMIUM_DESIGNS, type FreeDesign, type PremiumDesign, type ShareDesignKey } from "../../../services/premium/g4";

/** The card's `background` value for each Premium design (data-bg on the DOM card). */
export type PremiumBackground = "BOLD" | "GRAD" | "BADGE";
export const PREMIUM_BACKGROUND: Record<PremiumDesign, PremiumBackground> = { bold: "BOLD", gradient: "GRAD", premium_badge: "BADGE" };
export const isPremiumBackground = (bg: string | null | undefined): bg is PremiumBackground => bg === "BOLD" || bg === "GRAD" || bg === "BADGE";

/** Today's three free backgrounds (the sheet's first chips), by the Database's design key (G fixes: centium, pattern, photo). */
export type FreeBackground = "B" | "I" | "P";
export const FREE_BACKGROUND: Record<FreeDesign, FreeBackground> = { centium: "B", pattern: "I", photo: "P" };

/** The Database's design key for a background on the sheet, or null for one it does not list. */
export function designKeyOf(bg: string): ShareDesignKey | null {
  return FREE_DESIGNS.find((k) => FREE_BACKGROUND[k] === bg) ?? PREMIUM_DESIGNS.find((k) => PREMIUM_BACKGROUND[k] === bg) ?? null;
}

// Bold: near-black with one strong gold accent (11:1). Gradient: terracotta to
// rose to lavender (white type 4.4:1 or more). Premium badge: the Centium pair,
// deepened, with a gold pill.
export const BOLD_BG = "#15131F";
export const BOLD_ACCENT = "#F6C445";
export const GRAD_STOPS: [number, string][] = [
  [0, "#D24A2C"],
  [0.48, "#C2366B"],
  [1, "#6550AD"],
];
export const BADGE_STOPS: [number, string][] = [
  [0, "#2E2560"],
  [0.55, "#463A80"],
  [1, "#2F5D59"],
];
const css = (deg: number, stops: [number, string][]) => `linear-gradient(${deg}deg, ${stops.map(([at, c]) => `${c} ${Math.round(at * 100)}%`).join(", ")})`;

/** The swatch in the sheet's Background chips. */
export const PREMIUM_SWATCH: Record<PremiumBackground, string> = {
  BOLD: `linear-gradient(135deg, ${BOLD_BG} 60%, ${BOLD_ACCENT} 60%)`,
  GRAD: css(150, GRAD_STOPS),
  BADGE: css(150, BADGE_STOPS),
};

/** The gold of the Premium pill on the badge design (ink #2A1E00 on #F6C445: 10:1). */
export const BADGE_PILL = { bg: "#F6C445", ink: "#2A1E00" } as const;

const WHITE_TYPE: Omit<CardColours, "bg"> = {
  ink: "#FFFFFF",
  sub: "rgba(255,255,255,0.86)",
  acc: "#FFFFFF",
  num: "#FFFFFF",
  line: "rgba(255,255,255,0.3)",
  vis: "#FFFFFF",
  track: "rgba(255,255,255,0.28)",
  barIdle: "rgba(255,255,255,0.45)",
  leaf: "#A2C8C2",
  ts: "none",
};

/** The card's colours for a Premium design (white type on each; Bold's accent in gold). */
export function premiumColours(bg: PremiumBackground): CardColours {
  // Bold's gold band along the top edge (6 card px), as paintPremium draws it.
  if (bg === "BOLD") return { ...WHITE_TYPE, bg: `linear-gradient(180deg, ${BOLD_ACCENT} 0px, ${BOLD_ACCENT} 6px, ${BOLD_BG} 6px)`, acc: BOLD_ACCENT, vis: BOLD_ACCENT, sub: "rgba(255,255,255,0.78)", leaf: BOLD_ACCENT };
  if (bg === "GRAD") return { ...WHITE_TYPE, bg: css(150, GRAD_STOPS) };
  return { ...WHITE_TYPE, bg: css(150, BADGE_STOPS), acc: BADGE_PILL.bg, vis: BADGE_PILL.bg };
}

