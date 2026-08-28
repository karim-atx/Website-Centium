import React, { useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { ComparisonTable, type ComparisonRow } from "../components/ComparisonTable";
import { FaqAccordion } from "../components/FaqAccordion";
import { useSEO } from "../useSEO";

type Billing = "monthly" | "yearly";

const audiences: {
  key: string;
  audienceLabel: string;
  name: string;
  description: string;
  priceLabel: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}[] = [
  {
    key: "clients",
    audienceLabel: "I'm an individual",
    name: "Clients",
    description: "For individuals tracking their own health.",
    priceLabel: "One subscription",
    features: ["Nutrition & workout logging", "Health tracking & trends", "AI-powered guidance", "Community access"],
    ctaLabel: "Get Started",
    ctaHref: "/app",
  },
  {
    key: "professionals",
    audienceLabel: "I'm a professional",
    name: "Professionals",
    description: "Personal trainers, dietitians, physiotherapists & other professionals.",
    priceLabel: "Per seat",
    features: ["Client roster & booking", "Professional dashboard", "Client sharing controls", "Seat-based billing"],
    ctaLabel: "Get Started",
    ctaHref: "/app",
  },
  {
    key: "business",
    audienceLabel: "I'm a business",
    name: "Business",
    description: "Gyms, studios and other businesses.",
    priceLabel: "Plan + revenue share",
    features: ["Business dashboard", "Marketplace listing", "Employee & class management", "Analytics"],
    ctaLabel: "Talk to us",
    ctaHref: "/contact",
  },
];

const comparisonRows: ComparisonRow[] = [
  { label: "Nutrition & workout logging", clients: true, professionals: true, business: false },
  { label: "Health tracking & trends", clients: true, professionals: false, business: false },
  { label: "AI-powered guidance", clients: true, professionals: true, business: false },
  { label: "Client roster & booking", clients: false, professionals: true, business: false },
  { label: "Professional dashboard", clients: false, professionals: true, business: false },
  { label: "Marketplace listing", clients: false, professionals: false, business: true },
  { label: "Business dashboard & analytics", clients: false, professionals: false, business: true },
  { label: "Community access", clients: true, professionals: true, business: true },
];

const faqs = [
  {
    q: "Why isn't there a price yet?",
    a: "Centium hasn't launched. Rates for each plan will be announced at launch — the structure above (what's included in each plan, and how billing works) is final even though the numbers aren't set yet.",
  },
  {
    q: "What's the difference between monthly and yearly billing?",
    a: "Every plan can be billed monthly or yearly. Yearly billing will offer a discount versus paying monthly — the exact discount is confirmed at launch alongside pricing.",
  },
  {
    q: "How does business revenue share work?",
    a: "Business accounts pay a plan fee plus a share of the revenue generated through bookings and sales made via Centium's marketplace. Percentages are confirmed at launch.",
  },
  {
    q: "Can I switch between plans later?",
    a: "Yes — clients, professionals and businesses are separate account types, and you'll be able to change your plan or account type from inside the app once it's live.",
  },
];

export const Pricing: React.FC = () => {
  useSEO("Pricing", "Centium pricing for clients, professionals and businesses — monthly or yearly plans.");
  const [audience, setAudience] = useState(0);
  const [billing, setBilling] = useState<Billing>("monthly");
  const focused = audiences[audience];

  return (
    <>
      <Section className="pt-14 sm:pt-20 pb-8 bg-mkt-wash text-center">
        <Reveal>
          <Eyebrow className="mx-auto">PRICING</Eyebrow>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-mkt-ink tracking-tight mt-5">
            Plans for however you use Centium.
          </h1>
          <p className="text-lg leading-relaxed text-mkt-soft mt-4 max-w-xl mx-auto">
            Whether you're tracking your own health, working with clients, or running a business — there's a
            plan built around it.
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="inline-flex flex-wrap justify-center gap-1.5 border border-[#E0DDD6] p-1 rounded-full bg-white mt-8">
            {audiences.map((a, i) => (
              <button
                key={a.key}
                onClick={() => setAudience(i)}
                className={clsx(
                  "px-5 py-2.5 rounded-full text-sm font-bold transition-colors",
                  audience === i ? "bg-mkt-ink text-white" : "text-mkt-soft"
                )}
              >
                {a.audienceLabel}
              </button>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section className="pt-14 sm:pt-16">
        <Reveal>
          <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-5 items-stretch">
            <div className="border-[1.5px] border-mkt-accent rounded-3xl p-7 sm:p-9 flex flex-col">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-display font-bold text-xl text-mkt-ink">{focused.name}</div>
                  <p className="text-sm text-mkt-soft mt-1 max-w-sm">{focused.description}</p>
                </div>
                <div className="inline-flex gap-1 bg-mkt-tint rounded-full p-1 shrink-0">
                  {(["monthly", "yearly"] as Billing[]).map((b) => (
                    <button
                      key={b}
                      onClick={() => setBilling(b)}
                      className={clsx(
                        "px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-colors",
                        billing === b ? "bg-white text-mkt-ink shadow-sm" : "text-mkt-accent-hover"
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div className="font-display font-extrabold text-3xl text-mkt-ink tracking-tight mt-6">{focused.priceLabel}</div>
              <p className="text-[13px] text-mkt-faint mt-1.5 font-mono">"Announced at launch — join the list"</p>
              <ul className="flex flex-col gap-2.5 mt-6 flex-1">
                {focused.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-mkt-ink/85">
                    <Check size={16} className="shrink-0 mt-0.5 text-mkt-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={focused.ctaHref}
                className="tap block text-center py-3.5 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] mt-8 transition-colors"
              >
                {focused.ctaLabel}
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <span className="font-semibold text-[10.5px] tracking-[.2em] text-mkt-faint">ALSO AVAILABLE</span>
              {audiences.map((a, i) =>
                i === audience ? null : (
                  <button
                    key={a.key}
                    onClick={() => setAudience(i)}
                    className="text-left border border-mkt-line hover:border-mkt-accent-ring rounded-2xl p-5 transition-colors"
                  >
                    <div className="font-display font-bold text-base text-mkt-ink">{a.name}</div>
                    <p className="text-sm text-mkt-soft mt-1.5 leading-relaxed">{a.description}</p>
                  </button>
                )
              )}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-16">
          <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-mkt-ink tracking-tight">Compare everything</h2>
            <span className="font-semibold text-[11px] tracking-[.16em] text-mkt-faint">FULL BREAKDOWN</span>
          </div>
          <ComparisonTable rows={comparisonRows} />
        </Reveal>

        <Reveal delay={0.14} className="mt-16 max-w-2xl">
          <h2 className="font-display font-bold text-xl text-mkt-ink tracking-tight mb-2">Frequently asked</h2>
          <FaqAccordion items={faqs} />
        </Reveal>
      </Section>

      <Section className="bg-mkt-dark text-center">
        <Reveal className="flex flex-col items-center">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-mkt-dark-ink tracking-tight max-w-md">
            Know the moment pricing goes live.
          </h2>
          <p className="text-sm text-mkt-dark-soft mt-2 max-w-sm">No spam — one email when rates are announced.</p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col sm:flex-row gap-2.5 mt-7 w-full max-w-md"
          >
            <input
              type="email"
              required
              placeholder="you@email.com"
              className="flex-1 bg-transparent border border-mkt-dark-line rounded-full px-5 py-3 text-sm text-mkt-dark-ink placeholder:text-mkt-dark-soft/60 focus:outline-none focus:border-mkt-dark-accent"
            />
            <button
              type="submit"
              className="tap px-6 py-3 rounded-full bg-mkt-dark-accent text-mkt-dark font-semibold text-sm"
            >
              Notify me
            </button>
          </form>
          <p className="text-xs text-mkt-dark-soft/70 mt-3">Not yet connected — check back closer to launch.</p>
        </Reveal>
      </Section>
    </>
  );
};
