import React from "react";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { BlobBackdrop } from "../components/illustrations/BlobBackdrop";
import { useSEO } from "../useSEO";

export const About: React.FC = () => {
  useSEO("About", "Centium's purpose, mission and vision — one place to understand, manage and improve your health.");

  return (
    <>
      <Section className="pt-14 sm:pt-20 pb-6 relative overflow-hidden">
        <BlobBackdrop className="absolute -top-24 -left-24 w-[440px] opacity-50" flip />
        <Reveal className="relative max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">About</p>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-charcoal tracking-tight mb-5">
            Why Centium exists
          </h1>
          <p className="text-charcoal-soft text-lg leading-relaxed">
            Centium brings the things people already use to manage their health — nutrition, workouts, health
            tracking, guidance, and community — into one place, so staying healthy feels less like managing a
            collection of apps and more like managing your life.
          </p>
        </Reveal>
      </Section>

      <Section>
        <div className="grid sm:grid-cols-2 gap-5">
          <Reveal>
            <div className="rounded-3xl bg-cream-card shadow-soft p-8 sm:p-10 h-full">
              <p className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Mission</p>
              <h2 className="font-display font-bold text-2xl text-charcoal mb-4">
                To give people one simple place to understand, manage, and improve their health.
              </h2>
              <p className="text-charcoal-soft leading-relaxed">
                We combine everyday health tracking with practical tools, AI-powered assistance, nutrition and
                workout logging, and access to a community of people and professionals. Our goal is to make
                better health easier to understand, easier to act on, and easier to stick with.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="rounded-3xl bg-cream-card shadow-soft p-8 sm:p-10 h-full">
              <p className="text-sm font-bold uppercase tracking-wide text-teal-dark mb-3">Vision</p>
              <h2 className="font-display font-bold text-2xl text-charcoal mb-4">
                To become the place people turn to for their everyday health.
              </h2>
              <p className="text-charcoal-soft leading-relaxed">
                We want Centium to grow into a health ecosystem where people can track their progress,
                understand their habits, work toward their goals, and connect with the right resources and
                professionals — all without needing a different app for every part of their health.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="bg-cream-soft/60" narrow>
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Brand feel</p>
          <h2 className="font-display font-extrabold text-3xl text-charcoal tracking-tight mb-8">
            Wellness. Luxury. Easy on the eye. International.
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["Wellness", "Luxury", "Easy on the eye", "International"].map((w) => (
              <span key={w} className="px-4 py-2 rounded-full bg-cream-card shadow-soft text-sm font-semibold text-charcoal-soft">
                {w}
              </span>
            ))}
          </div>
        </Reveal>
      </Section>
    </>
  );
};
