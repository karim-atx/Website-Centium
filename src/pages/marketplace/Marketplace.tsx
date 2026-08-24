import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { marketplaceCategories } from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import { Flame, Sparkles } from "lucide-react";
import { marketplaceCategoryIcon } from "../../utils/icons";
import BusinessDashboard from "./BusinessDashboard";

export default function Marketplace() {
  const { streaks, user } = useApp();
  const navigate = useNavigate();

  // Businesses get a management dashboard here instead of the consumer
  // browse experience — separate UI per QA, not just a banner.
  if (user.accountType === "business") {
    return <BusinessDashboard />;
  }

  // Rewards are earned strictly off the 4 core (auto-derived, "locked")
  // streaks — a user-added custom streak never counts toward unlocking one.
  const lockedStreaks = streaks.filter((s) => s.auto);
  const streak = [...lockedStreaks].sort((a, b) => b.days - a.days)[0] ?? lockedStreaks[0];
  if (!streak) return null;

  return (
    <div>
      <PageHeader title="Explore" subtitle="The future Centium ecosystem" showBack />

      <Card className="mb-6 bg-gradient-to-br from-ember to-ember-dark !text-white animate-fade-slide-up">
        <div className="flex items-center gap-2 mb-1.5">
          <Flame size={16} />
          <p className="text-sm font-bold">Your {streak.days}-day streak unlocked a reward</p>
        </div>
        <p className="text-sm text-white/85">10% off your next gym membership at partner gyms</p>
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Categories</p>
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        {marketplaceCategories.map((c) => {
          const Icon = marketplaceCategoryIcon[c.id];
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/marketplace/${c.id}`)}
              className="tap flex flex-col items-center gap-1.5 bg-cream-card rounded-2xl py-4 shadow-soft animate-fade-slide-up"
            >
              <Icon size={20} className="text-sohati" />
              <span className="text-[10px] font-semibold text-charcoal-soft text-center leading-tight px-1">
                {c.label}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="text-center py-8 animate-fade-slide-up">
        <Sparkles size={22} className="text-berry mx-auto mb-3" />
        <p className="font-display font-semibold text-charcoal mb-1.5">More coming to Centium</p>
        <p className="text-xs text-charcoal-soft max-w-xs mx-auto leading-relaxed">
          Stores, classes, equipment, supplements and wellness services — a full health marketplace,
          built around your streaks and progress.
        </p>
      </Card>
    </div>
  );
}
