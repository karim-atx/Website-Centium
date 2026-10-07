import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  fetchOfferingsByBusiness,
  fetchOfferingsByCategory,
  type Offering,
  type OfferingCategory,
  type PublicOffering,
} from "../../services/business-offerings";
import { fetchMarketplaceVenues, type MarketplaceVenue } from "../../services/marketplace";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { marketplaceCategories } from "../../data/mockProfessionals";
import { MapPin, Building2, SlidersHorizontal, Check, ChevronRight, type LucideIcon } from "lucide-react";
import { marketplaceCategoryIcon } from "../../utils/icons";
import type { MarketplaceCategoryId } from "../../types";
import { initials } from "../../components/professionals/typeColour";
import { TYPE_CATEGORY, typeLabel } from "./venueTypes";

type FilterMode = "rating" | "proximity" | "discount";
const filterOptions: { value: FilterMode; label: string }[] = [
  { value: "rating", label: "Rating" },
  { value: "proximity", label: "Proximity" },
  { value: "discount", label: "Discounts" },
];

// V4: tapping a category on Explore now lands here — a listing of the
// matching services, each showing rating + location, instead of one flat
// unfiltered "browse everything" list.
//
// Decision 23 (kept-list items 43 and 46): /app/marketplace/business?id=…
// is a business's page, opened by its row on Explore › Businesses. It reuses
// this route and this page's listing card rather than adding a route.
export default function MarketplaceCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const [params] = useSearchParams();
  if (category === "business") return <BusinessPage key={params.get("id") ?? ""} businessId={params.get("id") ?? ""} />;
  return <CategoryListing key={category} category={category} />;
}

function CategoryListing({ category }: { category: string | undefined }) {
  const id = (category ?? "gyms") as MarketplaceCategoryId;
  const meta = marketplaceCategories.find((c) => c.id === id);
  const Icon = marketplaceCategoryIcon[id] ?? marketplaceCategoryIcon.gyms;
  // NO LOCATION IS ASKED FOR HERE. This page used to prompt for location as
  // soon as it opened and then throw the answer away (nothing on it ranks by
  // distance). A location prompt belongs to a user action that uses it.
  const [filter, setFilter] = useState<FilterMode>("rating");
  const [filterOpen, setFilterOpen] = useState(false);
  // THREE DEAD CONTROLS LIVED HERE. `activeGym` and `activeStore` had setters
  // nothing ever called — the fabricated lists that used to open those sheets
  // were removed earlier, and the sheets stayed mounted permanently closed. The
  // cart button went with them: the only thing that could ever add to the cart
  // was the store sheet, so it opened an order that could never have anything
  // in it. All three are gone rather than wired to real data, because the two
  // categories they served (gyms, classes) are answered by Explore, which reads
  // marketplace_venues and marketplace_classes.

  // V7 (QA 7.0): "adopts a marketplace like approach based on what they
  // provide in their Business UI" — offerings a business account created
  // (see BusinessDashboard's Marketplace tab) show up here alongside the mock
  // listings.
  //
  // IT READ THE VIEWER'S OWN DEVICE BEFORE, which is why no client has ever
  // seen this block. `businessOfferings` was a localStorage array written only
  // by the business screens, so on a client's device it was empty and on a
  // business's device it showed that business its own listings back to itself.
  // Now it is a real cross-business read: business_offerings and
  // business_profiles both carry `SELECT ... USING (true)`, because a
  // marketplace listing is public by definition, and each card names the
  // business selling it instead of borrowing whatever bio happened to be in
  // local state.
  const [businessListingsForCategory, setBusinessListingsForCategory] = useState<PublicOffering[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchOfferingsByCategory(id as OfferingCategory);
      // A failed read leaves the section as it was rather than collapsing it:
      // "no businesses here" and "the request failed" look identical once
      // rendered, and only one of them is true.
      if (cancelled || !result.ok) return;
      setBusinessListingsForCategory(result.offerings);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div>
      <PageHeader title={meta?.label ?? "Explore"} subtitle="Ranked by rating" showBack />

      {/* V9 (QA 9.0): "this filter logo instead of the separate tabs that
          shows you what the filters are when pressed" — one icon button
          opening a picker, replacing the always-visible Rating/Proximity/
          Discounts chip row. */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setFilterOpen(true)}
          className="tap flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-pale rounded-full px-3.5 py-1.5"
        >
          <SlidersHorizontal size={13} />
          {filterOptions.find((f) => f.value === filter)?.label}
        </button>
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter by">
        <div className="space-y-2 animate-fade-slide-up">
          {filterOptions.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value);
                setFilterOpen(false);
              }}
              className="tap w-full flex items-center justify-between rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-charcoal">{f.label}</span>
              {filter === f.value && <Check size={16} className="text-primary" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      <div className="space-y-2.5">
        {/* THE THREE FABRICATED LISTS THAT LIVED HERE ARE GONE: rankedGyms,
            rankedClasses and rankedListings, each rendering invented venues
            with invented star ratings and offers. Gyms and classes are real
            entities now and belong on Explore, which reads
            marketplace_venues and marketplace_classes; what remains on a
            category page is the one thing that was already real. */}
        {(id === "gyms" || id === "classes") && (
          <Card className="text-center py-8">
            <p className="text-sm font-semibold text-charcoal">
              {id === "gyms" ? "Gyms" : "Classes"} live on Explore now
            </p>
            <p className="text-xs text-charcoal-faint mt-1 leading-relaxed max-w-xs mx-auto">
              Real {id === "gyms" ? "gym listings" : "classes you can book"} are on the Explore
              screen, with live availability.
            </p>
          </Card>
        )}

        {id !== "gyms" && id !== "classes" && businessListingsForCategory.length > 0 && (
          <>
            <p className="section-label text-charcoal-faint pt-2">
              From Centium businesses
            </p>
            {businessListingsForCategory.map((o) => (
              <OfferingCard key={o.id} offering={o} Icon={Icon} seller={{ name: o.businessName, location: o.businessLocation }} />
            ))}
          </>
        )}
      </div>

    </div>
  );
}

