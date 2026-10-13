// Business Dashboard colours (DA1 / DA2 / DA3), literal from the handoff's
// BizSummaryV27 `L` / `D` palettes and BizTypeKit's light / dark `c`.
//
// THEMED THROUGH THE GENERATED PALETTE. Every lavender and teal shade is
// written as the literal rgb(var(--th-<hex>)) (the generator scans for the
// th-<hex> text, so it must stay literal), which `npm run gen:themes` maps to
// the active colour theme (DA1-015 O10: the primary family follows the
// theme; good / high / caution and the greys stay fixed). In Centium the
// variable is the hex itself, so the default theme renders the literal value.

export interface DashPalette {
  dark: boolean;
  hc: boolean;
  page: string;
  card: string;
  border: string;
  divider: string;
  soft: string;
  track: string;
  ink: string;
  inkSoft: string;
  faint: string;
  tert: string;
  primary: string;
  fill: string;
  onFill: string;
  pale: string;
  paleTrack: string;
  pDark: string;
  deep: string;
  line: string;
  good: string;
  goodTint: string;
  goodBg: string;
  caution: string;
  high: string;
  highBg: string;
  warn: string;
  warnBg: string;
  tealDark: string;
  tealPale: string;
  tealInk: string;
  hero: string;
  outline: string;
  option: string;
  raised: string;
  maskBg: string;
  maskInk: string;
  listBg: string;
  listRule: string;
  newRow: string;
  ghost: string;
  leafInk: string;
  /** BizTypeKit's second bar colour (`c.lav`). */
  lav: string;
  /** Gauge face, inner ring, bezel band. */
  face: string;
  faceRing: string;
  bezel: string;
  /** Gauge gradient ends (g0 → g1) and the cluster glow. */
  g0: string;
  g1: string;
  glowCol: string;
  /** Control faces and edges (KCOL). */
  knobFace: string;
  knobEdge: string;
  knobShade: string;
  leadAcc: string;
  secAcc: string;
  leadPressed: string;
  tipBg: string;
  tipInk: string;
  halo: string;
}

/**
 * The palette for one mode. `hc` applies the High contrast rows of the
 * checklists (DA1-015 O7, DA1-003 O6, DA2-003 O3): tracks to 22% ink, faint
 * ink to the soft ink.
 */
