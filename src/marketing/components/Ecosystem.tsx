import React from "react";
import { Reveal } from "./Reveal";
import { useEcoSlider } from "../hooks/useEcoSlider";

// Same leaf-mark outline PillarRail's bullet badge uses (`LEAF_PATH` there),
// duplicated locally rather than imported since PillarRail.tsx isn't owned by
// this change. Masked by its own local `#eco-leaf-slit` (not the literal
// handoff's shared `#cent-leaf-slit`), so this component stays fully
// self-contained and doesn't depend on PillarRail having rendered first.
const LEAF_PATH =
  "M 924.1 543.4 L 915.6 549.5 L 905.6 555.7 L 894 561.9 L 878.6 568.1 L 859.3 574.2 L 830 580.4 L 796.8 586.6 L 768.2 592.8 L 748.1 598.9 L 731.9 605.1 L 718.8 611.3 L 708 617.5 L 698.7 623.6 L 690.2 629.8 L 682.5 636 L 675.5 642.2 L 669.4 648.3 L 664 654.5 L 658.6 660.7 L 653.9 666.9 L 650.1 673.1 L 645.4 679.2 L 641.6 685.4 L 637.7 691.6 L 634.6 697.8 L 631.5 703.9 L 628.5 710.1 L 626.1 716.3 L 623.8 722.5 L 621.5 728.6 L 619.2 734.8 L 617.6 741 L 615.3 747.2 L 613.8 753.3 L 612.2 759.5 L 611.5 765.7 L 609.9 771.9 L 609.2 778 L 608.4 784.2 L 607.6 790.4 L 681.7 796.6 L 671.7 802.8 L 661.7 808.9 L 651.6 815.1 L 643.1 821.3 L 634.6 827.5 L 626.1 833.6 L 618.4 839.8 L 611.5 846 L 603.8 852.2 L 596.8 858.3 L 589.9 864.5 L 582.9 870.7 L 576.7 876.9 L 569.8 883 L 607.6 887.7 L 637.7 887.7 L 684.8 883 L 713.4 876.9 L 734.2 870.7 L 751.2 864.5 L 765.1 858.3 L 778.2 852.2 L 789 846 L 799.1 839.8 L 808.3 833.6 L 816.8 827.5 L 824.5 821.3 L 832.3 815.1 L 839.2 808.9 L 845.4 802.8 L 851.6 796.6 L 857.7 790.4 L 863.2 784.2 L 867.8 778 L 872.4 771.9 L 877 765.7 L 881.7 759.5 L 885.5 753.3 L 889.4 747.2 L 893.3 741 L 896.3 734.8 L 899.4 728.6 L 902.5 722.5 L 905.6 716.3 L 907.9 710.1 L 911 703.9 L 913.3 697.8 L 915.6 691.6 L 917.2 685.4 L 919.5 679.2 L 921.1 673.1 L 922.6 666.9 L 924.1 660.7 L 925.7 654.5 L 927.2 648.3 L 928 642.2 L 929.5 636 L 930.3 629.8 L 931.1 623.6 L 931.9 617.5 L 931.9 611.3 L 932.6 605.1 L 932.6 598.9 L 932.6 592.8 L 931.9 586.6 L 931.9 580.4 L 931.1 574.2 L 930.3 568.1 L 930.3 561.9 L 928.8 555.7 L 928 549.5 L 926.5 543.4 Z";
const LEAF_SLIT_PATH =
  "M 829.2 668.4 L 826.1 674.6 L 822.2 680.8 L 817.6 686.9 L 813.7 693.1 L 809.1 699.3 L 804.5 705.5 L 799.8 711.7 L 794.4 717.8 L 789 724 L 782.9 730.2 L 776.7 736.4 L 769.7 742.5 L 762.8 748.7 L 755.1 754.9 L 746.6 761.1 L 737.3 767.2 L 727.3 773.4 L 715.7 779.6 L 703.3 785.8 L 691 791.9 L 683.3 795.8 L 656.2 809.3 L 589.5 809.3 L 608.4 795.8 L 613.8 791.9 L 622.3 785.8 L 632.3 779.6 L 643.1 773.4 L 655.5 767.2 L 668.6 761.1 L 684 754.9 L 699.5 748.7 L 714.2 742.5 L 727.3 736.4 L 739.6 730.2 L 751.2 724 L 761.2 717.8 L 771.3 711.7 L 779.8 705.5 L 789 699.3 L 797.5 693.1 L 805.2 686.9 L 813 680.8 L 819.9 674.6 L 826.9 668.4 Z";

type ChipTone = "normal" | "warn";
interface RowChip {
  text: string;
  tone?: ChipTone;
}
interface ClientRow {
  initials: string;
  name: string;
  meta: string;
  chips: RowChip[];
  status: string;
  tone: "primary" | "teal";
  shed?: "1" | "6";
}

