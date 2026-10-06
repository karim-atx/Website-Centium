import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchOfferingsByCategory,
  type OfferingCategory,
  type PublicOffering,
} from "../../services/business-offerings";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { marketplaceCategories } from "../../data/mockProfessionals";
import { MapPin, Building2, SlidersHorizontal, Check } from "lucide-react";
import { marketplaceCategoryIcon } from "../../utils/icons";
import type { MarketplaceCategoryId } from "../../types";

type FilterMode = "rating" | "proximity" | "discount";
const filterOptions: { value: FilterMode; label: string }[] = [
  { value: "rating", label: "Rating" },
  { value: "proximity", label: "Proximity" },
  { value: "discount", label: "Discounts" },
];

// V4: tapping a category on Explore now lands here — a listing of the
// matching services, each showing rating + location, instead of one flat
// unfiltered "browse everything" list.
export default function MarketplaceCategoryPage() {
  const { category } = useParams<{ category: string }>();
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
              <Card key={o.id} className="animate-fade-slide-up">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-primary-dark" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal truncate">{o.title}</p>
                    {/* Who is actually selling it. The old markup borrowed the
                        viewer's own local bio for this, which only made sense
                        while the listing was the viewer's own. */}
                    <p className="flex items-center gap-1 text-xs text-primary-dark font-medium mt-0.5">
                      <Building2 size={11} /> {o.businessName}
                      {o.businessLocation && (
                        <span className="flex items-center gap-0.5 text-charcoal-faint font-normal">
                          <MapPin size={10} /> {o.businessLocation}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-charcoal-faint mt-0.5">{o.description}</p>
                  </div>
                  {o.price && (
                    <span className="text-xs font-bold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1.5 shrink-0">
                      {o.price}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

    </div>
  );
}
