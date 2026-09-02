import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { marketplaceCategories } from "../../data/mockProfessionals";
import type { MarketplaceCategoryId } from "../../types";
import { marketplaceCategoryIcon } from "../../utils/icons";
import { Plus, Trash2 } from "lucide-react";

// V7 (QA 7.0): the business side of the marketplace-listing feature — the
// client-facing read side (businessOfferings rendered under "From Centium
// businesses") was already wired in MarketplaceCategoryPage; this is where
// a business actually creates those listings.
const listableCategories = marketplaceCategories.filter((c) => c.id !== "gyms" && c.id !== "classes");

export default function BusinessMarketplaceTab() {
  const { businessOfferings, addBusinessOffering, removeBusinessOffering, businessListing, addDiscount, removeDiscount } = useApp();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MarketplaceCategoryId>(listableCategories[0].id);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [discountDraft, setDiscountDraft] = useState("");

  const save = () => {
    if (!title.trim() || !description.trim()) return;
    addBusinessOffering({ title: title.trim(), category, price: price.trim() || undefined, description: description.trim() });
    setTitle("");
    setPrice("");
    setDescription("");
  };

  return (
    <div>
      <PageHeader title="Marketplace" subtitle="List your products or services for clients to discover" />

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

        <Button fullWidth size="lg" onClick={save} disabled={!title.trim() || !description.trim()}>
          <Plus size={15} /> Publish listing
        </Button>
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
          <Button
            onClick={() => {
              if (!discountDraft.trim()) return;
              addDiscount(discountDraft.trim());
              setDiscountDraft("");
            }}
            disabled={!discountDraft.trim()}
          >
            <Plus size={15} />
          </Button>
        </div>
        {businessListing.discounts.length === 0 ? (
          <p className="text-sm text-charcoal-faint">No discounts yet — add one to feature it on Explore.</p>
        ) : (
          <div className="space-y-2">
            {businessListing.discounts.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-cream-soft rounded-xl px-3.5 py-2.5">
                <span className="text-sm font-medium text-charcoal">{d.label}</span>
                <button
                  onClick={() => removeDiscount(d.id)}
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
        {businessOfferings.map((o) => {
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
                onClick={() => removeBusinessOffering(o.id)}
                aria-label={`Remove ${o.title}`}
                className="tap text-charcoal-faint shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </Card>
          );
        })}
        {businessOfferings.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No listings yet — publish your first one above.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
