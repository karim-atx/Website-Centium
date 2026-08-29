import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { Star, MapPin, Camera, Image, Trash2, LogOut, Store, Mail, Phone, Globe } from "lucide-react";

// V8 (QA 8.0): "Move Profile fields and Ratings & Reviews out of the
// Business Dashboard's main view, into a dedicated Business Profile tab" —
// the dashboard is now purely listing/operations; identity-facing fields
// (name, bio, location) and reviews live here instead.
// V9 (QA 9.0): "Business profile and profile should be merged into just
// business profile" — the account-level bits (avatar, sign out) that used
// to live on the shared My Profile page move in here for business accounts,
// which no longer have a separate "/profile" entry point in More.
export default function BusinessProfileTab() {
  const { user, updateProfile, businessListing, updateBusinessListing, professionalReviews, signOut } = useApp();
  const navigate = useNavigate();
  const myBusinessReview = professionalReviews.find((r) => r.professionalId === "my-business");
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile({ avatarUrl: reader.result as string });
      setAvatarSheetOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSignOut = () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      setTimeout(() => setConfirmSignOut(false), 3000);
      return;
    }
    signOut();
    navigate("/onboarding");
  };

  return (
    <div>
      <PageHeader title="Business Profile" subtitle="How clients see you on Explore" showBack />

      <div className="flex items-center gap-4 mb-6 animate-fade-slide-up">
        <button
          onClick={() => setAvatarSheetOpen(true)}
          aria-label="Change profile picture"
          className="tap relative w-16 h-16 rounded-full bg-teal-pale flex items-center justify-center text-2xl font-bold text-teal-dark overflow-hidden shrink-0"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Store size={24} />
          )}
        </button>
        <div>
          <h2 className="font-display text-xl font-semibold text-charcoal">{user.businessName || "Your business"}</h2>
          <span className="inline-block text-[10px] font-bold text-charcoal-soft bg-cream-soft rounded-full px-2 py-0.5 mt-1">
            Business
          </span>
        </div>
      </div>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Profile</p>
      <Card className="mb-6">
        <label className="block mb-3">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Business name</span>
          {/* V9 (QA 9.0): "You should not be able to change the business
              name" */}
          <p className="w-full rounded-2xl bg-cream-soft px-4 py-3 text-sm text-charcoal-soft">
            {user.businessName || "Your business"}
          </p>
        </label>
        <label className="block mb-3">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Branch type — if this business has multiple branches
          </span>
          <input
            value={businessListing.branchType ?? ""}
            onChange={(e) => updateBusinessListing({ branchType: e.target.value })}
            placeholder="e.g. Downtown branch, Main location"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
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

      {/* V10 (QA 10.0): "a credentials tab should include the email, phone
          number, website. If either one is filled, it should reflect in
          the client UI as well as part of the explore tab." */}
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Credentials</p>
      <Card className="mb-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
            <Mail size={15} className="text-charcoal-faint shrink-0" />
            <input
              value={businessListing.email ?? ""}
              onChange={(e) => updateBusinessListing({ email: e.target.value })}
              placeholder="Business email"
              className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
            <Phone size={15} className="text-charcoal-faint shrink-0" />
            <input
              value={businessListing.phone ?? ""}
              onChange={(e) => updateBusinessListing({ phone: e.target.value })}
              placeholder="Phone number"
              className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
            <Globe size={15} className="text-charcoal-faint shrink-0" />
            <input
              value={businessListing.website ?? ""}
              onChange={(e) => updateBusinessListing({ website: e.target.value })}
              placeholder="Website"
              className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </div>
        </div>
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
          {businessListing.branchType && (
            <p className="text-xs font-semibold text-primary-dark mb-1">{businessListing.branchType}</p>
          )}
          {businessListing.location && (
            <p className="flex items-center gap-1.5 text-xs text-charcoal-faint mb-1.5">
              <MapPin size={11} /> {businessListing.location}
            </p>
          )}
          {businessListing.bio && <p className="text-sm text-charcoal-soft leading-relaxed mb-1.5">{businessListing.bio}</p>}
          {(businessListing.email || businessListing.phone || businessListing.website) && (
            <div className="pt-1.5 mt-1.5 border-t border-charcoal/[0.06] space-y-0.5">
              {businessListing.email && <p className="text-xs text-charcoal-soft">{businessListing.email}</p>}
              {businessListing.phone && <p className="text-xs text-charcoal-soft">{businessListing.phone}</p>}
              {businessListing.website && <p className="text-xs text-charcoal-soft">{businessListing.website}</p>}
            </div>
          )}
        </Card>
      )}

      <button
        onClick={handleSignOut}
        className="tap w-full flex items-center justify-center gap-2 rounded-2xl border border-teal/30 text-teal-dark text-sm font-semibold py-3.5"
      >
        <LogOut size={15} />
        {confirmSignOut ? "Tap again to confirm sign out" : "Sign Out"}
      </button>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleAvatarFile(e.target.files[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleAvatarFile(e.target.files[0])}
      />
      <BottomSheet open={avatarSheetOpen} onClose={() => setAvatarSheetOpen(false)} hideHeader>
        <div className="space-y-2.5 animate-fade-slide-up">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
          >
            <Camera size={18} className="text-primary" />
            <span className="text-sm font-semibold text-charcoal">Take a photo</span>
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
          >
            <Image size={18} className="text-primary" />
            <span className="text-sm font-semibold text-charcoal">Choose from library</span>
          </button>
          <button
            onClick={() => {
              updateProfile({ avatarUrl: undefined });
              setAvatarSheetOpen(false);
            }}
            disabled={!user.avatarUrl}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left disabled:opacity-40"
          >
            <Trash2 size={18} className="text-[#C0392B]" />
            <span className="text-sm font-semibold text-charcoal">Remove photo</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