const clients: ClientRow[] = [
  {
    initials: "JD",
    name: "John Doe",
    meta: "64.2 kg · −0.8 · 1,840 kcal",
    chips: [{ text: "8,420 steps" }, { text: "P 132g" }, { text: "7h 20m sleep" }],
    status: "Logged",
    tone: "primary",
  },
  {
    initials: "JR",
    name: "Jane Roe",
    meta: "81.6 kg · +0.3 · 2,650 kcal",
    chips: [{ text: "11,260 steps" }, { text: "P 186g" }, { text: "⚠ Left knee", tone: "warn" }],
    status: "Logged",
    tone: "teal",
  },
  {
    initials: "RR",
    name: "Richard Roe",
    meta: "58.9 kg · −0.2 · 1,620 kcal",
    chips: [{ text: "6,140 steps" }, { text: "P 98g" }, { text: "⚠ Low energy", tone: "warn" }],
    status: "Pending",
    tone: "primary",
    shed: "6",
  },
  {
    initials: "RT",
    name: "Roster today",
    meta: "2 logged · 1 pending",
    chips: [{ text: "2 flags open", tone: "warn" }, { text: "86% adherence" }, { text: "4 sessions" }],
    status: "3 clients",
    tone: "teal",
    shed: "1",
  },
];

interface StatTile {
  label: string;
  value: string;
  note: string;
  shed?: "3";
}

const proStats: StatTile[] = [
  { label: "ACTIVE CLIENTS", value: "12", note: "+2 this month" },
  { label: "ADHERENCE", value: "86%", note: "plans followed" },
  { label: "SESSIONS / WK", value: "18", note: "4 today", shed: "3" },
  { label: "RETENTION", value: "91%", note: "rolling 90 days", shed: "3" },
];

// top values are % of the plot's own 125px baseline height, so the row
// labels track the plot's height when it grows via --eco-grow (§3's "one
// addition to the port").
const compliance = [
  { name: "John Doe", pct: "92%", top: (18.7 / 125) * 100, color: "#4E3894" },
  { name: "Jane Roe", pct: "74%", top: (60.7 / 125) * 100, color: "#5C48A8" },
  { name: "Richard Roe", pct: "58%", top: (98.0 / 125) * 100, color: "#6A54C4" },
];

