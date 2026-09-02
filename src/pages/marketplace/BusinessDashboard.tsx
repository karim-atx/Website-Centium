import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Toggle } from "../../components/ui/Toggle";
import { useApp } from "../../context/AppContext";
import { Store, Tag } from "lucide-react";

// V10 (QA 10.0): "Revamp the entire Business dashboard into something more
// relevant given the changes done so far" — folds in the stats that make
// sense now that Operations/Gym/Analytics/Marketplace-discounts all exist,
// instead of just the listing-toggle + single members-reached stat this
// page used to be.
// QA 11.0: "Remove shortcuts tab from dashboard" — Analytics/Operations/
// Marketplace are already one tap away from the bottom nav.
export default function BusinessDashboard() {
  const { user, businessListing, updateBusinessListing } = useApp();
  const [editingPerk, setEditingPerk] = useState(false);
  const [perkDraft, setPerkDraft] = useState(businessListing.perk);
  const isGym = user.businessType === "gym";

  const views = businessListing.membersReached * 6 + 128;

  return (
    <div>
      <PageHeader title="Business Dashboard" subtitle="Manage your Centium marketplace listing" />

      {/* Design refinement §6.11: gradient hero flattens to one solid fill,
          with a LIVE pill standing in for the gradient's implied "active"
          glow whenever the listing actually is active. */}
      <Card className="mb-6 !text-white animate-fade-slide-up" style={{ background: "#241F1B" }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Store size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold truncate">{user.businessName || "Your business"}</p>
            <p className="text-xs text-white/60">Listed on Centium Explore</p>
          </div>
          {businessListing.active && (
            // QA 11.0: "When live the logo should flash similar to what
            // like flashing if recording on a camera."
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-status-good/20 text-status-good rounded-full px-2 py-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-status-good animate-pulse" /> Live
            </span>
          )}
        </div>
      </Card>

      {/* three-up stat cards collapse into one hairline row — the icons
          were purely decorative, so they're gone with them. */}
      <Card padded={false} className="mb-6 flex divide-x divide-charcoal/[0.06] animate-fade-slide-up">
        <div className="flex-1 text-center py-3.5">
          <p className="text-lg font-bold text-charcoal leading-none tabular-nums">{businessListing.membersReached}</p>
          <p className="text-[10px] text-charcoal-faint mt-1.5">Members reached</p>
        </div>
        <div className="flex-1 text-center py-3.5">
          <p className="text-lg font-bold text-charcoal leading-none tabular-nums">{views.toLocaleString()}</p>
          <p className="text-[10px] text-charcoal-faint mt-1.5">Views (30d)</p>
        </div>
        {isGym ? (
          <div className="flex-1 text-center py-3.5">
            <p className="text-lg font-bold text-charcoal leading-none tabular-nums">{businessListing.membershipPlans.length}</p>
            <p className="text-[10px] text-charcoal-faint mt-1.5">Membership plans</p>
          </div>
        ) : (
          <div className="flex-1 text-center py-3.5">
            <p className="text-lg font-bold text-charcoal leading-none tabular-nums">{businessListing.discounts.length}</p>
            <p className="text-[10px] text-charcoal-faint mt-1.5">Active discounts</p>
          </div>
        )}
      </Card>

      <p className="section-label text-charcoal-faint mb-2.5">
        Your listing
      </p>
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Tag size={16} className="text-charcoal-tertiary" />
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
    </div>
  );
}
