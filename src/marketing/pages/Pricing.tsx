import React, { useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Button } from "../../components/ui/Button";
import { useSEO } from "../useSEO";

type Billing = "monthly" | "yearly";

const tiers: {
  name: string;
  audience: string;
  billingNote: string;
  features: string[];
  tone: "primary" | "teal";
}[] = [
  {
    name: "Clients",
    audience: "For individuals tracking their own health.",
    billingNote: "Monthly or yearly subscription",
    features: ["Nutrition & workout logging", "Health tracking", "AI-powered guidance", "Community access"],
    tone: "primary",
  },
  {
    name: "Professionals",
    audience: "Personal trainers, dietitians, physiotherapists & other professionals.",
    billingNote: "Monthly or yearly, billed per seat",
    features: ["Client roster & booking", "Professional dashboard", "Seat-based billing", "Client sharing controls"],
    tone: "teal",
  },
  {
    name: "Business",
    audience: "Gyms, studios and other businesses.",
    billingNote: "Monthly or yearly subscription, plus a share of revenue generated through Centium",
    features: ["Business dashboard", "Marketplace listing", "Employee & class management", "Analytics"],
    tone: "primary",
  },
];

export const Pricing: React.FC = () => {
  useSEO("Pricing", "Centium pricing for clients, professionals and businesses — monthly or yearly plans.");
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <>
      <Section className="pt-14 sm:pt-20 pb-10 text-center">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Pricing</p>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-charcoal tracking-tight mb-5">
            Plans for however you use Centium
          </h1>
          <p className="text-charcoal-soft text-lg leading-relaxed max-w-xl mx-auto">
            Whether you're tracking your own health, working with clients, or running a business — there's a
            plan built around it.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="inline-flex items-center gap-1 bg-cream-soft rounded-full p-1 mt-9">
            {(["monthly", "yearly"] as Billing[]).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={clsx(
                  "tap px-5 py-2 rounded-full text-sm font-semibold capitalize transition-colors",
                  billing === b ? "bg-white text-charcoal shadow-soft" : "text-charcoal-faint"
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section className="pt-0">
        <div className="grid lg:grid-cols-3 gap-5">
          {tiers.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 0.06}>
              <div className="rounded-3xl bg-cream-card shadow-soft p-7 sm:p-8 h-full flex flex-col">
                <h2 className="font-display font-bold text-xl text-charcoal mb-1.5">{tier.name}</h2>
                <p className="text-sm text-charcoal-soft leading-relaxed mb-6">{tier.audience}</p>

                <div className="mb-1">
                  <span className="font-display font-extrabold text-3xl text-charcoal">Pricing TBD</span>
                </div>
                <p className="text-xs text-charcoal-faint mb-6">{tier.billingNote}</p>

                <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-charcoal-soft">
                      <Check
                        size={16}
                        className={clsx("shrink-0 mt-0.5", tier.tone === "primary" ? "text-primary-dark" : "text-teal-dark")}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button variant={tier.tone === "primary" ? "primary" : "teal"} fullWidth onClick={() => (window.location.href = "/app")}>
                  Get Started
                </Button>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="text-center text-sm text-charcoal-faint mt-10 max-w-lg mx-auto">
            Final pricing hasn't been set yet — plan structures above reflect the intended billing model, not
            confirmed rates.
          </p>
        </Reveal>
      </Section>
    </>
  );
};
