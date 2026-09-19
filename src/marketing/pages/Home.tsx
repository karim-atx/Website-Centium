import React from "react";
import { Link } from "react-router-dom";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { PillarRail, type PillarData } from "../components/PillarRail";
import { BrowserMockup } from "../components/BrowserMockup";
import { PersonaArc, type PersonaData } from "../components/PersonaArc";
import { PlanPicker, type Plan } from "../components/PlanPicker";
import { FaqAccordion, type FaqItem } from "../components/FaqAccordion";
import { ProblemList, type ProblemItem } from "../components/ProblemList";
import { ReviewsConveyor, type Review } from "../components/ReviewsConveyor";
import { Ecosystem } from "../components/Ecosystem";
import { BrandLoader } from "../components/BrandLoader";
import { useHeroFlow } from "../hooks/useHeroFlow";
import { useHeroSubtextPlacement } from "../hooks/useHeroSubtextPlacement";
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

const reviews: Review[] = [
  { initials: "JD", name: "Jane Doe", role: "General User", tone: "primary", quote: "Nutrition goals that adapt to you, not the other way around." },
  { initials: "JD", name: "John Doe", role: "Athlete", tone: "teal", quote: "Every set, every rep, every metric, tracked live." },
  { initials: "JR", name: "Jane Roe", role: "Dietitian", tone: "primary", quote: "Your clients, your plans, one seamless system." },
  { initials: "JR", name: "John Roe", role: "General User", tone: "teal", quote: "One place to understand, manage and improve your health." },
  { initials: "JP", name: "Jane Poe", role: "Personal Trainer", tone: "primary", quote: "Manage everything from health data to workouts and nutrition." },
  { initials: "JP", name: "John Poe", role: "General User", tone: "teal", quote: "Log less, eat better." },
];

// Literal figures from the v5 handoff's own `homePlans` data (`.dc.html`
// line ~1736) — a previous round's placeholder prices ($30/$15/$100) are
// superseded here. Yearly totals are the handoff's own literal −15% figures,
// not derived at runtime (see PlanPicker's own note on `yearlyPrice`: e.g.
// $15×12×0.85 = $153, not the handoff's $149).
const homePlans: Plan[] = [
  {
    key: "professionals",
    name: "Professionals",
    description: "Manage your entire roster, while keeping every experience personal.",
    monthly: 15,
    unit: "/ month",
    prefix: "Starting at",
    yearlyPrice: 149,
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
    yearlyPrice: 99,
    yearlyUnit: "/ yr",
    features: ["Nutrition & workout logging", "Health tracking & trends", "Connected Community & Experts"],
    ctaLabel: "Get Started",
  },
  {
    key: "business",
    name: "Business",
    description: "Unlock new opportunities. Scale your business with Centium.",
    monthly: 79,
    unit: "per month + rev share",
    yearlyPrice: 799,
    yearlyUnit: "/ yr + rev share",
    features: ["Marketplace Visibility", "Team Operations", "Growth Analytics"],
    ctaLabel: "Talk to us",
  },
];

// ---------------------------------------------------------------------------
// Platform pillar graphics + browser-chrome mockups
//
// Regression fix: these previously reused the hero's large phone-shell
// mockups and a ~78px graphic scale. The actual handoff markup
// (`Centium Landing.dc.html`) uses a much more compact browser-window
// device (BrowserMockup, 430px max-width) and ~44-52px inline graphics —
// ported 1:1 from the .dc.html rather than the earlier, larger reproduction.
// ---------------------------------------------------------------------------

