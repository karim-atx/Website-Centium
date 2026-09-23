import React, { useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { PillarRail, type PillarData } from "../components/PillarRail";
import { BrowserMockup, type RailItem } from "../components/BrowserMockup";
import { PersonaArc, type PersonaData } from "../components/PersonaArc";
import { PlanPicker, type Plan } from "../components/PlanPicker";
import { FaqAccordion, type FaqItem } from "../components/FaqAccordion";
import { ProblemList, type ProblemItem } from "../components/ProblemList";
import { Ecosystem } from "../components/Ecosystem";
import { BrandLoader } from "../components/BrandLoader";
import { HeroSection } from "../components/HeroSection";
import { NAV_JUMP_EVENT } from "../components/Nav";
import { useSEO } from "../useSEO";

const legacyApps: ProblemItem[] = [
  { label: "A nutrition app", tag: "Costly" },
  { label: "A workout app", tag: "Generic" },
  { label: "A health app", tag: "Discrepancies" },
  { label: "A messenger app", tag: "Elsewhere" },
  { label: "A spreadsheet you stopped filling", tag: "Inconsistency" },
];

const faqItems: FaqItem[] = [
  {
    q: "Why does Centium exist?",
    lead: "Why",
    color: "#7D67D9",
    a: "As a means to an end. Centium was built around the challenges people face, the goals they pursue, and the support they need to make meaningful progress.",
  },
  {
    q: "What exactly can I track with Centium?",
    lead: "What",
    color: "#5E9E95",
    a: "Everything. From your health and workouts to nutrition and progress, Centium brings it all together in one all-encompassing platform.",
  },
  {
    q: "Who is Centium built for?",
    lead: "Who",
    color: "#7D67D9",
    a: "Anyone. If you care about your health, Centium adapts to your needs with little effort, whether you're just starting out or already deep into your journey.",
  },
  {
    q: "Where does Centium fit into my daily routine?",
    lead: "Where",
    color: "#5E9E95",
    a: "All day, every day. Centium seamlessly fits into your routine without being invasive, acting as a smooth, always-accessible partner in your health journey.",
  },
  {
    q: "When should Centium be part of my journey?",
    lead: "When",
    color: "#7D67D9",
    a: "From wherever you are. Fitness will always require effort, but Centium guides and supports you every step of the way, helping you turn your goals into progress.",
  },
];

// Literal figures from the v7 handoff's own `homePlans` data
// (logic/data.js line ~147). A stale v5-round comment here previously cited
// $15/$149/$99/$79/$799 as the handoff's literal values and rounded off the
// cents — the current handoff's data.js carries every price (monthly *and*
// yearly) as an explicit "*.99" string: 14.99/149.99, 9.99/99.99,
// 79.99/799.99. rendered/08*.html confirms these are what's actually drawn
// ($14.99, $149.99, $79.99, $799.99), so they are not derived at runtime
// (e.g. $14.99×12×0.85 ≈ $152.99, not the handoff's own $149.99) — copy them
// verbatim from data.js instead.
const homePlans: Plan[] = [
  {
    key: "professionals",
    name: "Professionals",
    description: "Manage your entire roster, while keeping every experience personal.",
    monthly: 14.99,
    unit: "/ month",
    prefix: "Starting at",
    yearlyPrice: 149.99,
    yearlyUnit: "/ yr",
    features: ["Client roster & booking", "Programs Management", "Comprehensive Data Tracking"],
    ctaLabel: "Get Started",
  },
  {
    key: "clients",
    name: "General Users",
    description: "Take charge of your health with one click.",
    monthly: 9.99,
    unit: "per month",
    yearlyPrice: 99.99,
    yearlyUnit: "/ yr",
    features: ["Nutrition & workout logging", "Health tracking & trends", "Connected Community & Experts"],
    ctaLabel: "Get Started",
  },
  {
    key: "business",
    name: "Business",
    description: "Unlock new opportunities. Scale your business with Centium.",
    monthly: 79.99,
    unit: "per month + rev share",
    yearlyPrice: 799.99,
    yearlyUnit: "/ yr + rev share",
    features: ["Marketplace Visibility", "Team Operations", "Growth Analytics"],
    ctaLabel: "Talk to us",
  },
];

// ---------------------------------------------------------------------------
// Platform pillar browser-chrome mockups.
//
// Regression fix: an earlier round rendered this device at a fixed 430px
// max-width beside a text column (paragraph + bullet list) inside a 2-column
// pane grid — none of which exists in the handoff. The handoff's own
// `data-pane-figure` is `width:100%` on a pane that spans the full rail
// card, stacked directly below the pillar's `h3` (see PillarRail.tsx), with
// no separate paragraph/bullets — the module captions inside the device are
// the only descriptive copy. This mockup, `ModCard`/`ModInfo` and the
// per-module content below are now ported at the handoff's own literal type
// scale (12-16px, not the previous ~7-9px compact scale that only made
// sense at 430px) since the device now renders near-full pane width.
// ---------------------------------------------------------------------------

const ModCard: React.FC<{
  border: string;
  align?: "center" | "stretch";
  fullWidth?: boolean;
  children: React.ReactNode;
}> = ({ border, align = "center", fullWidth, children }) => (
  <div
    className="flex gap-[11px] min-w-0 rounded-[10px] px-[10px] py-[8px] bg-white"
    style={{
      border: `1px solid ${border}`,
      alignItems: align === "stretch" ? "stretch" : "center",
      gridColumn: fullWidth ? "1 / -1" : undefined,
    }}
  >
    {children}
  </div>
);

const ModInfo: React.FC<{
  label: string;
  badge: string;
  badgeBg: string;
  badgeInk: string;
  capMin?: 230 | 236 | 246;
  capInk: string;
  capPlate: string;
  capBorder: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}> = ({ label, badge, badgeBg, badgeInk, capMin, capInk, capPlate, capBorder, children, extra }) => (
  <div className="flex-1 min-w-0 flex flex-col gap-[5px]">
    <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
      <span className="text-[12px] font-extrabold tracking-[.11em] whitespace-nowrap" style={{ color: "#6B6358" }}>
        {label}
      </span>
      <span className="px-[8px] py-[3px] rounded-full text-[12px] font-extrabold whitespace-nowrap" style={{ background: badgeBg, color: badgeInk }}>
        {badge}
      </span>
    </div>
    <span
      data-mod-caption=""
      {...(capMin ? { "data-cap-min": String(capMin) } : {})}
      className="block text-[14px] font-bold leading-[1.35] rounded-r-[7px]"
      style={{ color: capInk, background: capPlate, borderLeft: `3px solid ${capBorder}`, padding: "7px 9px 7px 10px" }}
    >
      {children}
    </span>
    {extra}
  </div>
);

const NUTRITION_RAIL: RailItem[] = [
  { label: "Log", active: true },
  { label: "Prep" },
  { label: "Recipes" },
  { label: "History" },
];

const NutritionMockup: React.FC = () => (
  <BrowserMockup url="app.centium.health/nutrition" border="#E4DCF8" headerBg="#F4F1FB" railActive="#5C48A8" railInactiveDot="#E4DCF8" railInk="#6B6358" railItems={NUTRITION_RAIL}>
    <div className="flex flex-wrap items-start justify-between gap-[10px]">
      <div className="min-w-0">
        <div className="text-[16px] font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Today</div>
        <div className="mt-[3px] text-[12px] leading-[1.4] whitespace-nowrap" style={{ color: "#6B6358" }}>1,842 / 2,340 kcal · 18-day streak</div>
      </div>
      <div className="flex flex-wrap gap-[5px] shrink min-w-0">
        <span className="px-[8px] py-[3px] rounded-full text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#5C48A8", color: "#fff" }}>Log</span>
        <span className="px-[8px] py-[3px] rounded-full text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#F4F1FB", color: "#5C48A8" }}>Meal Prep</span>
      </div>
    </div>

    <div
      data-mod-grid
      className="grid min-w-0"
      style={{ flex: "1 1 auto", alignContent: "stretch", alignItems: "stretch", gridTemplateColumns: "repeat(auto-fit,minmax(min(420px,100%),1fr))", gap: 6 }}
    >
      {/* Module 1 — Macro targets (full width, literal from .dc.html
          data-pane-figure for /nutrition) */}
      <ModCard border="#E4DCF8" align="stretch" fullWidth>
        <div data-mod-ui className="grid gap-[5px] min-w-0" style={{ gridAutoRows: "1fr", alignItems: "stretch", flex: "0 1 420px", minHeight: 114 }}>
          {[
            { label: "Protein", pct: 30, val: "30% · 165 g", bar: "#4E3894", ink: "#4E3894" },
            { label: "Carbs", pct: 45, val: "45% · 260 g", bar: "#5C48A8", ink: "#5C48A8" },
            { label: "Fat", pct: 25, val: "25% · 65 g", bar: "#2F5F58", ink: "#2F5F58" },
          ].map((row) => (
            <span key={row.label} className="flex items-center gap-[9px]">
              <span className="w-[58px] text-[12px] font-bold whitespace-nowrap" style={{ color: "#3B352D" }}>{row.label}</span>
              <span className="relative flex-1 h-[5px] rounded-full" style={{ background: "#EFEAFB" }}>
                <span className="absolute left-0 top-0 bottom-0 rounded-full" style={{ width: `${row.pct}%`, background: row.bar }} />
              </span>
              <span className="w-[78px] text-right text-[12px] font-extrabold whitespace-nowrap" style={{ color: row.ink }}>{row.val}</span>
            </span>
          ))}
          <span aria-hidden="true" className="grid gap-[2px]" style={{ gridTemplateColumns: "repeat(10,1fr)" }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="h-[9px] rounded-[2px]" style={{ background: i < 6 ? "#4E3894" : i < 15 ? "#7D67D9" : "#A895E0" }} />
            ))}
          </span>
        </div>
        <ModInfo
          label="MACRO TARGETS"
          badge="TDEE 2,340"
          badgeBg="#F4F1FB"
          badgeInk="#5C48A8"
          capMin={246}
          capInk="#2F5F58"
          capPlate="#EDF4F3"
          capBorder="#5E9E95"
          extra={
            <span aria-hidden="true" className="flex flex-col gap-[6px]">
              <span className="flex items-baseline justify-between gap-[10px]">
                <span className="text-[11px] font-extrabold tracking-[.1em] whitespace-nowrap" style={{ color: "#6B6358" }}>TODAY SO FAR</span>
                <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: "#6B6358" }}>498 kcal still to log</span>
              </span>
              {[
                { l: "P", val: "128", of: "/165 g", pct: 78, bg: "#4E3894" },
                { l: "C", val: "196", of: "/260 g", pct: 75, bg: "#7D67D9" },
                { l: "F", val: "48", of: "/65 g", pct: 74, bg: "#2F5F58" },
              ].map((r) => (
                <span key={r.l} className="relative block w-full h-[18px] rounded-full overflow-hidden" style={{ background: "#F4F1FB" }}>
                  <span className="absolute left-0 top-0 bottom-0" style={{ width: `${r.pct}%`, background: r.bg }} />
                  <span className="absolute inset-0 flex items-center justify-between px-[9px]">
                    <span className="text-[11px] font-extrabold text-white">{r.l}</span>
                    <span className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: r.bg }}>
                      {r.val}
                      <span style={{ color: "#A9A29A" }}>{r.of}</span>
                    </span>
                  </span>
                </span>
              ))}
            </span>
          }
        >
          Editable macro sliders — drag any target and the split rebalances against your own TDEE.
        </ModInfo>
      </ModCard>

      {/* Module 2 — Today's log */}
      <ModCard border="#E4DCF8">
        <div data-mod-ui className="flex flex-col gap-[5px] min-w-0" style={{ flex: "0 1 210px", height: 114 }}>
          {[
            { title: "Breakfast", meta: "38P · 62C · 12F", kcal: "512", dashed: false },
            { title: "Lunch", meta: "52P · 74C · 18F", kcal: "686", dashed: false },
            { title: "+ Log dinner", meta: "498 kcal left", kcal: "", dashed: true },
          ].map((row) => (
            <span
              key={row.title}
              className="flex flex-wrap items-center justify-between gap-[8px] rounded-[8px] px-[8px] py-[6px]"
              style={{ border: row.dashed ? "1px dashed #E4DCF8" : "1px solid #E4DCF8" }}
            >
              <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: row.dashed ? "#5C48A8" : "#221E1A" }}>{row.title}</span>
              <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: "#5B5349" }}>{row.meta}</span>
              {row.kcal && <span className="text-[12px] font-extrabold whitespace-nowrap" style={{ color: "#4E3894" }}>{row.kcal}</span>}
            </span>
          ))}
        </div>
        <ModInfo label="TODAY'S LOG" badge="ONE TAP" badgeBg="#F4F1FB" badgeInk="#5C48A8" capInk="#2F5F58" capPlate="#EDF4F3" capBorder="#5E9E95">
          Log a meal with its full protein, carb and fat split.
        </ModInfo>
      </ModCard>

      {/* Module 3 — Meal prep */}
      <ModCard border="#E4DCF8">
        <div data-mod-ui className="flex flex-col gap-[7px] min-w-0" style={{ flex: "0 1 250px", minHeight: 114 }}>
          <span className="flex gap-[4px]">
            {[
              { d: "M", n: "3", k: "1.9k", off: false },
              { d: "T", n: "3", k: "2.1k", off: false },
              { d: "W", n: "3", k: "1.9k", off: false },
              { d: "T", n: "3", k: "2.0k", off: false },
              { d: "F", n: "3", k: "1.9k", off: false },
              { d: "S", n: "—", k: "", off: true },
              { d: "S", n: "—", k: "", off: true },
            ].map((c, i) => (
              <span key={i} className="flex-1 min-w-0 flex flex-col items-center gap-[2px]">
                <span className="text-[11px] font-bold" style={{ color: "#6B6358" }}>{c.d}</span>
                <span
                  className="w-full h-[24px] rounded-[5px] flex items-center justify-center text-[12px] font-extrabold"
                  style={c.off ? { background: "#F6F4F0", border: "1px solid #EDEAE4", color: "#C3BCB2" } : { background: "#F4F1FB", border: "1px solid #E4DCF8", color: "#5C48A8" }}
                >
                  {c.n}
                </span>
                <span className="font-bold whitespace-nowrap" style={{ fontSize: "10px", color: c.off ? "#C3BCB2" : "#6B6358" }}>{c.k}</span>
              </span>
            ))}
          </span>
          <span aria-hidden="true" className="flex items-center gap-[5px] flex-wrap">
            {["5 planned", "2 to go", "1,980 kcal avg"].map((c) => (
              <span key={c} className="px-[7px] py-[2px] rounded-full font-extrabold whitespace-nowrap" style={{ fontSize: "10.5px", background: "#F4F1FB", color: "#4E3894" }}>{c}</span>
            ))}
          </span>
          <span aria-hidden="true" className="flex flex-col gap-[4px]">
            <span className="flex items-baseline justify-between gap-[6px]">
              <span className="text-[11px] font-extrabold tracking-[.08em] whitespace-nowrap" style={{ color: "#6B6358" }}>BATCH CONTAINERS</span>
              <span className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: "#4E3894" }}>7 / 10</span>
            </span>
            <span className="flex items-end gap-[5px]">
              {[100, 100, 100, 60, 20].map((h, i) => (
                <span key={i} className="relative flex-1 min-w-0 h-[24px] overflow-hidden" style={{ border: "1.5px solid #7D67D9", borderRadius: "3px 3px 6px 6px", background: "#fff" }}>
                  <span className="absolute left-0 right-0 bottom-0" style={{ height: `${h}%`, background: "#7D67D9" }} />
                </span>
              ))}
            </span>
          </span>
          <span aria-hidden="true" className="flex items-center justify-between gap-[8px] rounded-[8px] px-[8px] py-[6px]" style={{ border: "1px solid #E4DCF8" }}>
            <span className="text-[11px] font-extrabold tracking-[.08em] whitespace-nowrap" style={{ color: "#6B6358" }}>NEXT COOK</span>
            <span className="text-[11.5px] font-bold whitespace-nowrap" style={{ color: "#4E3894" }}>Sun · 6 meals · 2h 10m</span>
          </span>
        </div>
        <ModInfo label="MEAL PREP" badge="WEEK 37" badgeBg="#F4F1FB" badgeInk="#5C48A8" capInk="#2F5F58" capPlate="#EDF4F3" capBorder="#5E9E95">
          Plan the week ahead in Meal Prep.
        </ModInfo>
      </ModCard>
    </div>
  </BrowserMockup>
);

