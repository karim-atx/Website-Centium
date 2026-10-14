import { useApp } from "../../../context/AppContext";

// The OpsTabsV4 / ClassFlowsV6 palettes (`L` / `D`, OpsTabsV4 logic 397-398,
// ClassFlowsV6 logic 165-167) for the Schedule screens, literal per role.
//
// THEMED WHERE THE HANDOVER COLOUR IS A THEME COLOUR (OP1-074 O11): the
// primary family goes through the --th-<hex> variables, which are the
// literal itself in Centium and the matching shade in Sky / Rose / Gold /
// Coral. Ink, card and page go through the --c-* tokens, whose Centium values
// are these literals and which High contrast darkens. Red, caution and teal
// stay fixed (O11).

export interface OpsColors {
  page: string;
  pageT: string;
  card: string;
  border: string;
  divider: string;
  soft: string;
  track: string;
  input: string;
  inputBd: string;
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
  caution: string;
  high: string;
  highBg: string;
  teal: string;
  tealPale: string;
  tealInk: string;
  segTrack: string;
  segOn: string;
  segOnInk: string;
  weekBg: string;
  blockBg: string;
  trkOn: string;
  trkOff: string;
  naBg: string;
  naInk: string;
  naTitle: string;
  naBd: string;
  menuBd: string;
  optBd: string;
  optBg: string;
  onFill2: string;
  onBd: string;
  check: string;
  focusRing: string;
  ctaShadow: string;
  bannerBg: string;
  bannerInk: string;
  dark: boolean;
  hc: boolean;
}

const th = (hex: string) => `rgb(var(--th-${hex}))`;
const tok = (name: string) => `rgb(var(--c-${name}))`;

export function opsColors(dark: boolean, hc: boolean): OpsColors {
  // High contrast (O7): hairlines go from 0.11 / 0.08 to 30% ink.
  const border = hc ? (dark ? "rgba(245,243,250,0.30)" : "rgba(36,31,27,0.30)") : dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.11)";
  const divider = hc ? (dark ? "rgba(245,243,250,0.30)" : "rgba(36,31,27,0.30)") : dark ? "rgba(245,243,250,0.06)" : "rgba(36,31,27,0.06)";
  const inputBd = hc ? (dark ? "rgba(245,243,250,0.30)" : "rgba(36,31,27,0.30)") : dark ? "rgba(245,243,250,0.10)" : "rgba(36,31,27,0.10)";
  const common = { dark, hc, page: tok("cream"), card: tok("cream-card"), border, divider, inputBd, ink: tok("charcoal"), inkSoft: tok("charcoal-soft"), faint: tok("charcoal-faint"), tert: tok("charcoal-tertiary"), menuBd: "rgba(174,161,220,0.5)" };
  if (dark) {
    return {
      ...common,
      pageT: "rgba(18,19,23,0)",
      soft: "#242730",
      track: "#262932",
      input: "#242730",
      primary: th("a991fe"),
      fill: th("a991fe"),
      onFill: "#0D0B1A",
      pale: th("303141"),
      pDark: th("c3b3fb"),
      deep: th("c3b3fb"),
      good: "#7FC79C",
      caution: "#E0B360",
      high: "#F09A8E",
      highBg: "#3C2A30",
      teal: "#A2C8C2",
      tealPale: "#293339",
      tealInk: "#B2D4CF",
      segTrack: "#242730",
      segOn: th("a991fe"),
      segOnInk: "#0D0B1A",
      weekBg: "#191B22",
      blockBg: "rgba(169,145,254,0.18)",
      trkOn: th("a991fe"),
      trkOff: hc ? "rgba(245,243,250,0.30)" : "#3A3D49",
      naBg: "#33242A",
      naInk: "#F09A8E",
      naTitle: "#F6C3BB",
      naBd: "rgba(240,154,142,0.38)",
      optBd: "#31343C",
      optBg: "#262932",
      onFill2: th("303141"),
      onBd: th("9a8cd6"),
      check: th("b7abde"),
      focusRing: "0 0 0 3px rgba(169,145,254,0.22)",
      ctaShadow: "0 10px 24px rgba(0,0,0,0.5)",
      bannerBg: "rgba(224,120,106,0.14)",
      bannerInk: "#F2A497",
    };
  }
  return {
    ...common,
    pageT: "rgba(255,255,255,0)",
    soft: "#F5F5F6",
    track: "#F5F5F6",
    input: "#F5F5F6",
    primary: th("aea1dc"),
    fill: th("aea1dc"),
    onFill: "#FFFFFF",
    pale: th("f0edf9"),
    pDark: th("7d6bb5"),
    deep: th("5f5093"),
    good: "#3F9165",
    caution: "#B07D16",
    high: "#C0392B",
    highBg: "#FBE7E4",
    teal: "#6F9993",
    tealPale: "#EAF4F2",
    tealInk: "#3E6B67",
    segTrack: th("f3f3fd"),
    segOn: th("a79ad5"),
    segOnInk: "#FFFFFF",
    weekBg: "#FAFAFC",
    blockBg: th("f0edf9"),
    trkOn: th("aea1dc"),
    trkOff: hc ? "rgba(36,31,27,0.30)" : "#D8D5DE",
    naBg: "#FCEFED",
    naInk: "#B8473A",
    naTitle: "#8E2F24",
    naBd: "rgba(192,57,43,0.28)",
    optBd: "#E5E6EB",
    optBg: "#FAFAFB",
    onFill2: th("f0edf9"),
    onBd: th("aea1dc"),
    check: th("7d6bb5"),
    focusRing: "0 0 0 3px rgba(125,107,181,0.18)",
    ctaShadow: "0 10px 24px rgba(95,80,147,0.35)",
    bannerBg: "#FBE9E6",
    bannerInk: "#9B2C1E",
  };
}

/** The palette for the current mode and High contrast. */
export function useOps(): OpsColors {
  const { theme, accessibility } = useApp();
  return opsColors(theme === "dark", !!accessibility.highContrast);
}