const NutritionGraphic: React.FC = () => (
  <>
    <span
      className="relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center"
      style={{ background: "conic-gradient(#4E3894 0turn .30turn,#7D67D9 .30turn .75turn,#5E9E95 .75turn 1turn)" }}
    >
      <span className="absolute inset-[13px] rounded-full bg-white flex items-center justify-center text-[11px] font-extrabold" style={{ color: "#4E3894" }}>
        2340
      </span>
    </span>
    <span className="flex flex-col gap-2 flex-1 min-w-0">
      {[
        { color: "#4E3894", pct: 78, label: "30%" },
        { color: "#7D67D9", pct: 62, label: "45%" },
        { color: "#5E9E95", pct: 44, label: "25%", labelColor: "#2F5F58" },
      ].map((row) => (
        <span key={row.label} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: row.color }} />
          <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#F4F1FB" }}>
            <span className="block h-full" style={{ width: `${row.pct}%`, background: row.color }} />
          </span>
          <span className="text-[10px] font-extrabold whitespace-nowrap" style={{ color: row.labelColor || row.color }}>
            {row.label}
          </span>
        </span>
      ))}
    </span>
  </>
);

const NutritionMockup: React.FC = () => (
  <BrowserMockup url="app.centium.health/nutrition" border="#E4DCF8" headerBg="#F4F1FB" railActive="#7D67D9" railInactive="#F4F1FB">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Today</div>
        <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">1,842 / 2,340 kcal</div>
      </div>
      <div className="flex gap-1 shrink-0">
        <span className="px-[7px] py-[3px] rounded-full text-[8px] font-bold whitespace-nowrap" style={{ background: "#7D67D9", color: "#fff" }}>Log</span>
        <span className="px-[7px] py-[3px] rounded-full text-[8px] font-bold whitespace-nowrap" style={{ background: "#F6F3FD", color: "#4E3894" }}>Meal Prep</span>
      </div>
    </div>
    <div className="flex flex-col gap-1.5">
      {[
        { label: "Protein", val: "128 / 165 g", pct: 78, bar: "#4E3894" },
        { label: "Carbs", val: "196 / 260 g", pct: 75, bar: "#A895E0" },
        { label: "Fat", val: "48 / 65 g", pct: 74, bar: "#5E9E95" },
      ].map((row) => (
        <div key={row.label} className="flex flex-col gap-[3px]">
          <div className="flex justify-between gap-1.5">
            <span className="text-[9px] font-semibold text-[#5B5349] whitespace-nowrap">{row.label}</span>
            <span className="text-[9px] font-extrabold text-mkt-ink whitespace-nowrap">{row.val}</span>
          </div>
          <div className="h-1 rounded-full" style={{ background: "#F4F1FB" }}>
            <span className="block h-full rounded-full" style={{ width: `${row.pct}%`, background: row.bar }} />
          </div>
        </div>
      ))}
    </div>
    <div className="flex flex-col gap-[5px]">
      {[
        { title: "Breakfast", meta: "38P · 62C · 12F", kcal: "512" },
        { title: "Lunch", meta: "52P · 74C · 18F", kcal: "686" },
      ].map((row) => (
        <div key={row.title} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5" style={{ border: "1px solid #E4DCF8" }}>
          <span className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap overflow-hidden text-ellipsis min-w-0">{row.title}</span>
          <span className="text-[8.5px] text-[#5B5349] whitespace-nowrap shrink-0">{row.meta}</span>
          <span className="text-[8px] font-bold whitespace-nowrap shrink-0" style={{ color: "#4E3894" }}>{row.kcal}</span>
        </div>
      ))}
    </div>
  </BrowserMockup>
);

const TrainingGraphic: React.FC = () => (
  <>
    <span className="flex items-center justify-center gap-[5px] shrink-0 w-[108px] h-16">
      <span className="w-[15px] h-[52px] rounded" style={{ background: "#2F5F58" }} />
      <span className="w-2.5 h-[34px] rounded-sm" style={{ background: "#5E9E95" }} />
      <span className="flex-1 h-2 rounded-full" style={{ background: "#3B352D" }} />
      <span className="w-2.5 h-[34px] rounded-sm" style={{ background: "#5E9E95" }} />
      <span className="w-[15px] h-[52px] rounded" style={{ background: "#2F5F58" }} />
    </span>
    <span className="flex flex-col gap-[7px] flex-1 min-w-0">
      <span className="flex items-end gap-[5px] h-[30px]">
        {[
          { h: 38, o: 0.3 },
          { h: 52, o: 0.45 },
          { h: 46, o: 0.38 },
          { h: 70, o: 0.62 },
          { h: 86, o: 0.8 },
          { h: 100, o: 1 },
        ].map((bar, i) => (
          <span
            key={i}
            className="flex-1 rounded"
            style={{ height: `${bar.h}%`, background: i === 5 ? "#2F5F58" : "#5E9E95", opacity: bar.o }}
          />
        ))}
      </span>
      <span className="flex gap-1.5">
        {["4 × 8", "RPE 8", "82.5 kg"].map((chip) => (
          <span key={chip} className="px-2 py-[3px] rounded-full text-[9.5px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#2F5F58" }}>
            {chip}
          </span>
        ))}
      </span>
    </span>
  </>
);

