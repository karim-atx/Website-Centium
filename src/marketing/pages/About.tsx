import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { PhotoPanel } from "../components/illustrations/PhotoPanel";
import { useSEO } from "../useSEO";

// Relative (no leading slash) so these resolve against the runtime <base>
// injected in index.html, which differs by deployment prefix (raw GitHub
// Pages vs. atraxia.org/centium/) — see vite.config.ts / index.html.
const team = [
  { name: "Karim Khaldi", role: "Co-Founder", photo: "atraxia/founder-karim-khaldi.jpg" },
  { name: "Abdallah Diab", role: "Co-Founder", photo: "atraxia/founder-abdallah-diab.jpg" },
];

export const About: React.FC = () => {
  useSEO("About", "Centium's purpose, mission and vision — one place to understand, manage and improve your health.");

  return (
    <>
      <Section className="pt-14 sm:pt-20 pb-10 bg-mkt-wash">
        <Reveal className="max-w-2xl">
          <Eyebrow>ABOUT</Eyebrow>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-mkt-ink tracking-tight mt-5">Why Centium exists</h1>
          <p className="text-lg leading-relaxed text-mkt-soft mt-5">
            Centium brings the things people already use to manage their health — nutrition, workouts, health
            tracking, guidance, and community — into one place, so staying healthy feels less like managing a
            collection of apps and more like managing your life.
          </p>
        </Reveal>
      </Section>

      <Section className="bg-white border-t border-mkt-line">
        <Reveal className="text-center">
          <Eyebrow tone="faint" className="mx-auto">
            MISSION
          </Eyebrow>
          <p className="font-display font-extrabold text-[26px] sm:text-4xl leading-[1.25] tracking-tight text-mkt-ink mt-6 max-w-3xl mx-auto">
            To give people one simple place to understand, manage and improve their health — combining everyday
            tracking, AI-powered assistance, and access to a community of people and professionals.
          </p>
        </Reveal>
      </Section>

      <div className="grid lg:grid-cols-2 border-t border-mkt-line">
        <Reveal className="min-h-[240px] lg:min-h-[360px]">
          <PhotoPanel icon={<Sparkles size={22} />} tone="teal" className="w-full h-full" />
        </Reveal>
        <Reveal delay={0.06} className="flex items-center py-14 px-5 sm:px-10">
          <div>
            <Eyebrow tone="teal">VISION</Eyebrow>
            <h2 className="font-display font-bold text-2xl sm:text-[28px] text-mkt-ink tracking-tight mt-3">
              To become the place people turn to for their everyday health.
            </h2>
            <p className="text-base leading-relaxed text-mkt-soft mt-3 max-w-md">
              We want Centium to grow into a health ecosystem where people can track their progress, understand
              their habits, work toward their goals, and connect with the right resources and professionals — all
              without needing a different app for every part of their health.
            </p>
          </div>
        </Reveal>
      </div>

      <Section className="bg-mkt-dark text-center">
        <Reveal className="flex flex-col items-center gap-3.5">
          <span className="font-semibold text-[11px] tracking-[.22em] text-mkt-dark-accent">BRAND FEEL</span>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-5 items-center mt-1">
            {["Wellness", "Luxury", "Easy on the eye", "International"].map((w, i, arr) => (
              <React.Fragment key={w}>
                <span className="font-bold text-sm sm:text-[15px] tracking-[.06em] text-mkt-dark-ink">{w}</span>
                {i < arr.length - 1 && <span className="text-mkt-dark-line">·</span>}
              </React.Fragment>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section className="bg-white">
        <Reveal>
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display font-bold text-2xl text-mkt-ink tracking-tight">The team</h2>
            <span className="font-semibold text-[11px] tracking-[.16em] text-mkt-faint">FOUNDERS</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-xl">
            {team.map((t) => (
              <div key={t.name} className="flex items-center gap-4">
                <img src={t.photo} alt={t.name} className="w-14 h-14 rounded-full object-cover border border-mkt-line" />
                <div>
                  <div className="font-bold text-[15px] text-mkt-ink">{t.name}</div>
                  <div className="text-[13px] text-mkt-faint mt-0.5">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section className="bg-mkt-tint border-t border-[#E7E1F6] text-center">
        <Reveal className="flex flex-col items-center">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-mkt-ink tracking-tight mb-7">
            Ready to bring it all together?
          </h2>
          <Link
            to="/app"
            className="tap px-8 py-4 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] transition-colors"
          >
            Get Started
          </Link>
        </Reveal>
      </Section>
    </>
  );
};
