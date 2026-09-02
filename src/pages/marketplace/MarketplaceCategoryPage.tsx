import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { BottomSheet } from "../../components/ui/BottomSheet";
import {
  mockGyms,
  mockClasses,
  mockMarketplaceListings,
  marketplaceCategories,
} from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import { getCurrentPosition, distanceKm, type Coords } from "../../services/geo";
import { Star, MapPin, Building2, ShoppingBag, SlidersHorizontal, Check } from "lucide-react";
import { marketplaceCategoryIcon } from "../../utils/icons";
import type { MarketplaceCategoryId, Gym } from "../../types";
import type { StoreItem } from "../../data/mockProfessionals";
import { GymDetailSheet } from "../../components/marketplace/GymDetailSheet";
import { StoreDetailSheet } from "../../components/marketplace/StoreDetailSheet";
import { CartSheet } from "../../components/marketplace/CartSheet";

type FilterMode = "rating" | "proximity" | "discount";
const filterOptions: { value: FilterMode; label: string }[] = [
  { value: "rating", label: "Rating" },
  { value: "proximity", label: "Proximity" },
  { value: "discount", label: "Discounts" },
];

// V4: tapping a category on Explore now lands here — a listing of the
// matching services, each showing rating + location, instead of one flat
// unfiltered "browse everything" list.
export default function MarketplaceCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const { businessOfferings, businessListing, cart } = useApp();
  const id = (category ?? "gyms") as MarketplaceCategoryId;
  const meta = marketplaceCategories.find((c) => c.id === id);
  const Icon = marketplaceCategoryIcon[id] ?? marketplaceCategoryIcon.gyms;
  const [position, setPosition] = useState<Coords | null>(null);
  const [filter, setFilter] = useState<FilterMode>("rating");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeGym, setActiveGym] = useState<Gym | null>(null);
  const [activeStore, setActiveStore] = useState<
    { id: string; name: string; location: string; rating: number; offer?: string; items: StoreItem[] } | null
  >(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const isStoreCategory = id !== "gyms" && id !== "classes";

  useEffect(() => {
    getCurrentPosition().then(setPosition);
  }, []);

  const rankedGyms = useMemo(() => {
    const withDistance = mockGyms.map((g) => ({
      ...g,
      distanceKm: position ? distanceKm(position, { lat: g.lat, lng: g.lng }) : undefined,
    }));
    if (filter === "proximity") {
      return [...withDistance].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    }
    if (filter === "discount") {
      return [...withDistance].sort((a, b) => a.perk.localeCompare(b.perk));
    }
    return [...withDistance].sort((a, b) => b.rating - a.rating);
  }, [position, filter]);

  const rankedClasses = useMemo(() => {
    if (filter === "discount") return [...mockClasses].sort((a, b) => a.offer.localeCompare(b.offer));
    return [...mockClasses].sort((a, b) => b.rating - a.rating);
  }, [filter]);

  // V7 (QA 7.0): "adopts a marketplace like approach based on what they
  // provide in their Business UI" — offerings a business account created
  // (see BusinessDashboard's Marketplace tab) show up here for real,
  // alongside the mock listings.
  const businessListingsForCategory = useMemo(
    () => businessOfferings.filter((o) => o.category === id),
    [businessOfferings, id]
  );

  const rankedListings = useMemo(() => {
    const base = mockMarketplaceListings[id as keyof typeof mockMarketplaceListings] ?? [];
    if (filter === "discount") return [...base].sort((a, b) => (a.offer ? -1 : 1) - (b.offer ? -1 : 1));
    return [...base].sort((a, b) => b.rating - a.rating);
  }, [id, filter]);

  return (
    <div>
      <PageHeader
        title={meta?.label ?? "Explore"}
        subtitle="Ranked by rating"
        showBack
        right={
          isStoreCategory && (
            <button
              onClick={() => setCartOpen(true)}
              aria-label="Cart"
              className="tap relative w-10 h-10 rounded-full bg-cream-card flex items-center justify-center text-charcoal-soft shadow-soft"
            >
              <ShoppingBag size={17} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] rounded-full bg-teal text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </button>
          )
        }
      />

      {/* V9 (QA 9.0): "this filter logo instead of the separate tabs that
          shows you what the filters are when pressed" — one icon button
          opening a picker, replacing the always-visible Rating/Proximity/
          Discounts chip row. */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setFilterOpen(true)}
          className="tap flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-pale rounded-full px-3.5 py-1.5"
        >
          <SlidersHorizontal size={13} />
          {filterOptions.find((f) => f.value === filter)?.label}
        </button>
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter by">
        <div className="space-y-2 animate-fade-slide-up">
          {filterOptions.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value);
                setFilterOpen(false);
              }}
              className="tap w-full flex items-center justify-between rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-charcoal">{f.label}</span>
              {filter === f.value && <Check size={16} className="text-primary" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      <div className="space-y-2.5">
        {id === "gyms" &&
          rankedGyms.map((g) => (
            <Card key={g.id} interactive onClick={() => setActiveGym(g)} className="animate-fade-slide-up">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary-dark" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal truncate">{g.name}</p>
                  <span className="flex items-center gap-0.5 text-xs text-gold font-semibold mt-0.5">
                    <Star size={11} className="fill-gold" /> {g.rating}
                  </span>
                  <p className="flex items-center gap-1 text-xs text-charcoal-faint truncate mt-0.5">
                    <span className="truncate">{g.location}</span>
                    {g.distanceKm !== undefined && (
                      <span className="flex items-center gap-0.5 shrink-0">
                        <MapPin size={10} /> {g.distanceKm.toFixed(1)} km
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs font-bold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1.5 text-center shrink-0 max-w-[38%] leading-snug">
                  {g.perk}
                </span>
              </div>
            </Card>
          ))}

        {id === "classes" &&
          rankedClasses.map((c) => (
            <Card key={c.id} className="animate-fade-slide-up">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-charcoal">{c.name}</p>
                <span className="flex items-center gap-0.5 text-xs font-bold text-gold shrink-0">
                  <Star size={11} className="fill-gold" /> {c.rating}
                </span>
              </div>
              <p className="text-xs text-primary-dark font-medium">{c.gymName}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="flex items-center gap-1 text-xs text-charcoal-faint">
                  <MapPin size={11} /> {c.location}
                </span>
                <span className="text-xs font-bold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1">
                  {c.offer}
                </span>
              </div>
            </Card>
          ))}

        {isStoreCategory &&
          rankedListings.map((item) => (
            <Card key={item.id} interactive onClick={() => setActiveStore(item)} className="animate-fade-slide-up">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary-dark" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal truncate">{item.name}</p>
                  <span className="flex items-center gap-0.5 text-xs text-gold font-semibold mt-0.5">
                    <Star size={11} className="fill-gold" /> {item.rating}
                  </span>
                  <p className="text-xs text-charcoal-faint truncate mt-0.5">{item.location}</p>
                </div>
                {item.offer && (
                  <span className="text-xs font-bold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1.5 text-center shrink-0 max-w-[38%] leading-snug">
                    {item.offer}
                  </span>
                )}
              </div>
            </Card>
          ))}

        {id !== "gyms" && id !== "classes" && businessListingsForCategory.length > 0 && (
          <>
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide pt-2">
              From Centium businesses
            </p>
            {(businessListing.bio || businessListing.location) && (
              <Card className="bg-cream-soft animate-fade-slide-up">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={14} className="text-primary-dark" />
                  {businessListing.location && (
                    <span className="flex items-center gap-1 text-xs text-charcoal-faint">
                      <MapPin size={10} /> {businessListing.location}
                    </span>
                  )}
                </div>
                {businessListing.bio && <p className="text-xs text-charcoal-soft leading-relaxed">{businessListing.bio}</p>}
              </Card>
            )}
            {businessListingsForCategory.map((o) => (
              <Card key={o.id} className="animate-fade-slide-up">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-primary-dark" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal truncate">{o.title}</p>
                    <p className="text-xs text-charcoal-faint mt-0.5">{o.description}</p>
                  </div>
                  {o.price && (
                    <span className="text-xs font-bold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1.5 shrink-0">
                      {o.price}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      <GymDetailSheet open={!!activeGym} onClose={() => setActiveGym(null)} gym={activeGym} />
      <StoreDetailSheet open={!!activeStore} onClose={() => setActiveStore(null)} store={activeStore} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
