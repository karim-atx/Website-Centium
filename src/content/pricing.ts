// The landing page's prices and plans (section 08 "Pricing"), in ONE place.
//
// Karim's prices (October 2026), in US dollars:
// - Individuals: Free. Premium $9.99 a month or $99.99 a year.
// - Professionals: Free (1 client). Starter $14.99 / $149.99. Growth
//   $34.99 / $349.99. Pro $74.99 / $749.99. Unlimited $99.99 / $999.99.
// - Businesses: $29 a month including 5 seats, plus $59.99 a month per 5 more
//   seats. Monthly only for now: with "Annual" selected the cards keep the
//   monthly price and say "Annual billing coming soon".
// The billing toggle starts on Annual, with the "Save 16%" badge.
//
// THE PAGE NO LONGER READS THE DATABASE. The app's own subscription screens
// still take their prices from the `subscription_tiers` table
// (src/services/subscription-tiers). When a price changes, change it in BOTH
// places, or this page and the app will quote different figures. (The table
// also holds yearly business prices, which this page deliberately does not
// show.)
//
// HOW TO EDIT
// - A price: change `monthly` / `annual` on the plan (numbers, no "$").
//   `annual: null` means the plan has no annual price (it always shows the
//   monthly one).
// - A plan's name, caption or bullet points: edit `name`, `caption`,
//   `features`.
// - The "Compare all features" table: `compare` on each audience, one row per
//   line: the feature, then one cell per plan in the same order as `plans`
//   ("✓" included, "–" not included, or a short text).
// The design (colours, the recommended card's style) lives in
// src/marketing/landing/sections/Pricing.tsx.

export type Billing = "monthly" | "annual";

export interface Plan {
  name: string;
  /** The short grey line under the name ("For getting started"). */
  caption: string;
  /** Price per month, in USD. 0 = free. */
  monthly: number;
  /** Price per year, in USD, or null when the plan is billed monthly only. */
  annual: number | null;
  features: string[];
  /** The card's button: "Get Started" opens the web app (/app); "Talk to us" opens /contact. */
  cta: "Get Started" | "Talk to us";
  /** The highlighted card with the RECOMMENDED tag. */
  recommended?: boolean;
  /** A business plan: "/ month + revenue share", and annual billing is not offered yet. */
  business?: boolean;
  /** The extra-seats block ("/ month per 5 seats"). */
  seatBlock?: boolean;
}

export interface Audience {
  /** The audience pill's label. */
  label: string;
  plans: Plan[];
  /** The line under the cards. */
  footnote: string;
  compare: string[][];
}

/** The billing toggle's first state (Karim: annual). */
export const DEFAULT_BILLING: Billing = "annual";

/** The badge beside the toggle while Annual is selected. */
export const SAVE_BADGE = "Save 16%";

/** What a business card says while Annual is selected. */
export const BUSINESS_ANNUAL_NOTE = "Annual billing coming soon";

