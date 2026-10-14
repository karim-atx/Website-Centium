// Marketplace (MA1) colours, literal from the handoff's BizMarketV7 `L` / `D`
// palettes (source lines 422-423, verified against the drawn dark frames in
// BU3_market_nav.md section 3).
//
// THEMED THROUGH THE GENERATED PALETTE, as the Dashboard palette is: every
// lavender and teal shade is written as the literal rgb(var(--th-<hex>)) so
// `npm run gen:themes` maps it to the active colour theme; in Centium the
// variable is the hex itself. Greys, good / caution / high and gold stay fixed.

export interface MarketPalette {
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
  pDark: string;
  deep: string;
  good: string;
  goodBg: string;
  caution: string;
  cautionBg: string;
  high: string;
  highBg: string;
  teal: string;
  tealPale: string;
  tealInk: string;
  gold: string;
  goldTrack: string;
  option: string;
  raised: string;
  /** Switch off track (SW in the source). */
  swOff: string;
  /** Selected multi-select option border (MA1-037 row 4). */
  optOn: string;
  /** Camera circle (MA1-080). */
  camBg: string;
  camInk: string;
  /** Dashed empty box in the chart (MA1-065 row 7). */
  dashed: string;
  /** Chart (ScrubChart c). */
  chartLine: string;
  chartArea: string;
  chartGrid: string;
  chartGhost: string;
  chartAxis: string;
  chartScrub: string;
  tipBg: string;
  tipInk: string;
  /** Funnel source colours: Search, Category browsing, Map, Direct link. */
  src: [string, string, string, string];
}

export function marketPalette(dark: boolean, hc: boolean): MarketPalette {
  const L: MarketPalette = {
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
    pDark: "rgb(var(--th-7d6bb5))",
    deep: "rgb(var(--th-5f5093))",
    good: "#3F9165",
    goodBg: "#E3F3E9",
    caution: "#B07D16",
    cautionBg: "#F6E9C9",
    high: "#C0392B",
    highBg: "#FBE7E4",
    teal: "rgb(var(--th-6f9993))",
    tealPale: "rgb(var(--th-eaf4f2))",
    tealInk: "rgb(var(--th-3e6b67))",
    gold: "#C08A1E",
    goldTrack: "#F3EAD6",
    option: "#E5E6EB",
    raised: "#FAFAFB",
    swOff: "#D9D6E3",
    optOn: "rgb(var(--th-aea1dc))",
    camBg: "#241F1B",
    camInk: "#FFFFFF",
    dashed: "rgba(36,31,27,0.14)",
    chartLine: "rgb(var(--th-7d6bb5))",
    chartArea: "rgb(var(--th-7d6bb5) / 0.12)",
    chartGrid: "rgba(36,31,27,0.07)",
    chartGhost: "#B5ADA4",
    chartAxis: "#A79E93",
    chartScrub: "#241F1B",
    tipBg: "#241F1B",
    tipInk: "#FFFFFF",
    src: ["rgb(var(--th-aea1dc))", "rgb(var(--th-6f9993))", "#C08A1E", "#A79E93"],
  };
  const D: MarketPalette = {
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
    pDark: "rgb(var(--th-c3b3fb))",
    deep: "rgb(var(--th-c3b3fb))",
    good: "#7FC79C",
    goodBg: "#192A20",
    caution: "#E0B360",
    cautionBg: "#332B1A",
    high: "#F09A8E",
    highBg: "#3C2A30",
    teal: "rgb(var(--th-a2c8c2))",
    tealPale: "rgb(var(--th-293339))",
    tealInk: "rgb(var(--th-b2d4cf))",
    gold: "#E2B65C",
    goldTrack: "#2A271F",
    option: "#31343C",
    raised: "#262932",
    swOff: "#3A3D48",
    optOn: "rgb(var(--th-9a8cd6))",
    camBg: "#F5F3FA",
    camInk: "#121317",
    dashed: "rgba(245,243,250,0.12)",
    chartLine: "rgb(var(--th-c3b3fb))",
    chartArea: "rgb(var(--th-a991fe) / 0.14)",
    chartGrid: "rgba(238,239,242,0.07)",
    chartGhost: "#8A86A0",
    chartAxis: "#9F9CAC",
    chartScrub: "#F5F3FA",
    tipBg: "#F5F3FA",
    tipInk: "#121317",
    src: ["rgb(var(--th-a991fe))", "rgb(var(--th-a2c8c2))", "#E2B65C", "#9F9CAC"],
  };
  const c = dark ? D : L;
  if (!hc) return c;
  // High contrast (MA1-001 O7): faint inks step to the soft ink, hairlines to 0.24;
  // filled controls take the app's high-contrast fill (X-10: #5B48B8 with white).
  return {
    ...c,
    ...(dark ? null : { fill: "rgb(var(--c-primary-fill))", primary: "rgb(var(--c-primary-fill))", onFill: "rgb(var(--c-on-primary-fill))" }),
    faint: dark ? "#F5F3FA" : "#5B5349",
    tert: dark ? "#B8B3C7" : "#5B5349",
    inkSoft: dark ? "#F5F3FA" : c.inkSoft,
    border: dark ? "rgba(245,243,250,0.24)" : "rgba(36,31,27,0.24)",
    divider: dark ? "rgba(245,243,250,0.24)" : "rgba(36,31,27,0.24)",
    chartAxis: dark ? "#B8B3C7" : "#5B5349",
    dashed: dark ? "rgba(245,243,250,0.3)" : "rgba(36,31,27,0.3)",
  };
}