const TRAINING_RAIL: RailItem[] = [
  { label: "Session", active: true },
  { label: "Routines" },
  { label: "RPE" },
  { label: "History" },
];

const TrainingMockup: React.FC = () => (
  <BrowserMockup url="app.centium.health/training" border="#D8EAE6" headerBg="#EDF4F3" railActive="#2F5F58" railInactiveDot="#D8EAE6" railInk="#6B6358" railItems={TRAINING_RAIL}>
    <div className="flex flex-wrap items-start justify-between gap-[10px]">
      <div className="min-w-0">
        <div className="text-[16px] font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Push Day</div>
        <div className="mt-[3px] text-[12px] leading-[1.4] whitespace-nowrap" style={{ color: "#6B6358" }}>Session 41:08 · 8,420 kg total</div>
      </div>
      <div className="flex flex-wrap gap-[5px] shrink min-w-0">
        <span className="px-[8px] py-[3px] rounded-full text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#2F5F58", color: "#fff" }}>● LIVE</span>
        <span className="px-[8px] py-[3px] rounded-full text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#3F726D" }}>History</span>
      </div>
    </div>

    <div
      data-mod-grid
      className="grid min-w-0"
      style={{ flex: "1 1 auto", alignContent: "stretch", alignItems: "stretch", gridTemplateColumns: "repeat(auto-fit,minmax(min(420px,100%),1fr))", gap: 6 }}
    >
      {/* Module 1 — Live set logging. Literal source order differs from the
          other modules: text column first, then [data-mod-ui], then a
          sibling "SET 3 OF 4" badge — not just the two-child shape. */}
      <ModCard border="#D8EAE6" fullWidth>
        <div className="flex-1 min-w-0 flex flex-col gap-[7px]">
          <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
            <span className="text-[12px] font-extrabold tracking-[.11em] whitespace-nowrap" style={{ color: "#6B6358" }}>LIVE SET LOGGING</span>
          </div>
          <span data-mod-caption="" className="block text-[14px] font-bold leading-[1.35] rounded-r-[7px]" style={{ color: "#4E3894", background: "#F4F1FB", borderLeft: "3px solid #7D67D9", padding: "7px 9px 7px 10px" }}>
            Log sets, reps and weight live during a session.
          </span>
          <span aria-hidden="true" className="flex flex-col gap-[6px]" style={{ maxWidth: 420 }}>
            <span className="flex items-baseline justify-between gap-[10px]">
              <span className="text-[11px] font-extrabold tracking-[.1em] whitespace-nowrap" style={{ color: "#6B6358" }}>SETS BANKED</span>
              <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: "#2F5F58" }}>1,320 kg of 2,640 planned</span>
            </span>
            <span className="flex gap-[5px]">
              <span className="flex-1 h-[14px] rounded-full" style={{ background: "#2F5F58" }} />
              <span className="flex-1 h-[14px] rounded-full" style={{ background: "#2F5F58" }} />
              <span className="flex-1 h-[14px] rounded-full" style={{ background: "#5E9E95" }} />
              <span className="flex-1 h-[14px] rounded-full" style={{ background: "#EDF4F3", boxShadow: "inset 0 0 0 1.5px #CFE4DF" }} />
            </span>
            <span className="flex gap-[5px]">
              {["8 × 82.5", "8 × 82.5", "logging", "to come"].map((t, i) => (
                <span key={i} className="flex-1 text-center text-[11px] font-bold" style={{ color: i < 2 ? "#2F5F58" : i === 2 ? "#5E9E95" : "#A9A29A" }}>{t}</span>
              ))}
            </span>
          </span>
        </div>
        <div data-mod-ui className="flex flex-col gap-[6px] min-w-0" style={{ flex: "0 1 420px" }}>
          <span className="flex items-center justify-between gap-[8px]">
            <span className="text-[12.5px] font-extrabold whitespace-nowrap" style={{ color: "#221E1A" }}>Bench Press</span>
            <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: "#6B6358" }}>82.5 kg · RPE 8</span>
          </span>
          <span className="flex flex-wrap gap-[5px]">
            <span className="px-[8px] py-[4px] rounded-[7px] text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#2F5F58", color: "#fff" }}>8 × 82.5</span>
            <span className="px-[8px] py-[4px] rounded-[7px] text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#2F5F58", color: "#fff" }}>8 × 82.5</span>
            <span className="px-[8px] py-[4px] rounded-[7px] text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#fff", color: "#2F5F58", border: "2px solid #5E9E95" }}>reps __</span>
            <span className="px-[8px] py-[4px] rounded-[7px] text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#3F726D" }}>4</span>
          </span>
          <span className="flex items-center justify-between gap-[8px] rounded-[8px] px-[8px] py-[5px]" style={{ background: "#EDF4F3" }}>
            <span className="text-[11.5px] font-extrabold tracking-[.08em] whitespace-nowrap" style={{ color: "#2F5F58" }}>REST</span>
            <span className="relative flex-1 min-w-0 h-[6px] rounded-full overflow-hidden" style={{ background: "#fff" }}>
              <span className="block h-full rounded-full" style={{ width: "62%", background: "#5E9E95" }} />
            </span>
            <span className="text-[11.5px] font-bold whitespace-nowrap" style={{ color: "#2F5F58" }}>1:12 / 2:00</span>
          </span>
          {[
            { name: "Incline DB Press", meta: "3 × 10 · 30 kg" },
            { name: "Cable Fly", meta: "3 × 12 · 17.5 kg" },
          ].map((row) => (
            <span key={row.name} className="flex flex-wrap items-center justify-between gap-[8px] rounded-[8px] px-[8px] py-[6px]" style={{ border: "1px solid #D8EAE6" }}>
              <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: "#221E1A" }}>{row.name}</span>
              <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: "#5B5349" }}>{row.meta}</span>
            </span>
          ))}
        </div>
        <span className="self-start shrink-0 px-[8px] py-[3px] rounded-full text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#3F726D" }}>SET 3 OF 4</span>
      </ModCard>

      {/* Module 2 — RPE calculator */}
      <ModCard border="#D8EAE6">
        <div data-mod-ui className="grid gap-[5px] min-w-0" style={{ gridAutoRows: "1fr", alignItems: "stretch", flex: "0 1 210px", height: 114 }}>
          <span aria-hidden="true" className="flex flex-col gap-[4px]">
            <span className="relative block h-[10px] rounded-full" style={{ background: "linear-gradient(90deg,#D8EAE6 0%,#93C1B9 45%,#5E9E95 72%,#2F5F58 100%)" }}>
              <span className="absolute rounded-full" style={{ top: -3, left: "50%", transform: "translateX(-50%)", width: 6, height: 16, background: "#2F5F58", boxShadow: "0 0 0 2px #FFFFFF" }} />
            </span>
            <span className="flex">
              {["6", "7", "8", "9", "10"].map((n) => (
                <span key={n} className="flex-1 text-center text-[11px]" style={{ color: n === "8" ? "#2F5F58" : "#6B6358", fontWeight: n === "8" ? 800 : 700 }}>{n}</span>
              ))}
            </span>
          </span>
          <span className="flex items-center justify-between gap-[6px]">
            <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: "#6B6358" }}>Timer</span>
            <span className="text-[12.5px] font-extrabold whitespace-nowrap" style={{ color: "#2F5F58" }}>01:32 rest</span>
          </span>
          <span aria-hidden="true" className="flex items-center gap-[8px]">
            <svg viewBox="0 0 28 28" className="w-[26px] h-[26px] shrink-0 block">
              <circle cx="14" cy="14" r="11" fill="none" stroke="#D8EAE6" strokeWidth="3" />
              <circle cx="14" cy="14" r="11" fill="none" stroke="#2F5F58" strokeWidth="3" strokeLinecap="round" strokeDasharray="69.1" strokeDashoffset="24" transform="rotate(-90 14 14)" />
            </svg>
            <span className="flex-1 min-w-0 text-[11px] font-bold whitespace-nowrap" style={{ color: "#2F5F58" }}>65% of 90s rest elapsed</span>
          </span>
        </div>
        <ModInfo label="RPE CALCULATOR" badge="e1RM 104 kg" badgeBg="#EDF4F3" badgeInk="#3F726D" capInk="#4E3894" capPlate="#F4F1FB" capBorder="#7D67D9">
          RPE calculator and a running session timer.
        </ModInfo>
      </ModCard>

      {/* Module 3 — History · volume */}
      <ModCard border="#D8EAE6">
        <div data-mod-ui className="grid gap-[5px] min-w-0" style={{ gridAutoRows: "1fr", alignItems: "stretch", flex: "0 1 210px", height: 114 }}>
          <span aria-hidden="true" className="block h-[34px]">
            <svg viewBox="0 0 120 34" preserveAspectRatio="none" className="w-full h-full block">
              <polyline points="2,28 22,24 42,25 62,17 82,13 102,7 118,4 118,34 2,34" fill="#5E9E95" fillOpacity={0.18} stroke="none" />
              <polyline points="2,28 22,24 42,25 62,17 82,13 102,7 118,4" fill="none" stroke="#2F5F58" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span aria-hidden="true" className="flex items-center gap-[5px] flex-wrap">
            {["6 weeks", "+14% volume", "8,420 kg"].map((c) => (
              <span key={c} className="px-[7px] py-[2px] rounded-full font-extrabold whitespace-nowrap" style={{ fontSize: "10.5px", background: "#EDF4F3", color: "#2F5F58" }}>{c}</span>
            ))}
          </span>
          <span aria-hidden="true" className="flex items-end gap-[5px]">
            {[
              { h: 16.8, label: "Push", bg: "#2F5F58" },
              { h: 12.6, label: "Pull", bg: "#5E9E95" },
              { h: 12.6, label: "Legs", bg: "#93C1B9" },
            ].map((b) => (
              <span key={b.label} className="flex-1 flex flex-col items-center gap-[2px]">
                <span className="w-full rounded-[3px]" style={{ height: `${b.h}px`, background: b.bg }} />
                <span className="text-[11px] font-bold" style={{ color: "#6B6358" }}>{b.label}</span>
              </span>
            ))}
          </span>
        </div>
        <ModInfo label="HISTORY · VOLUME" badge="+14% · 6 WK" badgeBg="#EDF4F3" badgeInk="#3F726D" capInk="#4E3894" capPlate="#F4F1FB" capBorder="#7D67D9">
          Volume progression charted under History.
        </ModInfo>
      </ModCard>
    </div>
  </BrowserMockup>
);

