// Centium landing v29: section 06's desktop graphics (02_pages/13-EC1), the
// prototype markup with its exact inline styles: an app window (URL bar,
// heading, then the slide's graphic: rows, week grid, chat, plan builder,
// earnings bridge, heat map, front desk, membership mix, shift board, gym
// page). Its [data-w] elements build as the slide comes to the centre
// (motion/eco.ts). The prototype's unused isProfile / isArea / isChart
// branches (no v29 slide sets them) are not ported.

import React from "react";
import type { Slide } from "./data";
import type { SectionVals } from "../sectionVals";
import { t } from "../../../../i18n/core";

/** t() for an optional data field: a missing one stays missing (renders nothing), as before. */
const tOpt = (s: string | undefined) => (s === undefined ? s : t(s));

export const DesktopGraphic: React.FC<{ sl: Slide; r: SectionVals }> = ({ sl, r }) => (
  <div style={{ borderRadius: "18px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.12)", overflow: "hidden", flexDirection: "column", minHeight: "0", contain: "paint", display: r.mhFlex }}>
    <div style={{ height: "32px", flexShrink: "0", display: "flex", alignItems: "center", gap: "6px", padding: "0 12px", background: "#FAF9FE", borderBottom: "1px solid rgba(125,103,217,.1)" }}>
      <span style={{ width: "7px", height: "7px", borderRadius: "9px", background: "#E4DCF8" }} />
      <span style={{ width: "7px", height: "7px", borderRadius: "9px", background: "#DDE8E5" }} />
      <span style={{ width: "7px", height: "7px", borderRadius: "9px", background: "#E7E3DC" }} />
      <span style={{ marginInlineStart: "8px", fontSize: r.eF11, fontWeight: "700", color: "#756D63" }}>
        {sl.url}
      </span>
    </div>
    <div style={{ flex: "1", padding: "14px", display: "flex", flexDirection: "column", gap: "8px", minHeight: "0", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "15px", fontWeight: "800" }}>
          {tOpt(sl.head)}
        </span>
        <span style={{ fontSize: r.eF115, fontWeight: "700", color: sl.c, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "45%", flexShrink: "1" }}>
          {tOpt(sl.sub)}
        </span>
      </div>
      {sl.isRows ? (
        <>
          <div style={{ flex: "1", minHeight: "0", display: "flex", flexDirection: "column", gap: "8px" }}>
            {sl.rows!.map((rw, rwI) => (
              <div key={rwI} data-w={rw.w} data-tx="-14" style={{ position: "relative", flex: "1 1 0", minHeight: "44px", display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px", borderRadius: "12px", border: "1px solid #F0EDE8", opacity: "0" }}>
                {rw.av ? (
                  <>
                    <span style={{ width: "30px", height: "30px", flexShrink: "0", borderRadius: rw.rad, background: rw.abg, color: rw.aink, fontSize: r.eF105, fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {rw.av}
                    </span>
                  </>
                ) : null}
                <div style={{ flex: "1", minWidth: "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden" }}>
                    {tOpt(rw.a)}
                    {rw.ver ? (
                      <>
                        <span style={{ width: "13px", height: "13px", borderRadius: "99px", background: "#5D9C93", color: "#fff", fontSize: r.eF8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          ✓
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div style={{ fontSize: r.eF11, color: "#756D63", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {tOpt(rw.m)}
                  </div>
                  {rw.bar ? (
                    <>
                      <div style={{ marginTop: "5px", height: "5px", borderRadius: "9px", background: "#F1EEF8", overflow: "hidden" }}>
                        <div data-w={rw.bw} data-sx="" style={{ height: "100%", width: rw.bar, borderRadius: "9px", background: rw.bc, transformOrigin: "left", transform: "scaleX(0)" }} />
                      </div>
                    </>
                  ) : null}
                </div>
                {rw.ring ? (
                  <>
                    <span style={{ position: "relative", width: "34px", height: "34px", flexShrink: "0" }}>
                      <svg viewBox="0 0 34 34" style={{ width: "34px", height: "34px" }}>
                        <circle cx="17" cy="17" r="13" fill="none" stroke="#EFEAFB" strokeWidth="4" />
                        <circle data-w={rw.bw} data-ring={rw.ring} cx="17" cy="17" r="13" fill="none" stroke="#5D9C93" strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" transform="rotate(-90 17 17)" />
                      </svg>
                    </span>
                  </>
                ) : null}
                <span style={{ flexShrink: "0", padding: "3px 9px", borderRadius: "99px", fontSize: r.eF11, fontWeight: "800", background: rw.sb, color: rw.sc }}>
                  {tOpt(rw.s)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {sl.isGrid ? (
        <>
          <div style={{ flex: "1", display: "grid", gridTemplateColumns: "34px repeat(5,1fr)", gridTemplateRows: "auto repeat(4,minmax(0,1fr))", gap: "4px", minHeight: "0" }}>
            <span />
            {sl.days!.map((d, dI) => (
              <span key={dI} style={{ textAlign: "center", fontSize: r.eF105, fontWeight: "700", color: "#756D63" }}>
                {t(d)}
              </span>
            ))}
            {sl.cells!.map((ce, ceI) => (
              <span key={ceI} style={{ position: "relative", minHeight: "26px", borderRadius: "7px", background: ce.bg, fontFamily: "'JetBrains Mono',monospace", fontSize: r.eF95, color: "#756D63", display: "flex", alignItems: "center", paddingInlineStart: "2px" }}>
                {tOpt(ce.t)}
                {ce.on ? (
                  <>
                    <span data-w={ce.w} data-stamp="" style={{ position: "absolute", inset: "0", borderRadius: "7px", background: ce.c, color: ce.ink, fontFamily: "Manrope,sans-serif", fontSize: r.eF10, fontWeight: "800", display: "flex", alignItems: "center", padding: "0 6px", opacity: "0", whiteSpace: "nowrap", overflow: "hidden" }}>
                      {tOpt(ce.n)}
                    </span>
                  </>
                ) : null}
              </span>
            ))}
          </div>
        </>
      ) : null}
      {sl.isChat ? (
        <>
          <div style={{ flex: "1", display: "grid", gridTemplateColumns: "150px 1fr", gap: "10px", minHeight: "0" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {sl.inbox!.map((ib, ibI) => (
                <div key={ibI} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "10px", background: ib.bg }}>
                  <span style={{ width: "24px", height: "24px", flexShrink: "0", borderRadius: "99px", background: "#DED4F4", color: "#5C48A8", fontSize: r.eF9, fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ib.i}
                  </span>
                  <span style={{ flex: "1", minWidth: "0", fontSize: r.eF115, fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {tOpt(ib.n)}
                  </span>
                  {ib.dot ? (
                    <>
                      <span style={{ width: "6px", height: "6px", borderRadius: "9px", background: "#775FD7" }} />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", justifyContent: "flex-end", padding: "8px", borderRadius: "12px", background: "#FAF9FE" }}>
              {sl.msgs!.map((mg, mgI) => (
                <div key={mgI} data-w={mg.w} data-op="" style={{ alignSelf: mg.side, maxWidth: "86%", padding: "7px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: mg.bg, color: mg.ink, opacity: "0" }}>
                  {tOpt(mg.t)}
                </div>
              ))}
              <div data-w="0.75 0.95" data-op="" style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: "10px", background: "#2F5F58", color: "#fff", fontSize: "12px", fontWeight: "700", opacity: "0" }}>
                <span>
                  {t("Video call · Rami Haddad · Thu 18:00")}
                </span>
                <span>
                  {t("Join")}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}
      {sl.isGym ? (
        <>
          <div style={{ flex: "1", minHeight: "0", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ position: "relative", height: "84px", borderRadius: "12px", background: "repeating-linear-gradient(135deg,#F4F1FB 0 10px,#ECE7F8 10px 20px)" }}>
              <span style={{ position: "absolute", left: "10px", top: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: r.eF10, color: "#6B5E94" }}>
                {t("gym cover photo")}
              </span>
              <span style={{ position: "absolute", left: "14px", bottom: "-16px", width: "44px", height: "44px", borderRadius: "12px", background: "#4E3894", color: "#fff", fontSize: "13px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #fff" }}>
                {/* i18n-ignore: initials */}
                AF
              </span>
              <span data-w="0.25 0.45" data-stamp="" style={{ position: "absolute", right: "10px", top: "10px", padding: "3px 10px", borderRadius: "99px", background: "#2F5F58", color: "#fff", fontSize: r.eF11, fontWeight: "800", opacity: "0" }}>
                {t("Published")}
              </span>
            </div>
            <div style={{ paddingInlineStart: "68px", fontSize: "15px", fontWeight: "800" }}>
              {t("Atlas Fitness")}
              <div style={{ fontSize: r.eF115, fontWeight: "600", color: "#756D63" }}>
                {t("Achrafieh, Beirut · Gym and studio")}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginTop: "2px" }}>
              {sl.info!.map((inf, infI) => (
                <div key={infI} data-w={inf.w} data-op="" style={{ padding: "8px 10px", borderRadius: "10px", border: "1px solid #F0EDE8", opacity: "0" }}>
                  <div style={{ fontSize: r.eF95, fontWeight: "800", letterSpacing: ".1em", color: "#756D63" }}>
                    {tOpt(inf.k)}
                  </div>
                  <div style={{ fontSize: "12.5px", fontWeight: "800" }}>
                    {tOpt(inf.v)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ flex: "1", minHeight: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: r.eF95, fontWeight: "800", letterSpacing: ".1em", color: "#756D63" }}>
                {t("TOMORROW ON THE TIMETABLE")}
              </div>
              {sl.next!.map((nx, nxI) => (
                <div key={nxI} data-w={nx.w} data-op="" style={{ flex: "1 1 0", minHeight: "30px", display: "flex", alignItems: "center", gap: "10px", padding: "0 10px", borderRadius: "10px", border: "1px solid #F0EDE8", opacity: "0" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: r.eF11, color: "#756D63" }}>
                    {tOpt(nx.t)}
                  </span>
                  <span style={{ flex: "1", minWidth: "0", fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {tOpt(nx.n)}
                  </span>
                  <span style={{ fontSize: r.eF105, fontWeight: "800", color: nx.c }}>
                    {tOpt(nx.s)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
      {sl.isDesk ? (
        <>
          <div style={{ flex: "1", display: "grid", gridTemplateColumns: "150px 1fr", gap: "10px", minHeight: "0" }}>
            <div style={{ position: "relative", borderRadius: "12px", background: "repeating-linear-gradient(135deg,#EEF4F2 0 8px,#E5EEEB 8px 16px)", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "8px" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: r.eF95, color: "#516E6A" }}>
                {t("scan member card")}
              </span>
              <span data-w="0.1 0.6" data-sweepy="110" style={{ position: "absolute", left: "8px", right: "8px", top: "8px", height: "2px", background: "#2F5F58", boxShadow: "0 0 0 3px rgba(47,95,88,.15)", opacity: "0" }} />
              <div style={{ marginTop: "6px", fontSize: "22px", fontWeight: "800", color: "#2F5F58" }}>
                <span data-w="0.1 0.9" data-cnt="86" data-from="79">
                  79
                </span>
              </div>
              <div style={{ fontSize: r.eF10, fontWeight: "700", color: "#3D6E69" }}>
                {t("check-ins today")}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {sl.feed!.map((fd, fdI) => (
                <div key={fdI} data-w={fd.w} data-tx="16" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 9px", borderRadius: "10px", border: "1px solid #F0EDE8", opacity: "0" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "99px", background: fd.bg, color: fd.ink, fontSize: r.eF9, fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {fd.i}
                  </span>
                  <span style={{ flex: "1", fontSize: "12px", fontWeight: "700" }}>
                    {tOpt(fd.n)}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: r.eF105, color: "#756D63" }}>
                    {tOpt(fd.t)}
                  </span>
                  <span style={{ fontSize: r.eF105, fontWeight: "800", color: fd.sc }}>
                    {tOpt(fd.s)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
      {sl.isPlan ? (
        <>
          <div style={{ flex: "1", display: "grid", gridTemplateColumns: r.planCols, gap: "5px", minHeight: "0" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <div style={{ fontSize: r.eF95, fontWeight: "800", letterSpacing: ".1em", color: "#756D63" }}>
                {t("LIBRARY")}
              </div>
              {sl.lib!.map((lb, lbI) => (
                <span key={lbI} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "8px", border: `1px solid ${lb.bd}`, fontSize: r.eF11, fontWeight: "700", color: lb.ink, background: lb.bg }}>
                  <span style={{ width: "7px", height: "7px", flexShrink: "0", borderRadius: "99px", background: lb.c }} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {tOpt(lb.t)}
                  </span>
                </span>
              ))}
              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "3px", fontSize: r.eF95, fontWeight: "700", color: "#5B5349" }}>
                {sl.legend!.map((lg, lgI) => (
                  <span key={lgI} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "99px", background: lg.c }} />
                    {tOpt(lg.t)}
                  </span>
                ))}
              </div>
            </div>
            {sl.cols!.map((cl, clI) => (
              <div key={clI} style={{ position: "relative", display: "flex", flexDirection: "column", gap: "5px", padding: "6px", borderRadius: "10px", background: cl.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontSize: r.eF10, fontWeight: "800", color: "#221E1A" }}>
                    {tOpt(cl.d)}
                  </span>
                  <span style={{ fontSize: r.eF9, fontWeight: "800", color: cl.ink, whiteSpace: "nowrap" }}>
                    {cl.kc}
                  </span>
                </div>
                <div style={{ height: "4px", borderRadius: "9px", background: "#FFFFFF", overflow: "hidden" }}>
                  <span data-w={cl.bw} data-sx="" style={{ display: "block", height: "100%", width: cl.fill, borderRadius: "9px", background: cl.bar, transformOrigin: "left", transform: "scaleX(0)" }} />
                </div>
                {cl.items.map((it, itI) => (
                  <span key={itI} data-w={it.w} data-tx={it.tx} style={{ padding: "5px 6px", borderRadius: "8px", background: it.bg, border: `1px solid ${it.bd}`, fontSize: r.eF10, fontWeight: "700", lineHeight: "1.25", color: it.ink, opacity: "0" }}>
                    <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {tOpt(it.t)}
                    </span>
                    <span style={{ display: "block", fontSize: r.eF9, fontWeight: "600", color: "#5B5349", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {tOpt(it.m)}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}
      {sl.isHeat ? (
        <>
          <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px", minHeight: "0" }}>
            <div style={{ flex: "1", minHeight: "0", display: "grid", gridTemplateColumns: "44px repeat(7,1fr)", gridTemplateRows: "auto repeat(5,minmax(24px,1fr))", gap: "3px", fontSize: r.eF95, fontWeight: "700", color: "#756D63", textAlign: "center" }}>
              <span />
              {sl.days!.map((d, dI) => (
                <span key={dI}>
                  {t(d)}
                </span>
              ))}
              {sl.cells!.map((ce, ceI) => (
                <span key={ceI} data-w={ce.w} data-op="" style={{ position: "relative", borderRadius: "5px", background: ce.bg, color: ce.ink, fontSize: r.eF9, fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", opacity: ce.op0 }}>
                  {tOpt(ce.t)}
                </span>
              ))}
            </div>
            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "8px", fontSize: r.eF10, fontWeight: "700", color: "#5B5349" }}>
              <span>
                {t("Capacity")}
              </span>
              <span style={{ flex: "1", maxWidth: "160px", height: "6px", borderRadius: "9px", background: "linear-gradient(90deg,#EFEAFB,#B9A9EE,#4E3894)" }} />
              <span data-w="0.8 0.95" data-stamp="" style={{ marginInlineStart: "auto", padding: "2px 9px", borderRadius: "99px", background: "#F4F1FB", color: "#5C48A8", fontWeight: "800", opacity: "0" }}>
                {t("HIIT 45 Thu · Full, 3 waitlist")}
              </span>
            </div>
          </div>
        </>
      ) : null}
      {sl.isStack ? (
        <>
          <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "10px", minHeight: "0" }}>
            <div style={{ display: "flex", height: "34px", borderRadius: "10px", overflow: "hidden", gap: "2px" }}>
              {sl.seg!.map((sg, sgI) => (
                <span key={sgI} data-w={sg.w} data-sx="" style={{ flex: sg.f, background: sg.c, transformOrigin: "left", transform: "scaleX(0)", display: "flex", alignItems: "center", paddingInlineStart: "8px", fontSize: r.eF105, fontWeight: "800", color: sg.ink, whiteSpace: "nowrap", overflow: "hidden" }}>
                  {tOpt(sg.t)}
                </span>
              ))}
            </div>
            <div style={{ flex: "1", minHeight: "0", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "8px" }}>
              {sl.seg!.map((sg, sgI) => (
                <div key={sgI} data-w={sg.w} data-ty="10" data-op="" style={{ padding: "9px 10px", borderRadius: "12px", border: "1px solid #F0EDE8", opacity: "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: r.eF10, fontWeight: "800", letterSpacing: ".08em", color: "#756D63" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: sg.c }} />
                    {tOpt(sg.k)}
                  </div>
                  <div style={{ fontSize: "17px", fontWeight: "800", marginTop: "2px" }}>
                    {tOpt(sg.n)}
                  </div>
                  <div style={{ fontSize: r.eF10, fontWeight: "600", color: "#756D63" }}>
                    {tOpt(sg.m)}
                  </div>
                </div>
              ))}
            </div>
            <div data-w="0.75 0.95" data-ty="10" data-op="" style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "14px", background: "#4E3894", color: "#fff", opacity: "0" }}>
              <span style={{ width: "34px", height: "34px", flexShrink: "0", borderRadius: "8px", background: "repeating-linear-gradient(45deg,#5C48A8 0 4px,#6A54C4 4px 8px)", fontFamily: "'JetBrains Mono',monospace", fontSize: r.eF8, display: "flex", alignItems: "center", justifyContent: "center", color: "#F4F1FB" }}>
                QR
              </span>
              <div style={{ flex: "1" }}>
                <div style={{ fontSize: r.eF10, fontWeight: "800", letterSpacing: ".1em", color: "#D9D0F5" }}>
                  {t("MEMBER CARD")}
                </div>
                <div style={{ fontSize: "13px", fontWeight: "800" }}>
                  {t("Nour Saab · Quarterly")}
                </div>
              </div>
              <span style={{ fontSize: r.eF105, fontWeight: "700", color: "#D9D0F5" }}>
                {t("Renews 12 Dec")}
              </span>
            </div>
          </div>
        </>
      ) : null}
      {sl.isGantt ? (
        <>
          <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px", minHeight: "0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", fontSize: r.eF9, fontWeight: "700", color: "#756D63" }}>
              <span />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {sl.hours!.map((hr, hrI) => (
                  <span key={hrI}>
                    {hr}
                  </span>
                ))}
              </div>
            </div>
            {sl.staff!.map((sf, sfI) => (
              <div key={sfI} style={{ flex: "1 1 0", minHeight: "30px", display: "grid", gridTemplateColumns: "150px 1fr", alignItems: "center", gap: "0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: "0" }}>
                  <span style={{ width: "26px", height: "26px", flexShrink: "0", borderRadius: "99px", background: sf.abg, color: sf.aink, fontSize: r.eF95, fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {sf.i}
                  </span>
                  <div style={{ minWidth: "0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: r.eF115, fontWeight: "800", whiteSpace: "nowrap" }}>
                      {tOpt(sf.n)}
                      {sf.ver ? (
                        <>
                          <span style={{ width: "11px", height: "11px", borderRadius: "99px", background: "#5D9C93", color: "#fff", fontSize: "7px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            ✓
                          </span>
                        </>
                      ) : null}
                    </div>
                    <div style={{ fontSize: r.eF95, fontWeight: "600", color: "#756D63", whiteSpace: "nowrap" }}>
                      {tOpt(sf.r)}
                    </div>
                  </div>
                </div>
                <div style={{ position: "relative", height: "22px", borderRadius: "6px", background: "repeating-linear-gradient(90deg,#FAF9FE 0 calc(100% / 17 - 1px),#F0EDE8 calc(100% / 17 - 1px) calc(100% / 17))" }}>
                  <span data-w={sf.w} data-sx="" style={{ position: "absolute", top: "3px", bottom: "3px", left: sf.l, width: sf.wd, borderRadius: "5px", background: sf.c, transformOrigin: "left", transform: "scaleX(0)", fontSize: r.eF9, fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", paddingInlineStart: "6px", whiteSpace: "nowrap", overflow: "hidden" }}>
                    {tOpt(sf.s)}
                  </span>
                </div>
              </div>
            ))}
            <div style={{ marginTop: "auto", display: "flex", gap: "12px", fontSize: r.eF10, fontWeight: "700", color: "#5B5349" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "2px", background: "#4A7D76" }} />
                {t("Floor")}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "2px", background: "#775FD7" }} />
                {t("Classes")}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "2px", background: "#91642C" }} />
                {t("Front desk")}
              </span>
            </div>
          </div>
        </>
      ) : null}
      {sl.isWater ? (
        <>
          <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px", minHeight: "0" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-.02em" }}>
                $
                <span data-w="0.75 0.95" data-cnt="2340" data-from="1960">
                  1960
                </span>
              </span>
              <span style={{ fontSize: r.eF11, fontWeight: "700", color: "#2F5F58" }}>
                {t("October, up $380 from September")}
              </span>
            </div>
            <div style={{ flex: "1", minHeight: "150px", display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gridTemplateRows: "minmax(0,1fr) 30px", columnGap: "6px" }}>
              <div style={{ position: "relative" }}>
                {sl.ticks!.map((tk, tkI) => (
                  <span key={tkI} style={{ position: "absolute", right: "0", top: tk.y, transform: "translateY(-50%)", fontSize: r.eF95, fontWeight: "700", color: "#756D63" }}>
                    {tk.t}
                  </span>
                ))}
              </div>
              <div style={{ position: "relative", borderInlineStart: "1px solid #E6E1EA", borderBottom: "1px solid #E6E1EA" }}>
                {sl.ticks!.map((tk, tkI) => (
                  <span key={tkI} style={{ position: "absolute", left: "0", right: "0", top: tk.y, borderTop: "1px solid #F1EEF4" }} />
                ))}
                {sl.wf!.map((wb, wbI) => (
                  <React.Fragment key={wbI}>
                    <span data-w={wb.w} data-op="" data-ty="10" style={{ position: "absolute", left: wb.l, width: wb.wd, bottom: wb.b, height: wb.h, borderRadius: "5px", background: wb.c, opacity: "0" }}>
                      <span style={{ position: "absolute", left: "50%", bottom: "calc(100% + 4px)", transform: "translateX(-50%)", fontSize: r.eF105, fontWeight: "800", color: wb.ink, whiteSpace: "nowrap" }}>
                        {tOpt(wb.v)}
                      </span>
                    </span>
                    <span data-w={wb.w} data-op="" style={{ position: "absolute", left: wb.cl, width: wb.cw, bottom: wb.ct, borderTop: "1.5px dashed #CFC5EA", opacity: "0" }} />
                  </React.Fragment>
                ))}
              </div>
              <span />
              <div style={{ position: "relative" }}>
                {sl.wf!.map((wb, wbI) => (
                  <span key={wbI} style={{ position: "absolute", left: wb.mid, top: "5px", transform: "translateX(-50%)", width: wb.wd, textAlign: "center", fontSize: r.eF95, fontWeight: "700", lineHeight: "1.2", color: "#5B5349" }}>
                    {tOpt(wb.t)}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: r.eF95, fontWeight: "600", color: "#756D63" }}>
              {t("US dollars. Paid through Centium. Axis starts at $1,500.")}
            </div>
          </div>
        </>
      ) : null}
    </div>
  </div>
);
