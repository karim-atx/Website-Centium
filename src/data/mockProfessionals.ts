import type { Professional, Gym } from "../types";

export const mockProfessionals: Professional[] = [
  {
    id: "pr1",
    name: "Maya Haddad",
    type: "dietitian",
    specialty: "Registered Dietitian · Weight Management",
    location: "Midtown",
    rating: 4.9,
    reviews: 128,
    bio: "Helps clients build sustainable eating habits rooted in real food — no extreme diets.",
    connected: true,
    monthlyRate: 65,
  },
  {
    id: "pr2",
    name: "Karim Abou Zeid",
    type: "trainer",
    specialty: "Certified Personal Trainer · Strength",
    location: "Uptown",
    rating: 4.8,
    reviews: 94,
    bio: "Strength & conditioning coach for recreational lifters and athletes alike.",
    monthlyRate: 55,
  },
  {
    id: "pr3",
    name: "Dr. Rana Fakhoury",
    type: "doctor",
    specialty: "General Practitioner",
    location: "Northside",
    rating: 4.9,
    reviews: 210,
    bio: "Family medicine physician focused on preventive care and longevity.",
    monthlyRate: 80,
  },
  {
    id: "pr4",
    name: "Elie Sarkis",
    type: "physiotherapist",
    specialty: "Sports Physiotherapist",
    location: "Harbor District",
    rating: 4.7,
    reviews: 61,
    bio: "Injury recovery and mobility work for athletes and everyday movers.",
    monthlyRate: 60,
  },
  {
    id: "pr5",
    name: "Layal Choueiri",
    type: "trainer",
    specialty: "Certified Personal Trainer · Mobility",
    location: "Riverside",
    rating: 4.9,
    reviews: 77,
    bio: "Builds beginner-friendly programs that stick — form first, always.",
    monthlyRate: 50,
  },
  {
    id: "pr6",
    name: "Tony Khoury",
    type: "dietitian",
    specialty: "Sports Nutritionist",
    location: "Eastgate",
    rating: 4.6,
    reviews: 52,
    bio: "Works with athletes and lifters on performance nutrition.",
    monthlyRate: 70,
  },
];

// Approximate real-world coordinates for each location, used to compute a
// mock "distance from you" in the Explore page.
export const mockGyms: Gym[] = [
  {
    id: "g1",
    name: "Iron Peak Gym",
    location: "Downtown",
    perk: "10% off with Centium",
    rating: 4.6,
    lat: 33.8959,
    lng: 35.4844,
    bio: "A full-size gym floor with free weights, machines and a dedicated CrossFit box.",
    reviewCount: 214,
    pricing: [
      { plan: "Day pass", price: "$10" },
      { plan: "Monthly", price: "$65" },
      { plan: "Annual", price: "$600" },
    ],
  },
  {
    id: "g2",
    name: "FitRepublik",
    location: "Lakeside",
    perk: "Free trial class",
    rating: 4.8,
    lat: 33.9425,
    lng: 35.5919,
    bio: "Boutique studio focused on HIIT, spin and small-group personal training.",
    reviewCount: 168,
    pricing: [
      { plan: "Class pack (5)", price: "$45" },
      { plan: "Monthly unlimited", price: "$80" },
    ],
  },
  {
    id: "g3",
    name: "PowerHouse Gym",
    location: "Harbor District",
    perk: "15% off annual plan",
    rating: 4.4,
    lat: 33.9808,
    lng: 35.6178,
    bio: "Classic powerlifting and bodybuilding gym with a full plate-loaded section.",
    reviewCount: 132,
    pricing: [
      { plan: "Monthly", price: "$55" },
      { plan: "Annual", price: "$500" },
    ],
  },
  {
    id: "g4",
    name: "Flow Yoga Studio",
    location: "Arts Quarter",
    perk: "2 free classes",
    rating: 4.9,
    lat: 33.8959,
    lng: 35.5310,
    bio: "A calm, plant-filled studio offering Vinyasa, Yin and breathwork sessions.",
    reviewCount: 96,
    pricing: [
      { plan: "Drop-in", price: "$18" },
      { plan: "Monthly unlimited", price: "$70" },
    ],
  },
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
  { id: "cl1", name: "Vinyasa Flow", gymName: "Flow Yoga Studio", location: "Arts Quarter", rating: 4.9, offer: "2 free classes" },
  { id: "cl2", name: "HIIT Circuit", gymName: "FitRepublik", location: "Lakeside", rating: 4.7, offer: "Free trial class" },
  { id: "cl3", name: "Spin", gymName: "Iron Peak Gym", location: "Downtown", rating: 4.5, offer: "10% off with Centium" },
  { id: "cl4", name: "Boxing Fundamentals", gymName: "PowerHouse Gym", location: "Harbor District", rating: 4.6, offer: "15% off annual plan" },
];

// V8 (QA 8.0): each store now carries actual sellable items (name, price,
// description) so tapping a store can open a real store page instead of
// just showing the business card's own rating/location.
export interface StoreItem {
  id: string;
  name: string;
  price: number;
  description: string;
}

// V4: generic marketplace listings for categories without dedicated mock
// data yet — same shape (rating + location) so the category page can
// render them uniformly.
export const mockMarketplaceListings: Record<
  "stores" | "clothing" | "equipment" | "supplements" | "wellness" | "meal_prep",
  { id: string; name: string; location: string; rating: number; offer?: string; items: StoreItem[] }[]
