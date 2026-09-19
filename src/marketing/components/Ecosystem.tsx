import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reveal } from "./Reveal";

const EASE = "cubic-bezier(.22,1,.36,1)";

// Same leaf-mark outline PillarRail's bullet badge uses (`LEAF_PATH` there),
// duplicated locally rather than imported since PillarRail.tsx isn't owned by
// this change. The handoff's own knob glyph additionally masks a "slit" out
// of the blade with an `evenodd`-adjacent mask (its own Gotchas note: a plain
// `evenodd` fill lets the cut fall outside the outline as a stray sliver —
// use a mask instead, which is what `#eco-leaf-slit` below does).
const LEAF_PATH =
  "M 924.1 543.4 L 915.6 549.5 L 905.6 555.7 L 894 561.9 L 878.6 568.1 L 859.3 574.2 L 830 580.4 L 796.8 586.6 L 768.2 592.8 L 748.1 598.9 L 731.9 605.1 L 718.8 611.3 L 708 617.5 L 698.7 623.6 L 690.2 629.8 L 682.5 636 L 675.5 642.2 L 669.4 648.3 L 664 654.5 L 658.6 660.7 L 653.9 666.9 L 650.1 673.1 L 645.4 679.2 L 641.6 685.4 L 637.7 691.6 L 634.6 697.8 L 631.5 703.9 L 628.5 710.1 L 626.1 716.3 L 623.8 722.5 L 621.5 728.6 L 619.2 734.8 L 617.6 741 L 615.3 747.2 L 613.8 753.3 L 612.2 759.5 L 611.5 765.7 L 609.9 771.9 L 609.2 778 L 608.4 784.2 L 607.6 790.4 L 681.7 796.6 L 671.7 802.8 L 661.7 808.9 L 651.6 815.1 L 643.1 821.3 L 634.6 827.5 L 626.1 833.6 L 618.4 839.8 L 611.5 846 L 603.8 852.2 L 596.8 858.3 L 589.9 864.5 L 582.9 870.7 L 576.7 876.9 L 569.8 883 L 607.6 887.7 L 637.7 887.7 L 684.8 883 L 713.4 876.9 L 734.2 870.7 L 751.2 864.5 L 765.1 858.3 L 778.2 852.2 L 789 846 L 799.1 839.8 L 808.3 833.6 L 816.8 827.5 L 824.5 821.3 L 832.3 815.1 L 839.2 808.9 L 845.4 802.8 L 851.6 796.6 L 857.7 790.4 L 863.2 784.2 L 867.8 778 L 872.4 771.9 L 877 765.7 L 881.7 759.5 L 885.5 753.3 L 889.4 747.2 L 893.3 741 L 896.3 734.8 L 899.4 728.6 L 902.5 722.5 L 905.6 716.3 L 907.9 710.1 L 911 703.9 L 913.3 697.8 L 915.6 691.6 L 917.2 685.4 L 919.5 679.2 L 921.1 673.1 L 922.6 666.9 L 924.1 660.7 L 925.7 654.5 L 927.2 648.3 L 928 642.2 L 929.5 636 L 930.3 629.8 L 931.1 623.6 L 931.9 617.5 L 931.9 611.3 L 932.6 605.1 L 932.6 598.9 L 932.6 592.8 L 931.9 586.6 L 931.9 580.4 L 931.1 574.2 L 930.3 568.1 L 930.3 561.9 L 928.8 555.7 L 928 549.5 L 926.5 543.4 Z";