const HEALTH_RAIL: RailItem[] = [
  { label: "Trends", active: true },
  { label: "Body" },
  { label: "Sleep" },
  { label: "Labs" },
];

const HealthMockup: React.FC = () => (
  <BrowserMockup url="app.centium.health/health" border="#E4DCF8" headerBg="#F4F1FB" railActive="#5C48A8" railInactiveDot="#E4DCF8" railInk="#6B6358" railItems={HEALTH_RAIL}>
    <div className="flex flex-wrap items-start justify-between gap-[10px]">
      <div className="min-w-0">
        <div className="text-[16px] font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Steps</div>
        <div className="mt-[3px] text-[12px] leading-[1.4] whitespace-nowrap" style={{ color: "#6B6358" }}>9,412 today · avg 8,640</div>
      </div>
      <div className="flex flex-wrap gap-[5px] shrink min-w-0">
        <span className="px-[8px] py-[3px] rounded-full text-[12px] font-extrabold" style={{ background: "#F4F1FB", color: "#54409B" }}>D</span>
        <span className="px-[8px] py-[3px] rounded-full text-[12px] font-extrabold" style={{ background: "#5C48A8", color: "#fff" }}>W</span>
        <span className="px-[8px] py-[3px] rounded-full text-[12px] font-extrabold" style={{ background: "#F4F1FB", color: "#54409B" }}>M</span>
      </div>
    </div>

    <div
      data-mod-grid
      className="grid min-w-0"
      style={{ flex: "1 1 auto", alignContent: "stretch", alignItems: "stretch", gridTemplateColumns: "repeat(auto-fit,minmax(min(420px,100%),1fr))", gap: 6 }}
    >
      {/* Module 1 — Steps */}
      <ModCard border="#E4DCF8">
        <div data-mod-ui className="grid gap-[5px] min-w-0" style={{ gridAutoRows: "1fr", alignItems: "stretch", flex: "0 1 210px", height: 114 }}>
          <span className="relative flex items-end gap-[4px] h-[34px]">
            {[52, 68, 44, 86, 62, 100, 74].map((h, i) => (
              <span key={i} className="flex-1 rounded-t-[3px]" style={{ height: `${h}%`, background: i === 5 ? "#5C48A8" : "#EFEAFB" }} />
            ))}
            <span className="absolute left-0 right-0" style={{ bottom: "62%", borderTop: "1px dashed #54409B", opacity: 0.55 }} />
          </span>
          <span aria-hidden="true" className="flex items-center gap-[5px] flex-wrap">
            {["avg 8,640", "today 9,412", "+9%"].map((c) => (
              <span key={c} className="px-[7px] py-[2px] rounded-full font-extrabold whitespace-nowrap" style={{ fontSize: "10.5px", background: "#F4F1FB", color: "#4E3894" }}>{c}</span>
            ))}
          </span>
          <span aria-hidden="true" className="flex gap-[3px] h-[9px]">
            <span className="rounded-full" style={{ flex: 62, background: "#7D67D9" }} />
            <span className="rounded-full" style={{ flex: 38, background: "#E4DCF8" }} />
          </span>
        </div>
        <ModInfo label="STEPS" badge="AVG 8,640" badgeBg="#F4F1FB" badgeInk="#54409B" capInk="#2F5F58" capPlate="#EDF4F3" capBorder="#5E9E95">
          Maintain your average step count.
        </ModInfo>
      </ModCard>

      {/* Module 2 — Body (weight/body fat vs goal) */}
      <ModCard border="#E4DCF8">
        <div data-mod-ui className="grid gap-[5px] min-w-0" style={{ gridAutoRows: "1fr", alignItems: "stretch", flex: "0 1 210px", height: 114 }}>
          <span className="flex gap-[7px]">
            {[
              { label: "WEIGHT", val: "74.6 kg" },
              { label: "BODY FAT", val: "17.2%" },
            ].map((c) => (
              <span key={c.label} className="flex-1 flex flex-col gap-[2px] rounded-[9px] px-[8px] py-[7px]" style={{ border: "1px solid #E4DCF8" }}>
                <span className="text-[12px] font-extrabold tracking-[.09em] whitespace-nowrap" style={{ color: "#6B6358" }}>{c.label}</span>
                <span className="text-[12px] font-extrabold whitespace-nowrap" style={{ color: "#221E1A" }}>{c.val}</span>
                <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: "#54409B" }}>edit</span>
              </span>
            ))}
          </span>
          <span className="flex flex-col gap-[4px]">
            <span className="flex items-baseline justify-between gap-[6px]">
              <span className="text-[11.5px] font-extrabold tracking-[.08em] whitespace-nowrap" style={{ color: "#6B6358" }}>GOAL 72.0 kg</span>
              <span className="text-[11.5px] font-extrabold whitespace-nowrap" style={{ color: "#4E3894" }}>2.6 to go</span>
            </span>
            <span className="block h-[6px] rounded-full" style={{ background: "#EFEAFB" }}>
              <span className="block h-full rounded-full" style={{ width: "68%", background: "#4E3894" }} />
            </span>
          </span>
        </div>
        <ModInfo label="BODY" badge="VS GOAL" badgeBg="#F4F1FB" badgeInk="#54409B" capInk="#2F5F58" capPlate="#EDF4F3" capBorder="#5E9E95">
          Reach your goal weight and body fat.
        </ModInfo>
      </ModCard>

      {/* Module 3 — Sleep */}
      <ModCard border="#E4DCF8">
        <div data-mod-ui className="flex items-center gap-[11px] min-w-0" style={{ flex: "0 1 210px", height: 114 }}>
          <span aria-hidden="true" className="relative w-[74px] h-[74px] shrink-0 rounded-full flex items-center justify-center" style={{ background: "conic-gradient(#4E3894 0turn .84turn,#EFEAFB .84turn 1turn)" }}>
            <span className="absolute inset-[9px] rounded-full bg-white" />
            <span className="relative flex flex-col items-center leading-none">
              <span className="text-[17px] font-extrabold" style={{ color: "#221E1A" }}>84</span>
              <span className="font-extrabold tracking-[.08em]" style={{ fontSize: "10px", color: "#6B6358" }}>SCORE</span>
            </span>
          </span>
          <span className="flex-1 min-w-0 flex flex-col gap-[6px]">
            {[
              { label: "REM", pct: 22, bg: "#7D67D9" },
              { label: "Deep", pct: 26, bg: "#4E3894" },
              { label: "Light", pct: 44, bg: "#A895E0" },
            ].map((r) => (
              <span key={r.label} className="flex items-center gap-[6px]">
                <span className="w-[38px] text-[11.5px] font-bold whitespace-nowrap" style={{ color: "#6B6358" }}>{r.label}</span>
                <span className="flex-1 h-[5px] rounded-full" style={{ background: "#EFEAFB" }}>
                  <span className="block h-full rounded-full" style={{ width: `${r.pct}%`, background: r.bg }} />
                </span>
                <span className="text-[11.5px] font-extrabold whitespace-nowrap" style={{ color: "#4E3894" }}>{r.pct}%</span>
              </span>
            ))}
          </span>
        </div>
        <ModInfo label="SLEEP" badge="SCORE 84" badgeBg="#F4F1FB" badgeInk="#54409B" capInk="#2F5F58" capPlate="#EDF4F3" capBorder="#5E9E95">
          Optimize sleep by measuring REM, deep, light and awake scores.
        </ModInfo>
      </ModCard>

      {/* Module 4 — Biomarkers */}
      <ModCard border="#E4DCF8">
        <div data-mod-ui className="grid gap-[5px] min-w-0" style={{ gridAutoRows: "1fr", alignItems: "stretch", flex: "0 1 210px", height: 114 }}>
          <span className="flex items-center flex-wrap gap-[8px] min-w-0">
            <span className="w-[27px] h-[27px] rounded-[8px] shrink-0 flex items-center justify-center" style={{ border: "1px dashed #7D67D9", background: "#F4F1FB" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#54409B" strokeWidth="2" strokeLinecap="round">
                <path d="M3 8h3l2-2h8l2 2h3v11H3z" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#221E1A" }}>Vitamin D · 32 ng/mL</span>
              <span className="block mt-[3px] text-[12px] leading-[1.35] whitespace-nowrap" style={{ color: "#6B6358" }}>read from photo · added to history</span>
            </span>
          </span>
          <span className="flex flex-col gap-[6px]">
            {[
              { name: "Ferritin", markerPct: 48, val: "86" },
              { name: "HbA1c", markerPct: 34, val: "5.4" },
            ].map((r) => (
              <span key={r.name} className="flex items-center gap-[7px]">
                <span className="flex-1 min-w-0 text-[11.5px] font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#221E1A" }}>{r.name}</span>
                <span className="relative w-[56px] h-[5px] rounded-full shrink-0" style={{ background: "#EFEAFB" }}>
                  <span className="absolute top-0 bottom-0 rounded-full" style={{ left: "22%", right: "22%", background: "#D9CEF6" }} />
                  <span className="absolute rounded-full" style={{ top: -2, left: `${r.markerPct}%`, width: 5, height: 9, background: "#4E3894" }} />
                </span>
                <span className="text-[11.5px] font-extrabold whitespace-nowrap" style={{ color: "#4E3894" }}>{r.val}</span>
              </span>
            ))}
          </span>
        </div>
        <ModInfo label="BIOMARKERS" badge="MEDICAL LOG" badgeBg="#F4F1FB" badgeInk="#54409B" capInk="#2F5F58" capPlate="#EDF4F3" capBorder="#5E9E95">
          Track and record medical history straight into history.
        </ModInfo>
      </ModCard>
    </div>
  </BrowserMockup>
);

