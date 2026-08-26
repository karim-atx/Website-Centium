import React from "react";
import { Stethoscope, Dumbbell as DumbbellIcon, Activity, UserCog, Shirt, Wrench, Pill, ChefHat, Sparkles as SparklesIcon } from "lucide-react";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { NetworkDiagram } from "../components/illustrations/NetworkDiagram";
import { Button } from "../../components/ui/Button";
import { useSEO } from "../useSEO";

const professionals = [
  { icon: <DumbbellIcon size={18} />, label: "Personal Trainers" },
  { icon: <Activity size={18} />, label: "Dietitians" },
  { icon: <UserCog size={18} />, label: "Physiotherapists" },
  { icon: <Stethoscope size={18} />, label: "GPs & other professionals" },
];

const businesses = [
  { icon: <DumbbellIcon size={18} />, label: "Gyms" },
  { icon: <Shirt size={18} />, label: "Clothing stores" },
  { icon: <Wrench size={18} />, label: "Equipment stores" },
  { icon: <Pill size={18} />, label: "Supplement stores" },
  { icon: <ChefHat size={18} />, label: "Meal prepping services" },
  { icon: <SparklesIcon size={18} />, label: "Wellness services" },
];

export const Business: React.FC = () => {
  useSEO(
    "For Professionals & Businesses",
    "Centium for personal trainers, dietitians, physiotherapists, gyms and businesses — client tools, listings and seat- or revenue-based billing."
  );

  return (
    <>
      <Section className="pt-14 sm:pt-20 pb-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">For Business</p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-charcoal tracking-tight mb-5">
              Bring your clients and listings into Centium
            </h1>
            <p className="text-charcoal-soft text-lg leading-relaxed max-w-md">
              Centium is B2B and B2C — professionals manage clients and businesses manage listings on the same
              platform their clients already use to track their health.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <NetworkDiagram className="max-w-lg mx-auto" />
          </Reveal>
        </div>
      </Section>

      <Section className="bg-cream-soft/60">
        <div className="grid lg:grid-cols-2 gap-10">
          <Reveal>
            <div className="rounded-3xl bg-cream-card shadow-soft p-7 sm:p-9 h-full">
              <h2 className="font-display font-bold text-xl text-charcoal mb-2">For professionals</h2>
              <p className="text-charcoal-soft leading-relaxed mb-6">
                Manage your client roster, bookings and shared health data — billed monthly or yearly, per
                seat.
              </p>
              <ul className="flex flex-wrap gap-2">
                {professionals.map((p) => (
                  <li
                    key={p.label}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full bg-primary-pale text-primary-dark"
                  >
                    {p.icon} {p.label}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="rounded-3xl bg-cream-card shadow-soft p-7 sm:p-9 h-full">
              <h2 className="font-display font-bold text-xl text-charcoal mb-2">For businesses</h2>
              <p className="text-charcoal-soft leading-relaxed mb-6">
                List your gym, store or service — billed monthly or yearly, plus a share of the revenue
                generated through Centium.
              </p>
              <ul className="flex flex-wrap gap-2">
                {businesses.map((b) => (
                  <li
                    key={b.label}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full bg-teal-pale text-teal-dark"
                  >
                    {b.icon} {b.label}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section narrow className="text-center">
        <Reveal>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal tracking-tight mb-4">
            Join the Centium network
          </h2>
          <p className="text-charcoal-soft text-base leading-relaxed mb-8">
            Get in touch to learn more about bringing your practice or business onto Centium.
          </p>
          <Button size="lg" onClick={() => (window.location.href = "/contact")}>
            Contact Us
          </Button>
        </Reveal>
      </Section>
    </>
  );
};
