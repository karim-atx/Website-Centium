import React from "react";
import { Link } from "react-router-dom";
import { Utensils, Dumbbell, HeartPulse, Sparkles, Users, ArrowRight } from "lucide-react";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { FeatureCard } from "../components/FeatureCard";
import { HeroIllustration } from "../components/illustrations/HeroIllustration";
import { UnifyDiagram } from "../components/illustrations/UnifyDiagram";
import { Button } from "../../components/ui/Button";
import { useSEO } from "../useSEO";

const pillars = [
  {
    icon: <Utensils size={20} />,
    title: "Nutrition tracking",
    description: "Log meals and understand what you're eating without switching apps to do it.",
    tone: "primary" as const,
  },
  {
    icon: <Dumbbell size={20} />,
    title: "Workout logging",
    description: "Track training and progress in the same place you track everything else about your health.",
    tone: "teal" as const,
  },
  {
    icon: <HeartPulse size={20} />,
    title: "Health tracking",
    description: "Weight, sleep, steps and more — one view of your everyday health, kept current.",
    tone: "primary" as const,
  },
  {
    icon: <Sparkles size={20} />,
    title: "AI-powered guidance",
    description: "Practical, personalized help making sense of your data and what to do with it.",
    tone: "teal" as const,
  },
  {
    icon: <Users size={20} />,
    title: "Community & professionals",
    description: "Access to a community of people and professionals, not just a log of numbers.",
    tone: "primary" as const,
  },
];

const personas = [
  { title: "Consistent", description: "Shows up regularly and wants a place that keeps up with them." },
  { title: "Determined", description: "Working toward a specific goal, not just tracking for the sake of it." },
  { title: "Health enthusiasts", description: "Already deep into fitness and nutrition, want it all connected." },
  { title: "Health conscious", description: "Paying attention to their health and looking for one clear place to do it." },
];

export const Home: React.FC = () => {
  useSEO(
    "Your health, all in one place",
    "Centium brings nutrition tracking, workout logging, health tracking, AI-powered guidance and community into one place."
  );

  return (
    <>
      {/* Hero */}
      <Section className="pt-14 sm:pt-20 pb-16 sm:pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <Reveal>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] text-charcoal tracking-tight">
              Your health.
              <br />
              All in one place.
            </h1>
            <p className="text-charcoal-soft text-lg leading-relaxed mt-6 max-w-md">
              Centium brings the tools you already use to manage your health — nutrition, workouts, health
              tracking, AI guidance and community — into one place, so staying healthy feels less like
              managing a collection of apps and more like managing your life.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-9">
              <Button size="lg" onClick={() => (window.location.href = "/app")}>
                Get Started
              </Button>
              <Link
                to="/product"
                className="tap inline-flex items-center gap-1.5 px-5 py-4 rounded-2xl text-sm font-semibold text-charcoal hover:bg-cream-soft"
              >
                See how it works <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <HeroIllustration className="w-full max-w-md mx-auto" />
          </Reveal>
        </div>
      </Section>

      {/* Problem */}
      <Section className="bg-cream-soft/60">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal className="order-2 lg:order-1">
            <UnifyDiagram />
          </Reveal>
          <Reveal className="order-1 lg:order-2">
            <p className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">The problem</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal tracking-tight mb-4">
              One hub, not another app to manage
            </h2>
            <p className="text-charcoal-soft text-base leading-relaxed max-w-lg">
              Multiple subscriptions. Multiple apps. Managing your health today means juggling a different
              tool for every part of it — Centium avoids the multi-app shuffle by putting nutrition,
              training, health data, guidance and community in one accessible place.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* Pillars */}
      <Section>
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal tracking-tight mb-4">
            Everything health, together
          </h2>
          <p className="text-charcoal-soft text-base leading-relaxed">
            Five pillars, one place to check in on all of them.
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.05}>
              <FeatureCard icon={p.icon} title={p.title} description={p.description} tone={p.tone} />
            </Reveal>
          ))}
          <Reveal delay={pillars.length * 0.05}>
            <Link
              to="/product"
              className="tap h-full rounded-3xl border-2 border-dashed border-primary/25 p-6 sm:p-7 flex flex-col items-center justify-center text-center gap-2 hover:border-primary/50 transition-colors"
            >
              <span className="font-display font-bold text-primary-dark">See the full product</span>
              <span className="text-sm text-charcoal-faint flex items-center gap-1">
                All features <ArrowRight size={14} />
              </span>
            </Link>
          </Reveal>
        </div>
      </Section>

      {/* Personas */}
      <Section className="bg-cream-soft/60">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-bold uppercase tracking-wide text-teal-dark mb-3">Who it's for</p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal tracking-tight">
            Built for people who show up
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {personas.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.05}>
              <div className="rounded-3xl bg-cream-card p-6 h-full shadow-soft">
                <h3 className="font-display font-bold text-charcoal text-base mb-1.5">{p.title}</h3>
                <p className="text-sm text-charcoal-soft leading-relaxed">{p.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Vision */}
      <Section narrow className="text-center">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Where we're headed</p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal tracking-tight mb-5">
            One ecosystem, not ten apps
          </h2>
          <p className="text-charcoal-soft text-base leading-relaxed">
            We want Centium to grow into a health ecosystem where people can track their progress, understand
            their habits, work toward their goals, and connect with the right resources and professionals —
            all without needing a different app for every part of their health.
          </p>
        </Reveal>
      </Section>

      {/* B2B teaser */}
      <Section className="bg-cream-soft/60">
        <Reveal className="rounded-[2.5rem] bg-cream-card shadow-soft px-8 py-12 sm:px-14 sm:py-16 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-lg">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-charcoal tracking-tight mb-3">
              Trainers, dietitians, gyms and businesses too
            </h2>
            <p className="text-charcoal-soft text-base leading-relaxed">
              Centium isn't just for individuals — professionals and businesses get their own tools to manage
              clients, listings and offers on the same platform.
            </p>
          </div>
          <Link to="/business" className="tap shrink-0">
            <Button variant="outline" size="lg">
              Explore for Business
            </Button>
          </Link>
        </Reveal>
      </Section>

      {/* Final CTA */}
      <Section narrow className="text-center pb-28">
        <Reveal>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal tracking-tight mb-6">
            Ready to bring it all together?
          </h2>
          <Button size="lg" onClick={() => (window.location.href = "/app")}>
            Get Started
          </Button>
        </Reveal>
      </Section>
    </>
  );
};
