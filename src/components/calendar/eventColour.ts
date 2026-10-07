import { liftTo } from "../../data/folderColors";

// An event's colours (MO1.6.2: "card tint is derived from the event's chosen
// colour, so every event swatch works"). The tint is the colour at 16% over
// whatever is behind it, as the Month rows have always drawn it. In dark the
// side bar is lifted until it reaches 3:1 on the page, so the near-black
// swatch still shows.

export const DEFAULT_EVENT_COLOUR = "#7D6BB5";
const DARK_PAGE = "#121317";

export function eventColours(colour: string | undefined, dark: boolean): { tint: string; bar: string } {
  const c = /^#[0-9a-f]{6}$/i.test(colour ?? "") ? colour! : DEFAULT_EVENT_COLOUR;
  return { tint: `${c}29`, bar: dark ? liftTo(c, DARK_PAGE, 3) : c };
}

/**
 * The swatches MO1.6.4 draws, sampled from the frame (the handover gives no
 * hex list). Events saved with an older colour keep it; it simply isn't
 * offered for new ones.
 */
export const EVENT_SWATCHES = [
  "#7D6BB5",
  "#6F9993",
  "#4C8FD1",
  "#5B5FC7",
  "#794E9C",
  "#D9A441",
  "#5E9A6B",
  "#5A6B7D",
  "#241F1B",
] as const;

// OKLab a/b (hue and chroma, lightness left out: every swatch is a deep
// shade, every theme's light primary a pale one).
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
function okAB(hex: string): [number, number] {
  const r = lin(parseInt(hex.slice(1, 3), 16));
  const g = lin(parseInt(hex.slice(3, 5), 16));
  const b = lin(parseInt(hex.slice(5, 7), 16));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/**
 * The swatch a NEW event starts on (Batch E, E11: "new calendar events
 * default to the theme's primary"). Event colours stay fixed in every theme
 * (R20), so the default is the swatch nearest the theme's primary rather
 * than the primary itself: the picker always shows it selected, and saved
 * events keep the colour they were saved with. Centium's #AEA1DC lands on
 * #7D6BB5, today's default, so Centium is unchanged.
 */
export function nearestEventSwatch(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return DEFAULT_EVENT_COLOUR;
  const [a, b] = okAB(hex);
  let best: string = EVENT_SWATCHES[0];
  let bestD = Infinity;
  for (const s of EVENT_SWATCHES) {
    const [sa, sb] = okAB(s);
    const d = Math.hypot(a - sa, b - sb);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}
