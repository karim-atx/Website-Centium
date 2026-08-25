// V7 (QA 7.0): "Centium Premium in the professional UI needs a different
// model based on max clients allowed" — a client-count cap per tier instead
// of the consumer feature-unlock model. `maxClients: null` means unlimited.
export interface ProfessionalTier {
  id: string;
  name: string;
  maxClients: number | null;
  price: string;
}

export const professionalTiers: ProfessionalTier[] = [
  { id: "starter", name: "Starter", maxClients: 5, price: "Free" },
  { id: "growth", name: "Growth", maxClients: 15, price: "$14.99/month" },
  { id: "pro", name: "Pro", maxClients: 40, price: "$29.99/month" },
  { id: "unlimited", name: "Unlimited", maxClients: null, price: "$49.99/month" },
];
