// Centium landing v29: the responsive values of sections 01 to 06 and the
// bands, literally from the prototype's renderVals `r` and r12 (02_pages
// 06-DY1, 07-WK1, 08-PR1, 09-PI1, 11-CO1, 12-WH1, 13-EC1; lg = width >= 1024,
// sm = width >= 640). Production renders without the prototype's QA
// parameters, so `q.still` / `q.fith` are always unset: pinned tracks are
// sticky on desktop and VH is 100svh.

import { LG, SM } from "../engine/env";

export function sectionVals(vw: number, vh: number) {
  const lg = vw >= LG,
    sm = vw >= SM,
    pin = lg;
  const VH = "100svh";
  const half = (s: string) => "calc(" + s + " / -2)";
  return {
    lg,
    sm,
    VH,
    px: sm ? "40px" : "20px",
    secY: lg ? "112px" : "64px",
    two: lg ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)",
    gap: lg ? "64px" : "28px",
    h2: lg ? "clamp(44px,4.4vw,64px)" : vw < 380 ? "32px" : "36px",
    chEy: lg ? "clamp(15px,1.55vw,22px)" : vw < 380 ? "12px" : "13px",
    chEyD: lg ? "clamp(14px,1.35vw,19px)" : "11px",
    pinPos: (pin ? "sticky" : "relative") as "sticky" | "relative",
    pinMin: lg ? VH : "0",
    pinPad: lg ? "88px" : "56px",
    dotsDisp: lg ? "none" : "flex",
    eF8: lg ? "8px" : "12px",
    eF9: lg ? "9px" : "12px",
    eF95: lg ? "9.5px" : "12px",
    eF10: lg ? "10px" : "12px",
    eF105: lg ? "10.5px" : "12px",
    eF11: lg ? "11px" : "12px",
    eF115: lg ? "11.5px" : "12.5px",
    // 01 Your day
    dayTrackH: lg ? "710vh" : "405svh",
    dayPinPos: "sticky" as const,
    dayStageH: VH,
    dayPad: lg ? "96px 40px 40px" : "80px 20px 16px",
    dayDisp: lg ? "grid" : "flex",
    dayCols: "280px minmax(0,1fr) 320px",
    dayGap: lg ? "32px" : "10px",
    dayLeftDisp: lg ? "flex" : "none",
    dayMobDisp: lg ? "none" : "flex",
    dayH2: lg ? "clamp(40px,3.6vw,52px)" : "26px",
    clock: lg ? "44px" : "22px",
    railH: "300px",
    dayPhoneSpace: lg ? "100%" : Math.round(662 * Math.max(0.46, Math.min(0.6, (vh - 360) / 662)) + 6) + "px",
    stepH: lg ? "280px" : "128px",
    stepTop: "50%",
    stepT: lg ? "30px" : "20px",
    stepP: "16px",
    // WK1 bands
    wkPad: lg ? "64px 0" : "40px 0",
    wkH: lg ? "160px" : "72px",
    // 03 Pillars
    plH: pin ? "650vh" : "auto",
    plMt: lg ? "40px" : "28px",
    plCols: lg ? "340px minmax(0,1fr)" : "minmax(0,1fr)",
    plIdx: lg ? "flex" : "none",
    plPaneH: lg ? "620px" : "auto",
    plZoom: "1",
    plMaxH: "none",
    plSh: lg
      ? "0 1px 1px rgba(72,58,130,.05),0 8px 20px rgba(72,58,130,.07),0 34px 70px rgba(92,72,168,.1)"
      : "0 1px 2px rgba(72,58,130,.06),0 6px 14px rgba(72,58,130,.06)",
    mhFlex: lg ? "flex" : "none",
    panePad: lg ? "16px 18px" : "12px 12px",
    paneGap: lg ? "10px" : "8px",
    mhBlock: lg ? "block" : "none",
    mhGrid: lg ? "grid" : "none",
    plAlign: "stretch",
    plDisp: lg ? "block" : "flex",
    plOver: (lg ? "visible" : "auto") as "visible" | "auto",
    plM: lg ? "0" : "0 -20px",
    plPad: lg ? "0" : "4px 20px 24px",
    plPanePos: (lg ? "absolute" : "relative") as "absolute" | "relative",
    plPaneW: "86vw",
    plPaneOp: lg ? "0" : "1",
    paneCols: lg ? "1.05fr 1fr" : "minmax(0,1fr)",
    scanCols: lg ? "1fr 1.3fr" : "minmax(0,1fr)",
    vidH: lg ? "110px" : "120px",
    figH: lg ? "150px" : "104px",
    cycRing: "92px",
    calCell: "16px",
    hRows: lg ? "auto auto minmax(0,1fr)" : "auto",
    cRows: lg ? "auto minmax(0,1fr)" : "auto",
    tRows: lg ? "auto auto minmax(0,1fr)" : "auto",
    ormMin: lg ? "0px" : "180px",
    ormCols: lg ? "150px minmax(0,1fr)" : "minmax(0,1fr)",
    ormNowDir: (lg ? "column" : "row") as "column" | "row",
    ormNowAlign: lg ? "flex-start" : "center",
    ormBig: lg ? "30px" : "26px",
    ormChipSelf: "flex-start",
    ormPlotMin: lg ? "120px" : "96px",
    // 04 Coaching
    coH: pin ? "320vh" : "auto",
    coCols: lg ? "1fr 1.15fr 1fr" : "minmax(0,1fr)",
    coSide: lg ? "block" : "none",
    // 05 Who it's for
    four: lg ? "repeat(4,minmax(0,1fr))" : "none",
    fourFlow: lg ? "row" : "column",
    fourAuto: lg ? "auto" : "84%",
    fourOv: (lg ? "visible" : "auto") as "visible" | "auto",
    fourM: lg ? "40px 0 0" : "28px -20px 0",
    fourP: lg ? "0" : "4px 20px 12px",
    instCols: "1fr",
    instDisp: lg ? "grid" : "flex",
    instAlignI: "center",
    instAlign: "center" as const,
    instS: lg ? "150px" : "140px",
    instJust: lg ? "center" : "flex-start",
    instItems: lg ? "center" : "flex-start",
    // 06 Beyond the individual
    ecoH: pin ? "300vh" : "auto",
    ecoViewH: lg ? "500px" : "auto",
    esPos: (lg ? "absolute" : "relative") as "absolute" | "relative",
    esOver: (lg ? "visible" : "auto") as "visible" | "auto",
    esPad: lg ? "0" : "4px 20px 24px",
    slPos: (lg ? "absolute" : "relative") as "absolute" | "relative",
    slW: lg ? "min(880px,74vw)" : "84vw",
    slH: lg ? "480px" : "max(420px, calc(100svh - 250px))",
    slML: lg ? half("min(880px,74vw)") : "0",
    slLeft: lg ? "50%" : "0",
    slSh: lg
      ? "0 1px 1px rgba(72,58,130,.05),0 10px 24px rgba(72,58,130,.07),0 40px 80px rgba(92,72,168,.12)"
      : "0 1px 2px rgba(72,58,130,.06),0 6px 14px rgba(72,58,130,.06)",
    slCols: lg ? "250px minmax(0,1fr)" : "minmax(0,1fr)",
    slPad: lg ? "28px" : vw < 380 ? "16px" : "20px",
    slRows: lg ? "minmax(0,1fr)" : "auto minmax(0,1fr)",
    slGap: lg ? "22px" : "16px",
    slT: lg ? "30px" : "20px",
    mobFlex: lg ? "none" : "flex",
    planDisp: vw < 380 ? "none" : "block",
    // Section 06 Pro 01 (not in the prototype): the check-in chip (85px) and the
    // week dots (83px) share the row's detail line only where that line is at
    // least 177px wide: the card (84vw) less its padding, the graphic's 28px
    // padding, the avatar, the ring and their gaps (112px).
    ecoChipWeek: 0.84 * vw - (vw < 380 ? 32 : 40) - 28 - 112 >= 177,
    planCols: lg ? "100px repeat(4,minmax(0,1fr))" : "0px repeat(2,minmax(0,1fr))",
    slTxtJ: lg ? "center" : "flex-start",
    slTL: lg ? "1.1" : "26px",
    slP: lg ? "14.5px" : "15px",
    slPL: lg ? "1.55" : "22px",
    mgH: vw < 380 ? "224px" : "240px",
    slTxtH: lg ? "auto" : vw < 380 ? "128px" : "136px",
    ecoCtlW: lg ? "640px" : "100%",
    segW: lg ? "170px" : "136px",
    ecoCursor: lg ? "grab" : "auto",
    ecoTouch: lg ? "pan-y" : "auto",
    pillSh: lg ? "none" : "0 6px 18px rgba(72,58,130,.14)",
  };
}

export type SectionVals = ReturnType<typeof sectionVals>;
