import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { mockGyms, marketplaceCategories } from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import { getCurrentPosition, distanceKm, type Coords } from "../../services/geo";
import { Flame, Sparkles, Star, MapPin } from "lucide-react";
import BusinessDashboard from "./BusinessDashboard";

export default function Marketplace() {
  const { streaks, user } = useApp();
  const streak = streaks[1] ?? streaks[0];
  const [position, setPosition] = useState<Coords | null>(null);

  useEffect(() => {
    getCurrentPosition().then(setPosition);
  }, []);

  const rankedGyms = useMemo(() => {
    return [...mockGyms]
      .map((g) => ({
        ...g,
        distanceKm: position ? distanceKm(position, { lat: g.lat, lng: g.lng }) : undefined,
      }))
      .sort((a, b) => b.rating - a.rating);
  }, [position]);

  // Businesses get a management dashboard here instead of the consumer
  // browse experience — separate UI per QA, not just a banner.
  if (user.accountType === "business") {
    return <BusinessDashboard />;
  }

  return (
    <div>
      <PageHeader title="Explore" subtitle="The future Sohati ecosystem" />

      <Card className="mb-6 bg-gradient-to-br from-ember to-ember-dark !text-white animate-fade-slide-up">
        <div className="flex items-center gap-2 mb-1.5">
          <Flame size={16} />
          <p className="text-sm font-bold">Your {streak.days}-day streak unlocked a reward</p>
        </div>
        <p className="text-sm text-white/85">10% off your next gym membership at partner gyms</p>
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Categories</p>
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        {marketplaceCategories.map((c) => (
          <div
            key={c.id}
            className="flex flex-col items-center gap-1.5 bg-cream-card rounded-2xl py-4 shadow-soft animate-fade-slide-up"
          >
            <span className="text-xl">{c.emoji}</span>
            <span className="text-[10px] font-semibold text-charcoal-soft text-center leading-tight px-1">
              {c.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
          Partner gyms near you
        </p>
        <span className="text-[10px] text-charcoal-faint">Ranked by rating</span>
      </div>
      <div className="space-y-2.5 mb-6">
        {rankedGyms.map((g) => (
          <Card key={g.id} className="flex items-center justify-between animate-fade-slide-up">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">{g.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal truncate">{g.name}</p>
                <div className="flex items-center gap-2 text-xs text-charcoal-faint">
                  <span className="flex items-center gap-0.5 text-gold font-semibold">
                    <Star size={11} className="fill-gold" /> {g.rating}
                  </span>
                  <span>{g.location}</span>
                  {g.distanceKm !== undefined && (
                    <span className="flex items-center gap-0.5">
                      <MapPin size={10} /> {g.distanceKm.toFixed(1)} km
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-sohati-dark bg-sohati-pale rounded-full px-2.5 py-1.5 text-right shrink-0 ml-2">
              {g.perk}
            </span>
          </Card>
        ))}
      </div>

      <Card className="text-center py-8 animate-fade-slide-up">
        <Sparkles size={22} className="text-berry mx-auto mb-3" />
        <p className="font-display font-semibold text-charcoal mb-1.5">More coming to Sohati</p>
        <p className="text-xs text-charcoal-soft max-w-xs mx-auto leading-relaxed">
          Stores, classes, equipment, supplements and wellness services — a full health marketplace,
          built around your streaks and progress.
        </p>
      </Card>
    </div>
  );
}
