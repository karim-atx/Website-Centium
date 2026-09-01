import React from "react";
import { Link } from "react-router-dom";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { TabShowcase, type ShowcaseTab } from "../components/TabShowcase";
import { PlanPicker, type Plan } from "../components/PlanPicker";
import { PhoneShell } from "../components/illustrations/PhoneShell";
import { AppScreen } from "../components/illustrations/AppScreen";
import { useMembraneCanvas } from "../hooks/useMembraneCanvas";
import { useSEO } from "../useSEO";

const capabilities = ["Nutrition tracking", "Workout logging", "Health tracking", "AI guidance", "Community & professionals"];

const legacyApps = [
  { name: "A nutrition app", note: "subscription" },
  { name: "A workout app", note: "subscription" },
  { name: "A sleep tracker", note: "subscription" },
  { name: "A coach on WhatsApp", note: "somewhere else" },
  { name: "A spreadsheet you stopped filling in", note: "March" },
];

const platformTabs: ShowcaseTab[] = [
  {
    label: "Nutrition",
    title: "Log a meal in seconds, not menus.",
    description:
      "Meals, macros and custom foods in the same place as everything else you track — so what you eat sits next to how you trained and how you slept.",
    points: ["Meal logging with custom foods and macros", "Goals calculated from your own TDEE", "Copy yesterday in a single swipe"],
    tone: "primary",
    screen: "nutrition",
  },
  {
    label: "Workouts",
    title: "Training that keeps its own history.",
    description:
      "Build routines, log the session as it happens, and let the progression take care of itself. Nothing to re-enter afterwards.",
    points: ["Routines, folders and a full exercise library", "Live session logger with timer, RPE and tempo", "Volume and 1RM trends over time"],
    tone: "primary",
    screen: "workout",
  },
  {
    label: "Health",
    title: "One view of everyday health.",
    description:
      "Weight, sleep, steps and biomarkers, kept current and readable — a trend you can act on rather than a number you forget.",
    points: ["Weight, sleep, steps and body composition", "Seven-day trend behind every metric", "Bloodwork captured by photo, not typing"],
    tone: "teal",
    screen: "health",
  },
  {
    label: "AI guidance",
    title: "Guidance, not just numbers.",
    description:
      "Centium reads what you log and tells you what it means — practical, personal, and built into the tracking rather than bolted on beside it.",
    points: ["Personalised insight from your own data", "Log by voice or photo when typing is too slow", "Present in every part of the app, quietly"],
    tone: "primary",
    screen: "ai",
  },
  {
    label: "Community",
    title: "The people around your goals.",
    description:
      "A community of people working toward similar things, and the professionals who can help — reachable from inside the same app you already log in.",
    points: ["Trainers, dietitians, physiotherapists and more", "Share exactly what you choose to share", "Gyms, stores and services in the marketplace"],
    tone: "teal",
    screen: "community",
  },
];

const personas = [
  { title: "Consistent", description: "Shows up regularly and wants a place that keeps up." },
  { title: "Determined", description: "Working toward a specific goal, not tracking for its own sake." },
  { title: "Health enthusiasts", description: "Already deep into fitness and nutrition, want it connected." },
  { title: "Health conscious", description: "Paying attention, looking for one clear place to do it." },
];

const homePlans: Plan[] = [
  {
    key: "professionals",
    badge: "FOR PROFESSIONALS",
    name: "Professionals",
    description: "Trainers, dietitians and physiotherapists managing clients.",
    monthly: 30,
    unit: "per seat / month",
    features: ["Client roster & booking", "Professional dashboard", "Client sharing controls"],
    ctaLabel: "Get Started",
    ctaHref: "/app",
  },
  {
    key: "clients",
    badge: "FOR INDIVIDUALS",
    name: "Clients",
    description: "Everything you need to track and understand your own health.",
    monthly: 15,
    unit: "per month",
    features: ["Nutrition & workout logging", "Health tracking & trends", "AI-powered guidance", "Community & marketplace"],
    ctaLabel: "Get Started",
    ctaHref: "/app",
  },
  {
    key: "business",
    badge: "FOR BUSINESSES",
    name: "Business",
    description: "Gyms, studios, stores and services listing on Centium.",
    monthly: 100,
    unit: "per month + rev share",
    features: ["Marketplace listing", "Employees & classes", "Analytics"],
    ctaLabel: "Talk to us",
    ctaHref: "/contact",
  },
];

