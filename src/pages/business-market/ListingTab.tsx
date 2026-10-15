import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnline } from "../../hooks/useOnline";
import { VenueHoursSheet } from "../../components/marketplace/VenueHoursSheet";
import { saveCategories } from "../../services/business-market";
import { CATEGORY_LABEL } from "../../components/business-more/kind";
import { useMarket } from "./MarketContext";
import { Store } from "lucide-react";
import { MBlock, MEmpty, MError, useMarketToast } from "./kit";
import { CategoriesCard, PhotosCard, RatingCard, StrengthCard, YourCard, type CardModel } from "./listingParts";
import { hoursSummary, notEnded, strengthItems, strengthPct, type StrengthInput, type StrengthItem } from "./model";
import { AMENITY_LABEL, isAmenityKey, photoCounts, photoLine as galleryLine, sortPhotos } from "../../services/business-market/listingLogic";
import { useListingSwitch } from "./useListingSwitch";
import { AmenitiesSheet, FirstVisitSheet } from "./DetailsSheets";
import { OfferingsCard } from "./OfferingsCard";

// MA1-001 / 024 / 031 / 037 / 046 / 062 / 078 (Classes), OURS-MA1-gym-listing
// (Gym) and MA1-067 (Store, under Products). Live data only: the B5 business
// row (logo, cover, bio, location, contacts, categories, active), the perk
// and discounts (chips), the venue's hours (gym_hours, one shared hours
// sheet, V6-163) and its reviews (my_venues). B13: the gallery
// (business_photos, MK-03), the venue's amenities and first-visit text
// (MK-02) and listing_strength(), whose done flags win for photos, amenities
// and first visit (the server counts 3 approved photos and any venue). While
// a B13 piece is absent its item keeps the client value and its editor its
// pending note.

export const REVIEWS_ROUTE = "/app/business/analytics/reputation";