const TrainingMockup: React.FC = () => (
  <BrowserMockup url="app.centium.health/training" border="#D8EAE6" headerBg="#EDF4F3" railActive="#5E9E95" railInactive="#EDF4F3">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Push Day</div>
        <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">Session 41:08 · 8,420 kg</div>
      </div>
      <div className="flex gap-1 shrink-0">
        <span className="px-[7px] py-[3px] rounded-full text-[8px] font-bold whitespace-nowrap" style={{ background: "#5E9E95", color: "#fff" }}>Live</span>
        <span className="px-[7px] py-[3px] rounded-full text-[8px] font-bold whitespace-nowrap" style={{ background: "#F0F7F5", color: "#2F5F58" }}>History</span>
      </div>
    </div>
    <div className="flex flex-col gap-[5px]">
      {[
        { name: "Bench Press", meta: "4 × 8 · 82.5 kg", rpe: "RPE 8" },
        { name: "Incline DB Press", meta: "3 × 10 · 30 kg", rpe: "RPE 7" },
        { name: "Cable Fly", meta: "3 × 12 · 17.5 kg", rpe: "RPE 9" },
      ].map((row) => (
        <div key={row.name} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5" style={{ border: "1px solid #D8EAE6" }}>
          <span className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap overflow-hidden text-ellipsis min-w-0">{row.name}</span>
          <span className="text-[8.5px] text-[#5B5349] whitespace-nowrap shrink-0">{row.meta}</span>
          <span className="text-[8px] font-bold whitespace-nowrap shrink-0" style={{ color: "#2F5F58" }}>{row.rpe}</span>
        </div>
      ))}
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-[8px] font-bold tracking-[.14em]" style={{ color: "#8C8378" }}>VOLUME · 6 WEEKS +14%</span>
      <span className="flex items-end gap-1 h-[26px]">
        {[
          { h: 38, o: 0.3 },
          { h: 52, o: 0.4 },
          { h: 46, o: 0.5 },
          { h: 70, o: 0.6 },
          { h: 86, o: 0.7 },
          { h: 100, o: 1 },
        ].map((bar, i) => (
          <span key={i} className="flex-1 rounded" style={{ height: `${bar.h}%`, background: i === 5 ? "#2F5F58" : "#5E9E95", opacity: bar.o }} />
        ))}
      </span>
    </div>
  </BrowserMockup>
);

const HealthGraphic: React.FC = () => (
  <>
    <span className="relative w-[52px] h-[52px] shrink-0 rounded-full flex items-center justify-center" style={{ border: "6px solid #F4F1FB" }}>
      <span
        className="absolute -inset-1.5 rounded-full"
        style={{ border: "6px solid #7D67D9", borderRightColor: "transparent", borderBottomColor: "transparent", transform: "rotate(24deg)" }}
      />
      <span className="text-[14px] font-extrabold" style={{ color: "#54409B" }}>84</span>
    </span>
    <span className="flex flex-col gap-[9px] flex-1 min-w-0">
      <svg viewBox="0 0 200 48" className="w-full h-8" preserveAspectRatio="none">
        <polyline points="0,38 24,26 48,31 72,14 96,22 120,9 144,17 168,6 200,11" fill="none" stroke="#7D67D9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="0,44 24,40 48,42 72,36 96,39 120,33 144,37 168,31 200,34" fill="none" stroke="#54409B" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="flex gap-1.5">
        <span className="px-2 py-[3px] rounded-full text-[9.5px] font-extrabold whitespace-nowrap" style={{ background: "#F4F1FB", color: "#54409B" }}>9,412 steps</span>
        <span className="px-2 py-[3px] rounded-full text-[9.5px] font-extrabold whitespace-nowrap" style={{ background: "#F4F1FB", color: "#54409B" }}>74.6 kg</span>
      </span>
    </span>
  </>
);

