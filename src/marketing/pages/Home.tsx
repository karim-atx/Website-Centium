import React from "react";
import { Link } from "react-router-dom";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { PillarRail, type PillarData } from "../components/PillarRail";
import { PersonaArc, type PersonaData } from "../components/PersonaArc";
import { PlanPicker, type Plan } from "../components/PlanPicker";
import { FaqAccordion } from "../components/FaqAccordion";
import { ProblemList, type ProblemItem } from "../components/ProblemList";
import { ReviewsConveyor, type Review } from "../components/ReviewsConveyor";
import { BrandLoader } from "../components/BrandLoader";
import { useHeroFlow } from "../hooks/useHeroFlow";
import { useSEO } from "../useSEO";

const legacyApps: ProblemItem[] = [
  { label: "A nutrition app", tag: "Costly" },
  { label: "A workout app", tag: "Generic" },
  { label: "A health app", tag: "Discrepancies" },
  { label: "A messenger app", tag: "Elsewhere" },
  { label: "A spreadsheet you stopped filling", tag: "Inconsistency" },
];

const faqItems = [
  {
    q: "Why does Centium exist?",
    a: "As a means to an end. Centium was built around the challenges people face, the goals they pursue, and the support they need to make meaningful progress.",
  },
  {
    q: "What exactly can I track with Centium?",
    a: "Everything. From your health and workouts to nutrition and progress, Centium brings it all together in one all-encompassing platform.",
  },
  {
    q: "Who is Centium built for?",
    a: "Anyone. If you care about your health, Centium adapts to your needs with little effort, whether you're just starting out or already deep into your journey.",
  },
  {
    q: "Where does Centium fit into my daily routine?",
    a: "All day, every day. Centium seamlessly fits into your routine without being invasive, acting as a smooth, always-accessible partner in your health journey.",
  },
  {
    q: "When should Centium be part of my journey?",
    a: "From wherever you are. Fitness will always require effort, but Centium guides and supports you every step of the way, helping you turn your goals into progress.",
  },
];

const reviews: Review[] = [
  { initials: "LK", name: "Layla K.", role: "General User", tone: "primary", quote: "Nutrition goals that adapt to you, not the other way around." },
  { initials: "OS", name: "Omar S.", role: "Athlete", tone: "teal", quote: "Every set, every rep, every metric, tracked live." },
  { initials: "NF", name: "Nadia F.", role: "Dietitian", tone: "primary", quote: "Your clients, your plans, one seamless system." },
  { initials: "KD", name: "Karim D.", role: "General User", tone: "teal", quote: "One place to understand, manage and improve your health." },
  { initials: "RH", name: "Rana H.", role: "Personal Trainer", tone: "primary", quote: "Manage everything from health data to workouts and nutrition." },
  { initials: "YT", name: "Youssef T.", role: "General User", tone: "teal", quote: "Log less, eat better." },
];

const homePlans: Plan[] = [
  {
    key: "professionals",
    name: "Professionals",
    description: "Manage your entire roster, while keeping every experience personal.",
    monthly: 30,
    unit: "per seat / month",
    features: ["Client roster & booking", "Programs Management", "Comprehensive Data Tracking"],
    ctaLabel: "Get Started",
    ctaHref: "/app",
  },
  {
    key: "clients",
    name: "General Users",
    description: "Take charge of your health with one click.",
    monthly: 15,
    unit: "per month",
    features: ["Nutrition & workout logging", "Health tracking & trends", "Connected Community & Experts"],
    ctaLabel: "Get Started",
    ctaHref: "/app",
  },
  {
    key: "business",
    name: "Business",
    description: "Unlock new opportunities. Scale your business with Centium.",
    monthly: 100,
    unit: "per month + rev share",
    features: ["Marketplace Visibility", "Team Operations", "Growth Analytics"],
    ctaLabel: "Talk to us",
    ctaHref: "/contact",
  },
];

// ---------------------------------------------------------------------------
// Hero phone mockups
// ---------------------------------------------------------------------------

const StatusBar: React.FC = () => (
  <div className="flex items-center justify-between px-4 pt-2.5 pb-1 text-[9px] font-bold text-mkt-faint">
    <span>9:41</span>
    <span className="w-[58px] h-[5px] rounded-full bg-mkt-line" />
    <span>100%</span>
  </div>
);

