import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { marketplaceCategories } from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import { Flame, Sparkles, Gem } from "lucide-react";
import { marketplaceCategoryIcon } from "../../utils/icons";
import BusinessDashboard from "./BusinessDashboard";
import ProfessionalExplore from "./ProfessionalExplore";

// V7 (QA 7.0): "The reward counter should be a series of points that goes
// from bronze to silver to gold to platinum to diamond. With each stage
// start with 5000 and increase increments of 5000."
const rewardTiers = [
  { name: "Bronze", threshold: 0, color: "#B08D57" },
  { name: "Silver", threshold: 5000, color: "#A8A9AD" },
  { name: "Gold", threshold: 10000, color: "#D9A441" },
  { name: "Platinum", threshold: 15000, color: "#8FA6A3" },
  { name: "Diamond", threshold: 20000, color: "#6FA8DC" },
];

export default function Marketplace() {
  const { streaks, user } = useApp();
  const navigate = useNavigate();

  // Businesses get a management dashboard here instead of the consumer
  // browse experience — separate UI per QA, not just a banner.
  if (user.accountType === "business") {
    return <BusinessDashboard />;
  }
  // V7 (QA 7.0): a professional's Explore is job postings + affiliation,
  // not the consumer rewards/marketplace browse experience.
  if (user.accountType === "professional") {
    return <ProfessionalExplore />;
  }

  // Rewards are earned strictly off the 4 core (auto-derived, "locked")
  // streaks — a user-added custom streak never counts toward unlocking one.
  const lockedStreaks = streaks.filter((s) => s.auto);
  const streak = [...lockedStreaks].sort((a, b) => b.days - a.days)[0] ?? lockedStreaks[0];
  if (!streak) return null;

  // Points are derived from total logged streak days across the core
  // streaks — a simple, transparent stand-in for a real points ledger.
  const points = lockedStreaks.reduce((sum, s) => sum + s.days, 0) * 100;
  const tierIdx = [...rewardTiers].reverse().findIndex((t) => points >= t.threshold);
  const tier = rewardTiers[rewardTiers.length - 1 - tierIdx];
  const nextTier = rewardTiers[rewardTiers.length - tierIdx];
  const progressPct = nextTier
    ? Math.min(100, ((points - tier.threshold) / (nextTier.threshold - tier.threshold)) * 100)
    : 100;

  return (
    <div>
      <PageHeader title="Explore" subtitle="The future Centium ecosystem" showBack />

      <Card className="mb-6 bg-gradient-to-br from-ember to-ember-dark !text-white animate-fade-slide-up">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gem size={16} />
            <p className="text-sm font-bold">{tier.name} tier</p>
          </div>
          <p className="text-sm font-bold">{points.toLocaleString()} pts</p>
        </div>
        <div className="h-1.5 rounded-full bg-white/25 overflow-hidden mb-2">
          <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-xs text-white/85">
          {nextTier
            ? `${(nextTier.threshold - points).toLocaleString()} pts to ${nextTier.name}`
            : "Highest tier reached — Diamond"}
        </p>
      </Card>

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
