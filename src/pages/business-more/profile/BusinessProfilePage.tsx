import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { AlertCircle, Camera, Globe, IdCard, Loader2, Mail, MapPin, MapPinned, Pencil, Phone, Plus, Share2, Star, Tags, Text, UserRound } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { BizCard, BizLabel, BizRow, BizSection, LoadError, RowsSkeleton, SubHeader, OfflineLine, LIST_BG, BORDER } from "../../../components/business-more/kit";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Toast } from "../../../components/ui/Toast";
import { useOnline } from "../../../hooks/useOnline";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBizToast } from "../../../components/business-more/useBizToast";
import { copyText } from "../../../components/business-more/share";
import { InstagramGlyph } from "../../../components/business-more/InstagramGlyph";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { CATEGORY_LABEL, initialsOf, typeLabel } from "../../../components/business-more/kind";
import { FORUM_PHOTO_ACCEPT } from "../../../services/forum/photo";
import {
  fetchLocations,
  removeBusinessImage,
  saveBusiness,
  uploadBusinessImage,
  type BizLocation,
  type BusinessPatch,
} from "../../../services/business-more";
import { saveMyBusinessProfile } from "../../../services/business-profile";
import { AVATAR_ACCEPT, removeAvatar, uploadAvatar } from "../../../services/avatar";
import { fetchReviewSummary } from "../../../services/venues";
import { dayValue, isoWeekdayIn, NOT_PUBLISHED } from "../../../services/venues/hours";
import { NameTypeSheet, BioSheet, CategoriesSheet, ContactSheet, AreaSheet, YourPhotoSheet } from "./ProfileSheets";
import { BusinessCard, type CardData } from "./BusinessCard";

// MO1B-011 / -013 / -025 · Business Profile (BizMoreV8 screen="profile", hero
// block line 43, rows lines 262 to 268). Replaces the old listing form
// (HANDOVER §5 "Replaced: More, Business Profile hero"): the cover and logo
// with their photo menus, Share and Edit, the name / type / rating line, the
// venue photos, About, Locations and hours, Contact, Listing and Sign Out.
// Every section edits through its sheet (MO1B-014 to -023) and saves only what
// it shows.
//
// KEPT: the business name is editable again (V6-83; it was read-only by QA
// 9.0) · branch type becomes the location's name (Locations and hours) ·
// the Explore preview becomes the business card (MO1B-026) · Cycle tracking
// moves to Settings › Data & account (V6-125) · Sign Out at the end · the
// venue console stays the photo / hours editor (MO1B-011 K2) · the old
// form's free-text Location is About › Area (business_profiles.location;
// the storefront, the Explore seller line and the listing strength read it)
// · the old form's personal picture is You › Your photo (profiles.avatar_url,
// shown in team and direct chats).

const stripes = "repeating-linear-gradient(135deg, rgb(var(--c-primary-pale)) 0 10px, var(--biz-list) 10px 20px)";

type PhotoKind = "cover" | "logo";
type SheetKind = "hero" | "bio" | "cats" | "area" | "contact" | "photo" | null;

function todayLine(loc: BizLocation): string {
  const today = isoWeekdayIn(loc.timezone);
  const row = loc.hours.find((h) => h.weekday === today);
  const v = dayValue(row);
  if (v === NOT_PUBLISHED) return "Hours not published";
  if (v === "Closed") return "Closed today";
  return `Open today ${v}`;
}

// AN3-078 / AN3-084 pop-up bodies per type (Classes keeps the drawn sentence).
const LISTING_ON_BODY = {
  classes: "Clients nearby can find you, see your perk and book your classes.",
  gym: "Clients nearby can find you, see your perk and join.",
  store: "Customers nearby can find you, see your perk and order.",
} as const;
const LISTING_OFF_BODY = {
  classes: "Existing members keep their bookings. New clients won't find you until you turn it back on.",
  gym: "Existing members keep their passes. New members won't find you until you turn it back on.",
  store: "Existing orders still go through. New customers won't find you until you turn it back on.",
} as const;

