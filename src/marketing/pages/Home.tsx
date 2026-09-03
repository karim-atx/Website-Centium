import React from "react";
import { Link } from "react-router-dom";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { TabShowcase, type ShowcaseTab } from "../components/TabShowcase";
import { PlanPicker, type Plan } from "../components/PlanPicker";
import { FaqAccordion } from "../components/FaqAccordion";
import { PhoneShell } from "../components/illustrations/PhoneShell";
import { AppScreen } from "../components/illustrations/AppScreen";
import { useMembraneCanvas } from "../hooks/useMembraneCanvas";
import { useSEO } from "../useSEO";

const capabilities = ["Nutrition tracking", "Workout logging", "Health tracking", "Community & professionals"];

const legacyApps = [
  { name: "A nutrition app", note: "Costly" },
  { name: "A workout app", note: "Generic" },
  { name: "A health app", note: "Discrepancies" },
  { name: "A messenger app", note: "Elsewhere" },
  { name: "A spreadsheet you stopped filling", note: "Inconsistency" },
];

const platformTabs: ShowcaseTab[] = [
  {
    label: "Nutrition",
    title: "Meal logging, made effortless.",
    description:
      "Nutrition and training have always gone hand in hand. Centium brings them together with your health metrics, giving you a clearer picture of how everything is connected.",
    points: ["Extensive food database, always at your fingertips", "Nutrition goals that adapt to you, not the other way around.", "Log less, eat better."],
    tone: "primary",
    screen: "nutrition",
  },
  {
    label: "Workouts",
    title: "Train today. Track yesterday. Progress tomorrow.",
    description: "Meticulous where it matters, simple where it should be. Built for every level of athlete.",
    points: ["Thousands of exercises. Endless ways to train.", "Every set, every rep, every metric, tracked live.", "See the trends. Find your next breakthrough."],
    tone: "primary",
    screen: "workout",
  },
  {
    label: "Health",
    title: "Your health, always at the forefront.",
    description:
      "All your health metrics and medical information, kept up to date, easy to read and built to drive action.",
    points: ["Every metric tracked. Every trend analyzed.", "Your health hub, all your information, one clear picture.", "Connected care, guided by established health standards."],
    tone: "teal",
    screen: "health",
  },
  {
    label: "Community",
    title: "One ecosystem. Every specialist.",
    description: "Progress faster, together. Expert guidance gets you there.",
    points: ["Trainers, dietitians and more, seamlessly connected to your health journey.", "Share what matters, on your terms.", "A marketplace built to take your fitness further."],
    tone: "teal",
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

const personas = [
  { title: "Consistent", description: "Shows up, puts in the work, and wants a platform that keeps up." },
  { title: "Determined", description: "Knows where they want to go and wants everything connected to get there." },
  { title: "Intentional", description: "Pays attention to the details that shape their health and wants them all in one place." },
  { title: "Proactive", description: "Wants to understand their health, act on it, and keep moving forward." },
];

const homePlans: Plan[] = [
  {
    key: "professionals",
    badge: "FOR PROFESSIONALS",
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
    badge: "FOR INDIVIDUALS",
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
    badge: "FOR BUSINESSES",
    name: "Business",
    description: "Unlock new opportunities. Scale your business with Centium.",
    monthly: 100,
    unit: "per month + rev share",
    features: ["Marketplace Visibility", "Team Operations", "Growth Analytics"],
    ctaLabel: "Talk to us",
    ctaHref: "/contact",
  },
];

export const Home: React.FC = () => {
  useSEO(
    "Your health, all in one place",
    "Centium brings nutrition tracking, workout logging, health tracking and community into one place."
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

      {/* Capability bar */}
      <section
        className="border-b border-mkt-line"
        style={{ background: "linear-gradient(100deg,#C9BCEC 0%,#CFC6EE 26%,#D2D3E4 50%,#B9DAD3 76%,#A7D2C9 100%)" }}
      >
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10 grid grid-cols-2 sm:grid-cols-4">
          {capabilities.map((label, i) => (
            <div
              key={label}
              className={`py-6 text-center font-semibold text-[13px] text-[#2E2740] border-r-[rgba(46,39,64,.12)] border-b-[rgba(46,39,64,.12)] ${
                i % 2 === 0 ? "border-r" : ""
              } ${i !== capabilities.length - 1 ? "sm:border-r" : "sm:border-r-0"} ${
                i < 2 ? "border-b sm:border-b-0" : ""
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
              Health shouldn't feel like a chore. No more jumping between apps, subscriptions and platforms just
              to keep track of your progress. Centium brings it all together in one place, so you can spend less
              time managing your health and more time improving it.
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

      {/* FAQ — replaces the deleted AI-powered guidance section and the
          standalone About page, per QA - Web 2.0 §06. */}
      <Section id="faq" className="bg-white border-t border-mkt-line scroll-mt-[88px]" narrow>
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

      {/* Beyond the individual (was B2B + B2C) */}
      <Section className="bg-white">
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
            <div className="border border-mkt-line hover:border-mkt-accent-ring rounded-3xl p-9 transition-colors">
              <div className="font-bold text-xl tracking-tight text-mkt-ink">For professionals</div>
              <p className="text-base leading-relaxed text-mkt-soft mt-3">
                Your clients, your plans, one seamless system. Manage everything from their health data to
                workouts and nutrition, with updates flowing straight to their app.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                {["Personal trainers", "Dietitians", "Physiotherapists", "General Practitioners"].map((t) => (
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
                Put your gym, classes and services on the map, digitize memberships, connect with professionals
                and gain insights through client analytics.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                {["Gyms & studios", "Equipment & supplements", "Meal prep services", "Activewear"].map((t) => (
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
        id="pricing"
        className="py-20 sm:py-28 border-t border-t-[#DEEBE7] border-b border-b-[#DEEBE7] scroll-mt-[88px]"
        style={{ background: "linear-gradient(160deg,#E4F1EE 0%,#EAF4F1 46%,#EEF3F5 78%,#EFEDF8 100%)" }}
      >
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
            <Link
              to="/contact"
              className="tap px-[26px] py-4 rounded-full border border-[#CFC5EA] hover:border-mkt-accent text-mkt-ink font-semibold text-[15px] transition-colors"
            >
              Request a Demo
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
};
