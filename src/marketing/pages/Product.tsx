import React from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { StickyIndex } from "../components/StickyIndex";
import { AppScreen } from "../components/illustrations/AppScreen";
import { useSEO } from "../useSEO";

const modules: {
  id: string;
  index: string;
  title: string;
  description: string;
  points: string[];
  tone: "primary" | "teal";
  screen: Parameters<typeof AppScreen>[0]["variant"];
  dark?: boolean;
}[] = [
  {
    id: "nutrition-training",
    index: "01",
    title: "Nutrition & training",
    description:
      "Log meals and training in the same place — no switching between a food app and a fitness app to see the full picture.",
    points: ["Meal logging with custom foods and macros", "Workout & routine logging", "Progress over time, in one history"],
    tone: "primary",
    screen: "nutrition",
  },
  {
    id: "health",
    index: "02",
    title: "Health tracking",
    description: "Everyday health metrics kept current, so you always know where you stand.",
    points: ["Weight, sleep & steps", "Trends over time", "One view of your everyday health"],
    tone: "teal",
    screen: "health",
  },
  {
    id: "ai",
    index: "03",
    title: "AI guidance",
    description: "Practical, personalized help making sense of your data — not just numbers on a screen.",
    points: ["Personalised guidance from your own data", "Helps you act on it, not just see it", "Built into everyday logging"],
    tone: "primary",
    screen: "ai",
    dark: true,
  },
  {
    id: "community",
    index: "04",
    title: "Community & professionals",
    description: "Connect with a community of people working toward similar goals, and the professionals who can help.",
    points: ["Community access", "Trainers, dietitians, physiotherapists & more", "Direct connection to professionals"],
    tone: "teal",
    screen: "community",
  },
  {
    id: "marketplace",
    index: "05",
    title: "Marketplace",
    description: "Discover gyms, stores and services from the same place you manage your health.",
    points: ["Gyms & studios", "Clothing, equipment & supplements", "Wellness services & meal prepping"],
    tone: "primary",
    screen: "listing",
  },
  {
    id: "booking",
    index: "06",
    title: "Booking & jobs",
    description: "Book time with professionals, and a jobs layer connecting the wider health & wellness ecosystem.",
    points: ["Book professionals directly", "Manage bookings in one place", "Jobs — part of the wider ecosystem"],
    tone: "teal",
    screen: "roster",
  },
];

export const Product: React.FC = () => {
  useSEO(
    "Product",
    "Nutrition and workout logging, health tracking, AI guidance, community, marketplace and professional booking — all in Centium."
  );

  return (
    <>
      <Section className="pt-32 sm:pt-[168px] pb-10 bg-mkt-wash">
        <Reveal className="max-w-xl">
          <Eyebrow>PRODUCT</Eyebrow>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-[58px] leading-[1.05] tracking-[-.03em] text-mkt-ink mt-5">
            Everything you need, nowhere else to go.
          </h1>
          <p className="text-lg leading-relaxed text-mkt-soft mt-5">
            One simple place to understand, manage and improve your health — combining everyday tracking with
            practical tools, AI-powered assistance, and access to a community of people and professionals.
          </p>
        </Reveal>
      </Section>

      <Section className="pt-0 pb-0">
        <div className="flex gap-14">
          <StickyIndex items={modules.map((m) => ({ id: m.id, label: m.title }))} />
          <div className="flex-1 flex flex-col min-w-0">
            {modules.map((m, i) => (
              <div
                key={m.id}
                id={m.id}
                data-nav-dark={m.dark ? "" : undefined}
                className={clsx(
                  "py-16 sm:py-20 scroll-mt-28",
                  i !== 0 && "border-t border-mkt-line",
                  m.dark && "bg-mkt-dark -mx-5 sm:-mx-10 px-5 sm:px-10 rounded-3xl my-4 border-t-0"
                )}
              >
                <Reveal delay={0.04}>
                  <div className={clsx("grid lg:grid-cols-2 gap-10 items-center", i % 2 === 1 && "lg:[&>*:first-child]:order-2")}>
                    <div>
                      <span className={clsx("font-semibold text-[13px] tracking-wide", m.dark ? "text-mkt-dark-accent" : "text-mkt-accent-ring")}>
                        {m.index}
                      </span>
                      <h2
                        className={clsx(
                          "font-display font-bold text-2xl sm:text-[28px] tracking-tight mt-2",
                          m.dark ? "text-mkt-dark-ink" : "text-mkt-ink"
                        )}
                      >
                        {m.title}
                      </h2>
                      <p className={clsx("leading-relaxed mt-3 max-w-md", m.dark ? "text-mkt-dark-soft" : "text-mkt-soft")}>
                        {m.description}
                      </p>
                      <ul className="flex flex-wrap gap-2 mt-5">
                        {m.points.map((p) => (
                          <li
                            key={p}
                            className={clsx(
                              "text-xs font-semibold px-3 py-1.5 rounded-full",
                              m.dark
                                ? "bg-white/10 text-mkt-dark-ink"
                                : m.tone === "primary"
                                ? "bg-mkt-tint text-mkt-accent-hover"
                                : "bg-mkt-teal-tint text-mkt-teal"
                            )}
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div
                      className={clsx(
                        "h-[220px] sm:h-[280px] rounded-2xl overflow-hidden border",
                        m.dark ? "border-mkt-dark-line bg-mkt-dark-surface" : "border-mkt-line bg-mkt-wash2"
                      )}
                    >
                      <AppScreen variant={m.screen} dark={m.dark} />
                    </div>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section narrow className="text-center">
        <Reveal>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-mkt-ink tracking-tight mb-7">See it for yourself</h2>
          <Link
            to="/app"
            className="tap inline-block px-8 py-4 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] transition-colors"
          >
            Get Started
          </Link>
        </Reveal>
      </Section>
    </>
  );
};
