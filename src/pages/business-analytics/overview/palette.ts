import { dashPalette, type DashPalette } from "../../../components/business-dashboard/palette";
import type { ClockColours } from "./clockModel";

// AN1 Overview colours, literal from BizAnalyticsV45 `L` / `D` and the clock
// (renderVals l.455-457, 650-842), on top of the Dashboard palette (the same
// handoff family). Lavender shades are written as rgb(var(--th-<hex>)) so the
// five colour themes follow the theme primary (AN1-034 O9 / AN1-001 O7);
// the hands (#0E4A45 / #2F9B90), the live teal (#14A08F / #4FD1C0), the event
// teal (#6F9993 / #A2C8C2) and good / high stay fixed (brand mark colours).
// High contrast (AN1-034 O6, AN1-001 O5): faint text → #5B5349, card border
// → rgba(36,31,27,0.22), minute ticks → #5B5349, future arcs at full
// strength, bezel 0.42 → 0.7.

export interface AnPalette extends DashPalette {
  cardBorder: string;
  entryShadow: string;
  keyLine: string;
  hair: string;
  hlShadow: string;
  hlNum: string;
  panelBg: string;
  bezelStroke: string;
  bezelHi: string;
  bezel2: string;
  face0: string;
  face1: string;
  morn: string;
  eve: string;
  laneCol: string;
  core: string;
  coreRing: string;
  liveTeal: string;
  logoCol: string;
  half: string;
  halfInk: string;
  pillTrack: string;
  pillBorder: string;
  pillThumbSh: string;
  clock: ClockColours;
  star: string;
}

export function anPalette(dark: boolean, hc: boolean): AnPalette {
  const base = dashPalette(dark, hc);
  const faint = hc ? (dark ? "#F5F3FA" : "#5B5349") : dark ? "#B8B3C7" : "#8C8378";
  const cls = dark ? "rgb(var(--th-a991fe))" : "rgb(var(--th-8e7fd0))";
  const evc = dark ? "#A2C8C2" : "#6F9993";
  return {
    ...base,
    faint,
    cardBorder: hc ? (dark ? "rgba(245,243,250,0.3)" : "rgba(36,31,27,0.22)") : dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.11)",
    entryShadow: dark ? "0 8px 20px -12px rgba(0,0,0,0.7)" : "0 6px 18px -12px rgba(95,80,147,0.35)",
    keyLine: dark ? "rgb(var(--th-a991fe) / 0.32)" : "rgb(var(--th-7d6bb5) / 0.26)",
    hair: dark ? "rgba(245,243,250,0.10)" : "rgba(36,31,27,0.09)",
    hlShadow: dark ? "0 10px 24px -16px rgba(0,0,0,0.7)" : "0 10px 24px -18px rgba(95,80,147,0.28)",
    hlNum: dark ? "#F5F3FA" : "rgb(var(--th-3f3272))",
    panelBg: dark ? "#20232E" : "#FAF9FE",
    bezelStroke: dark ? `rgb(var(--th-a991fe) / ${hc ? 0.7 : 0.5})` : `rgb(var(--th-7d6bb5) / ${hc ? 0.7 : 0.42})`,
    bezelHi: dark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.75)",
    bezel2: dark ? "rgba(245,243,250,0.06)" : "rgba(36,31,27,0.06)",
    face0: dark ? "#23263A" : "#FFFFFF",
    face1: dark ? "#1A1C27" : "#F7F5FD",
    morn: dark ? "rgba(224,179,96,0.05)" : "rgba(217,164,65,0.07)",
    eve: dark ? "rgb(var(--th-a991fe) / 0.09)" : "rgb(var(--th-7d6bb5) / 0.09)",
    laneCol: dark ? "rgb(var(--th-a991fe) / 0.08)" : "rgb(var(--th-8e7fd0) / 0.08)",
    core: dark ? "#1C1F28" : "#FFFFFF",
    coreRing: dark ? "rgb(var(--th-a991fe) / 0.25)" : "rgb(var(--th-aea1dc) / 0.5)",
    liveTeal: dark ? "#4FD1C0" : "#14A08F",
    logoCol: dark ? "rgb(var(--th-a991fe))" : "rgb(var(--th-7d6bb5))",
    half: dark ? "rgb(var(--th-a991fe))" : "rgb(var(--th-7d6bb5))",
    halfInk: dark ? "#121317" : "#FFFFFF",
    pillTrack: dark ? "rgba(238,239,242,0.06)" : "rgb(var(--th-5f5093) / 0.07)",
    pillBorder: dark ? "rgba(238,239,242,0.12)" : "rgb(var(--th-5f5093) / 0.16)",
    pillThumbSh: dark ? "0 1px 4px rgba(0,0,0,0.5)" : "0 1px 3px rgb(var(--th-5f5093) / 0.35)",
    star: dark ? "#E0B360" : "#B8862A",
    clock: {
      dark,
      hc,
      ink: dark ? "#F5F3FA" : "#241F1B",
      inkSoft: dark ? "#B8B3C7" : "#5B5349",
      faint,
      tert: dark ? "#9F9CAC" : "#A79E93",
      divider: base.divider,
      soft: base.soft,
      pale: base.pale,
      pDark: base.pDark,
      good: base.good,
      cls,
      evc,
      tabCls: dark ? "rgb(var(--th-a991fe))" : "rgb(var(--th-5f5093))",
      tabEv: dark ? "#A2C8C2" : "#3E6B67",
    },
  };
}
