import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { mockGyms, marketplaceCategories } from "../../data/mockProfessionals";
import { streaks } from "../../data/mockHealthData";
import { Flame, Sparkles } from "lucide-react";

export default function Marketplace() {
  const streak = streaks[1];

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

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Partner gyms near you
      </p>
      <div className="space-y-2.5 mb-6">
        {mockGyms.map((g) => (
          <Card key={g.id} className="flex items-center justify-between animate-fade-slide-up">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{g.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-charcoal">{g.name}</p>
                <p className="text-xs text-charcoal-faint">{g.location}</p>
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