/** One listing, as the category page has always drawn it. */
function OfferingCard({
  offering: o,
  Icon,
  seller,
}: {
  offering: Offering;
  Icon: LucideIcon;
  /** Who sells it; left out on the business's own page, which already says. */
  seller?: { name: string; location: string | null };
}) {
  return (
    <Card className="animate-fade-slide-up">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
          <Icon size={18} className="text-primary-dark" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-charcoal truncate">{o.title}</p>
          {/* Who is actually selling it. The old markup borrowed the
              viewer's own local bio for this, which only made sense
              while the listing was the viewer's own. */}
          {seller && (
            <p className="flex items-center gap-1 text-xs text-primary-dark font-medium mt-0.5">
              <Building2 size={11} /> {seller.name}
              {seller.location && (
                <span className="flex items-center gap-0.5 text-charcoal-faint font-normal">
                  <MapPin size={10} /> {seller.location}
                </span>
              )}
            </p>
          )}
          <p className="text-xs text-charcoal-faint mt-0.5">{o.description}</p>
        </div>
        {o.price && (
          <span className="text-xs font-bold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1.5 shrink-0">
            {o.price}
          </span>
        )}
      </div>
    </Card>
  );
}

/**
 * A business's page (decision 23, items 43 and 46; MO1.4.1 interactions
 * 12–16, whose destination the board leaves unspecified). Everything on it is
 * data that already exists: the venue row (bio, perk, upcoming-class count,
 * place), the business's listings from business_offerings, and a link to the
 * category page each of its listings — or its business type — belongs to, so
 * every category page stays reachable now the "More categories" grid is gone.
 *
 * NOT HERE, because nothing stores it: a logo, ratings or reviews, opening
 * hours, contact details, distance (B25, B26).
 */
