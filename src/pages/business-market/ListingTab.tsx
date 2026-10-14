import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnline } from "../../hooks/useOnline";
import { VenueHoursSheet } from "../../components/marketplace/VenueHoursSheet";
import { saveCategories } from "../../services/business-market";
import { CATEGORY_LABEL } from "../../components/business-more/kind";
import { useMarket } from "./MarketContext";
import { Store } from "lucide-react";
import { MBlock, MEmpty, MError, useMarketToast } from "./kit";
import { CategoriesCard, PhotosCard, RatingCard, StrengthCard, YourCard, type CardModel } from "./listingParts";
import { hoursSummary, notEnded, strengthItems, strengthPct, type StrengthItem } from "./model";
import { useListingSwitch } from "./useListingSwitch";
import { AmenitiesSheet, FirstVisitSheet } from "./DetailsSheets";
import { OfferingsCard } from "./OfferingsCard";

// MA1-001 / 024 / 031 / 037 / 046 / 062 / 078 (Classes), OURS-MA1-gym-listing
// (Gym) and MA1-067 (Store, under Products). Live data only: the B5 business
// row (logo, cover, bio, location, contacts, categories, active), the perk
// and discounts (chips), the venue's hours (gym_hours, one shared hours
// sheet, V6-163) and its reviews (my_venues). The gallery, amenities and
// first-visit text are B13 (MK-02, MK-03): they show their empty values and
// their editors say "Coming soon" until the server has them.

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
  const photos = business?.coverUrl ? [business.coverUrl] : [];
  const summary = hoursSummary(m.hours);
  const items = useMemo(
    () =>
      business
        ? strengthItems({
            store: kind === "store",
            logo: !!business.logoUrl,
            cover: !!business.coverUrl,
            photos: photos.length,
            description: !!business.bio?.trim(),
            categories: business.categories.map((k) => CATEGORY_LABEL[k] ?? k),
            address: business.location,
            hoursSummary: summary,
            amenities: [],
            delivery: !!m.store && (m.store.deliveryEnabled || m.store.pickupEnabled),
            contact: !!(business.publicEmail || business.publicPhone || business.publicWebsite || business.instagram),
            firstVisit: false,
            returns: m.returnsSet,
            reviews,
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [business, kind, summary, m.store, m.returnsSet, reviews.average, reviews.count, photos.length]
  );

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

  const photoLine = photos.length === 0 ? "No photos yet. Add at least 6 of your real space." : `${photos.length} of 6 recommended`;
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
      <PhotosCard c={c} photos={photos} line={photoLine} onOpen={() => navigate(`${m.base}/photos`)} />
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
            const next = strengthItems({
              ...{ store: kind === "store", logo: !!business.logoUrl, cover: !!business.coverUrl, photos: photos.length, description: !!business.bio?.trim() },
              categories: business.categories,
              address: business.location,
              hoursSummary: hoursSummary(rows),
              amenities: [],
              delivery: !!m.store && (m.store.deliveryEnabled || m.store.pickupEnabled),
              contact: !!(business.publicEmail || business.publicPhone || business.publicWebsite || business.instagram),
              firstVisit: false,
              returns: m.returnsSet,
              reviews,
            });
            flash("hours");
            showToast(!wasDone && hoursSummary(rows) ? `Opening hours added. Listing strength is now ${strengthPct(next)}%.` : "Opening hours saved.");
          }}
        />
      )}
      <AmenitiesSheet open={amenitiesOpen} onClose={() => setAmenitiesOpen(false)} />
      <FirstVisitSheet open={firstVisitOpen} onClose={() => setFirstVisitOpen(false)} />
      {sw.popup}
      {sw.toast}
      {toast}
    </div>
  );
}