> = {
  stores: [
    {
      id: "st1",
      name: "Healthy Basket",
      location: "Midtown",
      rating: 4.6,
      offer: "Free delivery over $30",
      items: [
        { id: "st1-i1", name: "Organic Quinoa (1kg)", price: 12, description: "Locally-packed organic white quinoa." },
        { id: "st1-i2", name: "Cold-Pressed Olive Oil (500ml)", price: 15, description: "Extra virgin, cold-pressed and small-batch." },
      ],
    },
    {
      id: "st2",
      name: "GreenGrocer Co.",
      location: "Harbor District",
      rating: 4.4,
      items: [
        { id: "st2-i1", name: "Weekly Veggie Box", price: 25, description: "A curated mix of seasonal local produce." },
        { id: "st2-i2", name: "Fresh Herb Bundle", price: 6, description: "Mint, parsley and thyme, picked same-day." },
      ],
    },
  ],
  clothing: [
    {
      id: "cw1",
      name: "ActiveWear Co.",
      location: "Midtown Mall",
      rating: 4.5,
      offer: "10% off with Centium",
      items: [
        { id: "cw1-i1", name: "Performance Leggings", price: 38, description: "Sweat-wicking, squat-proof compression fit." },
        { id: "cw1-i2", name: "Training Tank Top", price: 22, description: "Breathable mesh-back tank for high-intensity sessions." },
      ],
    },
    {
      id: "cw2",
      name: "FitStyle",
      location: "Lakeside",
      rating: 4.3,
      items: [
        { id: "cw2-i1", name: "Running Shorts", price: 28, description: "Lightweight shorts with a zip pocket." },
        { id: "cw2-i2", name: "Compression Socks (pair)", price: 14, description: "Graduated compression for recovery." },
      ],
    },
  ],
  equipment: [
    {
      id: "eq1",
      name: "IronWorks Equipment",
      location: "Old Town",
      rating: 4.7,
      offer: "Free shipping",
      items: [
        { id: "eq1-i1", name: "Adjustable Dumbbell Set", price: 180, description: "5–25kg per side, quick-lock adjustment." },
        { id: "eq1-i2", name: "Olympic Barbell (20kg)", price: 150, description: "Knurled grip, 700kg tensile strength." },
      ],
    },
    {
      id: "eq2",
      name: "HomeGym Direct",
      location: "Eastgate",
      rating: 4.5,
      items: [
        { id: "eq2-i1", name: "Resistance Band Set", price: 25, description: "5 bands, light to heavy resistance." },
        { id: "eq2-i2", name: "Foldable Yoga Mat", price: 20, description: "6mm thick, non-slip, carry strap included." },
      ],
    },
  ],
  supplements: [
    {
      id: "su1",
      name: "PureFuel Nutrition",
      location: "Uptown",
      rating: 4.6,
      offer: "15% off first order",
      items: [
        { id: "su1-i1", name: "Whey Protein (1kg)", price: 45, description: "24g protein per scoop, chocolate flavor." },
        { id: "su1-i2", name: "Creatine Monohydrate (300g)", price: 20, description: "Micronized, unflavored, 60 servings." },
      ],
    },
    {
      id: "su2",
      name: "ProteinHouse",
      location: "Northside",
      rating: 4.4,
      items: [
        { id: "su2-i1", name: "Mass Gainer (2kg)", price: 38, description: "High-calorie blend for lean bulking." },
        { id: "su2-i2", name: "BCAA Powder (250g)", price: 22, description: "2:1:1 ratio, watermelon flavor." },
      ],
    },
  ],
  wellness: [
    {
      id: "we1",
      name: "Serenity Spa & Wellness",
      location: "Riverside",
      rating: 4.9,
      offer: "1 free session",
      items: [
        { id: "we1-i1", name: "60-Minute Massage", price: 55, description: "Full-body deep tissue or relaxation massage." },
        { id: "we1-i2", name: "Sauna Session Pass", price: 20, description: "45 minutes, towel included." },
      ],
    },
    {
      id: "we2",
      name: "Recharge Recovery Lounge",
      location: "Midtown",
      rating: 4.7,
      items: [
        { id: "we2-i1", name: "Cryotherapy Session", price: 40, description: "3-minute whole-body cold therapy." },
        { id: "we2-i2", name: "Compression Boot Session", price: 25, description: "30-minute guided recovery session." },
      ],
    },
  ],
  meal_prep: [
    {
      id: "mp1",
      name: "Healthy Bites Meal Prep",
      location: "Midtown",
      rating: 4.8,
      offer: "10% off first order",
      items: [
        { id: "mp1-i1", name: "5-Day Meal Plan", price: 65, description: "Balanced macros, delivered daily." },
        { id: "mp1-i2", name: "High-Protein Bowl (single)", price: 12, description: "Grilled chicken, rice, roasted veg." },
      ],
    },
    {
      id: "mp2",
      name: "Homestyle MealBox",
      location: "Harbor District",
      rating: 4.6,
      offer: "Free delivery over $40",
      items: [
        { id: "mp2-i1", name: "Family Meal Box (4 servings)", price: 48, description: "Home-style comfort meals, ready to heat." },
        { id: "mp2-i2", name: "Vegetarian Mezze Box", price: 22, description: "Hummus, tabbouleh, moutabal and warak enab." },
      ],
    },
    {
      id: "mp3",
      name: "MacroKitchen",
      location: "Lakeside",
      rating: 4.7,
      items: [
        { id: "mp3-i1", name: "Cutting Plan (5 days)", price: 60, description: "Lower-calorie, high-protein prepared meals." },
        { id: "mp3-i2", name: "Single Protein Meal", price: 11, description: "Choice of chicken, beef or fish with sides." },
      ],
    },
  ],
};