const HealthMockup: React.FC = () => (
  <BrowserMockup url="app.centium.health/health" border="#E4DCF8" headerBg="#F4F1FB" railActive="#7D67D9" railInactive="#F4F1FB">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Steps</div>
        <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">9,412 · avg 8,640</div>
      </div>
      <div className="flex gap-1 shrink-0">
        <span className="px-[7px] py-[3px] rounded-full text-[8px] font-bold" style={{ background: "#7D67D9", color: "#fff" }}>D</span>
        <span className="px-[7px] py-[3px] rounded-full text-[8px] font-bold" style={{ background: "#F6F3FD", color: "#54409B" }}>W</span>
        <span className="px-[7px] py-[3px] rounded-full text-[8px] font-bold" style={{ background: "#F6F3FD", color: "#54409B" }}>M</span>
      </div>
    </div>
    <span className="flex items-end gap-1 h-[30px]">
      {[52, 68, 44, 86, 62, 100, 74].map((h, i) => (
        <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 5 ? "#7D67D9" : "#F4F1FB" }} />
      ))}
    </span>
    <div className="grid grid-cols-2 gap-[7px]">
      <div className="rounded-lg p-1.5" style={{ border: "1px solid #E4DCF8" }}>
        <div className="text-[7.5px] font-bold tracking-[.12em] text-mkt-faint">WEIGHT</div>
        <div className="text-[11px] font-extrabold text-mkt-ink">74.6 kg</div>
      </div>
      <div className="rounded-lg p-1.5" style={{ border: "1px solid #E4DCF8" }}>
        <div className="text-[7.5px] font-bold tracking-[.12em] text-mkt-faint">BODY FAT</div>
        <div className="text-[11px] font-extrabold text-mkt-ink">17.2%</div>
      </div>
    </div>
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5" style={{ border: "1px solid #E4DCF8" }}>
      <span className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap">Sleep score 84</span>
      <span className="text-[8.5px] text-mkt-faint whitespace-nowrap">7h 22m</span>
    </div>
  </BrowserMockup>
);

const CommunityGraphic: React.FC = () => (
  <>
    <span className="relative shrink-0 w-[88px] h-16">
      <span className="absolute w-[34px] h-[34px] rounded-full flex items-center justify-center text-[11px] font-extrabold text-white" style={{ left: 31, top: 0, background: "#33665E" }}>KD</span>
      <span className="absolute w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-extrabold text-white" style={{ left: 0, bottom: 2, background: "#5E9E95" }}>NF</span>
      <span className="absolute w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-extrabold text-white" style={{ right: 0, bottom: 2, background: "#7D67D9" }}>RH</span>
      <span className="absolute w-[26px] h-0.5 rounded-full" style={{ left: 19, top: 31, background: "#5E9E95", transform: "rotate(38deg)" }} />
      <span className="absolute w-[26px] h-0.5 rounded-full" style={{ right: 19, top: 31, background: "#5E9E95", transform: "rotate(-38deg)" }} />
      <span className="absolute w-[34px] h-0.5 rounded-full" style={{ left: 31, bottom: 15, background: "#EDF4F3" }} />
    </span>
    <span className="flex flex-col gap-[7px] flex-1 min-w-0">
      <span className="flex gap-[5px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="flex-1 h-[22px] rounded-[5px]" style={{ background: i < 4 ? "#33665E" : "#EDF4F3" }} />
        ))}
      </span>
      <span className="flex gap-1.5">
        <span className="px-2 py-[3px] rounded-full text-[9.5px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#33665E" }}>18-day streak</span>
        <span className="px-2 py-[3px] rounded-full text-[9.5px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#33665E" }}>12 clients</span>
      </span>
    </span>
  </>
);