const HeroPhoneNutrition: React.FC = () => (
  <div className="w-full h-full flex flex-col gap-2.5 p-4 bg-white text-left">
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-xs font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Today</div>
        <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">1,842 / 2,340 kcal</div>
      </div>
      <div className="relative w-[34px] h-[34px] rounded-full border-[3px] shrink-0" style={{ borderColor: "#E4DCF8" }}>
        <div className="absolute -inset-[3px] rounded-full border-[3px] border-r-transparent border-b-transparent" style={{ borderColor: "#7D67D9", borderRightColor: "transparent", borderBottomColor: "transparent" }} />
      </div>
    </div>
    <div className="flex flex-col gap-[7px] mt-0.5">
      {[
        { label: "Protein", val: "128 / 165 g", pct: 78, bar: "#7D67D9", bg: "#F4F1FB" },
        { label: "Carbs", val: "196 / 260 g", pct: 75, bar: "#A895E0", bg: "#F4F1FB" },
        { label: "Fat", val: "48 / 65 g", pct: 74, bar: "#5E9E95", bg: "#EDF4F3" },
      ].map((row) => (
        <div key={row.label} className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-[9.5px] font-semibold text-mkt-soft whitespace-nowrap">{row.label}</span>
            <span className="text-[9.5px] font-extrabold text-mkt-ink whitespace-nowrap">{row.val}</span>
          </div>
          <div className="h-1 rounded-full" style={{ background: row.bg }}>
            <span className="block h-full rounded-full" style={{ width: `${row.pct}%`, background: row.bar }} />
          </div>
        </div>
      ))}
    </div>
    <div className="flex flex-col gap-1.5 mt-0.5 flex-1">
      {[
        { icon: "B", iconBg: "#F4F1FB", iconFg: "#5C48A8", border: "#E4DCF8", title: "Breakfast", meta: "38P · 62C · 12F", kcal: "512" },
        { icon: "L", iconBg: "#EDF4F3", iconFg: "#3F726D", border: "#D8EAE6", title: "Lunch", meta: "52P · 74C · 18F", kcal: "686" },
      ].map((row) => (
        <div key={row.title} className="flex items-center gap-[9px] rounded-[10px] p-2" style={{ border: `1px solid ${row.border}` }}>
          <span className="w-[26px] h-[26px] rounded-[7px] shrink-0 flex items-center justify-center text-[9px] font-extrabold" style={{ background: row.iconBg, color: row.iconFg }}>
            {row.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-mkt-ink whitespace-nowrap">{row.title}</div>
            <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">{row.meta}</div>
          </div>
          <span className="text-[9px] font-extrabold text-mkt-ink whitespace-nowrap">{row.kcal}</span>
        </div>
      ))}
      <div className="flex items-center gap-[9px] rounded-[10px] p-2 border border-dashed" style={{ borderColor: "#E4DCF8" }}>
        <span className="w-[26px] h-[26px] rounded-[7px] shrink-0 flex items-center justify-center text-[11px] font-extrabold" style={{ background: "#F4F1FB", color: "#5C48A8" }}>
          +
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold whitespace-nowrap" style={{ color: "#5C48A8" }}>Log Dinner</div>
          <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">498 kcal left</div>
        </div>
      </div>
    </div>
  </div>
);

const HeroPhoneDashboard: React.FC = () => (
  <div className="w-full h-full flex flex-col">
    <StatusBar />
    <div className="flex-1 flex flex-col gap-[11px] px-4 pt-2.5 pb-3.5 text-left">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[13px] font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Dashboard</div>
          <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">Thu 7 Sep · day 18 streak</div>
        </div>
        <span className="w-[29px] h-[29px] rounded-full shrink-0 flex items-center justify-center text-[9.5px] font-extrabold" style={{ background: "#F4F1FB", color: "#5C48A8" }}>
          KD
        </span>
      </div>
      <div
        className="rounded-2xl p-3.5 flex items-center justify-between gap-2.5"
        style={{ background: "linear-gradient(120deg,#7D67D9 0%,#6E86C0 58%,#5E9E95 100%)" }}
      >
        <div>
          <div className="text-[8px] font-bold tracking-[.16em]" style={{ color: "rgba(255,255,255,.86)" }}>TODAY</div>
          <div className="text-[19px] font-extrabold tracking-[-.03em] text-white leading-[1.1] mt-0.5">1,842</div>
          <div className="text-[8.5px] font-semibold whitespace-nowrap" style={{ color: "rgba(255,255,255,.9)" }}>of 2,340 kcal</div>
        </div>
        <div className="relative w-11 h-11 rounded-full border-4 shrink-0" style={{ borderColor: "rgba(255,255,255,.34)" }}>
          <div className="absolute -inset-1 rounded-full border-4 border-white" style={{ borderRightColor: "transparent", borderBottomColor: "transparent", transform: "rotate(38deg)" }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-[9px] flex-1">
        {[
          { label: "NUTRITION", val: "128 g", meta: "protein of 165", dot: "#7D67D9", border: "#E4DCF8", bar: "#7D67D9", barBg: "#F4F1FB" },
          { label: "TRAINING", val: "Push Day", meta: "4 of 6 exercises", dot: "#5E9E95", border: "#D8EAE6", bar: "#5E9E95", barBg: "#EDF4F3" },
          { label: "HEALTH", val: "9,412", meta: "steps · avg 8,640", dot: "#7D67D9", border: "#E4DCF8", bar: "#7D67D9", barBg: "#F4F1FB" },
          { label: "HABITS", val: "4 / 5", meta: "done today", dot: "#5E9E95", border: "#D8EAE6", bar: "#5E9E95", barBg: "#EDF4F3" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-[14px] p-[11px] flex flex-col gap-1" style={{ border: `1px solid ${tile.border}` }}>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold tracking-[.14em] text-mkt-faint whitespace-nowrap">{tile.label}</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: tile.dot }} />
            </div>
            <div className="text-[14px] font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">{tile.val}</div>
            <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">{tile.meta}</div>
            <div className="h-[3px] rounded-full mt-0.5" style={{ background: tile.barBg }}>
              <span className="block h-full rounded-full" style={{ width: "72%", background: tile.bar }} />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[13px] p-[9px] flex items-center gap-[9px]" style={{ border: "1px solid #E4DCF8" }}>
        <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-extrabold" style={{ background: "#EDF4F3", color: "#3F726D" }}>
          NF
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap">Nadia F. · dietitian</div>
          <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">Updated your macro targets</div>
        </div>
      </div>
    </div>
    <div className="flex items-center justify-around px-3.5 pt-2.5 pb-3 border-t" style={{ borderColor: "#F1EEE9" }}>
      <span className="w-[18px] h-[18px] rounded-[6px]" style={{ background: "#7D67D9" }} />
      <span className="w-[18px] h-[18px] rounded-[6px] bg-mkt-line" />
      <span className="w-[18px] h-[18px] rounded-[6px] bg-mkt-line" />
      <span className="w-[18px] h-[18px] rounded-[6px] bg-mkt-line" />
    </div>
  </div>
);

const HeroPhoneHealth: React.FC = () => (
  <div className="w-full h-full flex flex-col gap-2.5 p-4 bg-white text-left">
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-xs font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Steps</div>
        <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">9,412 today · 8,640 avg</div>
      </div>
      <div className="flex gap-1">
        <span className="px-2 py-[3px] rounded-full text-[8.5px] font-bold whitespace-nowrap" style={{ background: "#7D67D9", color: "#fff" }}>D</span>
        <span className="px-2 py-[3px] rounded-full text-[8.5px] font-bold whitespace-nowrap" style={{ background: "#F4F1FB", color: "#5C48A8" }}>W</span>
        <span className="px-2 py-[3px] rounded-full text-[8.5px] font-bold whitespace-nowrap" style={{ background: "#F4F1FB", color: "#5C48A8" }}>M</span>
      </div>
    </div>
    <div className="flex items-end gap-1 h-[42px] mt-0.5">
      {[52, 68, 44, 88, 60, 100, 72].map((h, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-sm"
          style={{ height: `${h}%`, background: i === 5 ? "#7D67D9" : "#F4F1FB", opacity: i === 3 ? 0.5 : 1 }}
        />
      ))}
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-[11px] p-2" style={{ border: "1px solid #E4DCF8" }}>
        <div className="text-[8px] font-bold tracking-[.12em] text-mkt-faint">WEIGHT</div>
        <div className="text-xs font-extrabold text-mkt-ink mt-0.5">74.6 kg</div>
        <div className="text-[8px] font-bold" style={{ color: "#5C48A8" }}>tap to edit</div>
      </div>
      <div className="rounded-[11px] p-2" style={{ border: "1px solid #D8EAE6" }}>
        <div className="text-[8px] font-bold tracking-[.12em] text-mkt-faint">BODY FAT</div>
        <div className="text-xs font-extrabold text-mkt-ink mt-0.5">17.2%</div>
        <div className="text-[8px] font-bold" style={{ color: "#3F726D" }}>tap to edit</div>
      </div>
    </div>
    <div className="rounded-xl p-[9px] flex-1" style={{ border: "1px solid #E4DCF8" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-mkt-ink whitespace-nowrap">Sleep score 84</span>
        <span className="text-[8.5px] text-mkt-faint whitespace-nowrap">7h 22m</span>
      </div>
      <div className="flex gap-[3px] mt-1.5 h-1.5">
        <span className="rounded-full" style={{ flex: 22, background: "#7D67D9" }} />
        <span className="rounded-full" style={{ flex: 26, background: "#7D67D9", opacity: 0.6 }} />
        <span className="rounded-full" style={{ flex: 44, background: "#F4F1FB" }} />
        <span className="rounded-full" style={{ flex: 8, background: "#E7E3DC" }} />
      </div>
      <div className="flex justify-between mt-1 text-[7.5px] font-semibold text-mkt-faint">
        <span>REM 22%</span>
        <span>Deep 26%</span>
        <span>Light 44%</span>
        <span>Awake 8%</span>
      </div>
    </div>
  </div>
);

const HeroPhoneNarrow: React.FC = () => (
  <div className="w-full h-full flex flex-col gap-2.5 p-4 bg-white text-left">
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-xs font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Good morning, Karim</div>
        <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">Thu 7 Sep · all four pillars</div>
      </div>
      <span className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[9.5px] font-extrabold" style={{ background: "#F4F1FB", color: "#5C48A8" }}>
        KD
      </span>
    </div>
    <div className="grid grid-cols-2 gap-[9px] mt-0.5 flex-1">
      {[
        { title: "Nutrition", meta: "1,842 kcal", bg: "#F4F1FB", border: "#E4DCF8" },
        { title: "Training", meta: "Push Day", bg: "#EDF4F3", border: "#D8EAE6" },
        { title: "Health", meta: "9,412 steps", bg: "#F4F1FB", border: "#E4DCF8" },
        { title: "Community", meta: "18-day streak", bg: "#EDF4F3", border: "#D8EAE6" },
      ].map((tile) => (
        <div key={tile.title} className="rounded-[13px] p-[11px] flex flex-col gap-1.5" style={{ border: `1px solid ${tile.border}` }}>
          <span className="w-5 h-5 rounded-md" style={{ background: tile.bg }} />
          <div className="text-[10.5px] font-extrabold text-mkt-ink whitespace-nowrap">{tile.title}</div>
          <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">{tile.meta}</div>
        </div>
      ))}
    </div>
    <div className="rounded-xl p-[9px] flex items-center gap-[9px]" style={{ border: "1px solid #E4DCF8" }}>
      <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-extrabold" style={{ background: "#EDF4F3", color: "#3F726D" }}>
        NF
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap">Nadia F. · dietitian</div>
        <div className="text-[8.5px] text-mkt-faint whitespace-nowrap">Updated your macro targets</div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Platform pillar phone screens + graphics
// ---------------------------------------------------------------------------

const PillarPhoneNutrition: React.FC = () => (
  <div className="w-full h-full flex flex-col text-left">
    <StatusBar />
    <div className="flex-1 flex flex-col gap-2.5 px-3.5 pt-2.5 pb-3.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[12.5px] font-extrabold tracking-[-.02em] text-mkt-ink">Today's goals</div>
          <div className="text-[9px] text-mkt-faint whitespace-nowrap">TDEE 2,340 kcal · maintain</div>
        </div>
        <div className="flex gap-1.5">
          <span className="px-2.5 py-1 rounded-full text-[9.5px] font-bold whitespace-nowrap" style={{ background: "#7D67D9", color: "#fff" }}>Log</span>
          <span className="px-2.5 py-1 rounded-full text-[9.5px] font-bold whitespace-nowrap" style={{ background: "#F6F3FD", color: "#4E3894" }}>Meal Prep</span>
        </div>
      </div>
      <div className="flex flex-col gap-[9px] mt-0.5">
        {[
          { label: "Protein", val: "165 g · 30%", pct: 30 },
          { label: "Carbs", val: "260 g · 45%", pct: 45 },
          { label: "Fat", val: "65 g · 25%", pct: 25 },
        ].map((row) => (
          <div key={row.label} className="flex flex-col gap-[5px]">
            <div className="flex items-center justify-between gap-2.5">
              <span className="text-[11px] font-semibold text-mkt-soft whitespace-nowrap">{row.label}</span>
              <span className="text-[11px] font-extrabold text-mkt-ink whitespace-nowrap">{row.val}</span>
            </div>
            <div className="relative h-[5px] rounded-full" style={{ background: "#F6F3FD" }}>
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${row.pct}%`, background: "#7D67D9" }} />
              <span
                className="absolute rounded-full bg-white border-2"
                style={{ left: `calc(${row.pct}% - 5px)`, top: -3, width: 11, height: 11, borderColor: "#7D67D9" }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-[11px] flex items-center gap-2.5 mt-0.5" style={{ border: "1px solid #E4DCF8" }}>
        <span className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-xs font-extrabold" style={{ background: "#F6F3FD", color: "#4E3894" }}>
          +
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] font-bold text-mkt-ink whitespace-nowrap">Log Breakfast</div>
          <div className="text-[9.5px] text-mkt-faint whitespace-nowrap">Oats, whey, banana · 512 kcal</div>
        </div>
        <span className="text-[9.5px] font-bold whitespace-nowrap" style={{ color: "#4E3894" }}>38P · 62C · 12F</span>
      </div>
    </div>
    <div className="flex items-center justify-around px-3 pt-2 pb-[11px] border-t" style={{ borderColor: "#F1EEE9" }}>
      <span className="w-[17px] h-[17px] rounded-[5px]" style={{ background: "#4E3894", opacity: 0.9 }} />
      <span className="w-[17px] h-[17px] rounded-[5px] bg-mkt-line" />
      <span className="w-[17px] h-[17px] rounded-[5px] bg-mkt-line" />
      <span className="w-[17px] h-[17px] rounded-[5px] bg-mkt-line" />
    </div>
  </div>
);

const NutritionGraphic: React.FC = () => (
  <>
    <span
      className="relative w-[78px] h-[78px] shrink-0 rounded-full flex items-center justify-center"
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

const PillarPhoneTraining: React.FC = () => (
  <div className="w-full h-full flex flex-col text-left">
    <StatusBar />
    <div className="flex-1 flex flex-col gap-2.5 px-3.5 pt-2.5 pb-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold tracking-[-.02em] text-mkt-ink">Workout</span>
        <span className="px-2 py-[3px] rounded-full text-[7px] font-extrabold whitespace-nowrap" style={{ background: "#F4F1FB", color: "#5C48A8" }}>32:18</span>
      </div>
      <div className="flex gap-1">
        <span className="px-2 py-1 rounded-full text-[7.5px] font-bold whitespace-nowrap" style={{ background: "#7D67D9", color: "#fff" }}>Routines</span>
        <span className="px-2 py-1 rounded-full text-[7.5px] font-bold whitespace-nowrap" style={{ background: "#F6F4F0", color: "#8C8378" }}>Library</span>
        <span className="px-2 py-1 rounded-full text-[7.5px] font-bold whitespace-nowrap" style={{ background: "#F6F4F0", color: "#8C8378" }}>History</span>
      </div>
      <div className="rounded-[14px] p-[11px]" style={{ border: "1px solid #EDEAE4" }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-extrabold tracking-[-.02em] text-mkt-ink whitespace-nowrap">Upper Body</div>
            <div className="text-[8px] text-mkt-faint whitespace-nowrap">Strength · 52 min · intermediate</div>
          </div>
          <span className="px-2 py-1 rounded-full text-[8px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#3F726D" }}>In progress</span>
        </div>
        <div className="flex items-baseline gap-[5px] mt-2">
          <span className="text-[10.5px] font-extrabold text-mkt-ink whitespace-nowrap">Bench Press</span>
          <span className="text-[8px] text-mkt-faint whitespace-nowrap">4 × 8 · 80 kg</span>
        </div>
        <div className="flex flex-col gap-[5px] mt-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-[7px] px-2 py-1.5 rounded-[9px]" style={{ background: "rgba(125,103,217,.09)", border: "1px solid rgba(125,103,217,.2)" }}>
              <span className="w-[15px] h-[15px] rounded-[5px] shrink-0 text-white text-[8px] font-extrabold flex items-center justify-center" style={{ background: "#7D67D9" }}>✓</span>
              <span className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap">80 kg</span>
              <span className="text-[9px] text-mkt-faint whitespace-nowrap">× 8</span>
              <span className="ml-auto text-[8.5px] font-bold whitespace-nowrap" style={{ color: "#6A54C4" }}>Logged</span>
            </div>
          ))}
          <div className="flex items-center gap-[7px] px-2 py-1.5 rounded-[9px]" style={{ border: "1px solid #EDEAE4" }}>
            <span className="w-[15px] h-[15px] rounded-[5px] shrink-0 text-[8px] font-extrabold flex items-center justify-center" style={{ background: "#F6F4F0", color: "#A9A29A" }}>3</span>
            <span className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap">80 kg</span>
            <span className="text-[9px] text-mkt-faint whitespace-nowrap">× 8</span>
            <span className="ml-auto text-[8.5px] font-bold whitespace-nowrap text-mkt-faint">Log set</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="text-[6.5px] font-bold tracking-[.1em] text-mkt-faint">UP NEXT</div>
        <div className="flex items-center gap-2 rounded-[11px] p-2" style={{ border: "1px solid #EDEAE4" }}>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-mkt-ink whitespace-nowrap">Lat Pulldown</div>
            <div className="text-[8px] text-mkt-faint whitespace-nowrap">3 × 10 · 65 kg</div>
          </div>
          <span className="shrink-0 px-[7px] py-[3px] rounded-full text-[7.5px] font-extrabold whitespace-nowrap" style={{ background: "#F4F1FB", color: "#5C48A8" }}>Back</span>
        </div>
      </div>
    </div>
  </div>
);

const TrainingGraphic: React.FC = () => (
  <>
    <span className="flex items-center justify-center gap-1.5 shrink-0 w-[120px] h-[78px]">
      <span className="w-[15px] h-[52px] rounded" style={{ background: "#2F5F58" }} />
      <span className="w-2.5 h-[34px] rounded-sm" style={{ background: "#5E9E95" }} />
      <span className="flex-1 h-2 rounded-full" style={{ background: "#3B352D" }} />
      <span className="w-2.5 h-[34px] rounded-sm" style={{ background: "#5E9E95" }} />
      <span className="w-[15px] h-[52px] rounded" style={{ background: "#2F5F58" }} />
    </span>
    <span className="flex flex-col gap-[7px] flex-1 min-w-0">
      <span className="flex items-end gap-[5px] h-[38px]">
        {[38, 52, 46, 70, 86, 100].map((h, i) => (
          <span key={i} className="flex-1 rounded" style={{ height: `${h}%`, background: i === 5 ? "#2F5F58" : "#5E9E95", opacity: i === 5 ? 1 : 0.3 + i * 0.08 }} />
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

const PillarPhoneHealth: React.FC = () => (
  <div className="w-full h-full flex flex-col text-left">
    <StatusBar />
    <div className="flex-1 flex flex-col gap-2.5 px-3.5 pt-2.5 pb-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold tracking-[-.02em] text-mkt-ink">Steps</span>
        <div className="flex gap-1">
          <span className="px-2 py-[3px] rounded-full text-[8.5px] font-bold" style={{ background: "#7D67D9", color: "#fff" }}>D</span>
          <span className="px-2 py-[3px] rounded-full text-[8.5px] font-bold" style={{ background: "#F4F1FB", color: "#5C48A8" }}>W</span>
          <span className="px-2 py-[3px] rounded-full text-[8.5px] font-bold" style={{ background: "#F4F1FB", color: "#5C48A8" }}>M</span>
        </div>
      </div>
      <div className="flex items-end gap-1 h-10">
        {[52, 68, 44, 88, 60, 100, 72].map((h, i) => (
          <span key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 5 ? "#7D67D9" : "#F4F1FB", opacity: i === 3 ? 0.5 : 1 }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-2" style={{ border: "1px solid #EDEAE4" }}>
          <div className="text-[8px] font-bold tracking-[.12em] text-mkt-faint">WEIGHT</div>
          <div className="text-xs font-extrabold text-mkt-ink mt-0.5">74.6 kg</div>
          <div className="text-[8px] font-bold" style={{ color: "#5C48A8" }}>tap to edit</div>
        </div>
        <div className="rounded-xl p-2" style={{ border: "1px solid #EDEAE4" }}>
          <div className="text-[8px] font-bold tracking-[.12em] text-mkt-faint">BODY FAT</div>
          <div className="text-xs font-extrabold text-mkt-ink mt-0.5">17.2%</div>
          <div className="text-[8px] font-bold" style={{ color: "#3F726D" }}>tap to edit</div>
        </div>
      </div>
      <div className="rounded-xl p-[9px] flex-1" style={{ border: "1px solid #EDEAE4" }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-mkt-ink whitespace-nowrap">Sleep score 84</span>
          <span className="text-[8.5px] text-mkt-faint whitespace-nowrap">7h 22m</span>
        </div>
        <div className="flex gap-[3px] mt-1.5 h-1.5">
          <span className="rounded-full" style={{ flex: 22, background: "#7D67D9" }} />
          <span className="rounded-full" style={{ flex: 26, background: "#7D67D9", opacity: 0.6 }} />
          <span className="rounded-full" style={{ flex: 44, background: "#F4F1FB" }} />
          <span className="rounded-full" style={{ flex: 8, background: "#E7E3DC" }} />
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl p-2" style={{ border: "1px solid #EDEAE4" }}>
        <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-extrabold" style={{ background: "#F4F1FB", color: "#5C48A8" }}>
          ●
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap">Vitamin D · 31 ng/mL</div>
          <div className="text-[8px] text-mkt-faint whitespace-nowrap">Captured from photo · added to history</div>
        </div>
      </div>
    </div>
  </div>
);

const HealthGraphic: React.FC = () => (
  <>
    <span className="relative w-[78px] h-[78px] shrink-0 rounded-full border-[6px] flex items-center justify-center" style={{ borderColor: "#EDF4F3" }}>
      <span className="absolute -inset-1.5 rounded-full border-[6px] border-r-transparent" style={{ borderColor: "#5E9E95", borderRightColor: "transparent", transform: "rotate(45deg)" }} />
      <span className="text-[15px] font-extrabold" style={{ color: "#2F5F58" }}>84</span>
    </span>
    <span className="flex flex-col gap-2 flex-1 min-w-0">
      <svg viewBox="0 0 120 34" className="w-full h-[34px]" preserveAspectRatio="none">
        <polyline points="0,26 20,20 40,23 60,12 80,16 100,6 120,10" fill="none" stroke="#221E1A" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="0,30 20,24 40,20 60,18 80,12 100,14 120,4" fill="none" stroke="#5E9E95" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="flex gap-1.5">
        <span className="px-2 py-[3px] rounded-full text-[9.5px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#2F5F58" }}>9,412 steps</span>
        <span className="px-2 py-[3px] rounded-full text-[9.5px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#2F5F58" }}>74.6 kg</span>
      </span>
    </span>
  </>
);

const PillarPhoneCommunity: React.FC = () => (
  <div className="w-full h-full flex flex-col text-left">
    <StatusBar />
    <div className="flex-1 flex flex-col gap-2.5 px-3.5 pt-2.5 pb-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-extrabold tracking-[-.02em] text-mkt-ink">Habits</span>
        <span className="px-2 py-[3px] rounded-full text-[8.5px] font-extrabold whitespace-nowrap" style={{ background: "#F6F3FD", color: "#54409B" }}>4 of 5 done</span>
      </div>
      <div className="flex gap-1.5">
        <span className="px-2.5 py-1 rounded-full text-[9.5px] font-bold whitespace-nowrap" style={{ background: "#7D67D9", color: "#fff" }}>Habits</span>
        <span className="px-2.5 py-1 rounded-full text-[9.5px] font-bold whitespace-nowrap" style={{ background: "#F6F3FD", color: "#54409B" }}>Journal</span>
      </div>
      <div className="flex flex-col gap-[7px]">
        {[
          { label: "Morning walk", streak: "18-day streak" },
          { label: "Read 10 pages", streak: "6-day streak" },
          { label: "Stretch routine", streak: "3-day streak" },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2.5 rounded-[11px] p-2" style={{ border: "1px solid #EDEAE4" }}>
            <span className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[9px] font-extrabold text-white" style={{ background: "#7D67D9" }}>✓</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-mkt-ink whitespace-nowrap">{row.label}</div>
              <div className="text-[8px] text-mkt-faint whitespace-nowrap">{row.streak}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Personal", "Training", "Nutrition", "General"].map((chip) => (
          <span key={chip} className="px-2 py-1 rounded-full text-[8.5px] font-bold whitespace-nowrap" style={{ background: "#F6F3FD", color: "#54409B" }}>
            {chip}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-[7px] flex-1 justify-end">
        <div className="flex items-center gap-2.5 rounded-xl p-2" style={{ border: "1px solid #EDEAE4" }}>
          <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-extrabold" style={{ background: "#DED4F4", color: "#5C48A8" }}>RH</span>
          <div className="flex-1 min-w-0">
            <div className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap">Rana H. · client roster</div>
            <div className="text-[8px] text-mkt-faint whitespace-nowrap">12 clients · 9 logged today</div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl p-2" style={{ border: "1px solid #EDEAE4" }}>
          <div className="min-w-0">
            <div className="text-[9.5px] font-bold text-mkt-ink whitespace-nowrap">Beirut Strength Club</div>
            <div className="text-[8px] text-mkt-faint whitespace-nowrap">Listing active · 1,240 members reached</div>
          </div>
          <span className="w-8 h-[18px] rounded-full shrink-0 relative" style={{ background: "#7D67D9" }}>
            <span className="absolute top-0.5 right-0.5 w-[14px] h-[14px] rounded-full bg-white" />
          </span>
        </div>
      </div>
    </div>
  </div>
);

const CommunityGraphic: React.FC = () => (
  <>
    <span className="relative flex items-center justify-center shrink-0 w-[120px] h-[78px]">
      <span className="absolute left-1/2 top-0 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-extrabold" style={{ background: "#DED4F4", color: "#5C48A8" }}>KD</span>
      <span className="absolute left-2 bottom-0 w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-extrabold" style={{ background: "#DAEAE7", color: "#3F726D" }}>NF</span>
      <span className="absolute right-2 bottom-0 w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-extrabold" style={{ background: "#DED4F4", color: "#5C48A8" }}>RH</span>
    </span>
    <span className="flex flex-col gap-[7px] flex-1 min-w-0">
      <span className="flex gap-1 h-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="flex-1 rounded-full" style={{ background: i < 4 ? "#2F5F58" : "#EDEAE4" }} />
        ))}
      </span>
      <span className="flex gap-1.5">
        <span className="px-2 py-[3px] rounded-full text-[9.5px] font-extrabold whitespace-nowrap" style={{ background: "#F6F3FD", color: "#54409B" }}>18-day streak</span>
        <span className="px-2 py-[3px] rounded-full text-[9.5px] font-extrabold whitespace-nowrap" style={{ background: "#F6F3FD", color: "#54409B" }}>12 clients</span>
      </span>
    </span>
  </>
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
    phone: <PillarPhoneNutrition />,
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
    phone: <PillarPhoneTraining />,
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
    phone: <PillarPhoneHealth />,
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
    phone: <PillarPhoneCommunity />,
  },
];

// ---------------------------------------------------------------------------
// Who it's for — persona art (unchanged across v2/v3)
// ---------------------------------------------------------------------------

const traitArt = {
  checklist: (
    <div className="relative w-full h-[152px] rounded-[14px] overflow-hidden" style={{ background: "linear-gradient(150deg,#E9E3F8 0%,#EFEAF9 46%,#E4EEEB 100%)" }}>
      <div className="absolute rounded-full pointer-events-none" style={{ left: -18, top: -22, width: 96, height: 96, background: "radial-gradient(circle at 40% 40%,rgba(162,200,194,.55),rgba(162,200,194,0) 70%)" }} />
      <div className="absolute rounded-full pointer-events-none" style={{ right: -14, bottom: -26, width: 104, height: 104, background: "radial-gradient(circle at 50% 50%,rgba(140,110,222,.4),rgba(140,110,222,0) 70%)" }} />
      <div className="relative m-3.5 rounded-[10px] px-[13px] py-3" style={{ background: "rgba(255,255,255,.82)", boxShadow: "0 10px 24px rgba(72,58,130,.12)" }}>
        <div className="text-[8px] font-bold tracking-[.18em] text-mkt-faint">A HEALTHIER ME</div>
        <div className="flex flex-col gap-1.5 mt-2.5">
          {[
            { label: "Hit Protein Goals", bg: "#7D67D9", done: true },
            { label: "Mindfulness", bg: "#7D67D9", done: true },
            { label: "Resistance Train", bg: "#6F9993", done: true },
            { label: "Online Consultation", bg: "", done: false },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-[7px]">
              {row.done ? (
                <span className="w-[11px] h-[11px] rounded-[3px] text-white text-[8px] leading-[11px] text-center" style={{ background: row.bg }}>✓</span>
              ) : (
                <span className="w-[11px] h-[11px] rounded-[3px]" style={{ border: "1.5px solid rgba(34,30,26,.28)" }} />
              )}
              <span className="text-[10.5px] font-semibold text-[#3B352D] whitespace-nowrap">{row.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
  dumbbell: (
    <div className="relative w-full h-[152px] rounded-[14px] overflow-hidden" style={{ background: "linear-gradient(150deg,#E6E0F7 0%,#E9E7F5 48%,#DFEDE9 100%)" }}>
      <div className="absolute rounded-full pointer-events-none" style={{ left: -22, bottom: -28, width: 110, height: 110, background: "radial-gradient(circle at 50% 50%,rgba(140,110,222,.42),rgba(140,110,222,0) 70%)" }} />
      <div className="absolute rounded-full pointer-events-none" style={{ right: -18, top: -22, width: 96, height: 96, background: "radial-gradient(circle at 50% 50%,rgba(111,153,147,.44),rgba(111,153,147,0) 70%)" }} />
      <div className="relative h-full flex flex-col justify-between px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-bold tracking-[.18em] text-[#6B6358]">CURL · SET 3 OF 4</span>
          <span className="px-2 py-[3px] rounded-full text-[8.5px] font-extrabold text-[#5C48A8]" style={{ background: "rgba(255,255,255,.82)" }}>PR</span>
        </div>
        <div className="flex items-center justify-center gap-[9px]">
          <span className="w-[15px] h-[38px] rounded-[5px]" style={{ background: "linear-gradient(#8C7CC4,#6F5FA6)" }} />
          <span className="w-[9px] h-[26px] rounded-[3px]" style={{ background: "linear-gradient(#A79AD6,#8C7CC4)" }} />
          <span className="w-[46px] h-2 rounded-full" style={{ background: "rgba(34,30,26,.34)" }} />
          <span className="w-[9px] h-[26px] rounded-[3px]" style={{ background: "linear-gradient(#93BEB6,#6F9993)" }} />
          <span className="w-[15px] h-[38px] rounded-[5px]" style={{ background: "linear-gradient(#6F9993,#547E78)" }} />
        </div>
        <div className="flex items-end gap-[5px]">
          <span className="flex-1 h-4 rounded-t" style={{ background: "rgba(140,110,222,.34)" }} />
          <span className="flex-1 h-6 rounded-t" style={{ background: "rgba(140,110,222,.46)" }} />
          <span className="flex-1 h-5 rounded-t" style={{ background: "rgba(140,110,222,.4)" }} />
          <span className="flex-1 h-8 rounded-t" style={{ background: "rgba(111,153,147,.6)" }} />
          <span className="flex-1 h-10 rounded-t" style={{ background: "#6F9993" }} />
          <div className="ml-2 text-right">
            <div className="text-[13px] font-extrabold tracking-[-.02em] text-mkt-ink leading-none">14 kg</div>
            <div className="text-[8px] font-semibold text-[#6B6358]">×10 reps</div>
          </div>
        </div>
      </div>
    </div>
  ),
  plate: (
    <div className="relative w-full h-[152px] rounded-[14px] overflow-hidden" style={{ background: "linear-gradient(150deg,#E1EDE9 0%,#EBE8F5 54%,#E6DFF8 100%)" }}>
      <div className="absolute rounded-full pointer-events-none" style={{ right: -20, bottom: -26, width: 104, height: 104, background: "radial-gradient(circle at 50% 50%,rgba(140,110,222,.4),rgba(140,110,222,0) 70%)" }} />
      <div className="absolute rounded-full pointer-events-none" style={{ left: -18, top: -24, width: 100, height: 100, background: "radial-gradient(circle at 50% 50%,rgba(111,153,147,.44),rgba(111,153,147,0) 70%)" }} />
      <div className="relative h-full flex items-center gap-3.5 px-4 py-3.5">
        <span className="relative w-[86px] h-[86px] shrink-0 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.9)", boxShadow: "0 10px 24px rgba(72,58,130,.14)" }}>
          <span className="absolute left-1/2 top-0 w-1/2 h-full" style={{ background: "linear-gradient(200deg,#8C7CC4,#6F5FA6)" }} />
          <span className="absolute left-0 top-1/2 w-1/2 h-1/2" style={{ background: "linear-gradient(160deg,#93BEB6,#6F9993)" }} />
          <span className="absolute left-0 top-0 w-1/2 h-1/2" style={{ background: "linear-gradient(160deg,#C9BEEC,#A79AD6)" }} />
          <span className="absolute rounded-full" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 26, height: 26, background: "rgba(255,255,255,.92)" }} />
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-[7px]">
          <div className="text-[8px] font-bold tracking-[.18em] text-[#6B6358]">BALANCED PLATE</div>
          {[
            { label: "Protein", pct: 40, bar: "#6F5FA6" },
            { label: "Carbs", pct: 35, bar: "#A79AD6" },
            { label: "Veg & fats", pct: 25, bar: "#6F9993" },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-[9px] font-bold text-[#3B352D]">
                <span>{row.label}</span>
                <span>{row.pct}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden mt-[3px]" style={{ background: "rgba(255,255,255,.7)" }}>
                <span className="block h-full" style={{ width: `${row.pct}%`, background: row.bar }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
  video: (
    <div className="relative w-full h-[152px] rounded-[14px] overflow-hidden" style={{ background: "linear-gradient(150deg,#E3EEEB 0%,#EAEAF6 52%,#E7E1F8 100%)" }}>
      <div className="absolute rounded-full pointer-events-none" style={{ right: -20, top: -24, width: 108, height: 108, background: "radial-gradient(circle at 50% 50%,rgba(140,110,222,.42),rgba(140,110,222,0) 70%)" }} />
      <div className="absolute rounded-full pointer-events-none" style={{ left: -16, bottom: -24, width: 96, height: 96, background: "radial-gradient(circle at 50% 50%,rgba(111,153,147,.5),rgba(111,153,147,0) 70%)" }} />
      <div className="relative m-[13px] rounded-[11px] overflow-hidden" style={{ background: "rgba(255,255,255,.86)", boxShadow: "0 10px 24px rgba(72,58,130,.12)" }}>
        <div className="flex items-center gap-[5px] px-2.5 py-[7px]" style={{ borderBottom: "1px solid rgba(34,30,26,.07)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#6F9993" }} />
          <span className="text-[8px] font-bold tracking-[.14em] text-mkt-faint">LIVE CONSULTATION</span>
          <span className="ml-auto text-[8px] font-bold text-mkt-accent-hover">12:04</span>
        </div>
        <div className="flex gap-[7px] p-2.5">
          <div className="flex-[1.4] h-16 rounded-lg flex items-end p-1.5" style={{ background: "linear-gradient(160deg,#CFC4EF,#A9C8C1)" }}>
            <span className="text-[8px] font-bold text-white/95">Dietitian</span>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex-1 rounded-lg flex items-end p-[5px]" style={{ background: "linear-gradient(160deg,#DED6F5,#C3D9D4)" }}>
              <span className="text-[7.5px] font-bold text-white/95">You</span>
            </div>
            <div className="flex gap-1">
              <span className="flex-1 h-[13px] rounded-full" style={{ background: "#7D67D9" }} />
              <span className="w-[13px] h-[13px] rounded-full" style={{ background: "#EDEAE4" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

const personas: PersonaData[] = [
  { title: "Principled", accent: "#6A54C4", description: "Shows up, puts in the work, and wants a platform that keeps up.", art: traitArt.checklist },
  { title: "Determined", accent: "#3F726D", description: "Knows where they want to go and wants everything connected to get there.", art: traitArt.dumbbell },
  { title: "Intentional", accent: "#6A54C4", description: "Pays attention to the details that shape their health and wants them all in one place.", art: traitArt.plate },
  { title: "Proactive", accent: "#3F726D", description: "Wants to understand their health, act on it, and keep moving forward.", art: traitArt.video },
];

export const Home: React.FC = () => {
  useSEO(
    "Your health, all in one place",
    "Centium brings nutrition tracking, workout logging, health tracking and community into one place."
  );
  const canvasRef = useHeroFlow();

  return (
    <>
      <BrandLoader />

      {/* Hero + reviews conveyor share one gradient container, masked out
          toward the bottom so the seam into "The Problem" disappears — see
          the v3 handoff's own note that this must be a mask, not a white
          overlay, or a hard edge shows. #hero-band/#reviews-belt (rendered
          by ReviewsConveyor) are read by useNavHeroGlass to know when the
          nav should show its glass treatment. */}
      <div
        id="hero-band"
        className="relative bg-white"
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
      >
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
              <div className="font-display font-extrabold text-[44px] sm:text-6xl lg:text-[76px] leading-[1.03] tracking-[-.034em] text-mkt-ink mt-1.5 whitespace-nowrap">
                All in one place
              </div>
              <div className="flex flex-wrap items-baseline justify-center gap-x-[26px] gap-y-2.5 mt-6 text-lg leading-[1.4] text-mkt-soft">
                <span className="whitespace-nowrap">More clarity.</span>
                <span className="whitespace-nowrap">More control.</span>
                <span className="whitespace-nowrap">More you.</span>
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

            <Reveal delay={0.1} className="w-full">
              <div
                className="hidden sm:flex items-end justify-center gap-5 mt-[76px] mb-[-90px]"
                style={{
                  WebkitMaskImage: "linear-gradient(to bottom,#000 0%,#000 74%,rgba(0,0,0,.6) 88%,rgba(0,0,0,0) 100%)",
                  maskImage: "linear-gradient(to bottom,#000 0%,#000 74%,rgba(0,0,0,.6) 88%,rgba(0,0,0,0) 100%)",
                }}
              >
                <div className="bg-white shrink-0 w-[214px] h-[400px] rounded-[26px] border overflow-hidden" style={{ borderColor: "#E4DCF8", padding: 8, boxShadow: "0 18px 50px rgba(72,58,130,.10)" }}>
                  <div className="w-full h-full rounded-[22px] overflow-hidden">
                    <HeroPhoneNutrition />
                  </div>
                </div>
                <div className="bg-white shrink-0 w-[262px] h-[520px] rounded-[34px] border overflow-hidden" style={{ borderColor: "#D9D2EF", padding: 9, boxShadow: "0 28px 70px rgba(72,58,130,.16)" }}>
                  <div className="w-full h-full rounded-[26px] overflow-hidden">
                    <HeroPhoneDashboard />
                  </div>
                </div>
                <div className="bg-white shrink-0 w-[214px] h-[400px] rounded-[26px] border overflow-hidden" style={{ borderColor: "#E4DCF8", padding: 8, boxShadow: "0 18px 50px rgba(72,58,130,.10)" }}>
                  <div className="w-full h-full rounded-[22px] overflow-hidden">
                    <HeroPhoneHealth />
                  </div>
                </div>
              </div>
              <div
                className="sm:hidden mt-12 flex justify-center"
                style={{
                  WebkitMaskImage: "linear-gradient(to bottom,#000 0%,#000 78%,rgba(0,0,0,.6) 90%,rgba(0,0,0,0) 100%)",
                  maskImage: "linear-gradient(to bottom,#000 0%,#000 78%,rgba(0,0,0,.6) 90%,rgba(0,0,0,0) 100%)",
                }}
              >
                <div className="bg-white shrink-0 w-[220px] h-[410px] rounded-[27px] border overflow-hidden" style={{ borderColor: "#D9D2EF", padding: 8, boxShadow: "0 20px 50px rgba(72,58,130,.14)" }}>
                  <div className="w-full h-full rounded-[20px] overflow-hidden">
                    <HeroPhoneNarrow />
                  </div>
                </div>
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

      {/* Platform — pinned four-pillar scroll-scrubbed rail */}
      <section className="py-[clamp(72px,8vw,96px)] bg-mkt-wash border-t border-b border-mkt-line">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
          <Reveal>
            <Eyebrow>THE PLATFORM</Eyebrow>
            <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px] max-w-[860px]">
              Everything health,
              <br />
              together.{" "}
              <span className="font-normal text-base leading-relaxed tracking-normal text-mkt-soft">
                Four pillars in one place to check in on, and one history that keeps them connected.
              </span>
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-11">
            <PillarRail pillars={pillars} />
          </Reveal>
        </div>
      </section>

      {/* FAQ → Who it's for → Beyond the Individual → Pricing → Closing CTA
          share one descending gradient band (green enters at "Beyond the
          Individual" and merges into purple). */}
      <div
        style={{
          background:
            "linear-gradient(#FBFAF8 0%,#F3F8F6 8%,#FBFCFB 22%,#FFFFFF 36%,#EDF6F2 48%,#D7ECE5 58%,#D9E7EC 70%,#E2DEF6 84%,#E7E0F9 100%)",
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

        {/* Who it's for — persona arc */}
        <section className="py-[clamp(72px,8vw,96px)] pb-[clamp(48px,6vw,72px)]">
          <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
            <Reveal>
              <Eyebrow>WHO IT'S FOR</Eyebrow>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px] max-w-[560px]">
                Built for people who show up.
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <PersonaArc personas={personas} />
            </Reveal>
          </div>
        </section>

        {/* Beyond the individual */}
        <section className="relative py-[clamp(48px,6vw,72px)] overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute rounded-full pointer-events-none animate-mkt-drift-a"
            style={{ left: -120, top: 60, width: 340, height: 340, background: "radial-gradient(circle at 50% 50%,rgba(111,153,147,.34),rgba(111,153,147,0) 68%)" }}
          />
          <div
            aria-hidden="true"
            className="absolute rounded-full pointer-events-none animate-mkt-drift-b"
            style={{ right: -140, bottom: 20, width: 400, height: 400, background: "radial-gradient(circle at 50% 50%,rgba(140,110,222,.3),rgba(140,110,222,0) 68%)" }}
          />
          <div className="relative max-w-[1180px] mx-auto px-5 sm:px-10">
            <Reveal>
              <div className="mb-10">
                <Eyebrow tone="teal">BEYOND THE INDIVIDUAL</Eyebrow>
                <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px] max-w-[600px]">
                  The ecosystem built around your health.
                </h2>
              </div>
            </Reveal>
            <div className="grid lg:grid-cols-2 gap-5">
              <Reveal>
                <div
                  className="rounded-3xl p-9 transition-[transform,box-shadow,border-color] duration-[350ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] hover:-translate-y-1.5"
                  style={{
                    background: "linear-gradient(155deg,rgba(255,255,255,.94) 0%,rgba(255,255,255,.72) 100%)",
                    border: "1px solid rgba(125,103,217,.2)",
                    boxShadow: "0 20px 50px rgba(72,58,130,.09)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-[38px] h-[38px] shrink-0 rounded-[11px] flex items-center justify-center" style={{ background: "rgba(125,103,217,.14)", color: "#7D67D9" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
                      </svg>
                    </span>
                    <div className="font-bold text-xl tracking-[-.01em] text-mkt-ink whitespace-nowrap">For professionals</div>
                  </div>
                  <p className="text-base leading-relaxed text-mkt-soft mt-3" style={{ textWrap: "pretty" }}>
                    Your clients, your plans, one seamless system. Manage everything from their health data to
                    workouts and nutrition, with updates flowing straight to their app.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-6">
                    {["Personal trainers", "Dietitians", "Physiotherapists", "General Practitioners"].map((t) => (
                      <span key={t} className="px-3.5 py-2 rounded-full bg-mkt-tint text-mkt-accent-hover font-semibold text-[13px] whitespace-nowrap shrink-0">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-7 rounded-2xl overflow-hidden" style={{ background: "#FAF9F7", border: "1px solid #EDEAE4" }}>
                    <div className="p-5 bg-white flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[12.5px] font-extrabold tracking-[-.02em] text-mkt-ink">Clients</div>
                          <div className="text-[9px] text-mkt-faint whitespace-nowrap">3 active · Thu 4 Sep</div>
                        </div>
                        <div className="flex gap-[5px]">
                          <span className="px-[9px] py-1 rounded-full bg-mkt-accent text-white text-[8.5px] font-bold whitespace-nowrap">All</span>
                          <span className="px-[9px] py-1 rounded-full text-[8.5px] font-bold whitespace-nowrap" style={{ background: "#F6F4F0", color: "#8C8378" }}>Needs review</span>
                        </div>
                      </div>
                      <div className="flex flex-col mt-1">
                        {[
                          { initials: "NK", name: "Nadine Khalil", meta: "64.2 kg · −0.8 · 1,840 kcal", status: "Logged", tone: "primary" },
                          { initials: "SR", name: "Sami Rahal", meta: "81.6 kg · +0.3 · 2,650 kcal", status: "Logged", tone: "teal" },
                          { initials: "YB", name: "Yara Bou Saab", meta: "58.9 kg · −0.2 · 1,620 kcal", status: "Pending", tone: "primary" },
                          { initials: "RT", name: "Roster today", meta: "2 logged today · 1 pending", status: "3 clients", tone: "teal" },
                        ].map((row, i) => (
                          <div key={row.initials + i} className="flex items-center gap-3 py-2.5" style={i !== 0 ? { borderTop: "1px solid #EDEAE4" } : undefined}>
                            <span
                              className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-extrabold"
                              style={row.tone === "primary" ? { background: "#DED4F4", color: "#5C48A8" } : { background: "#DAEAE7", color: "#3F726D" }}
                            >
                              {row.initials}
                            </span>
                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                              <div className="text-[11.5px] font-bold text-mkt-ink whitespace-nowrap">{row.name}</div>
                              <div className="text-[9.5px] text-mkt-faint whitespace-nowrap">{row.meta}</div>
                            </div>
                            <div
                              className="shrink-0 px-[9px] py-1 rounded-full text-[9.5px] font-bold text-mkt-soft"
                              style={{ background: row.tone === "primary" ? "#F4F1FB" : "#EDF4F3" }}
                            >
                              {row.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.06}>
                <div
                  className="rounded-3xl p-9 transition-[transform,box-shadow,border-color] duration-[350ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] hover:-translate-y-1.5"
                  style={{
                    background: "linear-gradient(155deg,rgba(255,255,255,.94) 0%,rgba(255,255,255,.72) 100%)",
                    border: "1px solid rgba(94,158,149,.22)",
                    boxShadow: "0 20px 50px rgba(72,58,130,.09)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-[38px] h-[38px] shrink-0 rounded-[11px] flex items-center justify-center" style={{ background: "rgba(94,158,149,.16)", color: "#5E9E95" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 21V8l9-5 9 5v13" />
                        <path d="M9 21v-6h6v6" />
                        <path d="M3 21h18" />
                      </svg>
                    </span>
                    <div className="font-bold text-xl tracking-[-.01em] text-mkt-ink whitespace-nowrap">For businesses</div>
                  </div>
                  <p className="text-base leading-relaxed text-mkt-soft mt-3" style={{ textWrap: "pretty" }}>
                    Put your gym, classes and services on the map, digitize memberships, connect with professionals
                    and gain insights through client analytics.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-6">
                    {["Gyms & studios", "Equipment & supplements", "Meal prep services", "Activewear"].map((t) => (
                      <span key={t} className="px-3.5 py-2 rounded-full font-semibold text-[13px] whitespace-nowrap shrink-0" style={{ background: "#EDF4F3", color: "#4F8F8A" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-7 rounded-2xl overflow-hidden" style={{ background: "#FAF9F7", border: "1px solid #EDEAE4" }}>
                    <div className="p-5 bg-white flex flex-col gap-3">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <div className="text-[12.5px] font-extrabold tracking-[-.02em] text-mkt-ink">Check-ins</div>
                          <div className="text-[9px] text-mkt-faint whitespace-nowrap">This week · 591 visits</div>
                        </div>
                        <span className="px-[9px] py-1 rounded-full text-[8.5px] font-extrabold whitespace-nowrap" style={{ background: "#EDF4F3", color: "#3F726D" }}>+18% WoW</span>
                      </div>
                      <div className="flex items-end gap-1.5 h-[88px]">
                        {[
                          { day: "Mon", v: 53, h: 38 },
                          { day: "Tue", v: 87, h: 62 },
                          { day: "Wed", v: 70, h: 50 },
                          { day: "Thu", v: 109, h: 78 },
                          { day: "Fri", v: 81, h: 58 },
                          { day: "Sat", v: 129, h: 92 },
                          { day: "Sun", v: 62, h: 44 },
                        ].map((bar) => (
                          <div key={bar.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                            <span className="text-[7px] font-bold whitespace-nowrap" style={{ color: bar.day === "Sat" ? "#5C48A8" : "#A9A29A" }}>{bar.v}</span>
                            <div
                              className="w-full rounded-t"
                              style={{ height: `${bar.h}%`, background: bar.day === "Sat" ? "#7D67D9" : "rgba(125,103,217,.26)" }}
                            />
                            <span className="text-[7px] font-semibold text-mkt-faint whitespace-nowrap">{bar.day}</span>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { name: "Nour Aad", status: "Membership active" },
                          { name: "Fadi Chamoun", status: "Class booked" },
                        ].map((c) => (
                          <div key={c.name} className="rounded-xl p-2.5 flex flex-col gap-1.5" style={{ border: "1px solid #EDEAE4" }}>
                            <div className="text-[11.5px] font-bold text-mkt-ink whitespace-nowrap">{c.name}</div>
                            <div className="text-[9.5px] text-mkt-faint whitespace-nowrap mt-0.5">{c.status}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section id="pricing" className="py-[clamp(48px,6vw,72px)] pb-[clamp(72px,8vw,96px)] scroll-mt-[88px]">
          <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
            <Reveal className="text-center max-w-[560px] mx-auto mb-11">
              <Eyebrow className="mx-auto">PRICING</Eyebrow>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px]">
                Whatever your role, Centium fits.
              </h2>
              <p className="text-base leading-relaxed text-mkt-soft mt-[18px]">One app instead of a stack of subscriptions.</p>
            </Reveal>
            <Reveal delay={0.08}>
              <PlanPicker plans={homePlans} defaultSelected={1} />
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <Section className="bg-transparent text-center">
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