const COMMUNITY_RAIL: RailItem[] = [
  { label: "Habits", active: true },
  { label: "Journal" },
  { label: "Clients" },
  { label: "Gyms" },
];

const CommunityMockup: React.FC = () => (
  <BrowserMockup url="app.centium.health/community" border="#D8EAE6" headerBg="#EDF4F3" railActive="#2F5F58" railInactiveDot="#D8EAE6" railInk="#6B6358" railItems={COMMUNITY_RAIL}>
    <div className="flex flex-wrap items-start justify-between gap-[10px]">
      <div className="min-w-0">
        <div className="text-[16px] font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Habits</div>
        <div className="mt-[3px] text-[12px] leading-[1.4] whitespace-nowrap" style={{ color: "#6B6358" }}>4 of 5 done · 18-day streak</div>
      </div>
      <div className="flex flex-wrap gap-[5px] shrink min-w-0">
        <span className="px-[8px] py-[3px] rounded-full text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#2F5F58", color: "#fff" }}>Habits</span>
        <span className="px-[8px] py-[3px] rounded-full text-[12px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#33665E" }}>Journal</span>
      </div>
    </div>

    <div
      data-mod-grid
      className="grid min-w-0"
      style={{ flex: "1 1 auto", alignContent: "stretch", alignItems: "stretch", gridTemplateColumns: "repeat(auto-fit,minmax(min(420px,100%),1fr))", gap: 6 }}
    >
      {/* Module 1 — Habits & streaks */}
      <ModCard border="#D8EAE6">
        <div data-mod-ui className="grid gap-[5px] min-w-0" style={{ gridAutoRows: "1fr", alignItems: "stretch", flex: "0 1 210px", height: 114 }}>
          {[
            { name: "Morning walk", days: [1, 1, 1, 1, 1, 1, 1], streak: "7 d" },
            { name: "Protein target", days: [1, 1, 1, 1, 1, 1, 0], streak: "18 d" },
            { name: "Sleep by 11pm", days: [1, 1, 1, 1, 0, 0, 0], streak: "4 d" },
          ].map((row) => (
            <span key={row.name} className="flex items-center justify-between gap-[8px]">
              <span className="text-[12px] font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#221E1A" }}>{row.name}</span>
              <span className="flex gap-[3px] shrink-0">
                {row.days.map((d, i) => (
                  <span key={i} className="w-[7px] h-[7px] rounded-full" style={{ background: d ? "#33665E" : "#E4F0ED" }} />
                ))}
              </span>
              <span className="text-[12px] font-extrabold whitespace-nowrap shrink-0" style={{ color: "#33665E" }}>{row.streak}</span>
            </span>
          ))}
          <span aria-hidden="true" className="relative flex items-start justify-between">
            <span className="absolute rounded-full" style={{ left: "16.667%", right: "16.667%", top: 4, height: 3, background: "#CFE4DF" }} />
            <span className="absolute rounded-full" style={{ left: "16.667%", top: 5, width: "33.333%", height: 3, background: "#2F5F58" }} />
            {[
              { label: "7d", filled: true, ring: false },
              { label: "18d", filled: true, ring: true },
              { label: "30d", filled: false, ring: false },
            ].map((m) => (
              <span key={m.label} className="relative flex-1 flex flex-col items-center gap-[3px]">
                <span
                  className="w-[11px] h-[11px] rounded-full"
                  style={{
                    background: m.filled ? "#2F5F58" : "#FFFFFF",
                    boxShadow: m.filled ? (m.ring ? "0 0 0 3px rgba(47,95,88,.22)" : "none") : "inset 0 0 0 2px #CFE4DF",
                  }}
                />
                <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: m.filled ? "#2F5F58" : "#6B6358" }}>{m.label}</span>
              </span>
            ))}
          </span>
        </div>
        <ModInfo label="HABITS & STREAKS" badge="18-DAY" badgeBg="#EDF4F3" badgeInk="#33665E" capInk="#54409B" capPlate="#F4F1FB" capBorder="#7D67D9">
          Habits and streaks that hold the routine together.
        </ModInfo>
      </ModCard>

      {/* Module 2 — Journal */}
      <ModCard border="#D8EAE6">
        <div data-mod-ui className="grid gap-[5px] min-w-0" style={{ gridAutoRows: "1fr", alignItems: "stretch", flex: "0 1 210px", height: 114 }}>
          <span className="flex flex-wrap" style={{ gap: "4px 3px" }}>
            {["Personal", "Training", "Nutrition", "General"].map((t, i) => (
              <span
                key={t}
                className="px-[7px] rounded-t-[6px] text-[12px] font-extrabold whitespace-nowrap"
                style={{ paddingTop: i === 0 ? 2 : 3, paddingBottom: i === 0 ? 2 : 3, background: i === 0 ? "#33665E" : "#EDF4F3", color: i === 0 ? "#fff" : "#33665E" }}
              >
                {t}
              </span>
            ))}
          </span>
          <span className="flex flex-col gap-[2px] px-[8px] py-[4px]" style={{ border: "1px solid #D8EAE6", borderRadius: "0 8px 8px 8px" }}>
            <span className="text-[12px] font-bold" style={{ color: "#221E1A" }}>Felt strong on the last set</span>
            <span className="block h-[3px] rounded-full" style={{ width: "86%", background: "#E4F0ED" }} />
            <span className="block h-[3px] rounded-full" style={{ width: "64%", background: "#E4F0ED" }} />
          </span>
          <span aria-hidden="true" className="flex gap-[2px]">
            {["#7FB3AA", "#EDF4F3", "#2F5F58", "#BFD9D3", "#7FB3AA", "#2F5F58", "#EDF4F3", "#BFD9D3", "#2F5F58", "#7FB3AA", "#EDF4F3", "#7FB3AA", "#2F5F58", "#BFD9D3"].map((c, i) => (
              <span key={i} className="flex-1 min-w-0 h-[13px] rounded-[2px]" style={{ background: c }} />
            ))}
          </span>
        </div>
        <ModInfo label="JOURNAL" badge="4 FOLDERS" badgeBg="#EDF4F3" badgeInk="#33665E" capMin={230} capInk="#54409B" capPlate="#F4F1FB" capBorder="#7D67D9">
          A journal log to jot down personal, training, nutrition and general accomplishments.
        </ModInfo>
      </ModCard>

      {/* Module 3 — Client roster */}
      <ModCard border="#D8EAE6">
        <div data-mod-ui className="grid gap-[5px] min-w-0" style={{ gridAutoRows: "1fr", alignItems: "stretch", flex: "0 1 210px", height: 114 }}>
          {[
            { initials: "JD", name: "Jane D.", status: "logged" },
            { initials: "JD", name: "John D.", status: "logged" },
            { initials: "JR", name: "Jane R.", status: "pending" },
          ].map((row, i) => (
            <span key={i} className="flex items-center gap-[7px]">
              <span className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center text-[12px] font-extrabold" style={{ background: "#EDF4F3", color: "#33665E" }}>{row.initials}</span>
              <span className="flex-1 min-w-0 text-[12px] font-bold whitespace-nowrap" style={{ color: "#221E1A" }}>{row.name}</span>
              <span className="text-[12px] font-extrabold whitespace-nowrap" style={{ color: row.status === "logged" ? "#33665E" : "#6B6358" }}>{row.status}</span>
            </span>
          ))}
          <span className="flex justify-between gap-[6px] pt-[6px]" style={{ borderTop: "1px solid #D8EAE6" }}>
            <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: "#6B6358" }}>2 logged today</span>
            <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: "#6B6358" }}>1 pending</span>
          </span>
        </div>
        <ModInfo label="CLIENT ROSTER" badge="12 CLIENTS" badgeBg="#EDF4F3" badgeInk="#33665E" capInk="#54409B" capPlate="#F4F1FB" capBorder="#7D67D9">
          Client rosters with roster stats for professionals.
        </ModInfo>
      </ModCard>

      {/* Module 4 — Explore (gyms) */}
      <ModCard border="#D8EAE6">
        <div data-mod-ui className="grid gap-[5px] min-w-0" style={{ gridAutoRows: "1fr", alignItems: "stretch", flex: "0 1 210px", height: 114 }}>
          <span className="flex items-center gap-[8px] min-w-0">
            <span className="w-[23px] h-[23px] rounded-[7px] shrink-0 flex items-center justify-center" style={{ background: "#EDF4F3" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#33665E" strokeWidth="2" strokeLinecap="round">
                <path d="M3 21V8l9-5 9 5v13" />
                <path d="M9 21v-6h6v6" />
              </svg>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-bold whitespace-nowrap" style={{ color: "#221E1A" }}>Anytown Fitness Co.</span>
              <span className="block mt-[3px] text-[12px] leading-[1.4] whitespace-nowrap" style={{ color: "#6B6358" }}>591 members reached</span>
            </span>
            <span className="w-[24px] h-[14px] rounded-full shrink-0 flex items-center justify-end" style={{ background: "#33665E", padding: "0 2px" }}>
              <span className="w-[10px] h-[10px] rounded-full bg-white" />
            </span>
          </span>
          <span aria-hidden="true" className="flex items-center gap-[10px]">
            <svg viewBox="0 0 46 46" className="w-[36px] h-[36px] shrink-0 block">
              <circle cx="23" cy="23" r="21" fill="none" stroke="#D8EAE6" strokeWidth="1.5" />
              <circle cx="23" cy="23" r="13" fill="none" stroke="#D8EAE6" strokeWidth="1.5" />
              <circle cx="23" cy="23" r="3.4" fill="#2F5F58" />
              <circle cx="34" cy="16" r="3" fill="#5E9E95" />
              <circle cx="14" cy="31" r="3" fill="#5E9E95" />
              <circle cx="31" cy="34" r="2.6" fill="#93C1B9" />
            </svg>
            <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
              <span className="text-[13px] font-extrabold whitespace-nowrap" style={{ color: "#221E1A" }}>4 venues · 3 km</span>
              <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: "#2F5F58" }}>18 classes/wk</span>
            </span>
          </span>
          <span aria-hidden="true" className="flex items-center gap-[5px] flex-wrap">
            {["drop-in", "open now", "from $12"].map((c) => (
              <span key={c} className="px-[7px] py-[2px] rounded-full text-[11px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#2F5F58" }}>{c}</span>
            ))}
          </span>
        </div>
        <ModInfo label="EXPLORE" badge="ACTIVE" badgeBg="#EDF4F3" badgeInk="#33665E" capMin={236} capInk="#54409B" capPlate="#F4F1FB" capBorder="#7D67D9">
          Connect and join gyms, classes and browse a wide selection of items in a curated marketplace.
        </ModInfo>
      </ModCard>
    </div>
  </BrowserMockup>
);

