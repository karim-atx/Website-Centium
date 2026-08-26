import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Toggle } from "../../components/ui/Toggle";
import { useApp } from "../../context/AppContext";
import { Store, Users, Tag } from "lucide-react";

export default function BusinessDashboard() {
  const { user, businessListing, updateBusinessListing } = useApp();
  const [editingPerk, setEditingPerk] = useState(false);
  const [perkDraft, setPerkDraft] = useState(businessListing.perk);

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

      <Card className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
          <Users size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold text-charcoal">{businessListing.membersReached}</p>
          <p className="text-xs text-charcoal-faint">members reached via Centium streak rewards this month</p>
        </div>
      </Card>
    </div>
  );
}
