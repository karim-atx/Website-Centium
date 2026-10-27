// Centium landing v29: the responsive values the intro, hero and phone use,
// literally from the prototype's renderVals `r` (02_pages/04-IN1, 05-HE1;
// lg = width >= 1024, sm = width >= 640). Production renders without the
// prototype's QA parameters, so `q.ip` and `q.still` are always unset.

import { LG, SM } from "../engine/env";

export function introVals(vw: number) {
  const lg = vw >= LG,
    sm = vw >= SM;
  const VH = "100svh";
  return {
    lg,
    sm,
    VH,
    px: sm ? "40px" : "20px",
    introH: lg ? "469vh" : "285svh",
    stagePos: "sticky" as const,
    stmTop: "46%",
    stmW: lg ? "min(92vw,900px)" : "92vw",
    stmSize: lg ? "clamp(52px,5.3vw,78px)" : vw < 380 ? "36px" : "40px",
    fragW: lg ? "262px" : vw < 380 ? "156px" : "172px",
    fragBig: lg ? "22px" : "18px",
    cueB: sm ? "32px" : "20px",
    heroTop: lg ? "108px" : "90px",
    pillDesk: lg ? "grid" : "none",
    pillMob: lg ? "none" : "flex",
    pillGap: lg ? "30px" : "16px",
    pillSize: lg ? "12px" : vw < 380 ? "10px" : "10.5px",
    pillLs: ".2em",
    pillLsNeg: "-.2em",
    h1Mt: lg ? "14px" : "8px",
    display: lg ? "clamp(64px,7.2vw,108px)" : "min(12vw,50px)",
    subMt: lg ? "20px" : "12px",
    subSize: lg ? "20px" : "16px",
    ctaMt: lg ? "28px" : "20px",
    ctaW: sm ? "200px" : "100%",
    heroAnchor: "calc(100% - " + VH + ")",
    heroTail: lg ? "300px" : "120px",
    phoneLayerPos: "fixed" as const,
    sideDisp: lg ? "block" : "none",
  };
}

export type IntroVals = ReturnType<typeof introVals>;