const CommunityMockup: React.FC = () => (
  <BrowserMockup url="app.centium.health/community" border="#D8EAE6" headerBg="#EDF4F3" railActive="#5E9E95" railInactive="#EDF4F3">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Habits</div>
        <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">4 of 5 done · 18-day streak</div>
      </div>
      <div className="flex gap-1 shrink-0">
        <span className="px-[7px] py-[3px] rounded-full text-[8px] font-bold whitespace-nowrap" style={{ background: "#5E9E95", color: "#fff" }}>Habits</span>
        <span className="px-[7px] py-[3px] rounded-full text-[8px] font-bold whitespace-nowrap" style={{ background: "#F0F7F5", color: "#33665E" }}>Journal</span>
      </div>
    </div>
    <div className="flex flex-col gap-[5px]">
      {[
        { name: "Morning walk", meta: "7 days", status: "done" },
        { name: "Protein target", meta: "18 days", status: "done" },
        { name: "Sleep by 11pm", meta: "4 days", status: "open" },
      ].map((row) => (
        <div key={row.name} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5" style={{ border: "1px solid #D8EAE6" }}>
          <span className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap overflow-hidden text-ellipsis min-w-0">{row.name}</span>
          <span className="text-[8.5px] text-[#5B5349] whitespace-nowrap shrink-0">{row.meta}</span>
          <span className="text-[8px] font-bold whitespace-nowrap shrink-0" style={{ color: "#33665E" }}>{row.status}</span>
        </div>
      ))}
    </div>
    <div className="flex flex-wrap gap-1">
      {["Personal", "Training", "Nutrition", "General"].map((chip) => (
        <span key={chip} className="px-[7px] py-[3px] rounded-full text-[8px] font-bold whitespace-nowrap" style={{ background: "#F0F7F5", color: "#33665E" }}>
          {chip}
        </span>
      ))}
    </div>
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5" style={{ border: "1px solid #D8EAE6" }}>
      <span className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap">Rana H. · roster</span>
      <span className="text-[8.5px] text-mkt-faint whitespace-nowrap">12 clients</span>
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
    paragraph: "Your TDEE and macro split drive every target, and logging a meal takes one tap — with meal prep planned ahead in the same place.",
    bullets: [
      { color: "#5E9E95", text: "Editable macro sliders on your own TDEE" },
      { color: "#5E9E95", text: "Log a meal with its full protein, carb and fat split" },
      { color: "#5E9E95", text: "Plan the week ahead in Meal Prep" },
    ],
    graphic: <NutritionGraphic />,
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
    paragraph: "Named routines, live set logging and an RPE calculator — with total volume tracked through the session and charted over time.",
    bullets: [
      { color: "#7D67D9", text: "Log sets, reps and weight live during a session" },
      { color: "#7D67D9", text: "RPE calculator and a running session timer" },
      { color: "#7D67D9", text: "Volume progression charted under History" },
    ],
    graphic: <TrainingGraphic />,
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
    paragraph: "Steps, weight, body fat, sleep and biomarkers in one hub — daily, weekly and monthly, with averages that make the trend obvious.",
    bullets: [
      { color: "#5E9E95", text: "Steps by day, week or month with averages" },
      { color: "#5E9E95", text: "Tap to edit Weight and Body Fat" },
      { color: "#5E9E95", text: "Sleep score with REM, deep, light and awake" },
      { color: "#5E9E95", text: "Capture a biomarker by photo, straight into history" },
    ],
    graphic: <HealthGraphic />,
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
    paragraph: "Habits, journal and streaks keep you consistent — and professionals and gyms plug into the same system from their own side.",
    bullets: [
      { color: "#7D67D9", text: "Habits and streaks that hold the routine together" },
      { color: "#7D67D9", text: "A journal with Personal, Training, Nutrition and General folders" },
      { color: "#7D67D9", text: "Client rosters with roster stats for professionals" },
      { color: "#7D67D9", text: "Gym listings with an active toggle and members reached" },
    ],
    graphic: <CommunityGraphic />,
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
  const canvasRef = useHeroFlow();
  useHeroSubtextPlacement();

  return (
    <>
      <BrandLoader />

      {/* Hero + reviews conveyor share one gradient container, masked out
          toward the bottom so the seam into "The Problem" disappears — see
          the v3 handoff's own note that this must be a mask, not a white
          overlay, or a hard edge shows. #hero-band/#reviews-belt (rendered
          by ReviewsConveyor) are read by useNavHeroGlass to know when the
          nav should show its glass treatment. */}
      {/* Regression fix: the gradient + vertical fade previously lived
          directly on this wrapping div — but `mask-image` alpha-multiplies
          an element's *entire* rendered output, foreground included, so
          everything inside (the hero copy, and the review belt further
          down) inherited the same fade-to-transparent and read as washed
          out/barely visible by the time the mask reached ~80-100%. Per the
          handoff: "the gradient lives on an absolutely-positioned child
          that is masked out vertically" — the mask belongs on its own
          background-only layer, sibling to the real content, not on the
          content's own container. */}
      <div id="hero-band" className="relative bg-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(70% 42% at 50% 22%,#F6F3FC 0%,rgba(246,243,252,.72) 36%,rgba(246,243,252,0) 72%)," +
              "radial-gradient(58% 44% at 2% 60%,rgba(140,110,222,.34) 0%,rgba(140,110,222,0) 62%)," +
              "radial-gradient(58% 44% at 98% 60%,rgba(84,158,146,.34) 0%,rgba(84,158,146,0) 62%)," +
              "linear-gradient(90deg,#B49DEA 0%,#C4B7EC 24%,#D2D6E4 50%,#A8CFC6 76%,#8CC1B6 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom,#000 0%,#000 30%,rgba(0,0,0,.94) 42%,rgba(0,0,0,.82) 52%,rgba(0,0,0,.64) 62%,rgba(0,0,0,.44) 71%,rgba(0,0,0,.26) 79%,rgba(0,0,0,.12) 87%,rgba(0,0,0,.04) 94%,rgba(0,0,0,0) 100%)",
            maskImage:
              "linear-gradient(to bottom,#000 0%,#000 30%,rgba(0,0,0,.94) 42%,rgba(0,0,0,.82) 52%,rgba(0,0,0,.64) 62%,rgba(0,0,0,.44) 71%,rgba(0,0,0,.26) 79%,rgba(0,0,0,.12) 87%,rgba(0,0,0,.04) 94%,rgba(0,0,0,0) 100%)",
          }}
        />
        <section id="top" className="relative overflow-hidden">
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-[.92]"
            aria-hidden="true"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom,#000 0%,#000 38%,rgba(0,0,0,.82) 56%,rgba(0,0,0,.5) 72%,rgba(0,0,0,.22) 86%,rgba(0,0,0,0) 98%)",
              maskImage: "linear-gradient(to bottom,#000 0%,#000 38%,rgba(0,0,0,.82) 56%,rgba(0,0,0,.5) 72%,rgba(0,0,0,.22) 86%,rgba(0,0,0,0) 98%)",
            }}
          >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse 30% 26% at 50% 34%,rgba(247,245,253,.5) 0%,rgba(247,245,253,.2) 58%,rgba(247,245,253,0) 84%)" }}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(rgba(232,225,250,.42) 0%,rgba(251,250,254,0) 24%,rgba(255,255,255,.08) 78%,rgba(255,255,255,0) 100%)" }}
            />
          </div>

          <div className="relative z-10 max-w-[1180px] mx-auto px-5 sm:px-10 pt-[132px] sm:pt-[172px] flex flex-col items-center text-center">
            <Reveal>
              <span className="block font-display font-extrabold text-[11px] tracking-[.22em]" style={{ color: "#7D67D9" }}>
                NUTRITION · TRAINING · HEALTH · COMMUNITY
              </span>
              <h1 className="font-display font-extrabold text-[44px] sm:text-6xl lg:text-[76px] leading-[1.03] tracking-[-.034em] text-mkt-ink mt-5 max-w-[900px]">
                Your health,
              </h1>
              <div
                id="hero-line2"
                className="inline-block font-display font-extrabold text-[44px] sm:text-6xl lg:text-[76px] leading-[1.03] tracking-[-.034em] text-mkt-ink mt-1.5 whitespace-nowrap"
              >
                <span id="hw-all">All</span> in <span id="hw-one">one</span> <span id="hw-place">place</span>
              </div>
              <div
                id="hero-sub"
                className="flex flex-wrap items-baseline justify-center gap-x-6 gap-y-2.5 mt-6 text-lg leading-[1.4] text-mkt-soft"
              >
                <span className="hero-sub-line whitespace-nowrap" data-word="hw-all">
                  More clarity.
                </span>
                <span className="hero-sub-line whitespace-nowrap" data-word="hw-one">
                  More control.
                </span>
                <span className="hero-sub-line whitespace-nowrap" data-word="hw-place">
                  More you.
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-9">
                <Link
                  to="/app"
                  className="tap px-[30px] py-4 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] transition-colors"
                >
                  Get Started
                </Link>
                <Link
                  to="/contact"
                  data-glassy=""
                  data-glassy-fallback="rgba(255,255,255,.72)"
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
            </Reveal>

            {/* Real app captures — natural aspect ratio, no crop, no mask
                (the v3 build's bezel-wrapped fake mockups are superseded by
                these per the v5 handoff's own literal hero markup). Below
                640px only the dashboard shows, solo, at min(260px,72vw). */}
            <Reveal delay={0.1} className="w-full">
              <div className="hidden sm:flex items-center justify-center gap-[clamp(14px,2vw,26px)] mt-[76px] mb-[clamp(48px,6vw,80px)]">
                <img
                  src="/hero-food.png"
                  alt="Centium food diary"
                  width={1170}
                  height={2532}
                  className="shrink-0 block rounded-[22px]"
                  style={{ width: 236, height: "auto", boxShadow: "0 18px 50px rgba(72,58,130,.14)" }}
                />
                <img
                  src="/hero-dashboard.png"
                  alt="Centium dashboard"
                  width={1170}
                  height={2532}
                  className="shrink-0 block rounded-[22px]"
                  style={{ width: 310, height: "auto", boxShadow: "0 28px 70px rgba(72,58,130,.22)" }}
                />
                <img
                  src="/hero-workout.png"
                  alt="Centium workout routines"
                  width={1170}
                  height={2532}
                  className="shrink-0 block rounded-[22px]"
                  style={{ width: 236, height: "auto", boxShadow: "0 18px 50px rgba(72,58,130,.14)" }}
                />
              </div>
              <div className="sm:hidden mt-12 flex justify-center">
                <img
                  src="/hero-dashboard.png"
                  alt="Centium dashboard"
                  width={1170}
                  height={2532}
                  className="block rounded-[20px]"
                  style={{ width: "min(260px,72vw)", height: "auto", boxShadow: "0 20px 50px rgba(72,58,130,.18)" }}
                />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="relative z-[6]">
          <ReviewsConveyor reviews={reviews} />
        </section>
      </div>

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
        <Section id="faq" className="bg-transparent scroll-mt-[88px]">
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

        {/* Pricing preview */}
        <section id="pricing" className="py-[clamp(48px,6vw,72px)] pb-[clamp(72px,8vw,96px)] scroll-mt-[88px]">
          <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
            <PricingHeading />
            <Reveal delay={0.08}>
              <PlanPicker plans={homePlans} defaultSelected={1} />
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <Section id="cta" className="bg-transparent text-center scroll-mt-[88px]">
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
