import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Toggle } from "../../components/ui/Toggle";
import { useApp } from "../../context/AppContext";
import { Store, Users, Tag, BarChart3, Briefcase, ChevronRight, KeyRound, Percent } from "lucide-react";

// V10 (QA 10.0): "Revamp the entire Business dashboard into something more
// relevant given the changes done so far" — folds in the stats/shortcuts
// that make sense now that Operations/Gym/Analytics/Marketplace-discounts
// all exist, instead of just the listing-toggle + single members-reached
// stat this page used to be.
export default function BusinessDashboard() {
  const { user, businessListing, updateBusinessListing } = useApp();
  const navigate = useNavigate();
  const [editingPerk, setEditingPerk] = useState(false);
  const [perkDraft, setPerkDraft] = useState(businessListing.perk);
  const isGym = user.businessType === "gym";

  const views = businessListing.membersReached * 6 + 128;

  const shortcuts = [
    { icon: BarChart3, label: "Analytics", desc: "Views, taps & performance", to: "/business/analytics" },
    { icon: Briefcase, label: "Operations", desc: "Gym, employees & classes", to: "/business/operations" },
    { icon: Tag, label: "Marketplace", desc: "Listings & discounts", to: "/business/marketplace" },
  ];

  return (
    <div>
      <PageHeader title="Business Dashboard" subtitle="Manage your Centium marketplace listing" />

      <Card className="mb-6 bg-gradient-to-br from-charcoal to-charcoal/90 !text-cream animate-fade-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Store size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold truncate">{user.businessName || "Your business"}</p>
            <p className="text-xs text-cream/60">Listed on Centium Explore</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2.5 mb-6">
        <Card className="text-center animate-fade-slide-up">
          <Users size={15} className="text-primary mx-auto mb-1.5" />
          <p className="text-lg font-bold text-charcoal leading-none">{businessListing.membersReached}</p>
          <p className="text-[10px] text-charcoal-faint mt-1">Members reached</p>
        </Card>
        <Card className="text-center animate-fade-slide-up">
          <BarChart3 size={15} className="text-primary mx-auto mb-1.5" />
          <p className="text-lg font-bold text-charcoal leading-none">{views.toLocaleString()}</p>
          <p className="text-[10px] text-charcoal-faint mt-1">Listing views (30d)</p>
        </Card>
        {isGym ? (
          <Card className="text-center animate-fade-slide-up">
            <KeyRound size={15} className="text-primary mx-auto mb-1.5" />
            <p className="text-lg font-bold text-charcoal leading-none">{businessListing.membershipPlans.length}</p>
            <p className="text-[10px] text-charcoal-faint mt-1">Membership plans</p>
          </Card>
        ) : (
          <Card className="text-center animate-fade-slide-up">
            <Percent size={15} className="text-primary mx-auto mb-1.5" />
            <p className="text-lg font-bold text-charcoal leading-none">{businessListing.discounts.length}</p>
            <p className="text-[10px] text-charcoal-faint mt-1">Active discounts</p>
          </Card>
        )}
      </div>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Your listing
      </p>
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Tag size={16} className="text-primary" />
            <span className="text-sm font-semibold text-charcoal">Active on Explore</span>
          </div>
          <Toggle
            checked={businessListing.active}
            onChange={(v) => updateBusinessListing({ active: v })}
            label="Listing active"
          />
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Streak reward / perk shown to Centium users
          </span>
          {editingPerk ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={perkDraft}
                onChange={(e) => setPerkDraft(e.target.value)}
                className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => {
                  updateBusinessListing({ perk: perkDraft });
                  setEditingPerk(false);
                }}
                className="tap px-3 rounded-xl bg-primary text-white text-sm font-semibold"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setPerkDraft(businessListing.perk);
                setEditingPerk(true);
              }}
              className="tap w-full text-left rounded-2xl bg-cream-soft px-4 py-3 text-sm font-semibold text-primary-dark"
            >
              {businessListing.perk}
            </button>
          )}
        </label>
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Shortcuts</p>
      <div className="space-y-2.5">
        {shortcuts.map((s) => (
          <Card
            key={s.label}
            interactive
            onClick={() => navigate(s.to)}
            className="flex items-center justify-between animate-fade-slide-up"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                <s.icon size={17} className="text-primary-dark" />
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">{s.label}</p>
                <p className="text-xs text-charcoal-faint">{s.desc}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint" />
          </Card>
        ))}
      </div>
    </div>
  );
}