const LEAF_SLIT_PATH =
  "M 829.2 668.4 L 826.1 674.6 L 822.2 680.8 L 817.6 686.9 L 813.7 693.1 L 809.1 699.3 L 804.5 705.5 L 799.8 711.7 L 794.4 717.8 L 789 724 L 782.9 730.2 L 776.7 736.4 L 769.7 742.5 L 762.8 748.7 L 755.1 754.9 L 746.6 761.1 L 737.3 767.2 L 727.3 773.4 L 715.7 779.6 L 703.3 785.8 L 691 791.9 L 683.3 795.8 L 656.2 809.3 L 589.5 809.3 L 608.4 795.8 L 613.8 791.9 L 622.3 785.8 L 632.3 779.6 L 643.1 773.4 L 655.5 767.2 L 668.6 761.1 L 684 754.9 L 699.5 748.7 L 714.2 742.5 L 727.3 736.4 L 739.6 730.2 L 751.2 724 L 761.2 717.8 L 771.3 711.7 L 779.8 705.5 L 789 699.3 L 797.5 693.1 L 805.2 686.9 L 813 680.8 L 819.9 674.6 L 826.9 668.4 Z";

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

const clients = [
  { initials: "JD", name: "John Doe", meta: "64.2 kg · −0.8 · 1,840 kcal", status: "Logged", tone: "primary" as const },
  { initials: "JR", name: "Jane Roe", meta: "81.6 kg · +0.3 · 2,650 kcal", status: "Logged", tone: "teal" as const },
  { initials: "RR", name: "Richard Roe", meta: "58.9 kg · −0.2 · 1,620 kcal", status: "Pending", tone: "primary" as const },
  { initials: "RT", name: "Roster today", meta: "2 logged today · 1 pending", status: "3 clients", tone: "teal" as const },
];

const kpis = [
  { label: "MEMBERS", value: "412" },
  { label: "MRR", value: "$24.8k" },
  { label: "RETENTION", value: "78%" },
  { label: "ARPM", value: "$60" },
  { label: "VISITS / WK", value: "3.2" },
];

const checkins = [
  { day: "Mon", v: 53, h: 40 },
  { day: "Tue", v: 87, h: 66 },
  { day: "Wed", v: 70, h: 53 },
  { day: "Thu", v: 109, h: 83 },
  { day: "Fri", v: 81, h: 61 },
  { day: "Sat", v: 129, h: 98 },
  { day: "Sun", v: 62, h: 47 },
];

const occupancy = [
  { name: "HIIT 45", pct: 92 },
  { name: "Strength Foundations", pct: 75 },
  { name: "Vinyasa Flow", pct: 100 },
];

/** Beyond the Individual — a drag slider between the professionals and
 *  business audiences, ported from the v5 landing handoff's `initEcoSlider`/
 *  `ecoPointerDown/Move/Up`/`ecoKeyDown` plus its `eco` render block.
 *
 *  `ecoPos` (range -1..1) is the single source of truth, exactly as the
 *  handoff's README insists on ("`ecoPos` replaced a parallel `ecoOpen` map
 *  ... derive `ecoOpen` from `ecoPos`, never store both") — `proOn`/`bizOn`
 *  below are derived on every render, never stored. Default is -1
 *  (professionals shown), matching the handoff's own initial state
 *  (`state = { ..., ecoPos: -1, ... }`), not the README prose's implied
 *  neutral-centre default.
 *
 *  Both cards are always mounted; which one reads as "open" is purely the
 *  clip-path wipe (`inset()`, driven by the travel fraction) plus a width
 *  change — never a `grid-template-rows` collapse, matching the handoff's
 *  final render values (`eco.pro.rows`/`eco.biz.rows` are hard-set to "1fr"
 *  regardless of state; that collapse mechanic belongs to an earlier,
 *  abandoned "leaf-disc" iteration of this control still visible elsewhere
 *  in the handoff's dead render keys — `headShow` is hard-set to "none" for
 *  both sides, so that whole per-card header/badge/chevron block never
 *  renders and isn't ported here).
 *
 *  Two commit points, both handled here: a tap (< 4px of movement) flips to
 *  the opposite side from wherever the drag started; a real drag snaps to
 *  whichever side the pointer ended nearest. Keyboard: Left/Home -> -1,
 *  Right/End -> 1, Enter/Space toggles. Travel is derived from the rail's own
 *  measured width (`useResizeObserver`-style rect read), never a hardcoded
 *  span — the handoff's own Gotchas call out a slider that hardcoded this and
 *  landed 22px short of its end. */
