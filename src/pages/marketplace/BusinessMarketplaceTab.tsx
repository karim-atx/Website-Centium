import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { BusinessPrototypeNotice } from "../../components/marketplace/BusinessPrototypeNotice";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useBusinessDiscounts, useBusinessOfferings } from "../../hooks/useBusinessCatalog";
import { marketplaceCategories } from "../../data/mockProfessionals";
import type { MarketplaceCategoryId } from "../../types";
import { marketplaceCategoryIcon } from "../../utils/icons";
import { Plus, Trash2 } from "lucide-react";

// V7 (QA 7.0): the business side of the marketplace-listing feature — the
// client-facing read side (businessOfferings rendered under "From Centium
// businesses") was already wired in MarketplaceCategoryPage; this is where
// a business actually creates those listings.
const listableCategories = marketplaceCategories.filter((c) => c.id !== "gyms" && c.id !== "classes");

// THE ONLY SCREEN THAT OWNS TWO OF THE FOUR CATALOG TABLES, which is why it
// takes two hooks rather than one. Offerings and discounts were both nested in
// local state — `businessOfferings` as its own array, `discounts` inside the
// businessListing object — and sat next to each other here purely because the
// QA note asked for both on this screen. They are separate tables, separate
// reads and separate writes, and keeping them separate is what stops a
// discount ending up in the offerings list.
export default function BusinessMarketplaceTab() {
  const offerings = useBusinessOfferings();
  const discounts = useBusinessDiscounts();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MarketplaceCategoryId>(listableCategories[0].id);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [discountDraft, setDiscountDraft] = useState("");
  const [publishing, setPublishing] = useState(false);

  // The form clears only on a write that landed. It used to clear
  // unconditionally, which against a server would throw away what somebody
  // typed at the exact moment the save failed.
  const save = async () => {
    if (!title.trim() || !description.trim() || publishing) return;
    setPublishing(true);
    const ok = await offerings.add({ title: title.trim(), category, price, description: description.trim() });
    setPublishing(false);
    if (!ok) return;
    setTitle("");
    setPrice("");
    setDescription("");
  };

  const addDiscount = async () => {
    if (!discountDraft.trim()) return;
    if (await discounts.add(discountDraft)) setDiscountDraft("");
  };

  return (
    <div>
      <PageHeader title="Marketplace" subtitle="List your products or services for clients to discover" />
      <BusinessPrototypeNotice />

      <Card className="mb-6">
        <label className="block mb-3">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Listing title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Signature protein blend"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <div className="mb-3">
          <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Category</span>
          <div className="flex flex-wrap gap-2">
            {listableCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  category === c.id ? "bg-primary text-white border-primary" : "bg-cream-soft border-transparent text-charcoal-soft"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block mb-3">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Price (optional)</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="$25"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What makes this worth a look?"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </label>

        {offerings.error && (
          <p className="mb-2 text-xs font-semibold text-status-high">{offerings.error}</p>
        )}
        <Button
          fullWidth
          size="lg"
          onClick={() => void save()}
          disabled={!title.trim() || !description.trim() || publishing || !offerings.businessId}
        >
          <Plus size={15} /> {publishing ? "Publishing…" : "Publish listing"}
        </Button>
        {!offerings.businessId && !offerings.loading && (
          // business_offerings.business_id resolves through business_profiles,
          // so there is nothing to attach a listing to until the owner has
          // saved their profile once.
          <p className="mt-2 text-xs text-charcoal-faint">
            Save your business profile first — listings are published under it.
          </p>
        )}
      </Card>

      {/* V10 (QA 10.0): "The ability to add/remove discounts in the market place." */}
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Discounts</p>
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <input
            value={discountDraft}
            onChange={(e) => setDiscountDraft(e.target.value)}
            placeholder="e.g. 15% off first visit"
            className="flex-1 rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button onClick={() => void addDiscount()} disabled={!discountDraft.trim() || !discounts.businessId}>
            <Plus size={15} />
          </Button>
        </div>
        {discounts.error && <p className="mb-2 text-xs font-semibold text-status-high">{discounts.error}</p>}
        {discounts.discounts.length === 0 ? (
          <p className="text-sm text-charcoal-faint">
            {discounts.businessId || discounts.loading
              ? "No discounts yet — add one to feature it on Explore."
              : "Save your business profile first to start adding discounts."}
          </p>
        ) : (
          <div className="space-y-2">
            {discounts.discounts.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-cream-soft rounded-xl px-3.5 py-2.5">
                <span className="text-sm font-medium text-charcoal">{d.label}</span>
                <button
                  onClick={() => void discounts.remove(d.id)}
                  aria-label={`Remove ${d.label}`}
                  className="tap text-charcoal-faint"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Your listings</p>
      <div className="space-y-2.5">
        {offerings.offerings.map((o) => {
          const Icon = marketplaceCategoryIcon[o.category];
          return (
            <Card key={o.id} className="flex items-start gap-3 animate-fade-slide-up">
              <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                <Icon size={18} className="text-primary-dark" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal truncate">{o.title}</p>
                <p className="text-xs text-charcoal-faint mt-0.5">{o.description}</p>
                {o.price && <p className="text-xs font-semibold text-primary-dark mt-1">{o.price}</p>}
              </div>
              <button
                onClick={() => void offerings.remove(o.id)}
                aria-label={`Remove ${o.title}`}
                className="tap text-charcoal-faint shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </Card>
          );
        })}
        {offerings.offerings.length === 0 && !offerings.loading && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No listings yet — publish your first one above.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