export default function BusinessProfilePage() {
  const navigate = useNavigate();
  const { authUserId, user, updateProfile, signOut } = useApp();
  const { business, kind, kindKnown, loading, error, reload, setBusiness } = useBusiness();
  const [toast, showToast] = useBizToast();

  const [locations, setLocations] = useState<BizLocation[] | null>(null);
  const [rating, setRating] = useState<{ average: number; total: number } | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [menu, setMenu] = useState<PhotoKind | null>(null);
  const [uploading, setUploading] = useState<PhotoKind | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [listingBusy, setListingBusy] = useState(false);
  // AN3 listing flow (AN3-076 to AN3-090): the switch asks first, nothing is
  // written until the pop-up's confirm; the toast offers the way back.
  const [params] = useSearchParams();
  const from = params.get("from") === "analytics" ? "Analytics" : params.get("from") === "dashboard" ? "Dashboard" : null;
  const online = useOnline();
  const dark = useIsDark();
  const [listConfirm, setListConfirm] = useState<"on" | "off" | null>(null);
  const [listToast, setListToast] = useState<{ n: number; message: string; error?: boolean } | null>(null);
  // The highlight shows on arrival from a deep link while hidden, and goes
  // for good once the listing is on (AN3-076 row 6, AN3-086 row 3).
  const [hlArmed, setHlArmed] = useState(true);
  const listingRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const pickFor = useRef<PhotoKind>("cover");

  const bizId = business?.id ?? null;
  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchLocations(bizId).then(async (r) => {
      if (cancelled) return;
      const locs = r.ok ? r.value : [];
      setLocations(locs);
      // Rating (BU6-04): reviews are kept per venue today, so the business
      // line reads its first venue's summary.
      if (locs[0]) {
        const s = await fetchReviewSummary(locs[0].id);
        if (!cancelled && s.ok) setRating({ average: s.value.average, total: s.value.total });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [bizId]);

  const openSheet = (k: SheetKind) => {
    setSheetKey((n) => n + 1);
    setSheet(k);
  };

  /** Saves a sheet's patch; null on success, else the message for the sheet. */
  const save = async (patch: BusinessPatch): Promise<string | null> => {
    if (!authUserId) return "Couldn't save. Try again.";
    const id = business?.id ?? null;
    if (!id) {
      // No business_profiles row yet: the first save creates it (as the old
      // listing form did), from the onboarding name and type.
      const made = await saveMyBusinessProfile(authUserId, {}, { businessName: user.businessName, businessType: user.businessType });
      if (!made.ok) return made.message;
      reload();
      return "Your profile was set up. Try that again.";
    }
    const r = await saveBusiness(id, patch);
    if (!r.ok) return r.message;
    setBusiness(r.value);
    // Keep the rest of the app (navbar, dashboard) on the saved name and type.
    if (patch.name !== undefined || patch.type !== undefined) {
      updateProfile({ businessName: r.value.name, businessType: r.value.type as typeof user.businessType });
    }
    setSheet(null);
    showToast("Profile updated.");
    return null;
  };

  const onFile = async (file: File) => {
    const k = pickFor.current;
    if (!authUserId || !business) return;
    setUploading(k);
    const r = await uploadBusinessImage({ kind: k, uid: authUserId, ownerId: business.ownerId, businessId: business.id, file, previousPath: k === "logo" ? business.logoPath : business.coverPath });
    setUploading(null);
    if (!r.ok) {
      showToast("Couldn't upload the photo. Try again.");
      return;
    }
    setBusiness({ ...business, ...(k === "logo" ? { logoPath: r.value.path, logoUrl: r.value.url } : { coverPath: r.value.path, coverUrl: r.value.url }) });
    showToast("Profile updated.");
  };

  const removePhoto = async (k: PhotoKind) => {
    if (!authUserId || !business) return;
    setUploading(k);
    const r = await removeBusinessImage({ kind: k, uid: authUserId, ownerId: business.ownerId, businessId: business.id, previousPath: k === "logo" ? business.logoPath : business.coverPath });
    setUploading(null);
    if (!r.ok) {
      showToast(r.message);
      return;
    }
    setBusiness({ ...business, ...(k === "logo" ? { logoPath: null, logoUrl: null } : { coverPath: null, coverUrl: null }) });
  };

  // Your photo (LOST 5): the owner's own avatar, the same upload and remove
  // as the personal Profile (services/avatar). Local state follows the URL
  // the server gave back, never an optimistic guess.
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarCameraRef = useRef<HTMLInputElement>(null);
  const avatarLibraryRef = useRef<HTMLInputElement>(null);
  const onAvatarFile = async (file: File) => {
    if (!authUserId || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    const r = await uploadAvatar(authUserId, file, user.avatarUrl);
    setAvatarBusy(false);
    if (!r.ok) {
      setAvatarError(r.message);
      return;
    }
    updateProfile({ avatarUrl: r.url });
    setSheet(null);
    showToast("Your photo was updated.");
  };
  const onAvatarRemove = async () => {
    if (!authUserId || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    const r = await removeAvatar(authUserId, user.avatarUrl);
    setAvatarBusy(false);
    if (!r.ok) {
      setAvatarError(r.message ?? "Couldn't remove your picture.");
      return;
    }
    updateProfile({ avatarUrl: undefined });
    setSheet(null);
    showToast("Your photo was removed.");
  };

  const setListed = async (on: boolean) => {
    if (!business || listingBusy) return;
    setListingBusy(true);
    const r = await saveBusiness(business.id, { active: on });
    setListingBusy(false);
    setListConfirm(null);
    if (!r.ok) {
      setListToast((t) => ({ n: (t?.n ?? 0) + 1, message: "Couldn't change your listing. Try again.", error: true }));
      return;
    }
    setBusiness(r.value);
    setListToast((t) => ({ n: (t?.n ?? 0) + 1, message: on ? "Your listing is live on Explore" : "Your listing is hidden" }));
  };

  const listed = !!business?.active;
  if (listed && hlArmed) setHlArmed(false);
  const highlight = !!from && !!business && !listed && hlArmed;
  // Arrival from a deep link brings the card into view once (AN3-076 S4).
  const scrolled = useRef(false);
  useEffect(() => {
    if (!highlight || scrolled.current) return;
    scrolled.current = true;
    listingRef.current?.scrollIntoView({ block: "center" });
  }, [highlight]);
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(from === "Dashboard" ? "/app" : "/app/business/analytics/classes");
  };

  const handleSignOut = () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      window.setTimeout(() => setConfirmSignOut(false), 3000);
      return;
    }
    void signOut();
    navigate("/app/onboarding");
  };

  const name = business?.name ?? user.businessName ?? "Your business";
  const initials = initialsOf(name);
  const ownInitials = initialsOf(user.firstName || "You");
  const place = business?.location?.trim() || locations?.[0]?.name || null;
  const typeLine = [typeLabel(business?.type ?? user.businessType), place].filter(Boolean).join(" · ");
  const showRating = !!rating && rating.total >= 3;

  const cardData: CardData = {
    name,
    initials,
    type: typeLine,
    rating: showRating && rating ? `${rating.average.toFixed(1)} · ${rating.total} reviews` : null,
    coverUrl: business?.coverUrl ?? null,
    logoUrl: business?.logoUrl ?? null,
    rows: [
      locations?.[0] ? { kind: "address" as const, text: locations[0].address } : null,
      locations?.[0] ? { kind: "hours" as const, text: todayLine(locations[0]) } : null,
      business?.publicPhone ? { kind: "phone" as const, text: business.publicPhone } : null,
      business?.publicEmail ? { kind: "email" as const, text: business.publicEmail } : null,
    ].filter(Boolean) as CardData["rows"],
  };

  const covers = (locations ?? []).length;

  if (loading && !business) {
    return (
      <div>
        <SubHeader title="Business Profile" />
        <div aria-busy="true" aria-label="Loading your profile">
          <div className={clsx(LIST_BG, "animate-skeleton-pulse")} style={{ height: 132, borderRadius: 18 }} />
          <div className="bg-cream-soft animate-skeleton-pulse" style={{ width: 72, height: 72, borderRadius: 20, marginTop: -34, marginInlineStart: 14, boxShadow: "0 0 0 3px rgb(var(--c-cream))" }} />
          <div className="bg-cream-soft animate-skeleton-pulse" style={{ width: "55%", height: 16, borderRadius: 8, marginTop: 12 }} />
          <div className="bg-cream-soft animate-skeleton-pulse" style={{ width: "40%", height: 10, borderRadius: 5, marginTop: 10, marginBottom: 20 }} />
          <RowsSkeleton rows={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="[--biz-list:#F7F7FC] dark:[--biz-list:rgba(174,161,220,0.10)]">
      <SubHeader title="Business Profile" />
      <OfflineLine />
      {error && <LoadError message="Couldn't load your profile." onRetry={reload} />}

      {/* Hero (MO1B-011 rows 2 to 7) */}
      <div className="relative" style={{ marginBottom: 16 }}>
        <div className="relative overflow-hidden" style={{ height: 132, borderRadius: 18, background: business?.coverUrl ? undefined : stripes }}>
          {business?.coverUrl ? (
            <img src={business.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="absolute text-[11px] font-bold text-charcoal-faint" style={{ left: 12, top: 10 }}>
              Add a cover photo
            </span>
          )}
          {uploading === "cover" && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Loader2 size={32} className="animate-spin text-white" aria-label="Uploading" />
            </span>
          )}
          <button
            type="button"
            aria-label="Change cover photo"
            onClick={() => setMenu("cover")}
            disabled={!business}
            className="tap absolute flex items-center justify-center rounded-full text-white"
            style={{ right: 10, bottom: 10, width: 32, height: 32, background: "rgba(36,31,27,0.55)" }}
          >
            <Camera size={15} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        <div className="relative flex items-end" style={{ gap: 8, marginTop: -34, padding: "0 2px 0 14px" }}>
          <button
            type="button"
            aria-label="Change logo"
            onClick={() => setMenu("logo")}
            disabled={!business}
            className="tap relative flex items-center justify-center shrink-0 bg-th-8e7fd0 text-white text-[24px] font-extrabold"
            style={{ width: 72, height: 72, borderRadius: 20, boxShadow: "0 0 0 3px rgb(var(--c-cream))" }}
          >
            <span className="absolute inset-0 overflow-hidden flex items-center justify-center" style={{ borderRadius: 20 }}>
              {business?.logoUrl ? <img src={business.logoUrl} alt="" className="w-full h-full object-cover" /> : initials}
              {uploading === "logo" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Loader2 size={24} className="animate-spin text-white" aria-label="Uploading" />
                </span>
              )}
            </span>
            <span
              aria-hidden
              className={clsx("absolute flex items-center justify-center rounded-full bg-cream-card border text-primary-dark", BORDER)}
              style={{ right: -5, bottom: -5, width: 26, height: 26 }}
            >
              <Camera size={13} strokeWidth={2.2} />
            </span>
          </button>
          <span className="flex-1" />
          <button
            type="button"
            aria-label="Share business card"
            onClick={() => setCardOpen(true)}
            className={clsx("tap flex items-center justify-center rounded-full text-primary-dark", LIST_BG)}
            style={{ width: 40, height: 40 }}
          >
            <Share2 size={17} strokeWidth={2.2} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Edit name and type"
            onClick={() => openSheet("hero")}
            className={clsx("tap flex items-center justify-center rounded-full text-primary-dark", LIST_BG)}
            style={{ width: 40, height: 40 }}
          >
            <Pencil size={16} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        <p className="text-[20px] font-extrabold leading-[26px] tracking-[-0.01em] text-charcoal break-words" style={{ marginTop: 10 }}>
          {name}
        </p>
        <p className="text-[12.5px] leading-[18px] text-charcoal-faint">{typeLine}</p>
        <div className="flex items-center flex-wrap text-[11.5px] font-bold" style={{ gap: 8, marginTop: 8 }}>
          {showRating && rating ? (
            <>
              <span className="flex items-center text-charcoal" style={{ gap: 4 }}>
                <Star size={13} strokeWidth={2.4} aria-hidden className="text-primary-dark" />
                {rating.average.toFixed(1)}
              </span>
              <span className="font-semibold text-charcoal-faint">{rating.total} reviews</span>
            </>
          ) : (
            <span className="rounded-full bg-primary-pale text-primary-dark" style={{ padding: "2px 8px" }}>
              New on Centium
            </span>
          )}
          {business && (
            <span
              className={business.active ? "rounded-full bg-[rgba(63,145,101,0.14)] text-[#3F9165] dark:bg-[rgba(127,199,156,0.16)] dark:text-[#7FC79C]" : "rounded-full bg-cream-soft text-charcoal-faint"}
              style={{ padding: "2px 8px" }}
            >
              {business.active ? "Listed" : "Hidden"}
            </span>
          )}
        </div>

        {menu && (
          <PhotoMenu
            kind={menu}
            top={menu === "cover" ? 84 : 158}
            hasPhoto={menu === "logo" ? !!business?.logoUrl : !!business?.coverUrl}
            onClose={() => setMenu(null)}
            onCamera={() => {
              pickFor.current = menu;
              setMenu(null);
              cameraRef.current?.click();
            }}
            onLibrary={() => {
              pickFor.current = menu;
              setMenu(null);
              libraryRef.current?.click();
            }}
            onRemove={() => {
              const k = menu;
              setMenu(null);
              void removePhoto(k);
            }}
          />
        )}
      </div>

      {/* Photos (MO1B-011 rows 8, 9): the venue photos live in the venue console (K2). */}
      <BizLabel
        right={
          locations && locations.length > 0 ? (
            <button
              type="button"
              onClick={() => navigate("/app/business/more/locations")}
              className="tap whitespace-nowrap text-[11.5px] font-bold leading-[14px] text-primary-dark"
            >
              Manage · {covers}
            </button>
          ) : undefined
        }
      >
        Photos
      </BizLabel>
      <div className="grid grid-cols-4" style={{ gap: 6, marginBottom: 14 }}>
        {[0, 1, 2, 3].map((i) => {
          const loc = locations?.[i];
          return (
            <span key={i} className="relative overflow-hidden" style={{ aspectRatio: "1", borderRadius: 12, background: stripes }}>
              {loc && (
                <span className="absolute text-[8.5px] leading-[10px] text-charcoal-faint" style={{ left: 6, bottom: 5, right: 4 }}>
                  {loc.name}
                </span>
              )}
            </span>
          );
        })}
      </div>

      <BizSection label="About">
        <BizRow icon={Text} title="Bio" desc={business?.bio || "Add a few lines about what clients can expect"} onClick={() => openSheet("bio")} />
        <BizRow
          icon={Tags}
          title="Categories"
          desc={business && business.categories.length > 0 ? business.categories.map((c) => CATEGORY_LABEL[c] ?? c).join(", ") : "Pick up to 5"}
          onClick={() => openSheet("cats")}
        />
        <BizRow icon={MapPinned} title="Area" desc={business?.location?.trim() || "Shown next to your name on Explore"} onClick={() => openSheet("area")} />
      </BizSection>

      <BizSection label={kindKnown && kind === "store" ? "Pickup and opening hours" : "Locations and hours"}>
        {locations === null ? null : (
          locations.map((loc) => (
            <BizRow
              key={loc.id}
              icon={MapPin}
              title={loc.name}
              desc={`${loc.address.split(",")[0]} · ${todayLine(loc)}`}
              onClick={() => navigate(`/app/business/more/locations?edit=${loc.id}`)}
            />
          ))
        )}
        <BizRow icon={Plus} title="Add a location" onClick={() => navigate("/app/business/more/locations?add=1")} />
      </BizSection>

      <BizSection label="Contact">
        <BizRow icon={Phone} title="Phone" value={business?.publicPhone || undefined} onClick={() => openSheet("contact")} />
        <BizRow icon={Mail} title="Email" value={business?.publicEmail || undefined} onClick={() => openSheet("contact")} />
        <BizRow icon={Globe} title="Website" value={business?.publicWebsite || undefined} onClick={() => openSheet("contact")} />
        <BizRow icon={InstagramGlyph} title="Instagram" value={business?.instagram ? `@${business.instagram}` : undefined} onClick={() => openSheet("contact")} />
      </BizSection>

      <BizLabel>Listing</BizLabel>
      <div ref={listingRef}>
      <BizCard className="relative">
        <BizRow
          title="Show on Explore"
          desc="Clients can find and book you"
          toggle={{ checked: listed, onChange: (v) => setListConfirm(v ? "on" : "off"), disabled: !business || listingBusy || !online }}
        />
        <BizRow
          icon={IdCard}
          title="Business ID"
          desc="Professionals use it to join your team"
          value={business?.code ? `${business.code} · Copy` : undefined}
          valueAction={
            business?.code
              ? () => {
                  void copyText(business.code!).then((ok) => showToast(ok ? "Business ID copied." : "Couldn't copy. Try again."));
                }
              : undefined
          }
          onClick={() => navigate("/app/business/more/business-id")}
        />
        {highlight && (
          <span
            className="absolute pointer-events-none uppercase"
            style={{ top: -10, insetInlineEnd: 16, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", lineHeight: "14px", padding: "3px 8px", borderRadius: 999, background: "rgb(var(--c-primary))", color: "rgb(var(--c-on-primary-fill))" }}
          >
            {`From ${from}`}
          </span>
        )}
        {/* AN3-076 row 6: a 1px primary-dark border and a 4px ring while highlighted (box-shadow 0.3s ease). */}
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: 18,
            transition: "box-shadow 0.3s ease",
            boxShadow: highlight
              ? `inset 0 0 0 1px rgb(var(--c-primary-dark)), 0 0 0 4px ${dark ? "rgb(var(--c-primary) / 0.2)" : "rgb(var(--c-primary-dark) / 0.16)"}`
              : "inset 0 0 0 1px transparent, 0 0 0 4px transparent",
          }}
        />
      </BizCard>
      </div>

      <BizSection label="You">
        <BizRow
          icon={UserRound}
          title="Your photo"
          desc="Shown to your team and in direct messages"
          trailing={
            <span aria-hidden className="relative shrink-0 flex items-center justify-center overflow-hidden rounded-full bg-th-8e7fd0 text-white text-[11px] font-extrabold" style={{ width: 32, height: 32 }}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : ownInitials}
            </span>
          }
          onClick={() => {
            setAvatarError(null);
            openSheet("photo");
          }}
        />
      </BizSection>

      <button
        type="button"
        onClick={handleSignOut}
        className="tap w-full flex items-center justify-center text-[14px] font-bold text-charcoal-soft"
        style={{ height: 48 }}
      >
        {confirmSignOut ? "Tap again to confirm sign out" : "Sign Out"}
      </button>

      <input
        ref={cameraRef}
        type="file"
        accept={FORUM_PHOTO_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onFile(f);
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept={FORUM_PHOTO_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onFile(f);
        }}
      />

      {business && sheet === "hero" && (
        <NameTypeSheet key={sheetKey} open onClose={() => setSheet(null)} name={business.name} type={business.type} onSave={save} />
      )}
      {sheet === "bio" && <BioSheet key={sheetKey} open onClose={() => setSheet(null)} bio={business?.bio ?? ""} onSave={save} />}
      {sheet === "cats" && <CategoriesSheet key={sheetKey} open onClose={() => setSheet(null)} kind={kind} categories={business?.categories ?? []} onSave={save} />}
      {sheet === "area" && <AreaSheet key={sheetKey} open onClose={() => setSheet(null)} area={business?.location ?? ""} onSave={save} />}
      {sheet === "photo" && (
        <YourPhotoSheet
          key={sheetKey}
          open
          onClose={() => {
            if (!avatarBusy) setSheet(null);
          }}
          avatarUrl={user.avatarUrl ?? null}
          initials={ownInitials}
          busy={avatarBusy}
          error={avatarError}
          onCamera={() => avatarCameraRef.current?.click()}
          onLibrary={() => avatarLibraryRef.current?.click()}
          onRemove={() => void onAvatarRemove()}
        />
      )}
      <input
        ref={avatarCameraRef}
        type="file"
        accept={AVATAR_ACCEPT}
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onAvatarFile(f);
        }}
      />
      <input
        ref={avatarLibraryRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onAvatarFile(f);
        }}
      />
      {sheet === "contact" && (
        <ContactSheet
          key={sheetKey}
          open
          onClose={() => setSheet(null)}
          phone={business?.publicPhone ?? ""}
          email={business?.publicEmail ?? ""}
          website={business?.publicWebsite ?? ""}
          instagram={business?.instagram ?? ""}
          onSave={save}
        />
      )}
      <BusinessCard open={cardOpen} onClose={() => setCardOpen(false)} data={cardData} onToast={showToast} />
      {toast}
      <ConfirmCard
        open={listConfirm !== null}
        layout="decision"
        tone="primary"
        title={listConfirm === "off" ? "Hide your business from Explore?" : "Show your business on Explore?"}
        subtitle={(listConfirm === "off" ? LISTING_OFF_BODY : LISTING_ON_BODY)[kind]}
        cancelLabel="Cancel"
        confirmLabel={listConfirm === "off" ? "Hide" : "Turn on"}
        busy={listingBusy}
        onCancel={() => {
          if (!listingBusy) setListConfirm(null);
        }}
        onConfirm={() => void setListed(listConfirm === "on")}
      />
      {listToast && (
        <Toast
          key={listToast.n}
          open
          variant="business"
          shape="listing"
          message={listToast.message}
          icon={listToast.error ? <AlertCircle size={18} aria-hidden className="flex-none" /> : undefined}
          action={!listToast.error && from ? { label: `Back to ${from}`, onClick: goBack } : undefined}
          onExpire={() => setListToast(null)}
        />
      )}
    </div>
  );
}

