// Centium landing v29: section 01 "Your day, in rhythm" (DY1 v15, 02_pages/
// 06-DY1), the prototype markup with its exact inline styles. Desktop: the
// pinned stage has the chapter heading, the rolling clock and the moments
// rail on the left, the slot the fixed phone sits over in the middle and the
// step texts on the right. Mobile: heading row with a small clock, a
// horizontal rail, the phone slot, then the step texts. All motion (pin
// progress, the phone's day, clock, rail, steps) is motion/day.ts, which
// finds these elements by id and data attribute as the prototype does.

import React from "react";
import { ChapterMark } from "./ChapterMark";
import * as D from "./data/day";
import type { SectionVals } from "./sectionVals";

export const Day: React.FC<{ r: SectionVals }> = ({ r }) => (
  <div id="day-track" data-screen-label="DY1 v15 Your day, pillar by pillar" style={{ position: "relative", zIndex: "2", height: r.dayTrackH }}>
    <div id="day" style={{ position: r.dayPinPos, top: "0", height: r.dayStageH, padding: r.dayPad, overflow: "hidden" }}>
      <div style={{ maxWidth: "1180px", margin: "0 auto", height: "100%", display: r.dayDisp, gridTemplateColumns: r.dayCols, gap: r.dayGap, alignItems: "center", flexDirection: "column" }}>
        <div style={{ display: r.dayLeftDisp, flexDirection: "column", gap: "22px", textAlign: "left" }}>
          <div>
            <ChapterMark n="01" t="Your day" size={r.chEyD} />
            <h2 style={{ marginTop: "12px", fontWeight: "800", fontSize: r.dayH2, lineHeight: "1.04", letterSpacing: "-.035em" }}>
              Your day, in rhythm.
            </h2>
          </div>
          <div aria-label="Time" style={{ display: "flex", alignItems: "flex-end", gap: "2px", fontFamily: "'JetBrains Mono',monospace", fontSize: r.clock, lineHeight: "1", color: "#221E1A" }}>
            {D.clockCols.map((cc, ccI) => (
              <React.Fragment key={ccI}>
                {cc.digit ? (
                  <>
                    <span style={{ display: "block", height: "1em", overflow: "hidden" }}>
                      <span data-roll={cc.i} style={{ display: "flex", flexDirection: "column" }}>
                        {D.digits.map((dg, dgI) => (
                          <span key={dgI} style={{ display: "block", height: "1em" }}>
                            {dg}
                          </span>
                        ))}
                      </span>
                    </span>
                  </>
                ) : null}
                {cc.colon ? (
                  <>
                    <span style={{ display: "block", height: "1em" }}>
                      :
                    </span>
                  </>
                ) : null}
              </React.Fragment>
            ))}
          </div>
          <div style={{ position: "relative", height: r.railH }}>
            <span style={{ position: "absolute", left: "5px", top: "0", bottom: "0", width: "2px", borderRadius: "2px", background: "#EFEAFB" }} />
            <span id="rail-fill" style={{ position: "absolute", left: "5px", top: "0", bottom: "0", width: "2px", borderRadius: "2px", background: "#7D67D9", transformOrigin: "top", transform: "scaleY(0)" }} />
            {D.moments.map((mo, moI) => (
              <div key={moI} style={{ position: "absolute", left: "0", top: mo.l, display: "flex", alignItems: "center", gap: "12px", transform: "translateY(-50%)" }}>
                <span style={{ position: "relative", width: "12px", height: "12px", flexShrink: "0", borderRadius: "99px", background: "#FFFFFF", border: "2px solid #D9D2EE" }}>
                  <span data-rd={mo.i} style={{ position: "absolute", inset: "-2px", borderRadius: "99px", background: "#7D67D9", opacity: "0" }} />
                </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#8C8378" }}>
                  {mo.t}
                </span>
                <span data-rl={mo.i} style={{ fontSize: "13px", fontWeight: "700", color: "#5B5349", opacity: ".55", whiteSpace: "nowrap" }}>
                  {mo.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div id="day-phone-slot" style={{ height: r.dayPhoneSpace, width: "100%", flexShrink: "0" }} />
        <div style={{ display: r.dayMobDisp, flexDirection: "column", gap: "10px", width: "100%", padding: "0 4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "10.5px", fontWeight: "700", letterSpacing: ".22em", color: "#7D67D9" }}>
              01 · YOUR DAY, IN RHYTHM
            </span>
            <span id="day-clock-m" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "15px", color: "#221E1A" }}>
              08:10
            </span>
          </div>
          <div style={{ position: "relative", height: "16px" }}>
            <span style={{ position: "absolute", left: "0", right: "0", top: "7px", height: "2px", borderRadius: "2px", background: "#EFEAFB" }} />
            <span id="rail-fill-m" style={{ position: "absolute", left: "0", right: "0", top: "7px", height: "2px", borderRadius: "2px", background: "#7D67D9", transformOrigin: "left", transform: "scaleX(0)" }} />
            {D.momentsH.map((mo, moI) => (
              <span key={moI} style={{ position: "absolute", left: mo.l, top: "2px", width: "12px", height: "12px", marginLeft: "-6px", borderRadius: "99px", background: "#FFFFFF", border: "2px solid #D9D2EE" }}>
                <span data-rdm={mo.i} style={{ position: "absolute", inset: "-2px", borderRadius: "99px", background: "#7D67D9", opacity: "0" }} />
              </span>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", width: "100%", height: r.stepH, textAlign: "left" }}>
          {D.dayStepsTxt.map((ds, dsI) => (
            <div key={dsI} data-dstep={ds.i} style={{ position: "absolute", left: "0", right: "0", top: r.stepTop, transform: "translateY(-50%)", opacity: "0" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: ds.c }}>
                {ds.t}
              </span>
              <h3 style={{ marginTop: "8px", fontSize: r.stepT, fontWeight: "800", letterSpacing: "-.025em", lineHeight: "1.12" }}>
                {ds.h}
              </h3>
              <p style={{ marginTop: "8px", fontSize: r.stepP, lineHeight: "1.6", color: "#5B5349", maxWidth: "340px" }}>
                {ds.p}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