function BusinessPage({ businessId }: { businessId: string }) {
  const [venue, setVenue] = useState<MarketplaceVenue | null | undefined>(undefined);
  const [offerings, setOfferings] = useState<Offering[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [v, o] = await Promise.all([fetchMarketplaceVenues(), fetchOfferingsByBusiness(businessId)]);
      if (cancelled) return;
      if (!v.ok) {
        setError(v.message);
        setVenue(null);
      } else {
        // Businesses only: a gym has no listings and its page waits on MO1.4.2.1.
        setVenue(v.venues.find((x) => x.kind === "business" && x.venueId === businessId) ?? null);
      }
      setOfferings(o.ok ? o.offerings : []);
      if (!o.ok && v.ok) setError("Couldn't load this business's listings right now.");
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  if (venue === undefined) {
    return (
      <div>
        <PageHeader title="Explore" showBack />
        <div className="space-y-2.5" aria-busy="true" aria-label="Loading">
          {[96, 72, 72].map((h, i) => (
            <div key={i} aria-hidden="true" className="animate-pulse rounded-[18px] bg-cream-soft" style={{ height: h }} />
          ))}
        </div>
      </div>
    );
  }

  if (venue === null) {
    return (
      <div>
        <PageHeader title="Explore" showBack />
        <p role={error ? "alert" : undefined} className={`text-[12px] font-semibold ${error ? "text-status-high" : "text-charcoal-faint"}`}>
          {error ?? "This business isn't listed on Explore right now."}
        </p>
      </div>
    );
  }

  // The category pages this business leads to: its own type's, then every
  // category it has a listing in.
  const own = TYPE_CATEGORY[venue.venueType];
  const categoryIds = [...new Set([...(own ? [own] : []), ...(offerings ?? []).map((o) => o.category)])].filter(
    (c) => c !== "gyms" && c !== "classes"
  );
  const categoryLabel = (c: string) => marketplaceCategories.find((m) => m.id === c)?.label ?? c;

  return (
    <div>
      <PageHeader title={venue.name} subtitle={[typeLabel(venue.venueType), venue.location].filter(Boolean).join(" · ")} showBack />

      {/* What the Explore row used to carry below its place line (B26):
          the bio, the upcoming-class count and the perk. */}
      <Card className="mb-4 animate-fade-slide-up">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-[14px] bg-primary-pale flex items-center justify-center shrink-0 text-[15px] font-extrabold text-th-7d67d9 dark:text-primary-dark">
            {initials(venue.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] text-charcoal-faint">
              {venue.upcomingClassCount > 0
                ? `${venue.upcomingClassCount} upcoming ${venue.upcomingClassCount === 1 ? "class" : "classes"}`
                : "No upcoming classes"}
            </p>
            {venue.perk && (
              <span className="inline-block mt-1 text-[10px] font-bold text-primary-dark bg-primary-pale rounded-full px-2 py-0.5 leading-snug">
                {venue.perk}
              </span>
            )}
          </div>
        </div>
        {venue.bio && <p className="text-xs text-charcoal-soft mt-3 leading-relaxed whitespace-pre-line">{venue.bio}</p>}
      </Card>

      {error && (
        <p role="alert" className="mb-3 text-[12px] font-semibold text-status-high">
          {error}
        </p>
      )}

      <p className="section-label text-charcoal-faint pt-2 mb-2.5">Listings</p>
      <div className="space-y-2.5 mb-4">
        {offerings === null ? (
          <div aria-hidden="true" className="animate-pulse rounded-[18px] bg-cream-soft h-[72px]" />
        ) : offerings.length === 0 ? (
          <p className="text-[12px] text-charcoal-faint">No listings yet.</p>
        ) : (
          offerings.map((o) => (
            <OfferingCard key={o.id} offering={o} Icon={marketplaceCategoryIcon[o.category] ?? marketplaceCategoryIcon.stores} />
          ))
        )}
      </div>

      {categoryIds.length > 0 && (
        <>
          <p className="section-label text-charcoal-faint pt-2 mb-2.5">Browse by category</p>
          <div className="space-y-2.5">
            {categoryIds.map((c) => {
              const Icon = marketplaceCategoryIcon[c as MarketplaceCategoryId] ?? marketplaceCategoryIcon.stores;
              return (
                <Link
                  key={c}
                  to={`/app/marketplace/${c}`}
                  className="tap flex items-center gap-3 rounded-[18px] bg-cream-card border border-charcoal/[0.08] p-3 no-underline"
                >
                  <span className="w-9 h-9 rounded-[11px] bg-primary-pale flex items-center justify-center shrink-0">
                    <Icon size={17} className="text-primary-dark" />
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] font-semibold text-charcoal truncate">{categoryLabel(c)}</span>
                  <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-charcoal-faint" aria-hidden />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
