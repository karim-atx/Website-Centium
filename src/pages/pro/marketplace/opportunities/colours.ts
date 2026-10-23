import { hexAlpha, liftInk } from "../../../../components/market/marketColor";

// Market + Share 3.0 · W4 · fixed board hues on the P-MA.5 pages (STATUS_STEPS, the tags, the badges).

/** A board hue that is fixed in light; in dark it reads as the step colours do (D-05): 16% tint, lifted ink. */
export function fixedPair(bg: string, ink: string, dark: boolean): [string, string] {
  return dark ? [hexAlpha(ink, 0.16), liftInk(ink)] : [bg, ink];
}

/** The ink of a fixed board hue, lifted in dark (borders, badges). */
export const fixedInk = (ink: string, dark: boolean): string => (dark ? liftInk(ink) : ink);