export function dashPalette(dark: boolean, hc: boolean): DashPalette {
  const L: DashPalette = {
    dark: false,
    hc,
    page: "#FFFFFF",
    card: "#FFFFFF",
    border: "rgba(36,31,27,0.11)",
    divider: "rgba(36,31,27,0.06)",
    soft: "#F5F5F6",
    track: "#F5F5F6",
    ink: "#241F1B",
    inkSoft: "#5B5349",
    faint: "#8C8378",
    tert: "#A79E93",
    primary: "rgb(var(--th-aea1dc))",
    fill: "rgb(var(--th-aea1dc))",
    onFill: "#FFFFFF",
    pale: "rgb(var(--th-f0edf9))",
    paleTrack: "rgb(var(--th-7d6bb5) / 0.18)",
    pDark: "rgb(var(--th-7d6bb5))",
    deep: "rgb(var(--th-5f5093))",
    line: "rgb(var(--th-7d6bb5))",
    good: "#3F9165",
    goodTint: "rgba(63,145,101,0.2)",
    goodBg: "#E3F3E9",
    caution: "#D9A441",
    high: "#C0392B",
    highBg: "#FBE7E4",
    warn: "#8A6A3E",
    warnBg: "#F6E9C9",
    tealDark: "rgb(var(--th-6f9993))",
    tealPale: "rgb(var(--th-eaf4f2))",
    tealInk: "#5B5349",
    hero: `linear-gradient(150deg, ${"rgb(var(--th-58516f))"}, ${"rgb(var(--th-4b406d))"})`,
    outline: "rgb(var(--th-aea1dc))",
    option: "#E5E6EB",
    raised: "#FAFAFB",
    maskBg: "#F5F5F6",
    maskInk: "#5B5349",
    listBg: "rgb(var(--th-f7f7fc))",
    listRule: "rgb(var(--th-ebeaf6))",
    newRow: "rgb(var(--th-f0edf9))",
    ghost: "rgb(var(--th-aea1dc) / 0.24)",
    leafInk: "rgb(var(--th-4f8f8a))",
    lav: "rgb(var(--th-aea1dc))",
    face: "rgb(var(--th-fbfafe))",
    faceRing: "rgba(95,80,147,0.07)",
    bezel: "rgb(var(--th-f1effa))",
    g0: "rgb(var(--th-aea1dc))",
    g1: "rgb(var(--th-7d6bb5))",
    glowCol: "rgb(var(--th-7d6bb5))",
    knobFace: "rgb(var(--th-f7f6fd))",
    knobEdge: "rgba(36,31,27,0.10)",
    knobShade: "rgba(95,80,147,0.08)",
    leadAcc: "rgb(var(--th-6f9993))",
    secAcc: "rgb(var(--th-7d6bb5))",
    leadPressed: "rgb(var(--th-eaf4f2))",
    tipBg: "#241F1B",
    tipInk: "#FFFFFF",
    halo: "rgb(var(--th-aea1dc) / 0.1)",
  };
  const D: DashPalette = {
    dark: true,
    hc,
    page: "#121317",
    card: "#1C1F28",
    border: "rgba(245,243,250,0.08)",
    divider: "rgba(245,243,250,0.06)",
    soft: "#242730",
    track: "#262932",
    ink: "#F5F3FA",
    inkSoft: "#B8B3C7",
    faint: "#B8B3C7",
    tert: "#9F9CAC",
    primary: "rgb(var(--th-a991fe))",
    fill: "rgb(var(--th-a991fe))",
    onFill: "#0D0B1A",
    pale: "rgb(var(--th-303141))",
    paleTrack: "rgb(var(--th-c3b3fb) / 0.18)",
    pDark: "rgb(var(--th-c3b3fb))",
    deep: "rgb(var(--th-c3b3fb))",
    line: "rgb(var(--th-a393e0))",
    good: "#7FC79C",
    goodTint: "rgba(127,199,156,0.2)",
    goodBg: "#192A20",
    caution: "#E0B360",
    high: "#F09A8E",
    highBg: "#3C2A30",
    warn: "#DCBB7F",
    warnBg: "#332B1A",
    tealDark: "rgb(var(--th-4f8f8a))",
    tealPale: "rgb(var(--th-293339))",
    tealInk: "rgb(var(--th-b2d4cf))",
    hero: `linear-gradient(150deg, ${"rgb(var(--th-a991fe) / 0.35)"}, ${"rgb(var(--th-a991fe) / 0.15)"})`,
    outline: "rgb(var(--th-a991fe) / 0.7)",
    option: "#31343C",
    raised: "#262932",
    maskBg: "#262932",
    maskInk: "#B8B3C7",
    listBg: "rgb(var(--th-aea1dc) / 0.1)",
    listRule: "rgb(var(--th-aea1dc) / 0.16)",
    newRow: "rgb(var(--th-303141))",
    ghost: "rgb(var(--th-a991fe) / 0.22)",
    leafInk: "rgb(var(--th-8ac4ba))",
    lav: "rgb(var(--th-c3b3fb))",
    face: "#181A22",
    faceRing: "rgba(0,0,0,0.45)",
    bezel: "#20232E",
    g0: "rgb(var(--th-c3b3fb))",
    g1: "rgb(var(--th-a991fe))",
    glowCol: "rgb(var(--th-c3b3fb))",
    knobFace: "#1E2130",
    knobEdge: "rgba(245,243,250,0.10)",
    knobShade: "rgba(0,0,0,0.5)",
    leadAcc: "rgb(var(--th-a2c8c2))",
    secAcc: "rgb(var(--th-c3b3fb))",
    leadPressed: "rgb(var(--th-24333a))",
    tipBg: "#F5F3FA",
    tipInk: "#121317",
    halo: "rgb(var(--th-a991fe) / 0.07)",
  };
  const c = dark ? D : L;
  if (!hc) return c;
  // High contrast: the strongest ink for faint text, hairline-strength tracks.
  return {
    ...c,
    track: dark ? "rgba(245,243,250,0.22)" : "rgba(36,31,27,0.22)",
    faint: dark ? "#F5F3FA" : "#5B5349",
    inkSoft: dark ? "#F5F3FA" : c.inkSoft,
    tert: dark ? "#B8B3C7" : "#5B5349",
    border: dark ? "rgba(245,243,250,0.3)" : "rgba(36,31,27,0.3)",
  };
}
