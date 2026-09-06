import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { TabShowcase, type ShowcaseTab } from "../components/TabShowcase";
import { PlanPicker, type Plan } from "../components/PlanPicker";
import { FaqAccordion } from "../components/FaqAccordion";
import { ProblemList, type ProblemItem } from "../components/ProblemList";
import { ReviewsConveyor, type Review } from "../components/ReviewsConveyor";
import { BrandLoader } from "../components/BrandLoader";
import { PhoneShell } from "../components/illustrations/PhoneShell";
import { AppScreen } from "../components/illustrations/AppScreen";
import { useHeroFlow } from "../hooks/useHeroFlow";
import { useSEO } from "../useSEO";
import { useReducedMotion } from "framer-motion";

const legacyApps: ProblemItem[] = [
  { label: "A nutrition app", tag: "Costly" },
  { label: "A workout app", tag: "Generic" },
  { label: "A health app", tag: "Discrepancies" },
  { label: "A messenger app", tag: "Elsewhere" },
  { label: "A spreadsheet you stopped filling", tag: "Inconsistency" },
];

const platformTabs: ShowcaseTab[] = [
  {
    label: "Nutrition",
    title: "Meal logging, made effortless.",
    description:
      "Nutrition and training have always gone hand in hand. Centium brings them together with your health metrics, giving you a clearer picture of how everything is connected.",
    points: ["Extensive food database, always at your fingertips", "Nutrition goals that adapt to you, not the other way around.", "Log less, eat better."],
    screen: "nutrition",
  },
  {
    label: "Workouts",
    title: "Train today. Track yesterday. Progress tomorrow.",
    description: "Meticulous where it matters, simple where it should be. Built for every level of athlete.",
    points: ["Thousands of exercises. Endless ways to train.", "Every set, every rep, every metric, tracked live.", "See the trends. Find your next breakthrough."],
    screen: "workout",
  },
  {
    label: "Health",
    title: "Your health, always at the forefront.",
    description:
      "All your health metrics and medical information, kept up to date, easy to read and built to drive action.",
    points: ["Every metric tracked. Every trend analyzed.", "Your health hub, all your information, one clear picture.", "Connected care, guided by established health standards."],
    screen: "health",
  },
  {
    label: "Community",
    title: "One ecosystem. Every specialist.",
    description: "Progress faster, together. Expert guidance gets you there.",
    points: ["Trainers, dietitians and more, seamlessly connected to your health journey.", "Share what matters, on your terms.", "A marketplace built to take your fitness further."],
    screen: "community",
  },
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

const PIN_TOP = 72;

/** "Who it's for" pinned reveal: the section pins while four traits pop in
 *  one by one, then ordinary scrolling resumes — mirrors the Platform
 *  section's own scroll-pin mechanism but with its own step size and a
 *  distinct, always-on fallback for viewports that don't pin (traits still
 *  reveal, just against the section's own scroll position instead of a
 *  pinned track), per the v2 handoff's exact `onScroll` logic. */
function useTraitsPin(count: number) {
  const [traits, setTraits] = useState(0);
  const fitsRef = useRef(false);
  const keyRef = useRef("");

  useEffect(() => {
    const onScroll = () => {
      const track = document.getElementById("traits-track");
      const sec = document.getElementById("traits-section");
      if (!track || !sec) return;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const key = vw + "x" + vh;
      if (keyRef.current !== key) {
        keyRef.current = key;
        fitsRef.current = vw >= 1024 && vh >= 620 && sec.offsetHeight + PIN_TOP <= vh;
      }
      if (!fitsRef.current) {
        if (track.style.height) track.style.height = "";
        const top = sec.getBoundingClientRect().top;
        let n = Math.floor((vh * 0.86 - top) / (vh * 0.26)) + 1;
        if (n < 0) n = 0;
        else if (n > count) n = count;
        setTraits((prev) => (n > prev ? n : prev));
      } else {
        const step = Math.round(vh * 0.42);
        const want = sec.offsetHeight + step * (count - 1);
        if (track.style.height !== want + "px") track.style.height = want + "px";
        const travelled = PIN_TOP - track.getBoundingClientRect().top;
        let n = Math.floor(travelled / step) + 1;
        if (n < 0) n = 0;
        else if (n > count) n = count;
        setTraits((prev) => (prev === n ? prev : n));
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count]);

  return traits;
}

const traitArt = {
  // "A HEALTHIER ME" checklist card — Principled.
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
  // Dumbbell curl set — Determined.
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
  // Balanced plate macro ring — Intentional.
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
  // Live video consultation — Proactive.
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

const traits: { title: string; description: string; accent: string; art: React.ReactNode }[] = [
  { title: "Principled", description: "Shows up, puts in the work, and wants a platform that keeps up.", accent: "#6A54C4", art: traitArt.checklist },
  { title: "Determined", description: "Knows where they want to go and wants everything connected to get there.", accent: "#3F726D", art: traitArt.dumbbell },
  { title: "Intentional", description: "Pays attention to the details that shape their health and wants them all in one place.", accent: "#6A54C4", art: traitArt.plate },
  { title: "Proactive", description: "Wants to understand their health, act on it, and keep moving forward.", accent: "#3F726D", art: traitArt.video },
];

export const Home: React.FC = () => {
  useSEO(
    "Your health, all in one place",
    "Centium brings nutrition tracking, workout logging, health tracking and community into one place."
  );
  const canvasRef = useHeroFlow();
  const revealedTraits = useTraitsPin(traits.length);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <BrandLoader />

      {/* Hero + reviews conveyor share one gradient container so the seam
          between them disappears — the reviews strip has no background of
          its own. */}
      <div
        className="relative"
        style={{
          background:
            "radial-gradient(70% 58% at 50% 39%,#F6F3FC 0%,rgba(246,243,252,.72) 36%,rgba(246,243,252,0) 72%)," +
            "radial-gradient(58% 64% at 2% 96%,rgba(140,110,222,.34) 0%,rgba(140,110,222,0) 62%)," +
            "radial-gradient(58% 64% at 98% 96%,rgba(84,158,146,.34) 0%,rgba(84,158,146,0) 62%)," +
            "linear-gradient(90deg,#B49DEA 0%,#C4B7EC 24%,#D2D6E4 50%,#A8CFC6 76%,#8CC1B6 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0 h-[190px] pointer-events-none z-[5]"
          style={{ background: "linear-gradient(rgba(255,255,255,0) 0%,rgba(255,255,255,.72) 58%,#FFFFFF 100%)" }}
        />

        <section id="top" className="relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-[.92]" aria-hidden="true">
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
              <Eyebrow>NUTRITION · TRAINING · HEALTH · COMMUNITY</Eyebrow>
              <h1 className="font-display font-extrabold text-[44px] sm:text-6xl lg:text-[76px] leading-[1.04] lg:leading-[1.02] tracking-[-.03em] lg:tracking-[-.035em] text-mkt-ink mt-5 max-w-[780px]">
                Your health,
                <br />
                All in one place
              </h1>
              <p className="text-lg leading-relaxed text-mkt-soft mt-6 max-w-[560px] mx-auto">
                More clarity. More control. More you.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-9">
                <Link
                  to="/app"
                  className="tap px-[30px] py-4 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] transition-colors"
                >
                  Get Started
                </Link>
                <Link
                  to="/contact"
                  className="tap px-[26px] py-4 rounded-full border border-[#DFDAD2] hover:border-mkt-ink text-mkt-ink font-semibold text-[15px] transition-colors"
                >
                  Request a Demo
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="w-full">
              <div className="hidden sm:flex items-end justify-center gap-5 mt-[76px] mb-[-90px]">
                <PhoneShell width={214} height={400} radius={19} shadow="0 18px 50px rgba(72,58,130,.10)">
                  <AppScreen variant="nutrition" />
                </PhoneShell>
                <PhoneShell width={262} height={520} radius={24} border="#D9D2EF" shadow="0 28px 70px rgba(72,58,130,.16)">
                  <AppScreen variant="home" />
                </PhoneShell>
                <PhoneShell width={214} height={400} radius={19} shadow="0 18px 50px rgba(72,58,130,.10)">
                  <AppScreen variant="health" />
                </PhoneShell>
              </div>
              <div className="sm:hidden mt-12 flex justify-center">
                <PhoneShell width={220} height={410} radius={20} border="#D9D2EF" shadow="0 20px 50px rgba(72,58,130,.14)">
                  <AppScreen variant="home" />
                </PhoneShell>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Reviews conveyor — supersedes the plain capability bar. */}
        <section className="relative z-[6]">
          <ReviewsConveyor reviews={reviews} />
        </section>
      </div>

      {/* Problem */}
      <Section className="bg-white">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-24 items-center">
          <Reveal>
            <Eyebrow tone="faint">THE PROBLEM</Eyebrow>
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

      {/* Platform — scroll-pinned showcase, no pill tabs */}
      <div id="platform-track" className="relative bg-mkt-wash">
        <section id="platform" className="sticky top-[72px] py-20 bg-mkt-wash border-t border-b border-mkt-line flex flex-col justify-center">
          <div className="max-w-[1180px] mx-auto px-5 sm:px-10 w-full">
            <Reveal>
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div>
                  <Eyebrow>THE PLATFORM</Eyebrow>
                  <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px] max-w-[520px]">
                    Everything health, together.
                  </h2>
                </div>
                <p className="text-base leading-relaxed text-mkt-soft max-w-[340px]">
                  Four pillars, one place to check in on all of them, and one history that stays connected.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="mt-11">
              <TabShowcase tabs={platformTabs} scrollPin={{ sectionId: "platform", trackId: "platform-track" }} />
            </Reveal>
          </div>
        </section>
      </div>

      {/* FAQ → Who it's for → Beyond the Individual → Pricing → Closing CTA
          share one descending gradient band (green enters at "Beyond the
          Individual" and merges into purple), per the v2 handoff. */}
      <div
        style={{
          background:
            "linear-gradient(#FBFAF8 0%,#F3F8F6 8%,#FBFCFB 22%,#FFFFFF 36%,#EDF6F2 48%,#D7ECE5 58%,#D9E7EC 70%,#E2DEF6 84%,#E7E0F9 100%)",
        }}
      >
        <Section id="faq" className="bg-transparent scroll-mt-[88px]" narrow>
          <Reveal className="text-center mb-11">
            <Eyebrow tone="faint" className="mx-auto">
              FAQ
            </Eyebrow>
            <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px]">
              Questions, answered.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <FaqAccordion items={faqItems} />
          </Reveal>
        </Section>

        {/* Who it's for — pinned sequence, real trait imagery */}
        <div id="traits-track" className="relative">
          <section
            id="traits-section"
            className={reduceMotion ? "py-20 sm:py-28" : "sticky top-[72px] py-20 sm:py-28"}
          >
            <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
              <Reveal>
                <Eyebrow tone="faint">WHO IT'S FOR</Eyebrow>
                <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px] max-w-[560px]">
                  Built for people who show up.
                </h2>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 mt-11" style={{ borderTop: "1px solid rgba(46,39,64,.12)" }}>
                  {traits.map((t, i) => {
                    const shown = reduceMotion || revealedTraits > i;
                    return (
                      <div
                        key={t.title}
                        className="pt-8 pb-0 pr-0 lg:pr-7"
                        style={{
                          borderLeft: i === 0 ? "none" : "1px solid rgba(46,39,64,.12)",
                          paddingLeft: i === 0 ? 0 : undefined,
                        }}
                      >
                        <div
                          className="cursor-default transition-[filter,transform] duration-500 hover:[filter:saturate(1.06)_contrast(1)_brightness(1)] hover:scale-[1.015]"
                          style={{
                            filter: "saturate(.28) contrast(.97) brightness(1.03)",
                            opacity: shown ? 1 : 0,
                            transform: shown ? "none" : "translateY(18px) scale(.97)",
                            transitionProperty: "opacity,transform,filter",
                            transitionDuration: "0.55s",
                            transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
                          }}
                        >
                          {t.art}
                        </div>
                        <div className="font-bold text-lg tracking-tight mt-4" style={{ color: t.accent }}>
                          {t.title}
                        </div>
                        <p className="text-[15px] leading-relaxed text-mkt-soft mt-2.5">{t.description}</p>
                      </div>
                    );
                  })}
                </div>
              </Reveal>
            </div>
          </section>
        </div>

        {/* Beyond the individual */}
        <section className="relative py-20 sm:py-28 overflow-hidden">
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
                    <div className="font-bold text-xl tracking-tight text-mkt-ink whitespace-nowrap">For professionals</div>
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
                    <div className="font-bold text-xl tracking-tight text-mkt-ink whitespace-nowrap">For businesses</div>
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
        <section id="pricing" className="py-20 sm:py-28 scroll-mt-[88px]">
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
                className="tap px-[26px] py-4 rounded-full border border-[#CFC5EA] hover:border-mkt-accent text-mkt-ink font-semibold text-[15px] transition-colors"
              >
                Request a Demo
              </Link>
            </div>
          </Reveal>
        </Section>
      </div>
    </>
  );
};