const pillars: PillarData[] = [
  {
    eyebrowNum: "01",
    ink: "#4E3894",
    accent: "#7D67D9",
    wash: "linear-gradient(150deg,#F8F6FE 0%,#F2EDFC 52%,#EFF6F4 100%)",
    titleGradient: "linear-gradient(96deg,#4E3894 0%,#7D67D9 62%,#A895E0 100%)",
    titleWord: "Nutrition",
    h3: "Meal logging, made effortless.",
    mockup: <NutritionMockup />,
  },
  {
    eyebrowNum: "02",
    ink: "#2F5F58",
    accent: "#5E9E95",
    wash: "linear-gradient(150deg,#F3F9F7 0%,#EDF6F3 52%,#F5F2FD 100%)",
    titleGradient: "linear-gradient(96deg,#2F5F58 0%,#5E9E95 62%,#93C1B9 100%)",
    titleWord: "Training",
    h3: "Train today. Track yesterday. Progress tomorrow.",
    mockup: <TrainingMockup />,
  },
  {
    eyebrowNum: "03",
    ink: "#54409B",
    accent: "#7D67D9",
    wash: "linear-gradient(150deg,#F7F5FE 0%,#F1EEFC 48%,#EEF6F3 100%)",
    titleGradient: "linear-gradient(96deg,#54409B 0%,#7D67D9 62%,#AE9DE4 100%)",
    titleWord: "Health",
    h3: "Your health, always at the forefront.",
    mockup: <HealthMockup />,
  },
  {
    eyebrowNum: "04",
    ink: "#33665E",
    accent: "#5E9E95",
    wash: "linear-gradient(150deg,#F2F9F6 0%,#ECF6F2 50%,#F4F2FD 100%)",
    titleGradient: "linear-gradient(96deg,#33665E 0%,#5E9E95 62%,#93C1B9 100%)",
    titleWord: "Community",
    h3: "One ecosystem. Every specialist.",
    mockup: <CommunityMockup />,
  },
];

