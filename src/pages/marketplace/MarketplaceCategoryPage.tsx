import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import {
  mockGyms,
  mockClasses,
  mockMarketplaceListings,
  marketplaceCategories,
} from "../../data/mockProfessionals";
import { getCurrentPosition, distanceKm, type Coords } from "../../services/geo";
import { Star, MapPin } from "lucide-react";
import { marketplaceCategoryIcon } from "../../utils/icons";
import type { MarketplaceCategoryId } from "../../types";

// V4: tapping a category on Explore now lands here — a listing of the
// matching services, each showing rating + location, instead of one flat
// unfiltered "browse everything" list.
export default function MarketplaceCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const id = (category ?? "gyms") as MarketplaceCategoryId;
  const meta = marketplaceCategories.find((c) => c.id === id);
  const Icon = marketplaceCategoryIcon[id] ?? marketplaceCategoryIcon.gyms;
  const [position, setPosition] = useState<Coords | null>(null);

  useEffect(() => {
    if (id === "gyms") getCurrentPosition().then(setPosition);
  }, [id]);

  const rankedGyms = useMemo(() => {
    return [...mockGyms]
      .map((g) => ({
        ...g,
        distanceKm: position ? distanceKm(position, { lat: g.lat, lng: g.lng }) : undefined,
      }))
      .sort((a, b) => b.rating - a.rating);
  }, [position]);

  return (
    <div>
      <PageHeader title={meta?.label ?? "Explore"} subtitle="Ranked by rating" showBack />

      <div className="space-y-2.5">
        {id === "gyms" &&
          rankedGyms.map((g) => (
            <Card key={g.id} className="animate-fade-slide-up">
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
          mockClasses.map((c) => (
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
          mockMarketplaceListings[id as keyof typeof mockMarketplaceListings]?.map((item) => (
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
      </div>
    </div>
  );
}
