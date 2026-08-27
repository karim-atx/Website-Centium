import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { marketplaceCategories } from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import { Flame, Sparkles, Gem, Plus, SlidersHorizontal } from "lucide-react";
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
  const { streaks, user, bonusPoints, addBonusPoints } = useApp();
  const navigate = useNavigate();
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

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
  // V8 (QA 8.0): plus a placeholder bonus, added via the "+" button below.
  const points = lockedStreaks.reduce((sum, s) => sum + s.days, 0) * 100 + bonusPoints;
  const tierIdx = [...rewardTiers].reverse().findIndex((t) => points >= t.threshold);
  const tier = rewardTiers[rewardTiers.length - 1 - tierIdx];
  const nextTier = rewardTiers[rewardTiers.length - tierIdx];
  const progressPct = nextTier
    ? Math.min(100, ((points - tier.threshold) / (nextTier.threshold - tier.threshold)) * 100)
    : 100;

  return (
    <div>
      <PageHeader title="Explore" subtitle="The future Centium ecosystem" showBack />

      <Card className="mb-6 bg-gradient-to-br from-teal to-teal-dark !text-white animate-fade-slide-up">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gem size={16} />
            <p className="text-sm font-bold">{tier.name} tier</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold">{points.toLocaleString()} pts</p>
            {/* V8 (QA 8.0): "as a place holder add a plus sign logo that
                increases the tier by 1000 points" */}
            <button
              onClick={() => addBonusPoints(1000)}
              aria-label="Add 1000 points (placeholder)"
              className="tap w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Plus size={13} />
            </button>
          </div>
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

      <Card className="mb-6 bg-gradient-to-br from-teal to-teal-dark !text-white animate-fade-slide-up">
        <div className="flex items-center gap-2 mb-1.5">
          <Flame size={16} />
          <p className="text-sm font-bold">Your {streak.days}-day streak unlocked a reward</p>
        </div>
        <p className="text-sm text-white/85">10% off your next gym membership at partner gyms</p>
      </Card>

      {/* V8 (QA 8.0): "the filter should be a minimalistic logo that
          prompts you to choose what category rather than each one having
          their separate tab" — one filter button opens a picker instead of
          a permanent grid of category buttons. */}
      <button
        onClick={() => setCategoryPickerOpen(true)}
        className="tap w-full flex items-center justify-between bg-cream-card rounded-2xl px-4 py-3.5 shadow-soft mb-6 animate-fade-slide-up"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-charcoal">
          <SlidersHorizontal size={16} className="text-primary" /> Browse a category
        </span>
        <span className="text-xs text-charcoal-faint">{marketplaceCategories.length} available</span>
      </button>

      <Card className="text-center py-8 animate-fade-slide-up">
        <Sparkles size={22} className="text-berry mx-auto mb-3" />
        <p className="font-display font-semibold text-charcoal mb-1.5">More coming to Centium</p>
        <p className="text-xs text-charcoal-soft max-w-xs mx-auto leading-relaxed">
          Stores, classes, equipment, supplements and wellness services — a full health marketplace,
          built around your streaks and progress.
        </p>
      </Card>

      <BottomSheet open={categoryPickerOpen} onClose={() => setCategoryPickerOpen(false)} title="Choose a category">
        <div className="grid grid-cols-2 gap-2.5 animate-fade-slide-up">
          {marketplaceCategories.map((c) => {
            const Icon = marketplaceCategoryIcon[c.id];
            return (
              <button
                key={c.id}
                onClick={() => {
                  setCategoryPickerOpen(false);
                  navigate(`/app/marketplace/${c.id}`);
                }}
                className="tap flex flex-col items-center gap-1.5 bg-cream-soft rounded-2xl py-4"
              >
                <Icon size={20} className="text-primary" />
                <span className="text-[11px] font-semibold text-charcoal-soft text-center leading-tight px-1">
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
