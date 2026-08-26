import React from "react";
import { Utensils, HeartPulse, Sparkles, Users, Store, Briefcase } from "lucide-react";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { BlobBackdrop } from "../components/illustrations/BlobBackdrop";
import { Button } from "../../components/ui/Button";
import { useSEO } from "../useSEO";

const modules: {
  icon: React.ReactNode;
  title: string;
  description: string;
  points: string[];
  tone: "primary" | "teal";
}[] = [
  {
    icon: <Utensils size={22} />,
    title: "Nutrition & workout logging",
    description:
      "Log meals and training in the same place — no switching between a food app and a fitness app to see the full picture.",
    points: ["Meal logging", "Workout & routine logging", "Progress over time"],
    tone: "primary",
  },
  {
    icon: <HeartPulse size={22} />,
    title: "Health tracking",
    description: "Everyday health metrics kept current, so you always know where you stand.",
    points: ["Weight, sleep & steps", "Trends over time", "One view of your health"],
    tone: "teal",
  },
  {
    icon: <Sparkles size={22} />,
    title: "AI-powered guidance",
    description: "Practical, personalized help making sense of your data — not just numbers on a screen.",
    points: ["Personalized guidance", "Helps you act on your data", "Built into everyday logging"],
    tone: "primary",
  },
  {
    icon: <Users size={22} />,
    title: "Community & professionals",
    description: "Connect with a community of people working toward similar goals, and the professionals who can help.",
    points: ["Community access", "Personal trainers, dietitians, physiotherapists & more", "Direct connection to professionals"],
    tone: "teal",
  },
  {
    icon: <Store size={22} />,
    title: "Marketplace",
    description: "Discover gyms, stores and services from the same place you manage your health.",
    points: ["Gyms & studios", "Clothing, equipment & supplements", "Wellness services & meal prepping"],
    tone: "primary",
  },
  {
    icon: <Briefcase size={22} />,
    title: "Professional booking & jobs",
    description: "Book time with professionals, and a jobs layer connecting the wider health & wellness ecosystem.",
    points: ["Book professionals directly", "Manage bookings in one place", "Jobs — part of the wider ecosystem"],
    tone: "teal",
  },
];

export const Product: React.FC = () => {
  useSEO(
    "Product",
    "Nutrition and workout logging, health tracking, AI guidance, community, marketplace and professional booking — all in Centium."
  );

  return (
    <>
      <Section className="pt-14 sm:pt-20 pb-12 relative overflow-hidden">
        <BlobBackdrop className="absolute -top-20 -right-20 w-[480px] opacity-60" />
        <Reveal className="relative max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Product</p>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-charcoal tracking-tight mb-5">
            Everything you need, nowhere else to go
          </h1>
          <p className="text-charcoal-soft text-lg leading-relaxed">
            One simple place to understand, manage and improve your health — combining everyday tracking with
            practical tools, AI-powered assistance, and access to a community of people and professionals.
          </p>
        </Reveal>
      </Section>

      <Section className="pt-0">
        <div className="flex flex-col gap-5">
          {modules.map((m, i) => (
            <Reveal key={m.title} delay={i * 0.04}>
              <div className="rounded-3xl bg-cream-card shadow-soft p-7 sm:p-9 flex flex-col sm:flex-row gap-6 sm:gap-9">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    m.tone === "primary" ? "bg-primary-pale text-primary-dark" : "bg-teal-pale text-teal-dark"
                  }`}
                >
                  {m.icon}
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-charcoal mb-2">{m.title}</h2>
                  <p className="text-charcoal-soft leading-relaxed mb-4 max-w-xl">{m.description}</p>
                  <ul className="flex flex-wrap gap-2">
                    {m.points.map((p) => (
                      <li
                        key={p}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                          m.tone === "primary" ? "bg-primary-pale text-primary-dark" : "bg-teal-pale text-teal-dark"
                        }`}
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section narrow className="text-center">
        <Reveal>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal tracking-tight mb-6">
            See it for yourself
          </h2>
          <Button size="lg" onClick={() => (window.location.href = "/app")}>
            Get Started
          </Button>
        </Reveal>
      </Section>
    </>
  );
};
