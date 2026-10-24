// Centium landing v29: the landing's sections after the hero, in page order
// (section 01 Your day, band, 02 The problem, 03 Pillars, band, 04 Coaching,
// 05 Who it's for, 06 Beyond the individual, band). Lazy-loaded by Home
// (React.lazy) so the first paint never waits for them. The sections' own
// motions (02 to 05; 06 registers itself) join the page's scroll engine
// through the SectionHost; section 01, the chapter marks and the bands are
// driven from the motion chunk (motion/day.ts, chapters.ts, bands.ts), which
// finds this markup when the page re-measures after it mounts (onReady).

import React, { useContext, useLayoutEffect } from "react";
import { Band } from "./Band";
import { Coaching } from "./Coaching";
import { Day } from "./Day";
import { Ecosystem } from "./Ecosystem";
import { Pillars } from "./Pillars";
import { Problem } from "./Problem";
import { Who } from "./Who";
import type { SectionVals } from "./sectionVals";
import { SectionHostContext } from "../sectionHost";
import { CoachingMotion } from "../motion/coaching";
import { PillarsMotion } from "../motion/pillars";
import { ProblemMotion } from "../motion/problem";
import { WhoMotion } from "../motion/who";

const BelowFold: React.FC<{ r: SectionVals; vw: number; onReady: () => void }> = ({ r, vw, onReady }) => {
  const host = useContext(SectionHostContext);

  useLayoutEffect(() => {
    if (!host) return;
    const offs = [
      host.add(new ProblemMotion(host.rm)),
      host.add(new PillarsMotion(host.rm, () => host.invalidate())),
      host.add(new CoachingMotion(host.rm)),
      host.add(new WhoMotion(host.rm)),
    ];
    return () => offs.forEach((off) => off());
  }, [host]);

  // Once mounted the page re-measures (tracks, the day, chapter marks, bands)
  // and lands a pending #anchor again.
  useLayoutEffect(() => {
    onReady();
    // Once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Day r={r} />
      <Band id="wk-a" r={r} />
      <Problem r={r} />
      <Pillars r={r} />
      <Band id="wk-m" r={r} />
      <Coaching r={r} />
      <Who r={r} />
      <Ecosystem r={r} vw={vw} />
      <Band id="wk-b" r={r} />
    </>
  );
};

export default BelowFold;
