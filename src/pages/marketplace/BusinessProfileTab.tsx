import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { Star, MapPin } from "lucide-react";

// V8 (QA 8.0): "Move Profile fields and Ratings & Reviews out of the
// Business Dashboard's main view, into a dedicated Business Profile tab" —
// the dashboard is now purely listing/operations; identity-facing fields
// (name, bio, location) and reviews live here instead.
export default function BusinessProfileTab() {
  const { user, updateProfile, businessListing, updateBusinessListing, professionalReviews } = useApp();
  const myBusinessReview = professionalReviews.find((r) => r.professionalId === "my-business");

  return (
    <div>
      <PageHeader title="Business Profile" subtitle="How clients see you on Explore" showBack />

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Profile</p>
      <Card className="mb-6">
        <label className="block mb-3">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Business name</span>
          <input
            value={user.businessName ?? ""}
            onChange={(e) => updateProfile({ businessName: e.target.value })}
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Location — shown to clients on Explore
          </span>
          <input
            value={businessListing.location}
            onChange={(e) => updateBusinessListing({ location: e.target.value })}
            placeholder="Midtown"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
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
    </div>
  );
}