// MO1B-017 / -018: the photo source menu (BizMoreV8 `hasDrop`): right 16,
// width 220, r14, 1px rgba(174,161,220,0.5), shadow 0 12px 32px
// rgba(95,80,147,0.18), padding 8; header 11/700 0.1em uppercase; options
// min-height 44 r8 padding 9 10, 13/700. The page dims 0.18 (HANDOVER 2.2).
function PhotoMenu({
  kind,
  top,
  hasPhoto,
  onClose,
  onCamera,
  onLibrary,
  onRemove,
}: {
  kind: PhotoKind;
  top: number;
  hasPhoto: boolean;
  onClose: () => void;
  onCamera: () => void;
  onLibrary: () => void;
  onRemove: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const opt = "tap w-full flex items-center text-start border bg-cream-card text-[13px] font-bold text-charcoal";
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(36,31,27,0.18)" }} onClick={onClose} aria-hidden />
      <div
        role="menu"
        aria-label={kind === "cover" ? "Cover photo" : "Logo"}
        className="absolute z-50 bg-cream-card border border-th-aea1dc/50"
        style={{ right: 0, top, width: 220, borderRadius: 14, boxShadow: "0 12px 32px rgba(95,80,147,0.18)", padding: 8 }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-faint" style={{ margin: "2px 4px 2px" }}>
          {kind === "cover" ? "Cover photo" : "Logo"}
        </p>
        {kind === "logo" && <p className="text-[11px] text-charcoal-faint" style={{ margin: "0 4px 2px" }}>Square, at least 400 px</p>}
        {[
          { label: "Take a photo", on: onCamera, show: true },
          { label: "Choose from library", on: onLibrary, show: true },
          { label: "Remove photo", on: onRemove, show: hasPhoto },
        ]
          .filter((o) => o.show)
          .map((o) => (
            <button key={o.label} type="button" role="menuitem" onClick={o.on} className={clsx(opt, BORDER)} style={{ minHeight: 44, borderRadius: 8, padding: "9px 10px", marginTop: 6, gap: 10 }}>
              {o.label}
            </button>
          ))}
      </div>
    </>
  );
}