export function ListingTab() {
  const m = useMarket();
  const { c, v, kind, business } = m;
  const navigate = useNavigate();
  const online = useOnline();
  const sw = useListingSwitch();
  const [toast, showToast] = useMarketToast();
  const [hoursOpen, setHoursOpen] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [firstVisitOpen, setFirstVisitOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [catSignal, setCatSignal] = useState(0);
  const [now] = useState(() => Date.now());

  const reviews = { average: m.venue?.reviewsAverage ?? null, count: m.venue?.reviewsCount ?? 0 };
  const gallery = sortPhotos(m.photos ?? []);
  const counts = photoCounts(gallery);
  // The cover first (MA1-033 K1), then the approved photos; in-review photos
  // are counted on the line, not shown to the public yet.
  const photos = [...(business?.coverUrl ? [business.coverUrl] : []), ...gallery.filter((p) => p.status === "approved").map((p) => p.url)];
  const thumbs = [...(business?.coverUrl ? [business.coverUrl] : []), ...gallery.filter((p) => p.status !== "rejected").map((p) => p.url)];
  const amenities = m.details?.amenities ?? [];
  const amenitiesDone = m.strength?.amenities ?? amenities.length > 0;
  const firstVisitDone = m.strength?.first_visit ?? !!m.details?.firstVisit;
  const summary = hoursSummary(m.hours);
  const inputFor = (hours: string | null): StrengthInput | null =>
    business
      ? {
          store: kind === "store",
          logo: !!business.logoUrl,
          cover: !!business.coverUrl,
          photos: photos.length,
          photosDone: m.strength?.photos,
          description: !!business.bio?.trim(),
          categories: business.categories.map((k) => CATEGORY_LABEL[k] ?? k),
          address: business.location,
          hoursSummary: hours,
          amenities: amenities.map((k) => (isAmenityKey(k) ? AMENITY_LABEL[k] : k)),
          amenitiesDone,
          delivery: !!m.store && (m.store.deliveryEnabled || m.store.pickupEnabled),
          contact: !!(business.publicEmail || business.publicPhone || business.publicWebsite || business.instagram),
          firstVisit: firstVisitDone,
          returns: m.returnsSet,
          reviews,
        }
      : null;
  const input = inputFor(summary);
  const items = input ? strengthItems(input) : [];

  if (m.error && !business) return <MError c={c} onRetry={m.reload} />;
  if (m.loading) {
    return (
      <div aria-busy="true" aria-label="Loading your listing">
        <MBlock c={c} h={105.5} style={{ marginBottom: 12 }} />
        <MBlock c={c} h={352} />
        <MBlock c={c} h={144.5} style={{ marginTop: 12 }} />
      </div>
    );
  }
  if (!business) {
    // The read answered with no business_profiles row: listings (and
    // offerings, products) are published under it, so the owner saves the
    // profile first (main's BusinessMarketplaceTab gate, NOTHING_LOST LOST 2).
    return (
      <MEmpty
        c={c}
        icon={Store}
        title="Save your business profile first"
        body="Listings are published under it."
        action={{ label: "Set up business profile", onClick: () => navigate("/app/business/profile") }}
      />
    );
  }

  const isEmpty = items.every((x) => !x.done);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = m.classes.classes.filter((x) => x.date >= today && notEnded(x, now)).length;
  const meta =
    kind === "store"
      ? `${m.offerings.offerings.length} product${m.offerings.offerings.length === 1 ? "" : "s"}`
      : kind === "gym"
        ? `${m.plans.plans.length} passes and plans`
        : upcoming === 0
          ? "No upcoming classes"
          : `${upcoming} upcoming class${upcoming === 1 ? "" : "es"}`;
  const card: CardModel = {
    name: business.name,
    type: business.type,
    categories: business.categories,
    location: business.location,
    bio: business.bio,
    logoUrl: business.logoUrl,
    coverUrl: business.coverUrl,
    meta,
    chips: [...(m.perk ? [m.perk] : []), ...m.discounts.discounts.map((d) => d.label)],
    rating: reviews.count >= 3 && reviews.average !== null ? { average: reviews.average, count: reviews.count } : null,
  };

  const flash = (key: string) => {
    setHighlight(key);
    window.setTimeout(() => setHighlight((h) => (h === key ? null : h)), 3000);
  };

  const onItem = (it: StrengthItem) => {
    switch (it.key) {
      case "logo":
      case "cover":
      case "description":
      case "contact":
        navigate("/app/business/profile");
        break;
      case "photos":
        navigate(`${m.base}/photos`);
        break;
      case "categories":
        setCatSignal((s) => s + 1);
        break;
      case "address":
        navigate("/app/business/more/locations");
        break;
      case "hours":
        if (m.venue && m.can("schedule")) setHoursOpen(true);
        else navigate("/app/business/more/locations");
        break;
      case "amenities":
        setAmenitiesOpen(true);
        break;
      case "firstVisit":
        setFirstVisitOpen(true);
        break;
      case "delivery":
      case "returns":
        navigate("/app/business/more/store-policies");
        break;
      case "reviews":
        navigate(REVIEWS_ROUTE);
        break;
    }
  };

  const photoLine = galleryLine(photos.length, counts.inReview);
  const catSub = kind === "store" ? "Customers filter Explore by these." : kind === "gym" ? "People filter Explore by these." : "Clients filter Explore by these.";

  return (
    <div style={{ paddingBottom: 8 }}>
      <StrengthCard c={c} items={items} emptyLine={v.strengthEmpty} highlight={highlight} onItem={onItem} />
      <YourCard
        c={c}
        m={card}
        active={business.active}
        emptyBusiness={isEmpty}
        listedSub={v.listed}
        listedEmptySub={v.listedEmpty}
        hiddenSub={v.hiddenSub}
        canSwitch={online && m.isOwner && !sw.busy}
        onPreview={() => navigate(`${m.base}/preview`)}
        onSwitch={(on) => (on ? void sw.turnOn() : sw.requestOff())}
        emptyAddress="Add your address"
        emptyBio={`Add a short description so ${v.people} know what you're about.`}
        error={sw.error}
      />
      <PhotosCard c={c} photos={thumbs} line={photoLine} onOpen={() => navigate(`${m.base}/photos`)} />
      <CategoriesCard
        c={c}
        kind={kind}
        title={v.catTitle}
        sub={catSub}
        value={business.categories}
        canEdit={online && m.isOwner}
        openSignal={catSignal}
        onApply={async (next) => {
          const r = await saveCategories(business.id, next);
          if (!r.ok) return r.message;
          m.setBusiness({ ...business, categories: r.value });
          return null;
        }}
      />
      <RatingCard c={c} average={reviews.average} count={reviews.count} onOpen={() => navigate(REVIEWS_ROUTE)} />
      {kind !== "store" && <OfferingsCard />}

      {m.venue && m.hours && hoursOpen && (
        <VenueHoursSheet
          open={hoursOpen}
          onClose={() => setHoursOpen(false)}
          gymId={m.venue.gymId}
          timezone={m.venue.timezone}
          rows={m.hours}
          onSaved={(rows) => {
            const wasDone = !!summary;
            m.setHours(rows);
            setHoursOpen(false);
            const nextInput = inputFor(hoursSummary(rows));
            const next = nextInput ? strengthItems(nextInput) : [];
            m.refreshStrength();
            flash("hours");
            showToast(!wasDone && hoursSummary(rows) ? `Opening hours added. Listing strength is now ${strengthPct(next)}%.` : "Opening hours saved.");
          }}
        />
      )}
      {amenitiesOpen && (
        <AmenitiesSheet
          open
          onClose={() => setAmenitiesOpen(false)}
          onSaved={() => {
            setAmenitiesOpen(false);
            flash("amenities");
            showToast("Amenities saved.");
          }}
        />
      )}
      {firstVisitOpen && (
        <FirstVisitSheet
          open
          onClose={() => setFirstVisitOpen(false)}
          onSaved={() => {
            setFirstVisitOpen(false);
            flash("firstVisit");
            showToast("First visit info saved.");
          }}
        />
      )}
      {sw.popup}
      {sw.toast}
      {toast}
    </div>
  );
}
