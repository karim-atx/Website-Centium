/**
 * A course cover's colour. Light: the author's pastel as chosen. Dark: a
 * deeper shade of the same hue (no bright patch on a dark page); the
 * saturation is kept between 22% and 40% so a near-grey pastel still reads as
 * its colour rather than as grey.
 */
export function coverBackground(hex: string, dark: boolean): string {
  if (!dark || !/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s0 = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const s = Math.min(0.4, Math.max(0.22, s0));
  const L = 0.24;
  const c = (1 - Math.abs(2 * L - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** What sits on a cover (the pill, the back button): white in light; in dark
 *  the page colour with light ink, so it is not a bright patch either. */
export function onCover(dark: boolean): { bg: string; ink: string } {
  return dark ? { bg: "#121317", ink: "#F4F2EF" } : { bg: "#FFFFFF", ink: "#241F1B" };
}

// Pieces shared by the course screens (design screens 6-8). Sizes and
// colours are the design's, through the --forum-* variables so dark mode has
// its own values.