export const Ecosystem: React.FC<{ heading: React.ReactNode }> = ({ heading }) => {
  const [pos, setPos] = useState(-1); // -1..1; only ever settles at -1 or 1
  const [dragging, setDragging] = useState(false);
  const [reach, setReach] = useState(130); // half of clamp(90px,30%,260px) rail width, measured
  const [barHeight, setBarHeight] = useState(82); // switch bar's own rendered height, measured
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startPos: number; moved: number; span: number } | null>(null);

  // Gotcha from the handoff: "derive travel limits from measured geometry,
  // never hardcoded px — two separate hardcoded values left a slider mark
  // 22px short of its end." Both the rail's half-width (the knob's travel
  // span) and the bar's own height (where the crossover seam starts) are
  // read from the live DOM rather than assumed.
  useEffect(() => {
    if (!window.ResizeObserver) return;
    const track = trackRef.current;
    const bar = barRef.current;
    const roTrack = track
      ? new ResizeObserver((entries) => {
          const w = entries[0]?.contentRect.width;
          if (w) setReach(w / 2);
        })
      : null;
    // Read the full border box via getBoundingClientRect (not the observer
    // entry's contentRect, which excludes the bar's own 3px border) so the
    // seam starts exactly at the bar's rendered bottom edge.
    const roBar = bar
      ? new ResizeObserver(() => setBarHeight(bar.getBoundingClientRect().height))
      : null;
    if (track && roTrack) roTrack.observe(track);
    if (bar && roBar) roBar.observe(bar);
    return () => {
      roTrack?.disconnect();
      roBar?.disconnect();
    };
  }, []);

  const proOn = pos < 0;
  const bizOn = pos >= 0;
  const t = (clamp1(pos) + 1) / 2; // 0 (pro) .. 1 (biz) travel fraction

  const commit = useCallback((v: number) => setPos((prev) => (prev === v ? prev : v)), []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startPos: pos, moved: 0, span: Math.max(60, reach) };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.abs(dx);
    setPos(clamp1(d.startPos + dx / d.span));
  };
  const endDrag = () => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    setDragging(false);
    // two stops: a tap flips sides, a drag lands on whichever side it ended nearest
    if (d.moved < 4) commit(d.startPos < 0 ? 1 : -1);
    else setPos((prev) => (prev < 0 ? -1 : 1));
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "Home") { e.preventDefault(); commit(-1); }
    else if (e.key === "ArrowRight" || e.key === "End") { e.preventDefault(); commit(1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(pos < 0 ? 1 : -1); }
  };

  const barBg = proOn
    ? "linear-gradient(150deg,#EDE7FB 0%,#E4DBF7 52%,#E2EEEA 100%)"
    : "linear-gradient(150deg,#E2EFEB 0%,#D8E9E3 52%,#E8E2F8 100%)";
  const barBorder = proOn ? "#4E3894" : "#2F5F58";
  const coreInk = proOn ? "#5C48A8" : "#2F5F58";
  const capLeft = proOn ? "#5C48A8" : "rgba(92,72,168,.32)";
  const capRight = bizOn ? "#2F5F58" : "rgba(47,95,88,.32)";
  const seamColor = pos >= 0 ? "#2F5F58" : "#4E3894";

  const proCard = useMemo(
    () => (
      <div
        style={{
          flex: "1",
          width: proOn ? "min(540px,100%)" : "min(330px,100%)",
          minWidth: proOn ? 0 : "min(300px,100%)",
          display: "flex",
          flexDirection: "column",
          borderRadius: proOn ? "0 0 26px 26px" : "0",
          overflow: "hidden",
          transition: `width .55s ${EASE},border-radius .55s ${EASE},box-shadow .35s ${EASE}`,
          boxShadow: proOn ? "0 1px 0 rgba(255,255,255,.9) inset,0 22px 54px rgba(72,58,130,.12)" : "none",
          background: "linear-gradient(150deg,#F8F6FE 0%,#F2EDFC 52%,#EFF6F4 100%)",
          borderTop: 0,
          borderLeft: "3px solid #4E3894",
          borderRight: "3px solid #4E3894",
          borderBottom: "3px solid #4E3894",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 28px 28px", minWidth: 0 }}>
          <div style={{ borderRadius: 16, overflow: "hidden", background: "#FAF9F7", border: "1px solid #EDEAE4" }}>
            <div style={{ padding: 20, background: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-.02em", color: "#221E1A" }}>Clients</div>
                  <div style={{ fontSize: 11, color: "#6B6358" }}>3 active · Thu 4 Sep</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flexShrink: 0 }}>
                  <span style={{ padding: "4px 9px", borderRadius: 999, background: "#5C48A8", color: "#fff", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>All</span>
                  <span style={{ padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", background: "#F1EEE9", color: "#4A443C" }}>Needs review</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
                {clients.map((row, i) => (
                  <div
                    key={row.name}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i !== 0 ? "1px solid #EDEAE4" : undefined, minWidth: 0 }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        background: row.tone === "primary" ? "#DED4F4" : "#DAEAE7",
                        color: row.tone === "primary" ? "#4E3894" : "#2F5F58",
                      }}
                    >
                      {row.initials}
                    </span>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#221E1A", whiteSpace: "nowrap" }}>{row.name}</div>
                      <div style={{ fontSize: 11, color: "#6B6358" }}>{row.meta}</div>
                    </div>
                    <div style={{ flexShrink: 0, padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#5B5349", background: i % 2 === 0 ? "#F4F1FB" : "#EDF4F3" }}>
                      {row.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Reveal>
            <div style={{ marginTop: 4, borderTop: "1px solid #D8EAE6", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "#2F5F58", background: "#EDF4F3", borderLeft: "3px solid #5E9E95", borderRadius: "0 7px 7px 0", padding: "9px 11px 9px 12px", display: "block" }}>
                Your clients, your plans, one seamless system. Manage everything from their health data to workouts and nutrition, with updates flowing straight to their app.
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".14em", color: "#6B6358" }}>WHO IT&apos;S FOR</span>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Personal trainers", "Dietitians", "Physiotherapists", "General Practitioners"].map((t2) => (
                    <span key={t2} style={{ padding: "5px 11px", borderRadius: 999, background: "#EDF4F3", color: "#2F5F58", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                      {t2}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    ),
    [proOn]
  );

  const bizCard = useMemo(
    () => (
      <div
        style={{
          flex: "1",
          width: bizOn ? "min(540px,100%)" : "min(330px,100%)",
          minWidth: bizOn ? 0 : "min(300px,100%)",
          display: "flex",
          flexDirection: "column",
          borderRadius: bizOn ? "0 0 26px 26px" : "0",
          overflow: "hidden",
          transition: `width .55s ${EASE},border-radius .55s ${EASE},box-shadow .35s ${EASE}`,
          boxShadow: bizOn ? "0 1px 0 rgba(255,255,255,.9) inset,0 22px 54px rgba(94,158,149,.14)" : "none",
          background: "linear-gradient(150deg,#F3F9F7 0%,#EDF6F3 52%,#F5F2FD 100%)",
          borderTop: 0,
          borderLeft: "3px solid #2F5F58",
          borderRight: "3px solid #2F5F58",
          borderBottom: "3px solid #2F5F58",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 28px 28px", minWidth: 0 }}>
          <div style={{ borderRadius: 16, overflow: "hidden", background: "#FAF9F7", border: "1px solid #EDEAE4" }}>
            <div style={{ padding: 20, background: "#fff", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, fontSize: 13, fontWeight: 800, letterSpacing: "-.02em", color: "#221E1A" }}>Studio overview</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  <span style={{ padding: "3px 9px", borderRadius: 999, background: "#2F5F58", color: "#fff", fontSize: 11, fontWeight: 700 }}>Week</span>
                  <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "#EDF4F3", color: "#2F5F58" }}>Month</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(74px,100%),1fr))", gap: 5 }}>
                {kpis.map((k) => (
                  <div key={k.label} style={{ border: "1px solid #D8EAE6", borderRadius: 9, padding: "6px 7px", display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", lineHeight: 1.2, color: "#6B6358" }}>{k.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.02em", color: "#221E1A" }}>{k.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 8, borderTop: "1px solid #D8EAE6" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "#6B6358" }}>CHECK-INS · 591</span>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: "#EDF4F3", color: "#2F5F58" }}>+18% WoW</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                  {checkins.map((b) => (
                    <div key={b.day} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: b.day === "Sat" ? "#2F5F58" : "#6B6358" }}>{b.v}</span>
                      <div style={{ width: "100%", height: 34, display: "flex", alignItems: "flex-end" }}>
                        <div style={{ width: "100%", flexShrink: 0, height: `${b.h}%`, borderRadius: "3px 3px 0 0", background: b.day === "Sat" ? "#2F5F58" : "#5E9E95" }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: b.day === "Sat" ? "#2F5F58" : "#6B6358" }}>{b.day}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 8, borderTop: "1px solid #D8EAE6" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "#6B6358" }}>CLASS OCCUPANCY</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6358", whiteSpace: "nowrap", flexShrink: 0 }}>86 booked · 64% leads</span>
                </div>
                {occupancy.map((cls) => (
                  <div key={cls.name} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#221E1A", flex: "0 0 40%", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cls.name}</span>
                    <span style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 999, background: "#EDF4F3" }}>
                      <span style={{ display: "block", height: "100%", width: `${cls.pct}%`, borderRadius: 999, background: cls.pct >= 90 ? "#2F5F58" : "#5E9E95" }} />
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "#2F5F58", whiteSpace: "nowrap", flexShrink: 0 }}>{cls.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Reveal delay={0.04}>
            <div style={{ marginTop: 4, borderTop: "1px solid #E4DCF8", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "#4E3894", background: "#F4F1FB", borderLeft: "3px solid #7D67D9", borderRadius: "0 7px 7px 0", padding: "9px 11px 9px 12px", display: "block" }}>
                Put your gym, classes and services on the map, digitize memberships, connect with professionals and gain insights through client analytics.
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".14em", color: "#6B6358" }}>WHO IT&apos;S FOR</span>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Gyms & studios", "Equipment & supplements", "Meal prep services", "Activewear"].map((t2) => (
                    <span key={t2} style={{ padding: "5px 11px", borderRadius: 999, background: "#F4F1FB", color: "#4E3894", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                      {t2}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    ),
    [bizOn]
  );

  return (
    <section className="relative pt-[clamp(26px,2.8vw,38px)] pb-[clamp(48px,6vw,72px)] overflow-hidden">
      <div className="relative max-w-[1180px] mx-auto px-5 sm:px-10">
        {heading}

        <div
          className="relative grid"
          style={{ gridTemplateColumns: "minmax(0,1fr)", gap: 0, alignItems: "start", justifyItems: "stretch", marginTop: "clamp(72px,10vw,144px)" }}
        >
          {/* Crossover seam — rides the wipe boundary, visible only while dragging */}
          <div
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              top: barHeight,
              bottom: 0,
              left: `${(t * 100).toFixed(2)}%`,
              width: 2,
              marginLeft: -1,
              zIndex: 7,
              opacity: dragging ? 1 : 0,
              background: seamColor,
              boxShadow: `0 0 14px ${pos >= 0 ? "rgba(47,95,88,.32)" : "rgba(78,56,148,.32)"}`,
              WebkitMaskImage: "linear-gradient(180deg,transparent 0%,#000 14%,#000 86%,transparent 100%)",
              maskImage: "linear-gradient(180deg,transparent 0%,#000 14%,#000 86%,transparent 100%)",
              transition: "opacity .28s",
            }}
          />

          {/* Switch bar — this IS the panel header: same tint as the open
              side, 3px brand border, 26px radius with the bottom edge
              squared off so it fuses with the body beneath (per the
              handoff: "the whole shell recolours to the active side"). */}
          <div
            ref={barRef}
            style={{
              gridColumn: "1 / -1",
              gridRow: 1,
              position: "relative",
              zIndex: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              padding: "clamp(16px,1.8vw,22px) clamp(16px,2vw,26px)",
              background: barBg,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,.75),0 6px 16px -6px ${proOn ? "rgba(78,56,148,.35)" : "rgba(47,95,88,.35)"}`,
              // Longhand on every side (not the `border` shorthand) since
              // this object also sets borderBottom separately — mixing the
              // shorthand with a longhand override on the same property in
              // one style object is what React warns about across rerenders
              // as barBorder's color transitions.
              borderTop: `3px solid ${barBorder}`,
              borderLeft: `3px solid ${barBorder}`,
              borderRight: `3px solid ${barBorder}`,
              borderBottom: "none",
              borderRadius: "26px 26px 0 0",
              transition: `border-color .45s,background .45s`,
            }}
          >
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 bottom-0 pointer-events-none"
              style={{ width: "46%", background: "linear-gradient(90deg,rgba(125,103,217,.26) 0%,rgba(125,103,217,.10) 58%,rgba(255,255,255,0) 100%)", opacity: proOn ? 1 : 0.82, transition: "opacity .45s" }}
            />
            <span
              aria-hidden="true"
              className="absolute right-0 top-0 bottom-0 pointer-events-none"
              style={{ width: "46%", background: "linear-gradient(270deg,rgba(94,158,149,.26) 0%,rgba(94,158,149,.10) 58%,rgba(255,255,255,0) 100%)", opacity: bizOn ? 1 : 0.82, transition: "opacity .45s" }}
            />
            <span
              aria-hidden="true"
              className="relative flex-1 text-center"
              style={{
                zIndex: 2,
                fontWeight: 800,
                fontSize: "clamp(16px,2.1vw,30px)",
                lineHeight: 1.15,
                letterSpacing: "-.034em",
                minWidth: 0,
                background: "linear-gradient(96deg,#4E3894 0%,#7D67D9 62%,#A895E0 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                opacity: proOn ? 1 : 0.75,
                transition: "opacity .4s",
              }}
            >
              Professionals
            </span>

            <div
              ref={trackRef}
              id="eco-track"
              className="relative flex-none flex items-center"
              style={{ margin: "0 clamp(26px,3.4%,30px)", width: "clamp(90px,30%,260px)", height: 46, zIndex: 5 }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 top-1/2 rounded-full"
                style={{ height: 3, transform: "translateY(-50%)", background: "linear-gradient(90deg,#8C74E2 0%,#C9BEEC 34%,#DCE6E3 50%,#9FC9C1 66%,#4E8C82 100%)", opacity: 0.5 }}
              />
              <span
                aria-hidden="true"
                className="absolute top-1/2 flex items-center justify-center rounded-full"
                style={{ left: 0, width: 16, height: 16, transform: "translate(-50%,-50%)", background: "#fff", boxShadow: `0 0 0 1px ${capLeft},0 0 0 5px #fff,0 2px 6px rgba(72,58,130,.16)`, opacity: proOn ? 0 : 1, transition: "background .4s,opacity .3s" }}
              >
                <span className="block rounded-full" style={{ width: 7, height: 7, background: capLeft }} />
              </span>
              <span
                aria-hidden="true"
                className="absolute top-1/2 flex items-center justify-center rounded-full"
                style={{ right: 0, width: 16, height: 16, transform: "translate(50%,-50%)", background: "#fff", boxShadow: `0 0 0 1px ${capRight},0 0 0 5px #fff,0 2px 6px rgba(72,58,130,.16)`, opacity: bizOn ? 0 : 1, transition: "background .4s,opacity .3s" }}
              >
                <span className="block rounded-full" style={{ width: 7, height: 7, background: capRight }} />
              </span>

              <div
                role="slider"
                tabIndex={0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={endDrag}
                onKeyDown={onKeyDown}
                aria-label="Slide toward professionals or businesses to expand"
                aria-valuemin={-1}
                aria-valuemax={1}
                aria-valuenow={proOn ? -1 : 1}
                aria-valuetext={proOn ? "Professionals detail shown" : "Businesses detail shown"}
                className="absolute top-1/2 flex items-center justify-center"
                style={{
                  left: "50%",
                  marginLeft: Math.round(clamp1(pos) * reach),
                  transform: "translate(-50%,-50%)",
                  width: 48,
                  height: 48,
                  background: "transparent",
                  filter: "drop-shadow(0 1px 2px rgba(255,255,255,.95)) drop-shadow(0 -1px 2px rgba(255,255,255,.95)) drop-shadow(1px 0 2px rgba(255,255,255,.95)) drop-shadow(-1px 0 2px rgba(255,255,255,.95))",
                  cursor: dragging ? "grabbing" : "grab",
                  touchAction: "none",
                  userSelect: "none",
                  transition: dragging ? "none" : `margin-left .42s ${EASE},box-shadow .3s`,
                }}
              >
                <svg aria-hidden="true" viewBox="270 180 690 730" fill="none" style={{ display: "block", width: 38, height: 40, overflow: "visible", color: coreInk, transition: "color .45s" }}>
                  <defs>
                    <mask id="eco-leaf-slit" maskUnits="userSpaceOnUse" x="270" y="180" width="690" height="730">
                      <rect x="270" y="180" width="690" height="730" fill="#fff" />
                      <path d={LEAF_SLIT_PATH} fill="#000" />
                    </mask>
                  </defs>
                  <path d="M 843 339 A 287 287 0 1 0 561 809" stroke="currentColor" strokeWidth={113} strokeLinecap="butt" fill="none" />
                  <path fillRule="nonzero" mask="url(#eco-leaf-slit)" fill="currentColor" d={LEAF_PATH} />
                </svg>
              </div>
            </div>

            <span
              aria-hidden="true"
              className="relative flex-1 text-center"
              style={{
                zIndex: 2,
                fontWeight: 800,
                fontSize: "clamp(16px,2.1vw,30px)",
                lineHeight: 1.15,
                letterSpacing: "-.034em",
                minWidth: 0,
                background: "linear-gradient(96deg,#2F5F58 0%,#5E9E95 62%,#93C1B9 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                opacity: bizOn ? 1 : 0.75,
                transition: "opacity .4s",
              }}
            >
              Businesses
            </span>
          </div>

          {/* Deck — both panels always mounted, stacked in the same grid
              cell; a clip-path wipe (driven by the travel fraction) is what
              actually reveals one side or the other.

              Neither wrapper carries a `filter: drop-shadow(...)` for the
              receded side — that was applied to the full-width, clipped
              wrapper (not the narrower card inside it), and browsers don't
              agree on whether a filter's drop-shadow follows an element's
              original box or its clip-path-visible shape. Where it follows
              the clipped shape, it paints a shadow along the invisible clip
              boundary itself, which reads as a phantom disconnected box
              floating over the panel. Each card already has its own real
              `boxShadow` (see proCard/bizCard) for the "elevated" look,
              which doesn't have this clip-path interaction at all. */}
          <div className="relative grid w-full" style={{ gridTemplateColumns: "minmax(0,1fr)", gridRow: 2 }}>
            <div
              className="flex w-full min-w-0"
              style={{
                gridColumn: 1,
                gridRow: 1,
                clipPath: `inset(0 0 0 ${(t * 100).toFixed(2)}%)`,
                justifyContent: "flex-end",
              }}
            >
              <Reveal className="flex min-w-0">{proCard}</Reveal>
            </div>
            <div
              className="flex w-full min-w-0"
              style={{
                gridColumn: 1,
                gridRow: 1,
                clipPath: `inset(0 ${((1 - t) * 100).toFixed(2)}% 0 0)`,
                justifyContent: "flex-start",
              }}
            >
              <Reveal delay={0.06} className="flex min-w-0">{bizCard}</Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
