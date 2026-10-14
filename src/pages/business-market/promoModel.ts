import type { BizKind } from "../../components/business-more/kind";
import type { BusinessClassRow } from "../../services/business-classes";
import type { MembershipPlanRow } from "../../services/membership-plans";
import type { Offering } from "../../services/business-offerings";
import { dowTime, notEnded } from "./model";

// Create promotion (MA1-099 to 104, OURS-MA1-promotion-type-menu,
// OURS-MA1-gym-promotions): what can be promoted per type, the promotion
// types, and the Explore chip each one shows.

export interface Promotable {
  id: string;
  kind: "class" | "offering" | "plan" | "day_pass" | "offer";
  title: string;
  /** The field text ("Strength Basics · Mon 7:30 PM"). */
  field: string;
  /** The listbox sub ("Class · Mon 7:30 PM · 6 of 14 booked"). */
  sub: string;
  /** The preview sub ("8 spots left"). */
  preview: string;
}

export function promotables(
  kind: BizKind,
  input: { classes: BusinessClassRow[]; booked: Map<string, number> | null; offerings: Offering[]; plans: MembershipPlanRow[]; offers: string[]; today: string; now: number; instructors: Map<string, string> }
): Promotable[] {
  const out: Promotable[] = [];
  if (kind === "classes" || kind === "gym") {
    for (const x of input.classes.filter((c) => c.date >= input.today && notEnded(c, input.now)).slice(0, 12)) {
      const b = input.booked?.get(x.id) ?? 0;
      const when = dowTime(x.date, x.startTime);
      const who = x.professionalId ? input.instructors.get(x.professionalId) : null;
      const left = Math.max(0, x.maxCapacity - b);
      out.push({
        id: x.id,
        kind: "class",
        title: x.title,
        field: `${x.title} · ${when}`,
        sub: `Class · ${when} · ${b} of ${x.maxCapacity} booked`,
        preview: `${who ? `With ${who} · ` : ""}${left} spot${left === 1 ? "" : "s"} left`,
      });
    }
  }
  for (const o of input.offers) out.push({ id: `offer:${o}`, kind: "offer", title: o, field: o, sub: "Offer", preview: "On your listing" });
  if (kind === "gym") {
    for (const p of input.plans) {
      const day = p.kind === "day_pass";
      out.push({ id: p.id, kind: day ? "day_pass" : "plan", title: p.name, field: p.name, sub: `${day ? "Day pass" : "Plan"} · ${p.price}${day ? "" : billingWord(p.billing)}`, preview: p.price });
    }
  }
  for (const o of input.offerings) {
    const label = kind === "store" ? "Product" : "Class pack";
    out.push({ id: o.id, kind: "offering", title: o.title, field: o.title, sub: o.price ? `${label} · ${o.price}` : label, preview: o.price || label });
  }
  return out;
}

const billingWord = (b: string): string => (b === "monthly" ? " a month" : b === "annually" ? " a year" : "");

export type PromoType = "percent_off" | "first_free" | "first_n_free" | "bring_friend" | "free_delivery" | "days_free";

export interface PromoTypeOption {
  value: PromoType;
  label: string;
  note?: string;
}

/** OURS-MA1-promotion-type-menu rows 2-6 per type. */
export function promoTypes(kind: BizKind): PromoTypeOption[] {
  const pct: PromoTypeOption = { value: "percent_off", label: "Percent off", note: "Choose 5% to 90%" };
  if (kind === "store") return [pct, { value: "free_delivery", label: "Free delivery" }];
  if (kind === "gym") return [pct, { value: "first_free", label: "First visit free" }, { value: "bring_friend", label: "Bring a friend free" }, { value: "days_free", label: "7 days free" }];
  return [pct, { value: "first_free", label: "First class free" }, { value: "first_n_free", label: "First 2 classes free" }, { value: "bring_friend", label: "Bring a friend free" }];
}

/** The field text and the Explore chip for a type. */
export function promoText(kind: BizKind, type: PromoType | null, value: number | null): { field: string; chip: string } {
  if (!type) return { field: "Choose a type", chip: "Offer" };
  switch (type) {
    case "percent_off":
      return value ? { field: `${value}% off`, chip: `${value}% off` } : { field: "Percent off", chip: "Offer" };
    case "first_free":
      return { field: kind === "gym" ? "First visit free" : "First class free", chip: "1 free" };
    case "first_n_free":
      return { field: "First 2 classes free", chip: "2 free" };
    case "bring_friend":
      return { field: "Bring a friend free", chip: "Free friend" };
    case "free_delivery":
      return { field: "Free delivery", chip: "Free delivery" };
    case "days_free":
      return { field: "7 days free", chip: "7 days free" };
  }
}

export interface PromoDraft {
  what: string | null;
  type: PromoType | null;
  value: number | null;
  from: string | null;
  to: string | null;
  audience: "new" | "everyone";
}

export interface PromoErrors {
  what?: string;
  type?: string;
  value?: string;
  to?: string;
}

export function validatePromo(d: PromoDraft, whatError: string): PromoErrors {
  const e: PromoErrors = {};
  if (!d.what) e.what = whatError;
  if (!d.type) e.type = "Pick a promotion type.";
  if (d.type === "percent_off" && (!d.value || d.value < 5 || d.value > 90)) e.value = "Choose 5% to 90%";
  if (!d.to) e.to = "Choose an end date.";
  else if (d.from && d.to < d.from) e.to = "The end date must be after the start date.";
  return e;
}
