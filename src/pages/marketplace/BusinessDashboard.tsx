import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Toggle } from "../../components/ui/Toggle";
import { useApp } from "../../context/AppContext";
import { Store, Users, Tag, Star, MapPin } from "lucide-react";

export default function BusinessDashboard() {
  const { user, updateProfile, businessListing, updateBusinessListing, professionalReviews } = useApp();
  const [editingPerk, setEditingPerk] = useState(false);
  const [perkDraft, setPerkDraft] = useState(businessListing.perk);
  // V7 (QA 7.0): a client rating a business has no natural entry point yet
  // in this prototype (unlike a professional, a business isn't looked up
  // via a code/id from the client side) — this reads the same review store
  // under a business-specific sentinel so the display is ready once that
  // entry point exists.
  const myBusinessReview = professionalReviews.find((r) => r.professionalId === "my-business");

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

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Profile</p>
      <Card className="mb-6">
        <label className="block mb-3">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Business name</span>
          <input
            value={user.businessName ?? ""}
            onChange={(e) => updateProfile({ businessName: e.target.value })}
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>
        <label className="block mb-3">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Bio — shown to clients on Explore
          </span>
          <textarea
            value={businessListing.bio}
            onChange={(e) => updateBusinessListing({ bio: e.target.value })}
            rows={3}
            placeholder="Tell clients what makes your business worth a visit…"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20 resize-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Location — shown to clients on Explore
          </span>
          <input
            value={businessListing.location}
            onChange={(e) => updateBusinessListing({ location: e.target.value })}
            placeholder="Achrafieh, Beirut"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Ratings & Reviews
      </p>
      <Card className="mb-6">
        {myBusinessReview ? (
          <>
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={15} className={i < myBusinessReview.rating ? "fill-gold text-gold" : "text-charcoal/15"} />
              ))}
            </div>
            {myBusinessReview.text && <p className="text-sm text-charcoal-soft leading-relaxed">{myBusinessReview.text}</p>}
          </>
        ) : (
          <p className="text-sm text-charcoal-faint">No client reviews yet.</p>
        )}
      </Card>

      {(businessListing.bio || businessListing.location) && (
        <Card className="mb-6 bg-cream-soft">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Preview — what clients see on Explore
          </p>
          {businessListing.location && (
            <p className="flex items-center gap-1.5 text-xs text-charcoal-faint mb-1.5">
              <MapPin size={11} /> {businessListing.location}
            </p>
          )}
          {businessListing.bio && <p className="text-sm text-charcoal-soft leading-relaxed">{businessListing.bio}</p>}
        </Card>
      )}

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Your listing
      </p>
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Tag size={16} className="text-sohati" />
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
                className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
              />
              <button
                onClick={() => {
                  updateBusinessListing({ perk: perkDraft });
                  setEditingPerk(false);
                }}
                className="tap px-3 rounded-xl bg-sohati text-white text-sm font-semibold"
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
              className="tap w-full text-left rounded-2xl bg-cream-soft px-4 py-3 text-sm font-semibold text-sohati-dark"
            >
              {businessListing.perk}
            </button>
          )}
        </label>
      </Card>

      <Card className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-sohati-pale flex items-center justify-center shrink-0">
          <Users size={18} className="text-sohati" />
        </div>
        <div>
          <p className="text-lg font-bold text-charcoal">{businessListing.membersReached}</p>
          <p className="text-xs text-charcoal-faint">members reached via Centium streak rewards this month</p>
        </div>
      </Card>
    </div>
  );
}
