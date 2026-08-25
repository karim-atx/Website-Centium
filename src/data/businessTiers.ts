// V7 (QA 7.0): "Subscription tiers for Business UI, same client-count-based
// concept as Professional UI" — a business's equivalent headcount is its
// affiliated professionals ("employees"), so tiers cap that instead.
export interface BusinessTier {
  id: string;
  name: string;
  maxEmployees: number | null;
  price: string;
}

export const businessTiers: BusinessTier[] = [
  { id: "starter", name: "Starter", maxEmployees: 3, price: "Free" },
  { id: "growth", name: "Growth", maxEmployees: 10, price: "$19.99/month" },
  { id: "pro", name: "Pro", maxEmployees: 30, price: "$39.99/month" },
  { id: "unlimited", name: "Unlimited", maxEmployees: null, price: "$69.99/month" },
];
