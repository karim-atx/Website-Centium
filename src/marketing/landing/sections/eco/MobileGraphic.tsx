// Centium landing v29: section 06's mobile graphics (02_pages/13b, the v28
// template with the v29 Professionals 01 and 05), the prototype markup with
// its exact inline styles: one graphic per slide in the #F7F5FC area under
// the slide's copy (data in eco/data.ts MOBK). Below 1024px every graphic is
// shown at its final drawn state (motion/eco.ts ecoRest).

import React from "react";
import type { Slide } from "./data";
import type { SectionVals } from "../sectionVals";

export const MobileGraphic: React.FC<{ sl: Slide; r: SectionVals }> = ({ sl, r }) => (
  <div data-mobg="" style={{ display: r.mobFlex, height: r.mgH, borderRadius: "12px", background: "#F7F5FC", padding: "14px", flexDirection: "column", justifyContent: "space-evenly", gap: "8px", overflow: "hidden" }}>
    {sl.mRoster ? (
      <>
        {/* Pro 01. Karim's decision (binding): at every mobile width its
            elements stay at least 8px apart and inside the card (the v29 file
            measured 3.4 to 6.6px, and at 360 the wrapped check-in chip pushed
            the footer out). Changes from the prototype markup, measured on the
            text's own line box (ascent to descent): the name and plan lines are
            as tall as their glyphs (19px / 17px, prototype line-height 1, whose
            glyphs overhang their boxes by up to 3px), the name sits 8px above
            its detail line (prototype 10px); the filter chips use a 14px line
            and the footer 16px with 5px above it (prototype 18px / 6px); the
            row keeps 12px after the avatar and 8px before the ring (prototype
            12px); the check-in chip never wraps (4px side padding, prototype
            8px), and where the detail line is too narrow for it and the week
            (under about 400px, sectionVals ecoChipWeek) it replaces the week dots
            on its row (the plan already hides under 380px in the prototype). The ring's percentage label
            is not drawn: the prototype never rendered it (its renderer wraps
            SVG text in a span) and at 10px it would break the 12px label rule. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "800", color: "#221E1A" }}>
            Clients{" "}
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#756D63" }}>· 5</span>
          </span>
          <span style={{ display: "flex", gap: "8px", padding: "2px", borderRadius: "99px", background: "#FFFFFF", border: "1px solid #E4DCF8" }}>
            <span style={{ padding: "3px 10px", borderRadius: "99px", background: "#775FD7", color: "#FFFFFF", fontSize: "12px", fontWeight: "700", lineHeight: "14px" }}>All</span>
            <span style={{ padding: "3px 10px", fontSize: "12px", fontWeight: "700", color: "#5C48A8", lineHeight: "14px" }}>Needs attention</span>
          </span>
        </div>
        {sl.mb!.map((m, mI) => (
          <div key={mI} data-w={m.w} data-tx="-14" style={{ display: "flex", alignItems: "center", gap: "8px", opacity: "0" }}>
            <span
              style={{
                position: "relative",
                width: "32px",
                height: "32px",
                marginInlineEnd: "4px",
                flexShrink: "0",
                borderRadius: "99px",
                background: "#DED4F4",
                color: "#4E3894",
                fontSize: "12px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {m.a}
              <span style={{ position: "absolute", right: "-1px", bottom: "-1px", width: "10px", height: "10px", borderRadius: "99px", background: "#3FA36B", border: "2px solid #F7F5FC", display: m.on }} />
            </span>
            <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#221E1A", lineHeight: "19px" }}>{m.n}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "0" }}>
                {m.nodue ? <span style={{ fontSize: "12px", fontWeight: "600", color: "#756D63", lineHeight: "17px", whiteSpace: "nowrap", display: r.planDisp }}>{m.plan}</span> : null}
                {m.due ? (
                  <span
                    data-w="0.75 0.95"
                    data-op=""
                    style={{ padding: "0 4px", borderRadius: "99px", background: "#EDE8FB", color: "#4E3894", fontSize: "12px", fontWeight: "700", lineHeight: "17px", whiteSpace: "nowrap", opacity: "0" }}
                  >
                    Check-in due
                  </span>
                ) : null}
                <span style={{ display: m.due && !r.ecoChipWeek ? "none" : "flex", gap: "8px", flexShrink: "0" }}>
                  {m.days!.map((dd, ddI) => (
                    <span key={ddI} data-w={dd.w} data-stamp="" style={{ width: "5px", height: "5px", borderRadius: "99px", background: dd.c, opacity: "0" }} />
                  ))}
                </span>
              </div>
            </div>
            <svg viewBox="0 0 36 36" style={{ width: "32px", height: "32px", flexShrink: "0", transform: "rotate(-90deg)" }}>
              <circle cx="18" cy="18" r="15" fill="none" stroke="#E1ECEA" strokeWidth="4" />
              <circle data-w={m.w} data-ring={m.pr} cx="18" cy="18" r="15" fill="none" stroke="#5D9C93" strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
            </svg>
          </div>
        ))}
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#756D63", lineHeight: "16px", borderTop: "1px solid #E4DCF8", paddingTop: "5px" }}>{sl.mfoot}</span>
      </>
    ) : null}
    {sl.mTimeline ? (
      <>
        {/* Pro 03, Pro 04, Biz 01, 03 and 05: the 8px minimum gap applies to
            every slide (lead decision on B2). Their title/detail stacks (and
            the Biz 03 label/bar stacks) use gap 7px instead of the prototype's
            6px: at 6px the glyph boxes were 7.0px apart at every width. */}
        {sl.mb!.map((m, mI) => (
          <div key={mI} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ width: "44px", flexShrink: "0", fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#5B5349" }}>
              {m.t}
            </span>
            <span style={{ width: "10px", height: "10px", flexShrink: "0", borderRadius: "99px", background: m.c, boxShadow: "0 0 0 4px #F7F5FC,0 0 0 5px #E4DCF8" }} />
            <div style={{ flex: "1", minWidth: "0", padding: "8px 12px", borderRadius: "10px", background: m.bg, display: "flex", flexDirection: "column", gap: "7px" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#221E1A" }}>
                {m.n}
              </span>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#756D63" }}>
                {m.s}
              </span>
            </div>
          </div>
        ))}
      </>
    ) : null}
    {sl.mPlan ? (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "16px", fontWeight: "800", color: "#221E1A" }}>
            {sl.mh}
          </span>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#756D63" }}>
            {sl.ms}
          </span>
        </div>
        {sl.mb!.map((m, mI) => (
          <div key={mI} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "10px", background: "#FFFFFF", border: "1px solid #E4DCF8" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#221E1A" }}>
              {m.n}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#4E3894" }}>
              {m.s}
            </span>
          </div>
        ))}
        <div data-w="0.3 0.8" data-ty="10" data-op="" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "10px", background: "#EDE8FB", border: "1px dashed #9C7FF8", opacity: "0" }}>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#4E3894" }}>
            {sl.mx}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#4E3894" }}>
            {sl.mxs}
          </span>
        </div>
      </>
    ) : null}
    {sl.mArea ? (
      <>
        {/* Pro 05. Karim's decision (binding): 8px minimum gap and all inside
            the card at every mobile width (the v29 file had the tooltip 3.4 to
            6.6px from the "+$380 vs Sep" chip, over the Sep point at 360, and
            the footer 18px past the graphic at 360). Changes from the prototype
            markup: the tooltip sits under the line at the right (top 30% + 12px,
            prototype 10% - 11px); the chart's minimum height is 56px (64px); the
            chip, the figure, the months and the footer use line boxes as tall
            as their glyphs (14px / 36px / 17px / 16px with 5px above, prototype
            18px / 39px / 18px / 18px with 6px). */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "800", color: "#221E1A" }}>
            Earnings
          </span>
          <span style={{ padding: "3px 10px", borderRadius: "99px", background: "#FFFFFF", border: "1px solid #E4DCF8", fontSize: "12px", fontWeight: "700", color: "#5C48A8", lineHeight: "14px" }}>
            Last 4 months
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span style={{ fontSize: "26px", fontWeight: "800", letterSpacing: "-.02em", color: "#221E1A", lineHeight: "36px" }}>
            {sl.mh}
          </span>
          <span data-w="0.6 0.85" data-op="" style={{ padding: "2px 8px", borderRadius: "99px", background: "#DDF0EC", color: "#2F5F58", fontSize: "12px", fontWeight: "800", opacity: "0" }}>
            +$380 vs Sep
          </span>
        </div>
        <div style={{ position: "relative", flex: "1", minHeight: "56px", marginBottom: "4px" }}>
          <svg viewBox="0 0 300 120" preserveAspectRatio="none" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", overflow: "visible" }}>
            <line x1="0" y1="20" x2="300" y2="20" stroke="#E4DCF8" />
            <line x1="0" y1="60" x2="300" y2="60" stroke="#E4DCF8" />
            <line x1="0" y1="100" x2="300" y2="100" stroke="#E4DCF8" />
            <path data-w="0.1 0.6" data-op="" d={sl.marea} fill="#DDF0EC" style={{ opacity: "0" }} />
            <polyline data-w="0.1 0.7" data-draw="" points={sl.mline} fill="none" stroke="#2F5F58" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
          </svg>
          {sl.mpts!.map((pt, ptI) => (
            <span key={ptI} data-w={pt.w} data-stamp="" style={{ position: "absolute", left: pt.x, top: pt.y, width: pt.s, height: pt.s, margin: pt.m, borderRadius: "99px", background: "#FFFFFF", border: "2px solid #2F5F58", opacity: "0" }} />
          ))}
          <span data-w="0.75 0.95" data-op="" style={{ position: "absolute", right: "20px", top: "calc(30% + 12px)", padding: "2px 8px", borderRadius: "8px", background: "#2F5F58", color: "#FFFFFF", fontSize: "12px", fontWeight: "800", opacity: "0" }}>
            {sl.mtop}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
          {sl.mMonths!.map((m, mI) => (
            <span key={mI} style={{ fontSize: "12px", fontWeight: "600", color: "#756D63", lineHeight: "17px" }}>
              {m}
            </span>
          ))}
        </div>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#756D63", lineHeight: "16px", borderTop: "1px solid #E4DCF8", paddingTop: "5px", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "12px", height: "12px", borderRadius: "3px", border: "1.5px solid #756D63" }} />
          {sl.mfoot}
        </span>
      </>
    ) : null}
    {sl.mChat ? (
      <>
        {sl.mb!.map((m, mI) => (
          <span key={mI} style={{ alignSelf: m.side, maxWidth: "78%", padding: "9px 12px", borderRadius: "14px", background: m.bg, color: m.ink, fontSize: "14px", lineHeight: "1.4" }}>
            {m.t}
          </span>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "12px", background: "#FFFFFF", border: "1px solid #E4DCF8" }}>
          <span style={{ width: "32px", height: "32px", flexShrink: "0", borderRadius: "99px", background: "#DED4F4", color: "#4E3894", fontSize: "12px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {sl.mca}
          </span>
          <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "7px" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#221E1A" }}>
              {sl.mcn}
            </span>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#756D63" }}>
              {sl.mct}
            </span>
          </div>
          <span style={{ width: "36px", height: "36px", borderRadius: "99px", background: "#2F5F58", color: "#FFFFFF", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ▶
          </span>
        </div>
      </>
    ) : null}
    {sl.mClasses ? (
      <>
        {sl.mb!.map((m, mI) => (
          <div key={mI} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ width: "44px", flexShrink: "0", fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#5B5349" }}>
                {m.t}
              </span>
              <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "7px" }}>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#221E1A" }}>
                  {m.n}
                </span>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#756D63" }}>
                  {m.i}
                </span>
              </div>
              <span style={{ fontSize: "12px", fontWeight: "800", color: m.ink, whiteSpace: "nowrap" }}>
                {m.c}
              </span>
            </div>
            <span style={{ display: "block", height: "6px", borderRadius: "9px", background: "#E4DCF8", marginInlineStart: "56px", overflow: "hidden" }}>
              <span data-w="0.2 0.8" data-sx="" style={{ display: "block", height: "100%", width: m.f, background: m.bar, borderRadius: "9px", transformOrigin: "left", transform: "scaleX(0)" }} />
            </span>
          </div>
        ))}
      </>
    ) : null}
    {sl.mDesk ? (
      <>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#756D63" }}>
            Checked in today
          </span>
          <span style={{ fontSize: "30px", fontWeight: "800", color: "#2F5F58" }}>
            <span data-w="0.1 0.7" data-cnt={sl.mh} data-from="0">
              0
            </span>
          </span>
        </div>
        {sl.mb!.map((m, mI) => (
          <div key={mI} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ width: "32px", height: "32px", flexShrink: "0", borderRadius: "99px", background: "#DAEAE7", color: "#4E3894", fontSize: "12px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {m.a}
            </span>
            <span style={{ flex: "1", fontSize: "14px", fontWeight: "700", color: "#221E1A" }}>
              {m.n}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#5B5349" }}>
              {m.t}
            </span>
          </div>
        ))}
      </>
    ) : null}
    {sl.mBars ? (
      <>
        {sl.mb!.map((m, mI) => (
          <div key={mI} style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#221E1A" }}>
                {m.n}
              </span>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#4E3894" }}>
                {m.c}
              </span>
            </div>
            <span style={{ display: "block", height: "14px", borderRadius: "9px", background: "#E4DCF8", overflow: "hidden" }}>
              <span data-w="0.15 0.75" data-sx="" style={{ display: "block", height: "100%", width: m.f, background: m.bar, borderRadius: "9px", transformOrigin: "left", transform: "scaleX(0)" }} />
            </span>
          </div>
        ))}
      </>
    ) : null}
    {sl.mStaff ? (
      <>
        {sl.mb!.map((m, mI) => (
          <div key={mI} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ width: "32px", height: "32px", flexShrink: "0", borderRadius: "99px", background: "#DAEAE7", color: "#4E3894", fontSize: "12px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m.a}
              </span>
              <span style={{ flex: "1", fontSize: "14px", fontWeight: "700", color: "#221E1A" }}>
                {m.n}
              </span>
              <span style={{ padding: "3px 8px", borderRadius: "99px", background: "#EDE8FB", fontSize: "12px", fontWeight: "700", color: "#4E3894", whiteSpace: "nowrap" }}>
                {m.r}
              </span>
            </div>
            <span style={{ position: "relative", display: "block", height: "8px", borderRadius: "9px", background: "#E4DCF8", marginInlineStart: "44px" }}>
              <span style={{ position: "absolute", top: "0", bottom: "0", left: m.l, width: m.w, borderRadius: "9px", background: "#5D9C93" }} />
            </span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginInlineStart: "44px" }}>
          {sl.mhrs!.map((h, hI) => (
            <span key={hI} style={{ fontSize: "12px", fontWeight: "600", color: "#756D63" }}>
              {h}
            </span>
          ))}
        </div>
      </>
    ) : null}
    {sl.mGym ? (
      <>
        <div style={{ height: "64px", borderRadius: "10px", background: "repeating-linear-gradient(135deg,#EDE8FB 0 10px,#F4F1FB 10px 20px)", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "6px 8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#6B5E94" }}>
          gym photo
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          <span style={{ fontSize: "16px", fontWeight: "800", color: "#221E1A" }}>
            {sl.mh}
          </span>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#756D63" }}>
            {sl.ms}
          </span>
        </div>
        {sl.mb!.map((m, mI) => (
          <div key={mI} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ width: "44px", flexShrink: "0", fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#5B5349" }}>
              {m.t}
            </span>
            <span style={{ flex: "1", minWidth: "0", fontSize: "14px", fontWeight: "700", color: "#221E1A" }}>
              {m.n}
            </span>
            <span style={{ padding: "6px 14px", borderRadius: "99px", background: "#775FD7", color: "#FFFFFF", fontSize: "12px", fontWeight: "700" }}>
              Book
            </span>
          </div>
        ))}
      </>
    ) : null}
  </div>
);
