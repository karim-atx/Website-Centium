import { PricingUnavailable } from "../components/PricingUnavailable";
// Aliased: this module already exports a component called Pricing.
import { usePricing, type Pricing as PricingData } from "../hooks/usePricing";
import type { SubscriptionTier, TierType } from "../../services/subscription-tiers";
import {
  businessSummary,
  formatPercent,
  formatPrice,
  limitLabel,
  priceLabel,
  savingLabel,
  yearlySaving,
} from "../../services/subscription-tiers/pricing";
import React, { useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { ComparisonTable, type ComparisonRow } from "../components/ComparisonTable";
import { FaqAccordion, type FaqItem } from "../components/FaqAccordion";
import { useSEO } from "../useSEO";

type Billing = "monthly" | "yearly";

const audiences: {
  key: string;
  audienceLabel: string;
  name: string;
  description: string;
  /** Which tier_type in subscription_tiers this audience's prices come from. */
  tierType: TierType;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}[] = [
  {
    key: "clients",
    tierType: "client" as const,
    audienceLabel: "I'm an individual",
    name: "Clients",
    description: "For individuals tracking their own health.",
    features: ["Nutrition & workout logging", "Health tracking & trends", "AI-powered guidance", "Community access"],
    ctaLabel: "Get Started",
    ctaHref: "/app",
  },
  {
    key: "professionals",
    tierType: "professional" as const,
    audienceLabel: "I'm a professional",
    name: "Professionals",
    description: "Personal trainers, dietitians, physiotherapists & other professionals.",
    features: ["Client roster & booking", "Professional dashboard", "Client sharing controls", "Seat-based billing"],
    ctaLabel: "Get Started",
    ctaHref: "/app",
  },
  {
    key: "business",
    tierType: "business" as const,
    audienceLabel: "I'm a business",
    name: "Business",
    description: "Gyms, studios and other businesses.",
    features: ["Business dashboard", "Marketplace listing", "Employee & class management", "Analytics"],
    ctaLabel: "Talk to us",
    ctaHref: "/contact",
  },
];

/** The tiers of one audience, add-ons excluded — they are not plans anyone is on. */
const tiersFor = (pricing: PricingData, type: TierType): SubscriptionTier[] =>
  (type === "client" ? pricing.client : type === "professional" ? pricing.professional : pricing.business)
    .filter((t) => !t.isAddon);

/** The business line, assembled from the base row, the add-on row and the share. */
function businessLine(pricing: PricingData): string {
  const base = pricing.business.find((t) => !t.isAddon);
  const seat = pricing.business.find((t) => t.isAddon);
  if (!base || !seat) return "";
  return businessSummary({
    basePrice: base.monthlyPrice,
    seatPrice: seat.monthlyPrice,
    seatsPerBlock: seat.seatsPerUnit ?? 0,
    revenueSharePct: pricing.revenueSharePct,
  });
}

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

/**
 * The questions, answered with the numbers rather than around them.
 *
 * The first one used to be "Why isn't there a price yet?", answered with
 * "Centium hasn't launched. Rates will be announced at launch." They have
 * been. The monthly-versus-yearly answer said the discount was "confirmed at
 * launch" and the revenue-share answer said the same of its percentage —
 * both are columns now, so both are quoted.
 *
 * BUILT FROM THE DATA, which is why this is a function. An FAQ that states a
 * price is a price that has to be maintained, and the only maintenance that
 * survives contact with a pricing change is not writing it down twice.
 */
function buildFaqs(pricing: PricingData): FaqItem[] {
  const client = pricing.client.find((t) => t.monthlyPrice > 0);
  const saving = client ? yearlySaving(client.monthlyPrice, client.yearlyPrice) : null;
  const base = pricing.business.find((t) => !t.isAddon);
  const seat = pricing.business.find((t) => t.isAddon);
  const seatPlan = pricing.professional.find((t) => t.isBusinessSeatPlan);
  const share = formatPercent(pricing.revenueSharePct);

  return [
    {
      q: "How much do I save by paying yearly?",
      lead: "How",
      color: "#7D67D9",
      a: saving
        ? `Every paid plan is cheaper by the year. ${client!.name} is ${formatPrice(client!.monthlyPrice)} a month, or ${formatPrice(client!.yearlyPrice!)} for twelve — ${formatPrice(saving.amount)} less than paying monthly, which is ${saving.percent}% off. The other plans work the same way; the exact saving is shown beside each one.`
        : "Every paid plan can be billed monthly or yearly, and the yearly price is shown beside the monthly one on each plan above.",
    },
    {
      q: "How do business seats work?",
      lead: "How",
      color: "#5E9E95",
      a:
        base && seat
          ? `A business pays ${formatPrice(base.monthlyPrice)} a month for the account itself, then buys seats in blocks: ${formatPrice(seat.monthlyPrice)} a month per block of ${seat.seatsPerUnit ?? 0} professionals. Buy as many blocks as you need. Every professional sitting in one of your seats gets the ${seatPlan ? seatPlan.name : "seat"} plan for as long as they're on your team — they don't pay separately, and they keep their own clients.`
          : "Business accounts buy professional seats in blocks, and each seated professional gets a full plan for as long as they are on the team.",
    },
    {
      q: "How does the marketplace revenue share work?",
      lead: "How",
      color: "#7D67D9",
      a: `${share} of what you sell through the Centium marketplace — bookings, classes, products — is deducted monthly, calculated on the items sold in that period. It is separate from your subscription and in addition to it: a month with no marketplace sales costs you the plan fee and nothing else.`,
    },
    {
      q: "How do I pay?",
      lead: "How",
      color: "#5E9E95",
      a: "For now, with our team. There is no checkout in the app yet — tell us which plan you want and we'll set it up for you, and you'll be billed from there. Everything above is what you'll be quoted.",
    },
    {
      q: "Can I switch between plans later?",
      lead: "Can",
      color: "#7D67D9",
      a: "Yes — clients, professionals and businesses are separate account types, and you can change your plan or account type at any time. While payments are handled by our team, that means telling us; plans move immediately either way.",
    },
  ];
}

export const Pricing: React.FC = () => {
  const { pricing, error: pricingError, retry: retryPricing } = usePricing();
  useSEO("Pricing", "Centium pricing for clients, professionals and businesses — monthly or yearly plans.");
  const [audience, setAudience] = useState(0);
  const [billing, setBilling] = useState<Billing>("monthly");
  const focused = audiences[audience];

  return (
    <>
      <Section className="pt-32 sm:pt-[152px] pb-8 bg-mkt-wash text-center">
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
              {/* THE PRICES, FROM THE ROWS. What stood here was a phrase —
                  "One subscription", "Per seat", "Plan + revenue share" —
                  under the line "Announced at launch". They are announced. */}
              {pricingError ? (
                <div className="mt-6">
                  <PricingUnavailable message={pricingError} onRetry={retryPricing} />
                </div>
              ) : !pricing ? (
                <p className="text-sm text-mkt-soft mt-6">Loading prices…</p>
              ) : (
                <div className="mt-6 flex flex-col" style={{ gap: 10 }}>
                  {tiersFor(pricing, focused.tierType).map((t) => (
                    <div key={t.id} className="flex items-baseline justify-between flex-wrap" style={{ gap: 8 }}>
                      <span className="font-display font-bold text-[17px] text-mkt-ink">
                        {t.name}
                        {limitLabel(t) && (
                          <span className="font-sans font-normal text-[13px] text-mkt-faint"> · {limitLabel(t)}</span>
                        )}
                      </span>
                      <span className="font-display font-extrabold text-[19px] text-mkt-ink tracking-tight">
                        {priceLabel(t.monthlyPrice, t.yearlyPrice, billing)}
                        {billing === "yearly" && yearlySaving(t.monthlyPrice, t.yearlyPrice) && (
                          <span className="font-sans font-bold text-[11px] text-mkt-accent"> {savingLabel(yearlySaving(t.monthlyPrice, t.yearlyPrice)!)}</span>
                        )}
                      </span>
                    </div>
                  ))}
                  {focused.tierType === "business" && (
                    <p className="text-[13px] text-mkt-soft mt-1 leading-relaxed">
                      {businessLine(pricing)}
                    </p>
                  )}
                </div>
              )}
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
          {pricing && <FaqAccordion items={buildFaqs(pricing)} />}
        </Reveal>
      </Section>

      <Section className="bg-mkt-dark text-center" navDark>
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
