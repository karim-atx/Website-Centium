import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  fetchOfferingsByCategory,
  type Offering,
  type OfferingCategory,
  type PublicOffering,
} from "../../services/business-offerings";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { marketplaceCategories } from "../../data/mockProfessionals";
import { MapPin, Building2, type LucideIcon } from "lucide-react";
import { marketplaceCategoryIcon } from "../../utils/icons";
import type { MarketplaceCategoryId } from "../../types";
import { ClassPage } from "./ClassPage";
import { GymPage } from "./GymPage";
import { ShowcasePage } from "./rewards/ShowcasePage";

// V4: tapping a category on Explore now lands here — a listing of the
// matching services, each showing rating + location, instead of one flat
// unfiltered "browse everything" list.
//
// Decision 23 (kept-list items 43 and 46): /app/marketplace/business?id=…
// is a business's page. Market + Share 3.0 (W2): it is the C-MO.4.4.1
// showcase (rewards/ShowcasePage), opened from Rewards' business rows.
export default function MarketplaceCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const [params] = useSearchParams();
  if (category === "business") return <ShowcasePage key={params.get("id") ?? ""} businessId={params.get("id") ?? ""} source={params.get("src")} />;
  // Handover-complete pass: the class page (MO1.4.4) and the gym page
  // (MO1.4.2.1) on the same route, as the business page.
  if (category === "class") return <ClassPage key={params.get("id") ?? ""} classId={params.get("id") ?? ""} />;
  if (category === "gym") return <GymPage key={params.get("id") ?? ""} gymId={params.get("id") ?? ""} />;
  return <CategoryListing key={category} category={category} />;
}

function CategoryListing({ category }: { category: string | undefined }) {
  const id = (category ?? "gyms") as MarketplaceCategoryId;
  const meta = marketplaceCategories.find((c) => c.id === id);
  const Icon = marketplaceCategoryIcon[id] ?? marketplaceCategoryIcon.gyms;
  // NO LOCATION IS ASKED FOR HERE. This page used to prompt for location as
  // soon as it opened and then throw the answer away (nothing on it ranks by
  // distance). A location prompt belongs to a user action that uses it.
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
      {/* Market + Share 3.0 W3 (D-45): the "Filter by" sheet (Rating /
          Proximity / Discounts) is gone. It set a value nothing read, so it
          sorted nothing; "Ranked by rating" went with it, as nothing on this
          page is ranked. */}
      <PageHeader title={meta?.label ?? "Explore"} showBack />

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