export const AUDIENCES: Audience[] = [
  {
    label: "Individuals",
    plans: [
      {
        name: "Free",
        caption: "For getting started",
        monthly: 0,
        annual: 0,
        features: ["Nutrition and workout logging", "Health tracking", "Community forum"],
        cta: "Get Started",
      },
      {
        name: "Premium",
        recommended: true,
        caption: "Everything, connected",
        monthly: 9.99,
        annual: 99.99,
        features: ["Everything in Free", "Health trends and insights", "Connected community and experts"],
        cta: "Get Started",
      },
    ],
    footnote: "Prices in USD. Annual plans cost about 16% less than twelve monthly payments.",
    compare: [
      ["Food diary, barcode and voice logging", "✓", "✓"],
      ["Routines, folders and PR tracking", "✓", "✓"],
      ["Health records and lab ranges", "✓", "✓"],
      ["Community forum", "✓", "✓"],
      ["Health trends and insights", "–", "✓"],
      ["Connected experts and courses", "–", "✓"],
    ],
  },
  {
    label: "Professionals",
    plans: [
      {
        name: "Free",
        caption: "1 client",
        monthly: 0,
        annual: 0,
        features: ["Client roster and booking", "Programs management"],
        cta: "Get Started",
      },
      {
        name: "Starter",
        caption: "5 clients",
        monthly: 14.99,
        annual: 149.99,
        features: ["Client roster and booking", "Programs management", "Comprehensive data tracking"],
        cta: "Get Started",
      },
      {
        name: "Growth",
        recommended: true,
        caption: "About 20 clients",
        monthly: 34.99,
        annual: 349.99,
        features: ["Client roster and booking", "Programs management", "Comprehensive data tracking"],
        cta: "Get Started",
      },
      {
        name: "Pro",
        caption: "About 50 clients",
        monthly: 74.99,
        annual: 749.99,
        features: ["Client roster and booking", "Programs management", "Comprehensive data tracking"],
        cta: "Get Started",
      },
      {
        name: "Unlimited",
        caption: "Unlimited clients",
        monthly: 99.99,
        annual: 999.99,
        features: ["Client roster and booking", "Programs management", "Comprehensive data tracking"],
        cta: "Get Started",
      },
    ],
    footnote: 'Prices in USD. Annual plans cost about 16% less than twelve monthly payments. Client limits marked "about" are approximate.',
    compare: [
      ["Clients", "1", "5", "About 20", "About 50", "Unlimited"],
      ["Client roster and booking", "✓", "✓", "✓", "✓", "✓"],
      ["Programs and shared plans", "✓", "✓", "✓", "✓", "✓"],
      ["Comprehensive data tracking", "–", "✓", "✓", "✓", "✓"],
      ["Messages and calls", "✓", "✓", "✓", "✓", "✓"],
      ["CV and Verified badge", "✓", "✓", "✓", "✓", "✓"],
    ],
  },
  {
    label: "Businesses",
    plans: [
      {
        name: "Business",
        recommended: true,
        caption: "Includes 5 seats",
        monthly: 29,
        annual: null,
        features: ["Marketplace visibility", "Team operations", "Growth analytics"],
        cta: "Talk to us",
        business: true,
      },
      {
        name: "Extra seats",
        caption: "Blocks of 5 seats",
        monthly: 59.99,
        annual: null,
        features: ["Add staff as you grow", "Same features on every seat"],
        cta: "Talk to us",
        business: true,
        seatBlock: true,
      },
    ],
    footnote: "Business plans add a marketplace revenue share on bookings made through Centium. The rate is shown at signup.",
    compare: [
      ["Seats", "5 included", "+5 per block"],
      ["Gym page and marketplace listing", "✓", "–"],
      ["Classes, bookings and waitlist", "✓", "–"],
      ["Memberships and front desk check-in", "✓", "–"],
      ["Revenue share on marketplace bookings", "Yes, shown at signup", "–"],
      ["Billing", "Monthly, annual coming soon", "Monthly"],
    ],
  },
];

export interface PlanPrice {
  /** The figure the card shows. */
  value: number;
  /** "$0", "$29", "$9.99". */
  label: string;
  /** The words after the figure ("/ year"); "" for a free plan. */
  unit: string;
  /** The line under the figure ("Billed annually"). */
  note: string;
  /** True when the note is the business "annual billing coming soon" line (drawn in lavender). */
  comingSoon: boolean;
}

/** "$0", "$29" for a whole number, "$9.99" otherwise (the prototype's fmt). */
export function formatPrice(v: number): string {
  if (v === 0) return "$0";
  return Math.abs(v - Math.round(v)) < 0.005 ? "$" + Math.round(v) : "$" + v.toFixed(2);
}

/** What one card shows for a billing period: the annual price when Annual is
 *  selected and the plan has one; otherwise the monthly price (business plans
 *  keep the monthly price under Annual and say annual billing is coming). */
export function priceFor(plan: Plan, billing: Billing): PlanPrice {
  const annual = billing === "annual";
  const useYear = annual && plan.annual != null;
  const value = useYear ? (plan.annual as number) : plan.monthly;
  const unit =
    plan.monthly === 0 ? "" : plan.seatBlock ? "/ month per 5 seats" : plan.business ? "/ month + revenue share" : useYear ? "/ year" : "/ month";
  const note =
    plan.monthly === 0 ? "Free forever" : plan.business ? (annual ? BUSINESS_ANNUAL_NOTE : "Billed monthly") : useYear ? "Billed annually" : "Billed monthly";
  return { value, label: formatPrice(value), unit, note, comingSoon: !!plan.business && annual };
}

/** Whole percent a year of the plan saves against twelve monthly payments (null without an annual price). */
export function annualSaving(plan: Plan): number | null {
  if (plan.annual == null || plan.monthly === 0) return null;
  return Math.floor((1 - plan.annual / (plan.monthly * 12)) * 100);
}
