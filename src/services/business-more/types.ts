// Shapes shared with pure helpers (components/business-more/kind.ts,
// pages/business-more/storePolicyText.ts) and their node:test files, kept free
// of runtime imports so those tests never load the Supabase client.

/** The stored business_type value. "studio" is shown as "Classes" (D8, B5). */
export type BusinessTypeValue =
  | "studio"
  | "gym"
  | "store"
  | "supplement_store"
  | "equipment_seller"
  | "wellness_service"
  | "clothing_store"
  | "meal_prep_service";

export interface StoreSettings {
  exists: boolean;
  sellsProducts: boolean;
  offersAppointments: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFee: number | null;
  freeDeliveryOver: number | null;
  deliveryTimeText: string | null;
  returnsPolicy: string | null;
  allowExchanges: boolean;
}
