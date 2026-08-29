// V7 (QA 7.0): "Subscription tiers for Business UI, same client-count-based
// concept as Professional UI" — a business's equivalent headcount is its
// affiliated professionals ("employees"), so tiers cap that instead.
// V9 (QA 9.0): "The Centium Premium subscription plan should be monthly and
// yearly as well as every 5 years" — a numeric monthly base price so the
// other billing periods can be derived, instead of one fixed price string.
export interface BusinessTier {
  id: string;
  name: string;
  maxEmployees: number | null;
  monthlyPrice: number | null; // null = Free (Starter)
}

export const businessTiers: BusinessTier[] = [
  { id: "starter", name: "Starter", maxEmployees: 3, monthlyPrice: null },
  { id: "growth", name: "Growth", maxEmployees: 10, monthlyPrice: 19.99 },
  { id: "pro", name: "Pro", maxEmployees: 30, monthlyPrice: 39.99 },
  { id: "unlimited", name: "Unlimited", maxEmployees: null, monthlyPrice: 69.99 },
];
