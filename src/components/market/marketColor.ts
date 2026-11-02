import { SEGMENT_STEPS, highContrast, type MarketPalette } from "../../theme/marketTokens";
import { t, tx } from "../../i18n/core";

// Market + Share 3.0 · colour helpers for the dark (readable, D-05) versions
// of the board's fixed step / identity colours.

/** "rgba(r,g,b,a)" from a #RRGGBB hex. */
export function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** A #RRGGBB ink mixed 45% toward white, so a step ink reads at 4.5:1 on the dark card (#1C1F28). */
export function liftInk(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v + (255 - v) * 0.45);
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

/** WCAG relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** Contrast ratio of white text on a #RRGGBB fill. */
export const whiteContrast = (hex: string): number => 1.05 / (luminance(hex) + 0.05);

/**
 * The fill darkened (mixed toward black in 1% steps) just enough for white
 * text to reach `ratio` (W2 lead decision: the SegmentedTicketStrip's DARK
 * active fill must reach 4.5:1 under white; the light fill stays as drawn).
 * A fill that already reaches it comes back unchanged, as #RRGGBB.
 */
export function darkenForWhite(hex: string, ratio = 4.5): string {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const out = (k: number) => "#" + rgb.map((v) => Math.round(v * (1 - k)).toString(16).padStart(2, "0")).join("").toUpperCase();
  for (let i = 0; i <= 100; i++) {
    const h = out(i / 100);
    if (whiteContrast(h) >= ratio) return h;
  }
  return "#000000";
}

/**
 * A selected tile's fill under its ink (W3 lead decision, R1 polish: the
 * selected week-day tile, white on #A79AD5, is lifted to 4.5:1 like the
 * strip). White ink gets the fill darkened just enough; any other ink (the
 * dark theme's #0D0B1A --onfill, already past 7:1) keeps the drawn fill.
 */
export function fillUnder(fill: string, ink: string): string {
  return ink.toUpperCase() === "#FFFFFF" ? darkenForWhite(fill) : fill;
}

// ---------------------------------------------------------------------------
// TicketStub tones (Client Explore Screens `STUB`, Professional Marketplace
// Screens `STEP`).

export type StubTone = 1 | 2 | 3 | 4 | "teal" | "pale" | "muted" | { bg: string; ink: string; perf: string };

/** A tone's [stub fill, label ink, perforation]. Steps keep their light hues in dark (identity colours) on the dark card. */
export function stubColors(tone: StubTone, m: MarketPalette, dark: boolean): { bg: string; ink: string; perf: string } {
  if (typeof tone === "object") return tone;
  if (tone === "teal") return { bg: m.tealbg, ink: m.tealink, perf: m.teal };
  if (tone === "pale") return { bg: m.pale, ink: m.pdark, perf: m.fill };
  if (tone === "muted") return { bg: m.soft, ink: m.faint, perf: m.border };
  const [bg, ink] = SEGMENT_STEPS[tone - 1];
  // Dark (D-05, not drawn): the step's ink as a 16% tint on the card, the ink lifted to read.
  if (dark) return { bg: hexAlpha(ink, 0.16), ink: liftInk(ink), perf: liftInk(ink) };
  // High contrast (light; R2 gate): the drawn step inks read 3.2 to 3.7:1 on their tints; deepen the
  // label ink to 4.5:1 on the tint. Normal mode keeps the drawn ink.
  if (highContrast()) return { bg, ink: darkenForWhite(ink, 5.2), perf: ink };
  return { bg, ink, perf: ink };
}

// ---------------------------------------------------------------------------
// Offer status chips (Business Marketplace Screens `st`: Active good,
// Scheduled pale, Paused warn, Expired soft).

export type OfferStatus = "active" | "scheduled" | "paused" | "expired";

/** The status chip's word, in the app's language ("Active" here is an offer's state, not a person's activity). */
export const offerStatusLabel = (s: OfferStatus): string =>
  s === "active" ? tx("Active", "offer status") : s === "scheduled" ? t("Scheduled") : s === "paused" ? t("Paused") : t("Expired");

export function statusChip(status: OfferStatus, m: MarketPalette): [string, string] {
  return status === "active" ? [m.goodbg, m.good] : status === "scheduled" ? [m.pale, m.pdark] : status === "paused" ? [m.cautionbg, m.caution] : [m.soft, m.faint];
}
