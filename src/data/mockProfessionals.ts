import type { Professional, Gym } from "../types";

export const mockProfessionals: Professional[] = [
  {
    id: "pr1",
    name: "Maya Haddad",
    type: "dietitian",
    specialty: "Registered Dietitian · Weight Management",
    location: "Achrafieh, Beirut",
    rating: 4.9,
    reviews: 128,
    bio: "Helps clients build sustainable eating habits rooted in Lebanese cuisine — no extreme diets.",
    connected: true,
  },
  {
    id: "pr2",
    name: "Karim Abou Zeid",
    type: "trainer",
    specialty: "Certified Personal Trainer · Strength",
    location: "Hamra, Beirut",
    rating: 4.8,
    reviews: 94,
    bio: "Strength & conditioning coach for recreational lifters and athletes alike.",
  },
  {
    id: "pr3",
    name: "Dr. Rana Fakhoury",
    type: "doctor",
    specialty: "General Practitioner",
    location: "Jal el Dib",
    rating: 4.9,
    reviews: 210,
    bio: "Family medicine physician focused on preventive care and longevity.",
  },
  {
    id: "pr4",
    name: "Elie Sarkis",
    type: "physiotherapist",
    specialty: "Sports Physiotherapist",
    location: "Jounieh",
    rating: 4.7,
    reviews: 61,
    bio: "Injury recovery and mobility work for athletes and everyday movers.",
  },
  {
    id: "pr5",
    name: "Layal Choueiri",
    type: "trainer",
    specialty: "Certified Personal Trainer · Mobility",
    location: "Verdun, Beirut",
    rating: 4.9,
    reviews: 77,
    bio: "Builds beginner-friendly programs that stick — form first, always.",
  },
  {
    id: "pr6",
    name: "Tony Khoury",
    type: "dietitian",
    specialty: "Sports Nutritionist",
    location: "Zalka",
    rating: 4.6,
    reviews: 52,
    bio: "Works with athletes and lifters on performance nutrition.",
  },
];

// Approximate real-world coordinates for each location, used to compute a
// mock "distance from you" in the Explore page.
export const mockGyms: Gym[] = [
  { id: "g1", name: "Gold's Gym Beirut", location: "Downtown Beirut", perk: "10% off with Sohati", rating: 4.6, lat: 33.8959, lng: 35.4844 },
  { id: "g2", name: "FitRepublik", location: "Dbayeh", perk: "Free trial class", rating: 4.8, lat: 33.9425, lng: 35.5919 },
  { id: "g3", name: "PowerHouse Gym", location: "Jounieh", perk: "15% off annual plan", rating: 4.4, lat: 33.9808, lng: 35.6178 },
  { id: "g4", name: "Flow Yoga Studio", location: "Mar Mikhael", perk: "2 free classes", rating: 4.9, lat: 33.8959, lng: 35.5310 },
];

export const marketplaceCategories = [
  { id: "gyms", label: "Gyms" },
  { id: "classes", label: "Classes" },
  { id: "stores", label: "Stores" },
  { id: "clothing", label: "Clothing" },
  { id: "equipment", label: "Equipment" },
  { id: "supplements", label: "Supplements" },
  { id: "wellness", label: "Wellness Services" },
  { id: "meal_prep", label: "Meal Prepping" },
] as const;

// V4: tapping "Classes" shows the specific class service — which gym hosts
// it, where, and any offer — instead of a flat unfiltered list.
export const mockClasses = [
  { id: "cl1", name: "Vinyasa Flow", gymName: "Flow Yoga Studio", location: "Mar Mikhael", rating: 4.9, offer: "2 free classes" },
  { id: "cl2", name: "HIIT Circuit", gymName: "FitRepublik", location: "Dbayeh", rating: 4.7, offer: "Free trial class" },
  { id: "cl3", name: "Spin", gymName: "Gold's Gym Beirut", location: "Downtown Beirut", rating: 4.5, offer: "10% off with Sohati" },
  { id: "cl4", name: "Boxing Fundamentals", gymName: "PowerHouse Gym", location: "Jounieh", rating: 4.6, offer: "15% off annual plan" },
];

// V4: generic marketplace listings for categories without dedicated mock
// data yet — same shape (rating + location) so the category page can
// render them uniformly.
export const mockMarketplaceListings: Record<
  "stores" | "clothing" | "equipment" | "supplements" | "wellness" | "meal_prep",
  { id: string; name: string; location: string; rating: number; offer?: string }[]
> = {
  stores: [
    { id: "st1", name: "Healthy Basket", location: "Achrafieh, Beirut", rating: 4.6, offer: "Free delivery over $30" },
    { id: "st2", name: "GreenGrocer Lebanon", location: "Jounieh", rating: 4.4 },
  ],
  clothing: [
    { id: "cw1", name: "ActiveWear Beirut", location: "ABC Achrafieh", rating: 4.5, offer: "10% off with Sohati" },
    { id: "cw2", name: "FitStyle", location: "Dbayeh", rating: 4.3 },
  ],
  equipment: [
    { id: "eq1", name: "IronWorks Equipment", location: "Sin El Fil", rating: 4.7, offer: "Free shipping" },
    { id: "eq2", name: "HomeGym Lebanon", location: "Zalka", rating: 4.5 },
  ],
  supplements: [
    { id: "su1", name: "PureFuel Nutrition", location: "Hamra, Beirut", rating: 4.6, offer: "15% off first order" },
    { id: "su2", name: "ProteinHouse", location: "Jal el Dib", rating: 4.4 },
  ],
  wellness: [
    { id: "we1", name: "Serenity Spa & Wellness", location: "Verdun, Beirut", rating: 4.9, offer: "1 free session" },
    { id: "we2", name: "Recharge Recovery Lounge", location: "Achrafieh", rating: 4.7 },
  ],
  meal_prep: [
    { id: "mp1", name: "Healthy Bites Meal Prep", location: "Achrafieh, Beirut", rating: 4.8, offer: "10% off first order" },
    { id: "mp2", name: "Lebanese MealBox", location: "Jounieh", rating: 4.6, offer: "Free delivery over $40" },
    { id: "mp3", name: "MacroKitchen", location: "Dbayeh", rating: 4.7 },
  ],
};
