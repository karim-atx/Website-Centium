import { SEGMENT_STEPS, type MarketPalette } from "../../theme/marketTokens";

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
  return { bg, ink, perf: ink };
}

// ---------------------------------------------------------------------------
// Offer status chips (Business Marketplace Screens `st`: Active good,
// Scheduled pale, Paused warn, Expired soft).

export type OfferStatus = "active" | "scheduled" | "paused" | "expired";

export function statusChip(status: OfferStatus, m: MarketPalette): [string, string] {
  return status === "active" ? [m.goodbg, m.good] : status === "scheduled" ? [m.pale, m.pdark] : status === "paused" ? [m.cautionbg, m.caution] : [m.soft, m.faint];
}
