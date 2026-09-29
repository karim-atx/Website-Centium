// The marketplace's category taxonomy — and, since the arrays below it were
// deleted, nothing else.
//
// WHAT WENT. mockGyms, mockClasses and mockMarketplaceListings: invented
// venues with invented star ratings and invented offers. Between them they
// fed a browse screen (replaced by Explore, which reads marketplace_venues and
// marketplace_classes), a set of "businesses hiring" job postings on the
// professional's Explore tab, and the name lookup for gym passes. All three
// surfaces are gone; real venues and real classes come from the database.
//
// WHY THE CATEGORIES STAY. They are not data about anybody — they are the
// fixed list of things a business can list under, used by Explore, the
// category pages and the business's own Marketplace tab, and matched against
// business_offerings.category. The file keeps its name so the imports that
// already point here still resolve.

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