// PersonaArc owns each persona's graphic internally, keyed by title (see
// PersonaArc.tsx's PERSONA_ART) since each graphic is tightly coupled to
// that card's specific animation — no `art` field needed here.
const personas: PersonaData[] = [
  { title: "Principled", accent: "#6A54C4", description: "Shows up, puts in the work, and wants a platform that keeps up." },
  { title: "Determined", accent: "#3F726D", description: "Knows where they want to go and wants everything connected to get there." },
  { title: "Intentional", accent: "#6A54C4", description: "Pays attention to the details that shape their health and wants them all in one place." },
  { title: "Proactive", accent: "#3F726D", description: "Wants to understand their health, act on it, and keep moving forward." },
];

/** Pricing section heading. The v4 handoff's mirrored leaf-stem accents that
 *  used to flank it are gone in v5 — its own markup has no such shape. */
const PricingHeading: React.FC = () => {
  return (
    <Reveal className="relative text-center max-w-[820px] mx-auto mb-11">
      <div className="relative">
        <Eyebrow className="mx-auto">PRICING</Eyebrow>
        <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px]">
          Whatever your role, Centium fits.
        </h2>
        <p className="text-base leading-relaxed text-mkt-soft mt-[18px]">One app instead of a stack of subscriptions.</p>
      </div>
    </Reveal>
  );
};