export const Home: React.FC = () => {
  useSEO(
    "Your health, all in one place",
    "Centium brings nutrition tracking, workout logging, health tracking, AI-powered guidance and community into one place."
  );
  const canvasRef = useMembraneCanvas();

  return (
    <>
      {/* Hero */}
      <section id="top" className="relative overflow-hidden border-b border-mkt-line" style={{ background: "linear-gradient(#F6F3FC 0%, #FBFAFE 46%, #FFFFFF 100%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-[.92]" aria-hidden="true">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 30% 26% at 50% 38%,rgba(252,251,254,.5) 0%,rgba(252,251,254,.24) 58%,rgba(252,251,254,0) 84%)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(rgba(248,246,253,.35) 0%,rgba(251,250,254,0) 18%,rgba(255,255,255,.32) 84%,#FFFFFF 100%)" }}
          />
        </div>

        <div className="relative z-10 max-w-[1180px] mx-auto px-5 sm:px-10 pt-[132px] sm:pt-[172px] flex flex-col items-center text-center">
          <Reveal>
            <Eyebrow>NUTRITION · TRAINING · HEALTH · AI · COMMUNITY</Eyebrow>
            <h1 className="font-display font-extrabold text-[44px] sm:text-6xl lg:text-[76px] leading-[1.04] lg:leading-[1.02] tracking-[-.03em] lg:tracking-[-.035em] text-mkt-ink mt-5 max-w-[780px]">
              Your health.
              <br />
              All in one place.
            </h1>
            <p className="text-lg leading-relaxed text-mkt-soft mt-6 max-w-[560px] mx-auto">
              Centium brings the tools you already use to manage your health into one place — so staying healthy
              feels less like managing a collection of apps, and more like managing your life.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-9">
              <Link
                to="/app"
                className="tap px-[30px] py-4 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] transition-colors"
              >
                Get Started
              </Link>
              <a
                href="#platform"
                className="tap px-[26px] py-4 rounded-full border border-[#DFDAD2] hover:border-mkt-ink text-mkt-ink font-semibold text-[15px] transition-colors"
              >
                See how it works
              </a>
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

      {/* Capability bar */}
      <section
        className="border-b border-mkt-line"
        style={{ background: "linear-gradient(100deg,#C9BCEC 0%,#CFC6EE 26%,#D2D3E4 50%,#B9DAD3 76%,#A7D2C9 100%)" }}
      >
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10 grid grid-cols-2 sm:grid-cols-5">
          {capabilities.map((label, i) => (
            <div
              key={label}
              className={`py-6 text-center font-semibold text-[13px] text-[#2E2740] ${
                i !== capabilities.length - 1 ? "sm:border-r sm:border-r-[rgba(46,39,64,.12)]" : ""
              } ${i < 4 ? "border-b sm:border-b-0 border-b-[rgba(46,39,64,.12)]" : ""} ${
                i === capabilities.length - 1 ? "col-span-2 sm:col-span-1" : ""
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <Section className="bg-white">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-24 items-center">
          <Reveal>
            <Eyebrow tone="faint">THE PROBLEM</Eyebrow>
            <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px]">
              One hub, not another app to manage.
            </h2>
            <p className="text-[17px] leading-relaxed text-mkt-soft mt-5 max-w-[460px]">
              Multiple subscriptions. Multiple apps. Managing your health today means juggling a different tool
              for every part of it. Centium puts nutrition, training, health data, guidance and community in one
              accessible place.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="flex flex-col">
              {legacyApps.map((a) => (
                <div key={a.name} className="flex items-center justify-between py-[15px] border-t border-mkt-line">
                  <span className="text-base text-[#A9A29A] line-through">{a.name}</span>
                  <span className="text-xs text-[#C3BCB2]">{a.note}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-[22px] px-6 mt-[22px] rounded-2xl bg-mkt-tint border-t border-b-0 border-mkt-line">
                <span className="font-bold text-[17px] tracking-tight text-mkt-ink">Centium</span>
                <span className="font-semibold text-xs tracking-[.14em] text-mkt-accent">ONE PLACE</span>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Platform — scroll-pinned showcase */}
      <div id="platform-track" className="relative">
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
                  Five pillars, one place to check in on all of them — and one history that stays connected.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="mt-11">
              <TabShowcase tabs={platformTabs} scrollPin={{ sectionId: "platform", trackId: "platform-track" }} />
            </Reveal>
          </div>
        </section>
      </div>

      {/* AI dark band */}
      <Section className="bg-mkt-dark" navDark>
        <Reveal>
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div>
              <Eyebrow tone="dark-accent">AI-POWERED GUIDANCE</Eyebrow>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-dark-ink mt-[18px]">
                It reads your data, so you don't have to.
              </h2>
              <p className="text-[17px] leading-relaxed text-mkt-dark-soft mt-5 max-w-[440px]">
                Centium turns everything you log into something you can act on today — what changed, what it
                means, and what to do next. The same intelligence runs through nutrition, training and health.
              </p>
              <div className="flex flex-wrap gap-8 mt-9 pt-7 border-t border-mkt-dark-line">
                <div>
                  <div className="font-extrabold text-[15px] text-mkt-dark-ink">Voice & photo logging</div>
                  <div className="text-[13.5px] text-mkt-dark-soft/70 mt-1.5">Speak a meal, snap a label</div>
                </div>
                <div>
                  <div className="font-extrabold text-[15px] text-mkt-dark-ink">Always in context</div>
                  <div className="text-[13.5px] text-mkt-dark-soft/70 mt-1.5">Never a separate chatbot tab</div>
                </div>
              </div>
            </div>
            <div className="h-[300px] sm:h-[420px] rounded-3xl overflow-hidden border border-mkt-dark-line bg-mkt-dark-surface">
              <AppScreen variant="ai" dark />
            </div>
          </div>
        </Reveal>
      </Section>

      {/* Personas */}
      <section
        className="py-20 sm:py-28 border-b border-mkt-line"
        style={{ background: "linear-gradient(100deg,#EEE9FA 0%,#F1EDFB 28%,#F4F4F7 52%,#E6F3F0 78%,#DCEFEA 100%)" }}
      >
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
          <Reveal>
            <Eyebrow tone="faint">WHO IT'S FOR</Eyebrow>
            <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px] mb-11 max-w-[560px]">
              Built for people who show up.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-t-[rgba(46,39,64,.12)]">
              {personas.map((p, i) => (
                <div
                  key={p.title}
                  className={`pt-8 pb-0 pr-0 lg:pr-7 ${i !== 0 ? "lg:border-l lg:border-l-[rgba(46,39,64,.12)] lg:pl-7" : ""}`}
                >
                  <div className="font-bold text-lg tracking-tight text-mkt-ink">{p.title}</div>
                  <p className="text-[15px] leading-relaxed text-mkt-soft mt-2.5">{p.description}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Business */}
      <Section className="bg-white">
        <Reveal>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
            <div>
              <Eyebrow tone="teal">B2B + B2C</Eyebrow>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px] max-w-[600px]">
                Trainers, dietitians, gyms and businesses too.
              </h2>
            </div>
            <Link
              to="/business"
              className="tap shrink-0 px-[26px] py-[15px] rounded-full border border-[#DFDAD2] hover:border-mkt-ink text-mkt-ink font-semibold text-[15px] transition-colors"
            >
              Explore for Business
            </Link>
          </div>
        </Reveal>
        <div className="grid lg:grid-cols-2 gap-5">
          <Reveal>
            <div className="border border-mkt-line hover:border-mkt-accent-ring rounded-3xl p-9 transition-colors">
              <div className="font-bold text-xl tracking-tight text-mkt-ink">For professionals</div>
              <p className="text-base leading-relaxed text-mkt-soft mt-3">
                Manage your client roster, bookings and the health data clients choose to share — billed monthly
                or yearly, per seat.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                {["Personal trainers", "Dietitians", "Physiotherapists"].map((t) => (
                  <span key={t} className="px-3.5 py-2 rounded-full bg-mkt-tint text-mkt-accent-hover font-semibold text-[13px]">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-7 h-[210px] rounded-2xl overflow-hidden bg-mkt-wash2 border border-mkt-line">
                <AppScreen variant="roster" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="border border-mkt-line hover:border-[#A8CCC6] rounded-3xl p-9 transition-colors">
              <div className="font-bold text-xl tracking-tight text-mkt-ink">For businesses</div>
              <p className="text-base leading-relaxed text-mkt-soft mt-3">
                List your gym, store or service where people already track their health — billed monthly or
                yearly, plus a share of revenue generated through Centium.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                {["Gyms & studios", "Equipment & supplements", "Meal prep"].map((t) => (
                  <span key={t} className="px-3.5 py-2 rounded-full bg-mkt-teal-tint text-mkt-teal font-semibold text-[13px]">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-7 h-[210px] rounded-2xl overflow-hidden bg-mkt-wash2 border border-mkt-line">
                <AppScreen variant="listing" />
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Pricing preview */}
      <section
        className="py-20 sm:py-28 border-t border-t-[#DEEBE7] border-b border-b-[#DEEBE7]"
        style={{ background: "linear-gradient(160deg,#E4F1EE 0%,#EAF4F1 46%,#EEF3F5 78%,#EFEDF8 100%)" }}
      >
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
          <Reveal className="text-center max-w-[560px] mx-auto mb-11">
            <Eyebrow className="mx-auto">PRICING</Eyebrow>
            <h2 className="font-display font-extrabold text-[32px] sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-[18px]">
              Plans for however you use Centium.
            </h2>
            <p className="text-base leading-relaxed text-mkt-soft mt-[18px]">Indicative pricing — final rates are announced at launch.</p>
          </Reveal>
          <Reveal delay={0.08}>
            <PlanPicker plans={homePlans} defaultSelected={1} />
          </Reveal>
        </div>
      </section>

      {/* Vision */}
      <Section className="bg-white text-center" narrow>
        <Reveal>
          <Eyebrow tone="faint" className="mx-auto">
            WHERE WE'RE HEADED
          </Eyebrow>
          <h2 className="font-display font-extrabold text-[34px] sm:text-[52px] leading-[1.1] tracking-[-.032em] text-mkt-ink mt-5">
            One ecosystem for everyday health — not ten apps.
          </h2>
          <p className="text-lg leading-relaxed text-mkt-soft mt-6 max-w-xl mx-auto">
            Track your progress, understand your habits, work toward your goals, and connect with the right
            people and resources — without needing a different app for every part of your health.
          </p>
          <div className="flex flex-wrap justify-center gap-7 items-center mt-11 font-semibold text-[13px] tracking-[.1em] text-mkt-faint">
            <span>WELLNESS</span>
            <span className="text-[#DDD8D0]">·</span>
            <span>LUXURY</span>
            <span className="text-[#DDD8D0]">·</span>
            <span>EASY ON THE EYE</span>
            <span className="text-[#DDD8D0]">·</span>
            <span>INTERNATIONAL</span>
          </div>
        </Reveal>
      </Section>

      {/* Final CTA */}
      <Section className="bg-mkt-tint border-t border-[#E7E1F6] text-center">
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
            <a
              href="#platform"
              className="tap px-[26px] py-4 rounded-full border border-[#CFC5EA] hover:border-mkt-accent text-mkt-ink font-semibold text-[15px] transition-colors"
            >
              See the product
            </a>
          </div>
          <p className="text-[13.5px] text-mkt-faint mt-5">A product prototype — not yet available for download.</p>
        </Reveal>
      </Section>
    </>
  );
};