const kpis: StatTile[] = [
  { label: "MEMBERS", value: "412", note: "" },
  { label: "MRR", value: "$24.8k", note: "" },
  { label: "RETENTION", value: "78%", note: "" },
  { label: "ARPM", value: "$60", note: "", shed: "3" },
  { label: "VISITS / WK", value: "3.2", note: "", shed: "3" },
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

const occupancy: { name: string; time: string; pct: number; booked: string; waitlist?: string; shed?: "1" }[] = [
  { name: "HIIT 45", time: "06:30 · Dana", pct: 92, booked: "22/24" },
  { name: "Strength Foundations", time: "12:00 · Ravi", pct: 75, booked: "15/20" },
  { name: "Vinyasa Flow", time: "18:30 · Mia", pct: 100, booked: "18/18", waitlist: "4 waitlist", shed: "1" },
];

/** Beyond the Individual — the dedicated slider-section handoff
 * (`design_handoff_eco_slider`), whose own `useEcoSlider.ts` reference hook
 * (`../hooks/useEcoSlider`) is used as-is, not re-derived here, per that
 * handoff's own instruction ("the current port ... is a different, older
 * design ... replace that block completely; don't patch it").
 *
 * This file owns only:
 *  - the static markup contract the hook's selectors depend on (`#eco-stage`,
 *    `#eco-switch`, `#eco-track`, `#eco-slider`, `#eco-deck`,
 *    `[data-eco-seam]`, `[data-eco-wipe]`, `[data-eco-clip]`,
 *    `[data-eco-screen]`, `[data-eco-shed]`, `[data-eco-mod]`,
 *    `[data-eco-caption]`, `[data-eco-bars]`, `[data-eco-plot]` — see the
 *    handoff's README §3);
 *  - the five refs the hook attaches to (`stage`, `deck`, `track`, `knob`,
 *    `seam`);
 *  - the per-side (`pos`) committed styling from the handoff's README §5
 *    table (bar colours, wash/title/cap opacity, cap/knob colours, edge
 *    shadow, aria-valuenow/valuetext);
 *  - the verbatim mobile-fit CSS from the handoff's `eco-slider.css`.
 *
 * Everything else — the live drag paint (knob left, both clip-paths, the
 * seam), the mobile shed/back-fill/chart-grow fit, and equal-height panes —
 * is written straight to the DOM by the hook via refs, never through React
 * state (see the hook's own doc comment for why). `pos` itself only ever
 * settles at -1 (Professionals, default) or 1 (Businesses) — never a
 * "neutral centre." Both panels are always mounted in the same grid cell;
 * only `clip-path` (painted by the hook) decides which one is visible — they
 * are never conditionally rendered and never `display:none`d.
 *
 * `#eco-deck` carries `overflow:hidden`; `#eco-stage` deliberately does not,
 * because the knob's drop-shadow filter extends outside the stage. */
export const Ecosystem: React.FC<{ heading: React.ReactNode }> = ({ heading }) => {
  const { pos, refs, knobProps, titleProps } = useEcoSlider(-1);
  const proOn = pos < 0;
  const bizOn = pos >= 0;

  const barBg = proOn
    ? "linear-gradient(150deg,#EDE7FB 0%,#E4DBF7 52%,#E2EEEA 100%)"
    : "linear-gradient(150deg,#E2EFEB 0%,#D8E9E3 52%,#E8E2F8 100%)";
  const barBorder = proOn ? "#4E3894" : "#2F5F58";
  const coreInk = proOn ? "#5C48A8" : "#2F5F58";
  const capLeft = proOn ? "#5C48A8" : "rgba(92,72,168,.32)";
  const capRight = bizOn ? "#2F5F58" : "rgba(47,95,88,.32)";
  const t0 = proOn ? 0 : 100; // committed (non-dragging) clip-path travel, %

  return (
    <section className="relative" style={{ padding: "0 clamp(20px,4vw,40px) clamp(56px,6vw,72px)", overflow: "hidden" }}>
      {/* Verbatim from the handoff's `source/eco-slider.css` — mobile only,
          targets ids and data-eco-* attributes with !important, so it must
          stay real CSS, not Tailwind. */}
      <style>{`
@media (max-width:1023px){
#eco-switch{flex-wrap:wrap !important;row-gap:8px !important;padding:12px 14px !important;}
#eco-switch > [role="button"]{order:1;flex:1 1 40% !important;font-size:clamp(17px,4.6vw,24px) !important;}
#eco-track{order:2;flex:1 1 100% !important;width:auto !important;margin:0 22px !important;height:44px !important;}
#eco-deck [data-eco-wipe] > div > div:nth-child(2){padding:12px !important;}
#eco-stage [data-eco-screen]{padding:12px !important;justify-content:space-between !important;}
#eco-stage [data-eco-screen] > [data-eco-mod]{margin-top:0 !important;}
#eco-stage [style*="font-size:10.5px"],#eco-stage [style*="font-size: 10.5px"],#eco-stage [style*="font-size:10px"],#eco-stage [style*="font-size: 10px"]{font-size:11px !important;}
#eco-stage [data-eco-chips]{flex-wrap:wrap !important;flex-shrink:1 !important;}
#eco-stage [data-eco-class]{flex-wrap:wrap !important;row-gap:4px !important;}
#eco-stage [data-eco-class] > :first-child{flex:1 1 100% !important;}
#eco-stage[data-efit~="1"] [data-eco-shed="1"]:not([data-ekeep]),#eco-stage[data-efit~="2"] [data-eco-shed="2"]:not([data-ekeep]),#eco-stage[data-efit~="3"] [data-eco-shed="3"]:not([data-ekeep]),#eco-stage[data-efit~="4"] [data-eco-shed="4"]:not([data-ekeep]),#eco-stage[data-efit~="5"] [data-eco-shed="5"]:not([data-ekeep]),#eco-stage[data-efit~="6"] [data-eco-shed="6"]:not([data-ekeep]),#eco-stage[data-efit~="7"] [data-eco-shed="7"]:not([data-ekeep]),#eco-stage[data-efit~="8"] [data-eco-screen] > :not([data-eco-mod]):not([data-ekeep]){display:none !important;}
}
@media (max-width:639px){
#eco-stage [data-eco-split]{grid-template-columns:minmax(0,1fr) !important;gap:10px !important;}
}
      `}</style>
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <mask id="eco-leaf-slit" maskUnits="userSpaceOnUse" x={270} y={180} width={690} height={730}>
          <rect x={270} y={180} width={690} height={730} fill="#FFFFFF" />
          <path d={LEAF_SLIT_PATH} fill="#000000" />
        </mask>
      </svg>
      <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto" }}>
        {heading}

        <div
          ref={refs.stage}
          id="eco-stage"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr)",
            gap: 0,
            alignItems: "start",
            justifyItems: "center",
            justifyContent: "center",
            marginTop: "clamp(28px,3.4vw,60px)",
            transition: "gap .42s cubic-bezier(.22,1,.36,1)",
          }}
        >
          <div
            id="eco-switch"
            style={{
              gridArea: "1/1/2/-1",
              justifySelf: "stretch",
              width: "100%",
              position: "relative",
              zIndex: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              overflow: "hidden",
              padding: "clamp(16px,1.8vw,22px) clamp(16px,2vw,26px)",
              background: barBg,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,.75),0 6px 16px -6px ${proOn ? "rgba(78,56,148,.35)" : "rgba(47,95,88,.35)"}`,
              borderTop: `3px solid ${barBorder}`,
              borderLeft: `3px solid ${barBorder}`,
              borderRight: `3px solid ${barBorder}`,
              borderBottom: `3px solid ${barBorder}`,
              borderRadius: "26px 26px 0 0",
              transition: "border-color .45s,background .45s",
            }}
          >
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 bottom-0 pointer-events-none"
              style={{ width: "46%", background: "linear-gradient(90deg,rgba(125,103,217,.26) 0%,rgba(125,103,217,.10) 58%,rgba(255,255,255,0) 100%)", opacity: proOn ? 1 : 0.82, transition: "opacity .45s" }}
            />
            <span
              {...titleProps(-1)}
              aria-label="Show professionals"
              style={{
                cursor: "pointer",
                position: "relative",
                zIndex: 2,
                fontWeight: 800,
                fontSize: "clamp(16px,2.1vw,30px)",
                lineHeight: 1.15,
                letterSpacing: "-.034em",
                padding: "0 .04em .05em 0",
                whiteSpace: "normal",
                flex: "1 1 0",
                minWidth: 0,
                textAlign: "center",
                background: "linear-gradient(96deg,#4E3894 0%,#7D67D9 62%,#A895E0 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                opacity: proOn ? 1 : 0.55,
                transition: "opacity .4s",
              }}
            >
              Professionals
            </span>

            <div
              ref={refs.track}
              id="eco-track"
              className="relative flex-none flex items-center"
              style={{ position: "relative", zIndex: 5, flex: "0 0 auto", margin: "0 clamp(26px,3.4%,30px)", width: "clamp(90px,30%,260px)", height: 46, display: "flex", alignItems: "center" }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 top-1/2 rounded-full"
                style={{ height: 3, transform: "translateY(-50%)", background: "linear-gradient(90deg,#8C74E2 0%,#C9BEEC 34%,#DCE6E3 50%,#9FC9C1 66%,#4E8C82 100%)", opacity: 0.5 }}
              />
              <span
                aria-hidden="true"
                data-eco-cap="left"
                className="absolute top-1/2 flex items-center justify-center rounded-full"
                style={{ left: 0, width: 16, height: 16, transform: "translate(-50%,-50%)", background: "#fff", boxShadow: `0 0 0 1px ${capLeft},0 0 0 5px #fff,0 2px 6px rgba(72,58,130,.16)`, opacity: proOn ? 0 : 1, transition: "background .4s,box-shadow .4s,opacity .3s" }}
              >
                <span className="block rounded-full" style={{ width: 7, height: 7, background: capLeft, transition: "background .4s" }} />
              </span>
              <span
                aria-hidden="true"
                data-eco-cap="right"
                className="absolute top-1/2 flex items-center justify-center rounded-full"
                style={{ right: 0, width: 16, height: 16, transform: "translate(50%,-50%)", background: "#fff", boxShadow: `0 0 0 1px ${capRight},0 0 0 5px #fff,0 2px 6px rgba(72,58,130,.16)`, opacity: bizOn ? 0 : 1, transition: "background .4s,box-shadow .4s,opacity .3s" }}
              >
                <span className="block rounded-full" style={{ width: 7, height: 7, background: capRight, transition: "background .4s" }} />
              </span>

              <div
                ref={refs.knob}
                id="eco-slider"
                {...knobProps}
                className="absolute top-1/2 flex items-center justify-center"
                style={{
                  left: `${50 + pos * 50}%`,
                  transform: "translate(-50%,-50%)",
                  width: 48,
                  height: 48,
                  background: "transparent",
                  filter: "drop-shadow(0 1px 2px rgba(255,255,255,.95)) drop-shadow(0 -1px 2px rgba(255,255,255,.95)) drop-shadow(1px 0 2px rgba(255,255,255,.95)) drop-shadow(-1px 0 2px rgba(255,255,255,.95))",
                  cursor: "grab",
                  // "pan-y", not "none": the hook now direction-locks a drag
                  // in JS (see its onPointerMove) instead of relying on CSS to
                  // block 100% of the browser's native touch handling on this
                  // 48x48 knob from the first pixel of any touch that starts
                  // on it. "none" (the design handoff's own reference value)
                  // froze page scrolling for the whole gesture whenever a
                  // user's thumb happened to pass over the knob while
                  // scrolling past this card -- not dragging it at all -- and
                  // could even flip the panel on release from incidental
                  // jitter. "pan-y" lets the browser start a native vertical
                  // scroll immediately, as if the knob weren't there; the
                  // hook only takes over once it's confirmed the gesture is
                  // actually horizontal.
                  touchAction: "pan-y",
                  userSelect: "none",
                  transition: `left .42s cubic-bezier(.22,1,.36,1),box-shadow .3s`,
                }}
              >
                <svg aria-hidden="true" viewBox="270 180 690 730" fill="none" style={{ display: "block", width: 38, height: 40, overflow: "visible", color: coreInk, transition: "color .45s" }}>
                  <path d="M 843 339 A 287 287 0 1 0 561 809" stroke="currentColor" strokeWidth={113} strokeLinecap="butt" fill="none" />
                  <path fillRule="nonzero" mask="url(#eco-leaf-slit)" fill="currentColor" d={LEAF_PATH} />
                </svg>
              </div>
            </div>

            <span
              aria-hidden="true"
              className="absolute right-0 top-0 bottom-0 pointer-events-none"
              style={{ width: "46%", background: "linear-gradient(270deg,rgba(94,158,149,.26) 0%,rgba(94,158,149,.10) 58%,rgba(255,255,255,0) 100%)", opacity: bizOn ? 1 : 0.82, transition: "opacity .45s" }}
            />
            <span
              {...titleProps(1)}
              aria-label="Show businesses"
              style={{
                cursor: "pointer",
                position: "relative",
                zIndex: 2,
                fontWeight: 800,
                fontSize: "clamp(16px,2.1vw,30px)",
                lineHeight: 1.15,
                letterSpacing: "-.034em",
                padding: "0 .04em .05em 0",
                whiteSpace: "normal",
                flex: "1 1 0",
                minWidth: 0,
                textAlign: "center",
                background: "linear-gradient(96deg,#2F5F58 0%,#5E9E95 62%,#93C1B9 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                opacity: bizOn ? 1 : 0.55,
                transition: "opacity .4s",
              }}
            >
              Businesses
            </span>
          </div>

          <div ref={refs.deck} id="eco-deck" className="relative" style={{ position: "relative", display: "grid", width: "100%", alignItems: "start", overflow: "hidden", borderRadius: "0 0 26px 26px" }}>
            <div
              ref={refs.seam}
              data-eco-seam=""
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${t0}%`,
                width: 2,
                marginLeft: -1,
                pointerEvents: "none",
                zIndex: 7,
                opacity: 0,
                background: "currentColor",
                color: proOn ? "#4E3894" : "#2F5F58",
                WebkitMaskImage: "linear-gradient(180deg,transparent 0%,#000 14%,#000 86%,transparent 100%)",
                maskImage: "linear-gradient(180deg,transparent 0%,#000 14%,#000 86%,transparent 100%)",
                transition: "opacity .28s",
              }}
            />

            {/* Deliberate deviation from the literal snapshot: the raw
                eco-section.*.html files also carry a
                `filter:drop-shadow(0 16px 30px rgba(...))` on whichever
                wipe is currently clipped away (fully hidden). That's the
                exact mechanic the earlier "Fix a phantom floating box in
                the ecosystem slider" commit (3d5ae54) removed from this same
                component — a drop-shadow on a clip-path'd element renders
                inconsistently across browsers, some painting the shadow
                along the invisible clip boundary itself as a disconnected
                floating box. It isn't in the handoff's own §5 "what changes
                between sides" table (only the inset box-shadow is), so it
                reads as a snapshot artifact rather than a required value —
                left out here; each card already has its own real `boxShadow`
                for elevation, which doesn't have this clip-path interaction.
                Re-add only if live verification shows the design's elevation
                is missing without it, and re-check for the phantom-box
                artifact immediately if you do. */}
            <div
              data-eco-wipe="pro"
              style={{
                gridArea: "1/1/2/-1",
                justifySelf: "stretch",
                width: "100%",
                borderRadius: "0 0 26px 26px",
                display: "flex",
                clipPath: `inset(0px 0px 0px ${proOn ? 0 : 100}.00%)`,
                boxShadow: proOn ? "inset 3px 0 0 0 #4E3894" : "inset 3px 0 0 0 transparent",
                transition: "clip-path .52s cubic-bezier(.22,1,.36,1),box-shadow .52s cubic-bezier(.22,1,.36,1)",
                // Both wipe panels are always fully mounted (see the file
                // header). visibility and will-change are both owned by
                // useEcoSlider's paint() (via refs, never through this style
                // prop) rather than set here: the inactive one is hidden
                // whenever the slider is at rest, and will-change:clip-path
                // is applied only for the brief drag/transition window it
                // actually helps -- see paint()'s own comment for why it's
                // no longer a permanent style.
                minWidth: 0,
                justifyContent: "flex-end",
              }}
            >
              <div className="flex min-w-0" style={{ flex: 1, width: proOn ? "min(540px,100%)" : "min(330px,100%)", minWidth: proOn ? 0 : "min(300px,100%)" }}>
              <Reveal className="flex min-w-0 w-full">
                <div
                  style={{
                    flex: 1,
                    width: "100%",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "0 0 26px 26px",
                    overflow: "hidden",
                    transition: "width .55s cubic-bezier(.22,1,.36,1),border-radius .55s cubic-bezier(.22,1,.36,1),box-shadow .35s cubic-bezier(.22,1,.36,1),border-color .35s cubic-bezier(.22,1,.36,1)",
                    boxShadow: proOn ? "0 1px 0 rgba(255,255,255,.9) inset,0 22px 54px rgba(72,58,130,.12)" : "0 1px 0 rgba(255,255,255,.9) inset,0 6px 16px rgba(72,58,130,.05)",
                    background: "linear-gradient(150deg,#F8F6FE 0%,#F2EDFC 52%,#EFF6F4 100%)",
                    border: "3px solid #4E3894",
                    borderTop: 0,
                  }}
                >
                  {/* Kept but never shown — the handoff's own per-card head
                      block (icon badge + "For professionals"), display:none
                      in every rendered state. Its markup order matters: the
                      mobile CSS's `[data-eco-wipe] > div > div:nth-child(2)`
                      selector counts this as child 1, targeting the actual
                      content wrapper below as child 2. */}
                  <div data-eco-head="pro" aria-hidden="true" style={{ display: "none" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "24px 28px 28px", transition: "padding .42s cubic-bezier(.22,1,.36,1)" }}>
                    <div style={{ display: "grid", gridTemplateRows: "1fr", transition: "grid-template-rows .42s cubic-bezier(.22,1,.36,1)", flex: 1, minHeight: 0, marginTop: 22 }}>
                      {/* data-eco-clip's first child is what the hook's fit()
                          measures the panel's full, un-clipped natural
                          content height from — identical whichever side is
                          showing. */}
                      <div data-eco-clip style={{ overflow: "hidden", minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ borderRadius: 16, overflow: "hidden", background: "#FAF9F7", border: "1px solid #EDEAE4", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                          <div data-eco-screen style={{ padding: 20, background: "#fff", display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
                            <div data-eco-shed="7" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-.02em", color: "#221E1A" }}>Clients</div>
                                <div style={{ fontSize: 11, color: "#6B6358" }}>3 active · Thu 4 Sep</div>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flexShrink: 0 }}>
                                <span style={{ padding: "4px 9px", borderRadius: 999, background: "#5C48A8", color: "#fff", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>All</span>
                                <span style={{ padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", background: "#F1EEE9", color: "#4A443C" }}>Needs review</span>
                              </div>
                            </div>

                            <div data-eco-split style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,1fr)", gap: 18, alignItems: "start", marginTop: 4 }}>
                              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                {clients.map((row, i) => (
                                  <div
                                    key={row.name}
                                    data-eco-shed={row.shed}
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
                                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                                        <span
                                          style={{
                                            padding: "2px 7px",
                                            borderRadius: 999,
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            whiteSpace: "nowrap",
                                            color: row.tone === "primary" ? "#4E3894" : "#2F5F58",
                                            background: row.tone === "primary" ? "#F4F1FB" : "#EDF4F3",
                                          }}
                                        >
                                          {row.meta}
                                        </span>
                                        <div data-eco-shed="2" style={{ display: "flex", flexWrap: "wrap", gap: 4, minWidth: 0 }}>
                                          {row.chips.map((chip) => (
                                            <span
                                              key={chip.text}
                                              style={{
                                                padding: "2px 7px",
                                                borderRadius: 999,
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                                whiteSpace: "nowrap",
                                                color: chip.tone === "warn" ? "#8A6512" : row.tone === "primary" ? "#4E3894" : "#2F5F58",
                                                background: chip.tone === "warn" ? "#FBF3DF" : row.tone === "primary" ? "#F4F1FB" : "#EDF4F3",
                                              }}
                                            >
                                              {chip.text}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ flexShrink: 0, padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#5B5349", background: i % 2 === 0 ? "#F4F1FB" : "#EDF4F3" }}>
                                      {row.status}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                                <div data-eco-shed="7" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(104px,100%),1fr))", gap: 7 }}>
                                  {proStats.map((s) => (
                                    <div key={s.label} data-eco-shed={s.shed} style={{ border: "1px solid #E4DCF8", borderRadius: 10, padding: "7px 8px", display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", lineHeight: 1.25, color: "#6B6358" }}>{s.label}</span>
                                      <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em", color: "#221E1A" }}>{s.value}</span>
                                      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: "#4E3894" }}>{s.note}</span>
                                    </div>
                                  ))}
                                </div>

                                <div data-eco-shed="4" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "#6B6358" }}>PLAN COMPLIANCE</span>
                                    <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: "#F4F1FB", color: "#4E3894" }}>7 weeks</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
                                    <div data-eco-plot style={{ position: "relative", flex: 1, minWidth: 0, height: "calc(125px + var(--eco-grow, 0px))" }}>
                                      <span style={{ position: "absolute", inset: 0, lineHeight: 0 }}>
                                        <svg viewBox="0 0 300 125" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
                                          <line x1={0} y1={101.3} x2={300} y2={101.3} stroke="#E4DCF8" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                          <line x1={0} y1={54.7} x2={300} y2={54.7} stroke="#E4DCF8" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                          <line x1={0} y1={8.0} x2={300} y2={8.0} stroke="#E4DCF8" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                          <line x1={0} y1={54.7} x2={300} y2={54.7} stroke="#7D67D9" strokeWidth={1.4} strokeDasharray="5 4" opacity={0.75} vectorEffect="non-scaling-stroke" />
                                          <polyline points="0.0,68.7 48.0,57.0 96.0,47.7 144.0,40.7 192.0,45.3 240.0,33.7 288.0,26.7" fill="none" stroke="#4E3894" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                          <polyline points="0.0,78.0 40.0,87.3 80.0,73.3 120.0,80.3 160.0,64.0 200.0,75.7 240.0,68.7" fill="none" stroke="#7D67D9" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                          <polyline points="0.0,92.0 32.0,99.0 64.0,108.3 96.0,96.7 128.0,113.0 160.0,101.3 192.0,106.0" fill="none" stroke="#A895E0" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        </svg>
                                        <span aria-hidden="true" style={{ position: "absolute", left: "96%", top: "21.4%", width: 9, height: 9, margin: "-4.5px 0 0 -4.5px", borderRadius: 999, background: "#4E3894", boxShadow: "0 0 0 2px #fff" }} />
                                        <span aria-hidden="true" style={{ position: "absolute", left: "80%", top: "55%", width: 9, height: 9, margin: "-4.5px 0 0 -4.5px", borderRadius: 999, background: "#7D67D9", boxShadow: "0 0 0 2px #fff" }} />
                                        <span aria-hidden="true" style={{ position: "absolute", left: "64%", top: "84.8%", width: 9, height: 9, margin: "-4.5px 0 0 -4.5px", borderRadius: 999, background: "#A895E0", boxShadow: "0 0 0 2px #fff" }} />
                                      </span>
                                      <span style={{ position: "absolute", left: 0, top: "16.56%", fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: "#5C48A8", background: "#F4F1FB", borderRadius: 999, padding: "2px 7px", lineHeight: 1.1 }}>
                                        80% TARGET
                                      </span>
                                    </div>
                                    <div style={{ position: "relative", width: 132, flexShrink: 0, height: "calc(125px + var(--eco-grow, 0px))" }}>
                                      {compliance.map((r) => (
                                        <span key={r.name} style={{ position: "absolute", left: 0, right: 0, top: `${r.top}%`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                          <span style={{ fontSize: 11, fontWeight: 700, color: "#221E1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                                          <span style={{ fontSize: 11, fontWeight: 800, color: r.color, whiteSpace: "nowrap" }}>{r.pct}</span>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div data-eco-mod style={{ marginTop: "auto", borderTop: "1px solid #D8EAE6", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                              <span data-eco-caption style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "#2F5F58", background: "#EDF4F3", borderLeft: "3px solid #5E9E95", borderRadius: "0 7px 7px 0", padding: "9px 11px 9px 12px", display: "block" }}>
                                Your clients, your plans, one seamless system. Manage everything from their health data to workouts and nutrition, with updates flowing straight to their app.
                              </span>
                              <div data-eco-caption data-eco-shed="5" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
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
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
              </div>
            </div>

            <div
              data-eco-wipe="biz"
              style={{
                gridArea: "1/1/2/-1",
                justifySelf: "stretch",
                width: "100%",
                borderRadius: "0 0 26px 26px",
                display: "flex",
                clipPath: `inset(0px ${bizOn ? 0 : 100}.00% 0px 0px)`,
                boxShadow: bizOn ? "inset -3px 0 0 0 #2F5F58" : "inset -3px 0 0 0 transparent",
                transition: "clip-path .52s cubic-bezier(.22,1,.36,1),box-shadow .52s cubic-bezier(.22,1,.36,1)",
                // See the "pro" panel above -- visibility/will-change are
                // both owned by paint(), not this style prop.
                minWidth: 0,
                justifyContent: "flex-start",
              }}
            >
              <div className="flex min-w-0" style={{ flex: 1, width: bizOn ? "min(540px,100%)" : "min(330px,100%)", minWidth: bizOn ? 0 : "min(300px,100%)" }}>
              <Reveal delay={0.06} className="flex min-w-0 w-full">
                <div
                  style={{
                    flex: 1,
                    width: "100%",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "0 0 26px 26px",
                    overflow: "hidden",
                    transition: "width .55s cubic-bezier(.22,1,.36,1),border-radius .55s cubic-bezier(.22,1,.36,1),box-shadow .35s cubic-bezier(.22,1,.36,1),border-color .35s cubic-bezier(.22,1,.36,1)",
                    boxShadow: bizOn ? "0 1px 0 rgba(255,255,255,.9) inset,0 22px 54px rgba(94,158,149,.14)" : "none",
                    background: "linear-gradient(150deg,#F3F9F7 0%,#EDF6F3 52%,#F5F2FD 100%)",
                    border: "3px solid #2F5F58",
                    borderTop: 0,
                  }}
                >
                  <div data-eco-head="biz" aria-hidden="true" style={{ display: "none" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "24px 28px 28px", transition: "padding .42s cubic-bezier(.22,1,.36,1)" }}>
                    <div style={{ display: "grid", gridTemplateRows: "1fr", transition: "grid-template-rows .42s cubic-bezier(.22,1,.36,1)", flex: 1, minHeight: 0, marginTop: 22 }}>
                      <div data-eco-clip style={{ overflow: "hidden", minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ borderRadius: 16, overflow: "hidden", background: "#FAF9F7", border: "1px solid #EDEAE4", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                          <div data-eco-screen style={{ padding: 20, background: "#fff", display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
                            <div data-eco-shed="7" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                              <div style={{ minWidth: 0, fontSize: 13, fontWeight: 800, letterSpacing: "-.02em", color: "#221E1A" }}>Studio overview</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                <span style={{ padding: "3px 9px", borderRadius: 999, background: "#2F5F58", color: "#fff", fontSize: 11, fontWeight: 700 }}>Week</span>
                                <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "#EDF4F3", color: "#2F5F58" }}>Month</span>
                              </div>
                            </div>
                            <div data-eco-shed="7" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(74px,100%),1fr))", gap: 5 }}>
                              {kpis.map((k) => (
                                <div key={k.label} data-eco-shed={k.shed} style={{ border: "1px solid #D8EAE6", borderRadius: 9, padding: "6px 7px", display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", lineHeight: 1.2, color: "#6B6358" }}>{k.label}</span>
                                  <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.02em", color: "#221E1A" }}>{k.value}</span>
                                </div>
                              ))}
                            </div>
                            <div data-eco-shed="4" style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 8, borderTop: "1px solid #D8EAE6" }}>
                              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "#6B6358" }}>CHECK-INS · 591</span>
                                <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: "#EDF4F3", color: "#2F5F58" }}>+18% WoW</span>
                              </div>
                              <div data-eco-bars style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                                {checkins.map((b) => (
                                  <div key={b.day} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: b.day === "Sat" ? "#2F5F58" : "#6B6358" }}>{b.v}</span>
                                    <div style={{ width: "100%", height: "calc(34px + var(--eco-grow, 0px))", display: "flex", alignItems: "flex-end" }}>
                                      <div style={{ width: "100%", flexShrink: 0, height: `${b.h}%`, borderRadius: "3px 3px 0 0", background: b.day === "Sat" ? "#2F5F58" : "#5E9E95" }} />
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: b.day === "Sat" ? "#2F5F58" : "#6B6358" }}>{b.day}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div data-eco-shed="6" style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 8, borderTop: "1px solid #D8EAE6" }}>
                              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "#6B6358" }}>CLASS OCCUPANCY</span>
                                <span data-eco-shed="2" data-eco-chips style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                                  {["86 booked", "64% leads", "peak Sat 18:00"].map((c) => (
                                    <span key={c} style={{ padding: "2px 7px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", color: "#2F5F58", background: "#EDF4F3" }}>
                                      {c}
                                    </span>
                                  ))}
                                </span>
                              </div>
                              {occupancy.map((cls) => (
                                <div key={cls.name} data-eco-shed={cls.shed} data-eco-class style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ flex: "0 0 auto", minWidth: 0, display: "flex", alignItems: "baseline", gap: 7 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#221E1A", whiteSpace: "nowrap" }}>{cls.name}</span>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6B6358", whiteSpace: "nowrap" }}>{cls.time}</span>
                                  </span>
                                  <span style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 999, background: "#EDF4F3" }}>
                                    <span style={{ display: "block", height: "100%", width: `${cls.pct}%`, borderRadius: 999, background: cls.pct >= 90 ? "#2F5F58" : "#5E9E95" }} />
                                  </span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6358", whiteSpace: "nowrap", flexShrink: 0 }}>{cls.booked}</span>
                                  {cls.waitlist && (
                                    <span style={{ padding: "2px 7px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, color: "#8A6512", background: "#FBF3DF" }}>
                                      {cls.waitlist}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "#2F5F58", whiteSpace: "nowrap", flexShrink: 0, width: 38, textAlign: "right" }}>{cls.pct}%</span>
                                </div>
                              ))}
                            </div>
                            <div data-eco-mod style={{ marginTop: "auto", borderTop: "1px solid #E4DCF8", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                              <span data-eco-caption style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "#4E3894", background: "#F4F1FB", borderLeft: "3px solid #7D67D9", borderRadius: "0 7px 7px 0", padding: "9px 11px 9px 12px", display: "block" }}>
                                Put your gym, classes and services on the map, digitize memberships, connect with professionals and gain insights through client analytics.
                              </span>
                              <div data-eco-caption data-eco-shed="5" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
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
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
