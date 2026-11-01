// Centium landing v29: section 04 "Real professionals in your corner." (CO1
// v6, 02_pages/11-CO1), the prototype markup with its exact inline styles.
// Centre: the chat between Rami and Lara, one message at a time, then the
// call card. Desktop only, on either side: what Rami sees (left) and what
// Lara sees (right), six scenes each, kept in step with the chat; a 320vh
// track pins the stage (motion/coaching.ts).

import React from "react";
import { ChapterMark } from "./ChapterMark";
import * as D from "./data/coaching";
import type { SectionVals } from "./sectionVals";
import { t } from "../../../i18n/core";

export const Coaching: React.FC<{ r: SectionVals }> = ({ r }) => (
  <div id="co-track" data-screen-label="CO1 v6 Coaching" style={{ position: "relative", zIndex: "2", height: r.coH }}>
    <div style={{ position: r.pinPos, top: "0", minHeight: r.pinMin, padding: `${r.pinPad} ${r.px}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ maxWidth: "1240px", margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <ChapterMark n="04" t={t("Coaching")} size={r.chEy} />
          <h2 style={{ marginTop: "14px", fontWeight: "800", fontSize: r.h2, lineHeight: "1.04", letterSpacing: "-.035em" }}>
            {t("Real professionals in your corner.")}
          </h2>
        </div>
        <div style={{ marginTop: "36px", display: "grid", gridTemplateColumns: r.coCols, gap: "18px", alignItems: "stretch" }}>
          <div style={{ display: r.coSide, position: "relative", height: "420px", borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.14)", boxShadow: "0 1px 1px rgba(72,58,130,.05),0 6px 16px rgba(72,58,130,.06),0 24px 50px rgba(92,72,168,.09)", overflow: "hidden", textAlign: "start" }}>
            <div style={{ position: "absolute", left: "20px", top: "16px", right: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
                {t("CLIENT VIEW · RAMI")}
              </span>
              <span id="co-lstep" style={{ fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "10.5px", color: "#756D63" }}>
                1 / 6
              </span>
            </div>
            <div data-cl="0" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ width: "52px", height: "52px", borderRadius: "99px", background: "#DAEAE7", color: "#2F5F58", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* i18n-ignore: initials */}
                  LK
                </span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "17px", fontWeight: "800" }}>
                    {t("Lara Khoury")}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", paddingBlock: "2px", paddingInline: "2px 7px", borderRadius: "99px", background: "#EDF4F3", color: "#2F5F58", fontSize: "10px", fontWeight: "800" }}>
                      <span style={{ width: "13px", height: "13px", borderRadius: "99px", background: "#5D9C93", color: "#fff", fontSize: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ✓
                      </span>
                      {t("Verified")}
                    </span>
                  </div>
                  <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#3D6E69" }}>
                    {t("Dietitian · Beirut")}
                  </div>
                </div>
              </div>
              {D.cvLines.map((cv, cvI) => (
                <div key={cvI} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#3B352D" }}>
                  <span style={{ width: "5px", height: "5px", marginTop: "8px", borderRadius: "9px", background: "#5D9C93", flexShrink: "0" }} />
                  {t(cv)}
                </div>
              ))}
              <div style={{ marginTop: "auto", position: "relative", height: "46px" }}>
                <span data-w="0.2 0.5" data-out="" style={{ position: "absolute", inset: "0", borderRadius: "99px", background: "#775FD7", color: "#fff", fontWeight: "700", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {t("Hire Lara")}
                </span>
                <span data-w="0.3 0.6" data-op="" style={{ position: "absolute", inset: "0", borderRadius: "99px", background: "#2F5F58", color: "#fff", fontWeight: "700", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", opacity: "0" }}>
                  {t("✓ Hired yesterday")}
                </span>
              </div>
            </div>
            <div data-cl="1" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ padding: "14px", borderRadius: "16px", background: "#FAF9FE", border: "1px solid rgba(125,103,217,.14)" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#4E3894" }}>
                  {t("NEW PLAN FROM LARA")}
                </div>
                <div style={{ marginTop: "2px", fontSize: "18px", fontWeight: "800" }}>
                  {t("High protein · week 3")}
                </div>
                <div style={{ fontSize: "12px", color: "#5B5349" }}>
                  {t("Shared today · daily targets")}
                </div>
              </div>
              {D.planTargets.map((pt, ptI) => (
                <div key={ptI}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700" }}>
                    <span>
                      {t(pt.k)}
                    </span>
                    <span style={{ color: "#5B5349" }}>
                      {t(pt.v)}
                    </span>
                  </div>
                  <div style={{ marginTop: "5px", height: "7px", borderRadius: "9px", background: "#F1EEF8", overflow: "hidden" }}>
                    <div data-w={pt.w} data-sx="" style={{ height: "100%", width: pt.pct, borderRadius: "9px", background: pt.c, transformOrigin: "left", transform: "scaleX(0)" }} />
                  </div>
                </div>
              ))}
            </div>
            <div data-cl="2" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "15px", fontWeight: "800" }}>
                {t("Today's diary")}
              </div>
              {D.diaryRows.map((dr, drI) => (
                <div key={drI} style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: "14px", border: "1px solid #EDEAE4" }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
                      {t(dr.k)}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700" }}>
                      {t(dr.t)}
                    </div>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#4E3894" }}>
                    {dr.v}
                  </span>
                  {dr.swap ? (
                    <>
                      <span data-w="0.3 0.6" data-op="" style={{ position: "absolute", inset: "-1px", borderRadius: "14px", border: "2px solid #775FD7", opacity: "0" }} />
                      <span data-w="0.4 0.7" data-stamp="" style={{ position: "absolute", right: "10px", top: "-10px", padding: "2px 8px", borderRadius: "99px", background: "#775FD7", color: "#fff", fontSize: "10px", fontWeight: "800", opacity: "0" }}>
                        {t("Swap requested")}
                      </span>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            <div data-cl="3" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ padding: "14px", borderRadius: "16px", border: "2px solid #5D9C93", background: "#F3F9F7" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#2F5F58" }}>
                    {t("DINNER · UPDATED BY LARA")}
                  </span>
                  <span data-w="0.2 0.4" data-stamp="" style={{ padding: "1px 8px", borderRadius: "99px", background: "#2F5F58", color: "#fff", fontSize: "10px", fontWeight: "800", opacity: "0" }}>
                    {t("Synced")}
                  </span>
                </div>
                <div style={{ marginTop: "4px", fontSize: "17px", fontWeight: "800" }}>
                  {t("Mujaddara")}
                </div>
                <div data-w="0.15 0.45" data-tx="-12" style={{ fontSize: "14px", fontWeight: "700", color: "#2F5F58", opacity: "0" }}>
                  {t("+ Grilled halloumi, 80 g")}
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700" }}>
                  <span>
                    {t("Protein today")}
                  </span>
                  <span>
                    <span data-w="0.3 0.85" data-cnt="150" data-from="128">
                      128
                    </span>
                    {" "}{t("/ 165 g")}
                  </span>
                </div>
                <div style={{ position: "relative", marginTop: "6px", height: "9px", borderRadius: "9px", background: "#F1EEF8", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: "77.6%", borderRadius: "9px", background: "#B9A9EE" }} />
                  <div data-w="0.3 0.85" data-sx="" style={{ position: "absolute", left: "77.6%", top: "0", bottom: "0", width: "13.3%", background: "#775FD7", transformOrigin: "left", transform: "scaleX(0)" }} />
                </div>
              </div>
              <div style={{ marginTop: "auto", fontSize: "12.5px", color: "#5B5349" }}>
                {t("Your plan and diary stay in sync. Lara sees training and nutrition. Labs stay private.")}
              </div>
            </div>
            <div data-cl="4" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "15px", fontWeight: "800" }}>
                  {t("Book with Lara")}
                </span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#756D63" }}>
                  {t("October")}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "6px" }}>
                {D.bookDays.map((bk, bkI) => (
                  <div key={bkI} style={{ position: "relative", padding: "8px 0", borderRadius: "12px", border: "1px solid #EDEAE4", textAlign: "center" }}>
                    <div style={{ fontSize: "10px", fontWeight: "700", color: "#756D63" }}>
                      {t(bk.d)}
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "800" }}>
                      {bk.n}
                    </div>
                    {bk.on ? (
                      <>
                        <span data-w="0.1 0.3" data-op="" style={{ position: "absolute", inset: "-1px", borderRadius: "12px", background: "#775FD7", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: "0" }}>
                          <span style={{ fontSize: "10px", fontWeight: "700" }}>
                            {t(bk.d)}
                          </span>
                          <span style={{ fontSize: "16px", fontWeight: "800" }}>
                            {bk.n}
                          </span>
                        </span>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px" }}>
                {D.bookSlots.map((bs, bsI) => (
                  <div key={bsI} style={{ position: "relative", padding: "9px 0", borderRadius: "10px", border: "1px solid #EDEAE4", textAlign: "center", fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "12px", color: "#5B5349" }}>
                    {bs.t}
                    {bs.on ? (
                      <>
                        <span data-w="0.35 0.55" data-stamp="" style={{ position: "absolute", inset: "-1px", borderRadius: "10px", background: "#2F5F58", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", opacity: "0" }}>
                          {bs.t}{" "}✓
                        </span>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
              <div data-w="0.55 0.8" data-op="" style={{ marginTop: "auto", padding: "12px 14px", borderRadius: "14px", background: "#EDF4F3", fontSize: "13px", fontWeight: "700", color: "#2F5F58", opacity: "0" }}>
                {t("Video call · Thu 22 Oct, 18:00")}
              </div>
            </div>
            <div data-cl="5" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ position: "relative", flex: "1", borderRadius: "16px", background: "repeating-linear-gradient(135deg,#EEF4F2 0 10px,#E5EEEB 10px 20px)", overflow: "hidden", padding: "12px" }}>
                <span style={{ fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "10px", color: "#516E6A" }}>
                  {t("video: Lara Khoury")}
                </span>
                <span style={{ position: "absolute", right: "12px", bottom: "12px", width: "76px", height: "96px", borderRadius: "12px", background: "repeating-linear-gradient(135deg,#F4F1FB 0 8px,#ECE7F8 8px 16px)", border: "2px solid #fff", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "6px", fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "9px", color: "#6B5E94" }}>
                  {t("you")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "14px", background: "#2F5F58", color: "#fff" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap" }}>
                  {t("Lara Khoury")}
                </span>
                <div style={{ flex: "1", display: "flex", alignItems: "center", gap: "3px", height: "20px" }}>
                  {D.voice.map((vc, vcI) => (
                    <span key={vcI} data-w={vc.w} data-sy="" style={{ flex: "1", height: vc.h, borderRadius: "2px", background: "#8AC4BA", transformOrigin: "center", transform: "scaleY(0)" }} />
                  ))}
                </div>
                <span style={{ fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "12px" }}>
                  12:04
                </span>
              </div>
            </div>
          </div>
          <div style={{ padding: "20px", borderRadius: "22px", background: "#FAF9FE", border: "1px solid rgba(125,103,217,.14)", display: "flex", flexDirection: "column", gap: "10px", minHeight: "420px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63", textAlign: "center" }}>
              {t("MESSAGES")}
            </span>
            {D.chat.map((m, mI) => (
              <div key={mI} data-cm="" style={{ alignSelf: m.side, maxWidth: "80%", padding: "10px 14px", borderRadius: "16px", fontSize: "14px", fontWeight: "600", background: m.bg, color: m.ink, opacity: "0" }}>
                {t(m.t)}
              </div>
            ))}
            <div data-call="" style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: "14px", background: "#2F5F58", color: "#fff", opacity: "0" }}>
              <span style={{ fontWeight: "700", fontSize: "14px" }}>
                {t("Voice call · Lara Khoury")}
              </span>
              <span style={{ fontSize: "13px" }}>
                12:04
              </span>
            </div>
          </div>
          <div style={{ display: r.coSide, position: "relative", height: "420px", borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(94,158,149,.2)", boxShadow: "0 1px 1px rgba(72,58,130,.05),0 6px 16px rgba(72,58,130,.06),0 24px 50px rgba(92,72,168,.09)", overflow: "hidden", textAlign: "start" }}>
            <div style={{ position: "absolute", left: "20px", top: "16px", right: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#3D6E69" }}>
                {t("PROFESSIONAL VIEW · LARA")}
              </span>
              <span id="co-rstep" style={{ fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "10.5px", color: "#756D63" }}>
                1 / 6
              </span>
            </div>
            <div data-cr="0" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "15px", fontWeight: "800", marginBottom: "4px" }}>
                {t("Clients")}
              </div>
              {D.clientsCo.map((c, cI) => (
                <div key={cI} data-w={c.w} data-tx={c.tx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderTop: "1px solid #EDEAE4" }}>
                  <span style={{ width: "30px", height: "30px", borderRadius: "99px", background: c.bg, color: c.ink, fontSize: "10.5px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.i}
                  </span>
                  <span style={{ flex: "1", fontSize: "13.5px", fontWeight: "700" }}>
                    {t(c.n)}
                  </span>
                  <span style={{ fontSize: "11.5px", fontWeight: "800", padding: "2px 8px", borderRadius: "99px", background: c.sb, color: c.sc }}>
                    {t(c.s)}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#F4F1FB" }}>
                  <div style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".1em", color: "#5C48A8" }}>
                    {t("NEW THIS WEEK")}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: "800" }}>
                    {t("1 client")}
                  </div>
                </div>
                <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#EDF4F3" }}>
                  <div style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".1em", color: "#2F5F58" }}>
                    {t("CHECK-INS DUE")}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: "800" }}>
                    {t("1 today")}
                  </div>
                </div>
              </div>
            </div>
            <div data-cr="1" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ fontSize: "15px", fontWeight: "800" }}>
                {t("Plan builder")}
              </div>
              <div style={{ padding: "12px 14px", borderRadius: "14px", border: "1px solid rgba(94,158,149,.2)" }}>
                <div style={{ fontSize: "14px", fontWeight: "800" }}>
                  {t("High protein · week 3")}
                </div>
                {D.planMeals.map((pm, pmI) => (
                  <div key={pmI} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #F1EEEA", fontSize: "12.5px" }}>
                    <span style={{ color: "#756D63", fontWeight: "700" }}>
                      {t(pm.k)}
                    </span>
                    <span style={{ fontWeight: "700" }}>
                      {t(pm.v)}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "14px", background: "#EDF4F3" }}>
                <span style={{ width: "28px", height: "28px", borderRadius: "99px", background: "#DED4F4", color: "#5C48A8", fontSize: "10px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* i18n-ignore: initials */}
                  RH
                </span>
                <span style={{ flex: "1", fontSize: "13px", fontWeight: "700" }}>
                  {t("Shared with Rami Haddad")}
                </span>
                <span data-w="0.3 0.55" data-stamp="" style={{ width: "22px", height: "22px", borderRadius: "99px", background: "#2F5F58", color: "#fff", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", opacity: "0" }}>
                  ✓
                </span>
              </div>
            </div>
            <div data-cr="2" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ fontSize: "15px", fontWeight: "800" }}>
                {t("Rami Haddad · today")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                {D.clientStats.map((cs, csI) => (
                  <div key={csI} style={{ padding: "10px", borderRadius: "12px", border: "1px solid #EDEAE4" }}>
                    <div style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".1em", color: "#756D63" }}>
                      {t(cs.k)}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: "800" }}>
                      {t(cs.v)}
                    </div>
                  </div>
                ))}
              </div>
              <div data-w="0.35 0.65" data-ty="12" data-op="" style={{ padding: "12px 14px", borderRadius: "14px", background: "#F4F1FB", border: "1px solid rgba(125,103,217,.2)", opacity: "0" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#4E3894" }}>
                  {t("REQUEST")}
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: "700" }}>
                  {t("Rami asked to swap dinner for mujaddara")}
                </div>
                <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                  <span style={{ padding: "6px 12px", borderRadius: "99px", background: "#775FD7", color: "#fff", fontSize: "12px", fontWeight: "700" }}>
                    {t("Review")}
                  </span>
                  <span style={{ padding: "6px 12px", borderRadius: "99px", border: "1px solid #DFDAD2", fontSize: "12px", fontWeight: "700" }}>
                    {t("Later")}
                  </span>
                </div>
              </div>
            </div>
            <div data-cr="3" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ fontSize: "15px", fontWeight: "800" }}>
                {t("Edit dinner")}
              </div>
              <div style={{ padding: "12px 14px", borderRadius: "14px", border: "1px solid rgba(94,158,149,.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", fontWeight: "700" }}>
                  <span>
                    {t("Mujaddara")}
                  </span>
                  <span>
                    {t("520 kcal")}
                  </span>
                </div>
                <div data-w="0.1 0.4" data-tx="-12" style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", fontWeight: "700", color: "#2F5F58", marginTop: "6px", opacity: "0" }}>
                  <span>
                    {t("+ Grilled halloumi 80 g")}
                  </span>
                  <span>
                    {t("+22 g P")}
                  </span>
                </div>
              </div>
              <div data-w="0.4 0.7" data-stamp="" style={{ alignSelf: "flex-start", padding: "6px 12px", borderRadius: "99px", background: "#2F5F58", color: "#fff", fontSize: "12px", fontWeight: "800", opacity: "0" }}>
                {t("✓ Synced to Rami's plan")}
              </div>
            </div>
            <div data-cr="4" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "15px", fontWeight: "800" }}>
                {t("Schedule · Thursday")}
              </div>
              {D.laraDay.map((ld, ldI) => (
                <div key={ldI} style={{ position: "relative", display: "flex", gap: "10px", alignItems: "center", padding: "9px 12px", borderRadius: "12px", border: "1px solid #EDEAE4" }}>
                  <span style={{ fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "11.5px", color: "#756D63", width: "42px" }}>
                    {ld.t}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "700" }}>
                    {t(ld.n)}
                  </span>
                  {ld.on ? (
                    <>
                      <span data-w="0.3 0.55" data-op="" style={{ position: "absolute", inset: "-1px", borderRadius: "12px", background: "#2F5F58", color: "#fff", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px", opacity: "0" }}>
                        <span style={{ fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "11.5px", width: "42px" }}>
                          {ld.t}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: "700" }}>
                          {t("Rami Haddad · video")}
                        </span>
                      </span>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            <div data-cr="5" style={{ position: "absolute", left: "20px", right: "20px", top: "48px", bottom: "20px", opacity: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "15px", fontWeight: "800" }}>
                  {t("Session notes")}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "13px", color: "#2F5F58" }}>
                  ● 12:04
                </span>
              </div>
              {D.notes.map((nt, ntI) => (
                <div key={ntI} data-w={nt.w} data-op="" style={{ display: "flex", gap: "8px", fontSize: "13px", lineHeight: "1.45", opacity: "0" }}>
                  <span style={{ width: "6px", height: "6px", marginTop: "7px", borderRadius: "9px", background: "#5D9C93", flexShrink: "0" }} />
                  {t(nt.t)}
                </div>
              ))}
              <div data-w="0.75 0.95" data-op="" style={{ marginTop: "auto", padding: "12px 14px", borderRadius: "14px", background: "#EDF4F3", opacity: "0" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#3D6E69" }}>
                  {t("AFTER THE CALL")}
                </div>
                <div style={{ marginTop: "4px", fontSize: "13.5px", fontWeight: "800" }}>
                  {t("Notes shared with Rami")}
                </div>
                <div style={{ marginTop: "2px", fontSize: "12px", color: "#5B5349" }}>
                  {t("Plan stays on week 3 · next call Monday 18:00")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
