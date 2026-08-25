import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import {
  mockGyms,
  mockClasses,
  mockMarketplaceListings,
  marketplaceCategories,
} from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import { getCurrentPosition, distanceKm, type Coords } from "../../services/geo";
import { Star, MapPin, Building2 } from "lucide-react";
import { marketplaceCategoryIcon } from "../../utils/icons";
import type { MarketplaceCategoryId, Gym } from "../../types";
import { GymDetailSheet } from "../../components/marketplace/GymDetailSheet";

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
  const { businessOfferings, businessListing } = useApp();
  const id = (category ?? "gyms") as MarketplaceCategoryId;
  const meta = marketplaceCategories.find((c) => c.id === id);
  const Icon = marketplaceCategoryIcon[id] ?? marketplaceCategoryIcon.gyms;
  const [position, setPosition] = useState<Coords | null>(null);
  const [filter, setFilter] = useState<FilterMode>("rating");
  const [activeGym, setActiveGym] = useState<Gym | null>(null);

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
      <PageHeader title={meta?.label ?? "Explore"} subtitle="Ranked by rating" showBack />

      <div className="flex gap-2 mb-4">
        {filterOptions.map((f) => (
          <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="space-y-2.5">
        {id === "gyms" &&
          rankedGyms.map((g) => (
            <Card key={g.id} interactive onClick={() => setActiveGym(g)} className="animate-fade-slide-up">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-2xl bg-sohati-pale flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-sohati-dark" />
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
                <span className="text-xs font-bold text-sohati-dark bg-sohati-pale rounded-full px-2.5 py-1.5 text-center shrink-0 max-w-[38%] leading-snug">
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
              <p className="text-xs text-sohati-dark font-medium">{c.gymName}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="flex items-center gap-1 text-xs text-charcoal-faint">
                  <MapPin size={11} /> {c.location}
                </span>
                <span className="text-xs font-bold text-sohati-dark bg-sohati-pale rounded-full px-2.5 py-1">
                  {c.offer}
                </span>
              </div>
            </Card>
          ))}

        {id !== "gyms" &&
          id !== "classes" &&
          rankedListings.map((item) => (
            <Card key={item.id} className="animate-fade-slide-up">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-2xl bg-sohati-pale flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-sohati-dark" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal truncate">{item.name}</p>
                  <span className="flex items-center gap-0.5 text-xs text-gold font-semibold mt-0.5">
                    <Star size={11} className="fill-gold" /> {item.rating}
                  </span>
                  <p className="text-xs text-charcoal-faint truncate mt-0.5">{item.location}</p>
                </div>
                {item.offer && (
                  <span className="text-xs font-bold text-sohati-dark bg-sohati-pale rounded-full px-2.5 py-1.5 text-center shrink-0 max-w-[38%] leading-snug">
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
                  <Building2 size={14} className="text-sohati-dark" />
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
                  <span className="w-11 h-11 rounded-2xl bg-sohati-pale flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-sohati-dark" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal truncate">{o.title}</p>
                    <p className="text-xs text-charcoal-faint mt-0.5">{o.description}</p>
                  </div>
                  {o.price && (
                    <span className="text-xs font-bold text-sohati-dark bg-sohati-pale rounded-full px-2.5 py-1.5 shrink-0">
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
    </div>
  );
}