export const Home: React.FC = () => {
  useSEO(
    "Your health, all in one place",
    "Centium brings nutrition tracking, workout logging, health tracking and community into one place."
  );
  // README §4.4/§6.5: isOccluded must read refs, not stale props — a plain
  // function closing over these refs, recreated only if the refs themselves
  // changed (they don't), so useHeroFlow always calls the latest state.
  // Loader detection reuses the same DOM-query pattern useNavHeroGlass uses
  // for #hero-band/#reviews-belt, since BrandLoader owns its own dismiss
  // timing internally and exposes no prop/state to read it by. Nav-jump
  // detection listens for the same NAV_JUMP_EVENT Nav.tsx already dispatches
  // around its own long (>1.2x viewport) smooth-scroll jumps. A routed
  // screen (Contact/Legal) covering the hero needs no separate check here:
  // those are real React Router routes in this codebase, so Home — and the
  // canvas's effect — fully unmounts on navigation instead of continuing to
  // run underneath an overlay.
  const navJumpingRef = useRef(false);
  useEffect(() => {
    const onNavJump = (e: Event) => {
      navJumpingRef.current = !!(e as CustomEvent<{ active: boolean }>).detail?.active;
    };
    window.addEventListener(NAV_JUMP_EVENT, onNavJump);
    return () => window.removeEventListener(NAV_JUMP_EVENT, onNavJump);
  }, []);
  const isOccluded = useCallback(() => !!document.querySelector(".cent-loader-lockup") || navJumpingRef.current, []);

  // README §7: tier-1 degrade must strip backdrop-filter from EVERY
  // [data-glassy] element (nav pill, Log in, burger, AND Request a Demo),
  // not just the hero's own CTA — moved here from inside the canvas hook so
  // it's an external callback the hook fires once, matching the design's own
  // architecture (initHeroFlow calls out to the page, it doesn't reach into
  // the nav itself).
  const onDegradeGlass = useCallback(() => {
    document.querySelectorAll<HTMLElement>("[data-glassy]").forEach((el) => {
      el.style.backdropFilter = "none";
      (el.style as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter = "none";
      const solid = el.getAttribute("data-glassy-fallback");
      if (solid) el.style.background = solid;
    });
  }, []);

  // README §2/§3 row 9: "Get Started" smooth-scrolls to #cta (the final CTA
  // section further down this same page) instead of routing to /app. The
  // 88px nav offset is already the existing `scroll-mt-[88px]` on that
  // section (see its <Section id="cta"> below) rather than a duplicated
  // offset constant here.
  const onGetStarted = useCallback(() => {
    document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      <BrandLoader />

      <HeroSection isOccluded={isOccluded} onDegradeGlass={onDegradeGlass} onGetStarted={onGetStarted} />

      {/* Problem */}
      <Section className="bg-white" style={{ paddingTop: "clamp(40px,5vw,64px)", paddingBottom: "clamp(72px,8vw,96px)" }}>
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-24 items-center">
          <Reveal>
            <Eyebrow tone="teal">THE PROBLEM</Eyebrow>
            <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px]">
              One hub, not another app to manage.
            </h2>
            <p className="text-[17px] leading-relaxed text-mkt-soft mt-5 max-w-[460px]">
              Health shouldn't feel like a chore. No more jumping between apps, subscriptions and platforms just
              to keep track of your progress. Centium brings it all together in one place, so you can spend less
              time managing your health and more time improving it.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <ProblemList items={legacyApps} />
          </Reveal>
        </div>
      </Section>

      {/* Platform — pinned four-pillar scroll-scrubbed rail. The heading
          lives *inside* PillarRail's own sticky section (not a separate
          block above it) — regression fix: the handoff pins the heading and
          the rail together at top:72px as one unit, never vertically
          centering it, which an earlier build never carried over. */}
      <PillarRail
        pillars={pillars}
        heading={
          <Reveal>
            <Eyebrow>THE PLATFORM</Eyebrow>
            <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[10px] max-w-[860px]">
              Everything health,
              <br />
              together.{" "}
              <span className="font-normal text-base leading-relaxed tracking-normal text-mkt-soft">
                Four pillars in one place to check in on, and one history that keeps them connected.
              </span>
            </h2>
          </Reveal>
        }
      />

      {/* FAQ → Who it's for → Beyond the Individual → Pricing → Closing CTA
          share one background that fades to solid white by 34% and stays
          white the rest of the way. Regression fix: this previously carried
          a much busier multi-stop gradient (green fading into purple) left
          over from an earlier round — its purple tail sat directly behind
          the footer's own colour-wash layer (which bleeds up from the
          footer, per Footer.tsx), so the two competed visibly right around
          the "Ready to bring it all together?" heading. The footer expects
          plain white underneath it, per the handoff. */}
      <div
        style={{
          background: "linear-gradient(#FBFAF8 0%,#FDFCFB 14%,#FFFFFF 34%,#FFFFFF 100%)",
        }}
      >
        {/* v7 landing handoff §5.5: bottom padding tightened on 23 Sep to
            close the gap before "Who it's for" — asymmetric, not the
            Section default's equal top/bottom rhythm. */}
        <Section
          id="faq"
          className="bg-transparent scroll-mt-[88px]"
          style={{ paddingTop: "clamp(80px,7vw,112px)", paddingBottom: "clamp(36px,3.6vw,52px)" }}
        >
          <Reveal className="mb-11">
            <Eyebrow tone="teal">FAQ</Eyebrow>
            <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px]">
              Questions, answered.
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="max-w-[600px] mx-auto">
            <FaqAccordion items={faqItems} />
          </Reveal>
        </Section>

        {/* Who it's for — persona arc. Regression fix: the heading now
            lives inside PersonaArc's own sticky section (see its own
            comment) instead of sitting above it as a separate, unpinned
            block — and the bottom padding is the handoff's actual
            clamp(28px,3vw,40px) (the tight seam into "Beyond the
            individual"), not the generic section rhythm value this
            previously had. */}
        <PersonaArc
          personas={personas}
          heading={
            <Reveal>
              <Eyebrow>WHO IT'S FOR</Eyebrow>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px] max-w-[560px]">
                Built for people who show up.
              </h2>
            </Reveal>
          }
        />

        {/* Beyond the individual — a drag slider between the professionals
            and business audiences (see components/Ecosystem.tsx). The
            v4-era static two-card grid this replaces carried placeholder
            copy/numbers (Nadine Khalil/Sami Rahal/Yara Bou Saab, a plain
            check-ins bar chart) that the v5 handoff's own `.dc.html`
            supersedes with a KPI dashboard (members/MRR/retention/ARPM/
            visits-per-week), class occupancy and the literal John/Jane/
            Richard Doe/Roe roster — Ecosystem.tsx owns all of that now.
            Top padding stays at the v4 handoff's tightened
            clamp(26px,2.8vw,38px) (a past regression fix for the seam with
            PersonaArc above) since the v5 `.dc.html`'s own section padding
            (`0 0 clamp(56px,6vw,72px)`) assumes spacing comes from the
            *previous* section instead, which this codebase gets from
            PersonaArc's own bottom padding, not from here. */}
        <Ecosystem
          heading={
            <Reveal>
              <Eyebrow tone="teal">BEYOND THE INDIVIDUAL</Eyebrow>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px] max-w-[600px]">
                The ecosystem built around your health.
              </h2>
            </Reveal>
          }
        />

        {/* Pricing preview. rendered/08*.html: padding is
            `clamp(48px,6vw,72px) 0 clamp(28px,3vw,40px)` — the bottom value
            was previously stretched to clamp(72px,8vw,96px), which stacked
            on top of the CTA section's own (already-fixed) increased top
            padding below and doubled up the gap the 23 Sep fix already
            supplies. Use the section's own literal bottom padding instead
            of also padding it out here. */}
        <section id="pricing" className="py-[clamp(48px,6vw,72px)] pb-[clamp(28px,3vw,40px)] scroll-mt-[88px]">
          <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
            <PricingHeading />
            <Reveal delay={0.08}>
              <PlanPicker plans={homePlans} defaultSelected={1} />
            </Reveal>
          </div>
        </section>

        {/* Final CTA — v7 landing handoff §5.9: top padding increased twice
            on 23 Sep at the user's request, to separate the CTA from the
            pricing cards. Asymmetric, not the Section default. */}
        <Section
          id="cta"
          className="bg-transparent text-center scroll-mt-[88px]"
          style={{ paddingTop: "clamp(176px,18vw,256px)", paddingBottom: "clamp(92px,9.5vw,135px)" }}
        >
          <Reveal className="flex flex-col items-center">
            <h2 className="font-display font-extrabold text-[34px] sm:text-[52px] leading-[1.08] tracking-[-.032em] text-mkt-ink max-w-[620px]">
              Ready to bring it all together?
            </h2>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                to="/app"
                className="tap px-8 py-4 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] transition-colors"
              >
                Get Started
              </Link>
              <Link
                to="/contact"
                className="tap px-[26px] py-4 rounded-full font-semibold text-[15px] text-mkt-ink transition-[background-color,border-color] duration-200"
                style={{
                  border: "1px solid rgba(255,255,255,.72)",
                  background: "rgba(255,255,255,.42)",
                  backdropFilter: "blur(16px) saturate(1.7)",
                  boxShadow: "0 10px 28px rgba(72,58,130,.12), inset 0 1px 0 rgba(255,255,255,.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(94,158,149,.16)";
                  e.currentTarget.style.borderColor = "#5E9E95";
                  e.currentTarget.style.color = "#2F5F58";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,.42)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,.72)";
                  e.currentTarget.style.color = "";
                }}
              >
                Request a Demo
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5 mt-[22px]">
              <span className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-mkt-ink/10 bg-white/70">
                <span className="flex text-mkt-accent-hover">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M16.6 12.9c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.2 0 1.9-1.1 2.6-2.1.8-1.2 1.1-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.3zM14.6 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1 1.7-.9 2.6 1 .1 2-.5 2.6-1.2z" />
                  </svg>
                </span>
                <span className="flex flex-col leading-[1.1] text-left">
                  <span className="text-[9px] font-semibold text-mkt-faint">Coming soon</span>
                  <span className="text-[12.5px] font-bold text-mkt-ink">App Store</span>
                </span>
              </span>
              <span className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-mkt-ink/10 bg-white/70">
                <span className="flex text-mkt-accent-hover">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M4 3.5v17c0 .5.5.8.9.6l9.3-5.3-3-3L4 3.5zM15.6 14.1l2.9-1.6c.6-.4.6-1.3 0-1.6l-2.9-1.7-3 3.1 3 1.8zM4.9 2.3l8.7 8.8-2.4 2.4L4.9 2.3z" />
                  </svg>
                </span>
                <span className="flex flex-col leading-[1.1] text-left">
                  <span className="text-[9px] font-semibold text-mkt-faint">Coming soon</span>
                  <span className="text-[12.5px] font-bold text-mkt-ink">Google Play</span>
                </span>
              </span>
            </div>
          </Reveal>
        </Section>
      </div>
    </>
  );
};
