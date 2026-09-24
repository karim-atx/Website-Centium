import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { BusinessPrototypeNotice } from "../../components/marketplace/BusinessPrototypeNotice";
import { Card } from "../../components/ui/Card";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { AVATAR_ACCEPT, removeAvatar, uploadAvatar } from "../../services/avatar";
import {
  fetchMyBusinessProfile,
  saveMyBusinessProfile,
  type BusinessProfilePatch,
} from "../../services/business-profile";
import { MapPin, Camera, Image, Trash2, LogOut, Store, Mail, Phone, Globe } from "lucide-react";

// V8 (QA 8.0): "Move Profile fields and Ratings & Reviews out of the
// Business Dashboard's main view, into a dedicated Business Profile tab" —
// the dashboard is now purely listing/operations; identity-facing fields
// (name, bio, location) and reviews live here instead.
// V9 (QA 9.0): "Business profile and profile should be merged into just
// business profile" — the account-level bits (avatar, sign out) that used
// to live on the shared My Profile page move in here for business accounts,
// which no longer have a separate "/profile" entry point in More.
// PHASE (2026-09): THE LISTING IS REAL NOW. Every field below wrote to
// `businessListing`, a usePersistentState object, on each keystroke — so a
// gym's bio, location, branch and contact details lived on exactly one device
// while the columns every client-facing surface reads stayed empty.
//
// DRAFT AND STORED, WITH AN EXPLICIT SAVE, copied from ProfessionalBioCard
// deliberately. Per-keystroke writes are out of the question against a server,
// and blur-to-save is worse than it looks: blur fires when somebody switches
// tab or app, so the write lands invisibly at a moment they were not thinking
// about it. A Save button that appears only when something differs from what
// is stored makes "you have unsaved changes" a visible state.
//
// THE AVATAR IS UNTOUCHED. It was made real in the avatar work and still runs
// through services/avatar against the `avatars` bucket and profiles.avatar_url
// — a different row, a different table, and nothing below shares a code path
// with it.
export default function BusinessProfileTab() {
  const { user, updateProfile, signOut, authUserId, profileReady } = useApp();
  const navigate = useNavigate();

  const [stored, setStored] = useState<BusinessProfilePatch>({});
  const [draft, setDraft] = useState<BusinessProfilePatch>({});
  const [loading, setLoading] = useState(true);
  const [savingListing, setSavingListing] = useState(false);
  const [savedListing, setSavedListing] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void fetchMyBusinessProfile(authUserId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        // Keep the form as it is rather than blanking it: an empty listing
        // and a failed read look identical, and only one of them is safe to
        // then save over the top of.
        setListingError(result.message);
        return;
      }
      setListingError(null);
      const next: BusinessProfilePatch = {
        branchType: result.profile?.branchType ?? "",
        bio: result.profile?.bio ?? "",
        location: result.profile?.location ?? "",
        publicEmail: result.profile?.publicEmail ?? "",
        publicPhone: result.profile?.publicPhone ?? "",
        publicWebsite: result.profile?.publicWebsite ?? "",
      };
      setStored(next);
      setDraft(next);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady]);

  const field = (key: keyof BusinessProfilePatch) => draft[key] ?? "";
  const edit = (key: keyof BusinessProfilePatch, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSavedListing(false);
  };

  const dirty = (Object.keys(draft) as (keyof BusinessProfilePatch)[]).some(
    (k) => (draft[k] ?? "").trim() !== (stored[k] ?? "").trim()
  );

  const saveListing = async () => {
    if (!authUserId || savingListing) return;
    setSavingListing(true);
    setListingError(null);
    const result = await saveMyBusinessProfile(authUserId, draft, {
      // Only used when the row does not exist yet — both columns are NOT NULL
      // and this is the one place those two values live today.
      businessName: user.businessName,
      businessType: user.businessType,
    });
    setSavingListing(false);
    if (!result.ok) {
      setListingError(result.message);
      return;
    }
    // From the response, not the draft: what the row actually holds is the
    // only thing that should be treated as saved.
    const saved: BusinessProfilePatch = {
      branchType: result.profile.branchType ?? "",
      bio: result.profile.bio ?? "",
      location: result.profile.location ?? "",
      publicEmail: result.profile.publicEmail ?? "",
      publicPhone: result.profile.publicPhone ?? "",
      publicWebsite: result.profile.publicWebsite ?? "",
    };
    setStored(saved);
    setDraft(saved);
    setSavedListing(true);
  };
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // The same real upload the personal profile now does. A business account's
  // picture is the one that shows in the marketplace listing, so it was the
  // most visible instance of the old bug: chosen here, seen nowhere.
  const handleAvatarFile = async (file: File) => {
    if (!authUserId || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    const result = await uploadAvatar(authUserId, file, user.avatarUrl);
    setAvatarBusy(false);
    if (!result.ok) {
      setAvatarError(result.message);
      return;
    }
    updateProfile({ avatarUrl: result.url });
    setAvatarSheetOpen(false);
  };

  const handleAvatarRemove = async () => {
    if (!authUserId || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    const result = await removeAvatar(authUserId, user.avatarUrl);
    setAvatarBusy(false);
    if (!result.ok) {
      setAvatarError(result.message ?? "Couldn't remove your picture.");
      return;
    }
    updateProfile({ avatarUrl: undefined });
    setAvatarSheetOpen(false);
  };

  const handleSignOut = () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      setTimeout(() => setConfirmSignOut(false), 3000);
      return;
    }
    signOut();
    navigate("/app/onboarding");
  };

  return (
    <div>
      <PageHeader title="Business Profile" subtitle="How clients see you on Explore" showBack />
      <BusinessPrototypeNotice />

      <div className="flex items-center gap-4 mb-6 animate-fade-slide-up">
        <button
          onClick={() => setAvatarSheetOpen(true)}
          aria-label="Change profile picture"
          className="tap relative w-16 h-16 rounded-full bg-teal-pale flex items-center justify-center text-2xl font-bold text-charcoal-soft dark:text-teal-deep-text overflow-hidden shrink-0"
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
            value={field("branchType")}
            onChange={(e) => edit("branchType", e.target.value)}
            placeholder="e.g. Downtown branch, Main location"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="block mb-3">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Bio — shown to clients on Explore
          </span>
          <textarea
            value={field("bio")}
            onChange={(e) => edit("bio", e.target.value)}
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
            value={field("location")}
            onChange={(e) => edit("location", e.target.value)}
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
              value={field("publicEmail")}
              onChange={(e) => edit("publicEmail", e.target.value)}
              placeholder="Business email"
              className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
            <Phone size={15} className="text-charcoal-faint shrink-0" />
            <input
              value={field("publicPhone")}
              onChange={(e) => edit("publicPhone", e.target.value)}
              placeholder="Phone number"
              className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
            <Globe size={15} className="text-charcoal-faint shrink-0" />
            <input
              value={field("publicWebsite")}
              onChange={(e) => edit("publicWebsite", e.target.value)}
              placeholder="Website"
              className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* ONE SAVE FOR BOTH CARDS. Profile and Credentials edit two halves of a
          single business_profiles row; two buttons writing one row is how a
          half-saved listing happens. */}
      <div className="flex items-center gap-3 mb-6 min-h-[28px]">
        {loading ? (
          <p className="text-xs font-semibold text-charcoal-faint">Loading your listing…</p>
        ) : dirty ? (
          <button
            onClick={() => void saveListing()}
            disabled={savingListing}
            className="tap rounded-full bg-primary text-white text-xs font-bold px-5 py-2.5 disabled:opacity-50"
          >
            {savingListing ? "Saving…" : "Save changes"}
          </button>
        ) : savedListing ? (
          <p className="text-xs font-semibold text-primary-dark">Saved</p>
        ) : null}
        {listingError && <p className="text-xs font-semibold text-status-high">{listingError}</p>}
      </div>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Ratings & Reviews
      </p>
      {/* BUSINESSES HAVE NO REVIEWS, and this card has never shown one. It
          read a localStorage entry keyed "my-business" that nothing in the app
          has ever written — there is no flow, on any screen, that creates one.
          professional_reviews is keyed on a professional's account and its
          gate requires a professional_clients relationship, so a business
          cannot be its subject. Reviewing businesses is a separate feature
          with its own table; until it exists this says so plainly instead of
          waiting on a key that will never arrive. */}
      <Card className="mb-6">
        <p className="text-sm text-charcoal-faint">Client reviews for businesses aren't available yet.</p>
      </Card>

      {/* The preview reads the draft, not what is stored — it is a preview of
          the edit in progress, which is the only thing it would be useful for.
          The Save button above is what says whether any of it has landed. */}
      {(field("bio") || field("location")) && (
        <Card className="mb-6 bg-cream-soft">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Preview — what clients see on Explore
          </p>
          {field("branchType") && (
            <p className="text-xs font-semibold text-primary-dark mb-1">{field("branchType")}</p>
          )}
          {field("location") && (
            <p className="flex items-center gap-1.5 text-xs text-charcoal-faint mb-1.5">
              <MapPin size={11} /> {field("location")}
            </p>
          )}
          {field("bio") && <p className="text-sm text-charcoal-soft leading-relaxed mb-1.5">{field("bio")}</p>}
          {(field("publicEmail") || field("publicPhone") || field("publicWebsite")) && (
            <div className="pt-1.5 mt-1.5 border-t border-charcoal/[0.06] space-y-0.5">
              {field("publicEmail") && <p className="text-xs text-charcoal-soft">{field("publicEmail")}</p>}
              {field("publicPhone") && <p className="text-xs text-charcoal-soft">{field("publicPhone")}</p>}
              {field("publicWebsite") && <p className="text-xs text-charcoal-soft">{field("publicWebsite")}</p>}
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
        accept={AVATAR_ACCEPT}
        capture="user"
        className="hidden"
        // Cleared after every pick so choosing the SAME file again still fires
        // onChange — otherwise a rejected photo cannot be retried without
        // picking something else first. Same fix the capture flows carry.
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (picked) void handleAvatarFile(picked);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (picked) void handleAvatarFile(picked);
        }}
      />
      <BottomSheet open={avatarSheetOpen} onClose={() => setAvatarSheetOpen(false)} hideHeader>
        <div className="space-y-2.5 animate-fade-slide-up">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={avatarBusy}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
          >
            <Camera size={18} className="text-primary" />
            <span className="text-sm font-semibold text-charcoal">Take a photo</span>
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            disabled={avatarBusy}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
          >
            <Image size={18} className="text-primary" />
            <span className="text-sm font-semibold text-charcoal">Choose from library</span>
          </button>
          <button
            onClick={() => void handleAvatarRemove()}
            disabled={!user.avatarUrl || avatarBusy}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left disabled:opacity-40"
          >
            <Trash2 size={18} className="text-[#C0392B]" />
            <span className="text-sm font-semibold text-charcoal">Remove photo</span>
          </button>
          {avatarBusy && (
            <p className="text-center text-xs font-semibold text-charcoal-faint">Saving…</p>
          )}
          {avatarError && (
            <p className="text-center text-xs font-semibold text-status-high">{avatarError}</p>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
