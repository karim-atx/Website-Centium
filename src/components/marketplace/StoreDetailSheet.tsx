import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { StoreItem } from "../../data/mockProfessionals";
import { Star, MapPin, ChevronLeft, ShoppingBag, Check } from "lucide-react";

// V8 (QA 8.0): "After accessing the specific store, it should direct you
// to a store page that includes things like the item name, its price,
// description, quantity and buy button" — a browse view (items) that
// drills into a detail view (quantity + buy), same two-step pattern
// AddFoodSheet already uses elsewhere in this app.
export const StoreDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  store: { id: string; name: string; location: string; rating: number; offer?: string; items: StoreItem[] } | null;
}> = ({ open, onClose, store }) => {
  const { addToCart } = useApp();
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [quantityDraft, setQuantityDraft] = useState("1");
  const [added, setAdded] = useState(false);

  const reset = () => {
    setSelectedItem(null);
    setQuantity(1);
    setQuantityDraft("1");
    setAdded(false);
  };

  if (!store) return null;

  if (selectedItem) {
    return (
      <BottomSheet
        open={open}
        onClose={() => {
          reset();
          onClose();
        }}
        hideHeader
      >
        <div className="animate-fade-slide-up">
          <button
            onClick={() => setSelectedItem(null)}
            className="tap flex items-center gap-1.5 text-sm font-semibold text-primary mb-4"
          >
            <ChevronLeft size={16} /> {store.name}
          </button>

          <p className="font-display text-xl font-semibold text-charcoal mb-1">{selectedItem.name}</p>
          <p className="text-lg font-bold text-primary-dark mb-3">${selectedItem.price}</p>
          <p className="text-sm text-charcoal-soft leading-relaxed mb-5">{selectedItem.description}</p>

          {/* Foundations: number entry is typed, never -/+ buttons. Grey
              container + white input; the draft lets the field be cleared
              mid-edit, and blur restores the last valid (>= 1) quantity. */}
          <div
            className="flex items-center mb-5"
            style={{ gap: 12, background: "#F4F4F6", borderRadius: 16, padding: "13px 14px" }}
          >
            <span style={{ flex: "none", fontSize: 14.5, fontWeight: 500, color: "#575863" }}>Quantity</span>
            <input
              value={quantityDraft}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setQuantityDraft(v);
                const n = Number(v);
                if (v && n >= 1) setQuantity(n);
              }}
              onBlur={() => setQuantityDraft(String(quantity))}
              inputMode="numeric"
              aria-label="Quantity"
              className="min-w-0 text-center focus:outline-none"
              style={{ flex: 1, background: "#FFFFFF", border: "none", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontWeight: 700, color: "#241F1B" }}
            />
          </div>

          <Button
            fullWidth
            size="lg"
            disabled={added}
            onClick={() => {
              addToCart(
                { itemId: selectedItem.id, itemName: selectedItem.name, storeId: store.id, storeName: store.name, price: selectedItem.price },
                quantity
              );
              setAdded(true);
              setTimeout(() => {
                reset();
              }, 700);
            }}
          >
            {added ? (
              <>
                <Check size={16} /> Added to cart
              </>
            ) : (
              <>
                <ShoppingBag size={15} /> Add to cart — ${(selectedItem.price * quantity).toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={store.name}
    >
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-sm font-bold text-gold">
            <Star size={14} className="fill-gold" /> {store.rating}
          </span>
          <span className="flex items-center gap-1 text-xs text-charcoal-faint">
            <MapPin size={11} /> {store.location}
          </span>
        </div>

        {store.offer && (
          <span className="inline-block text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-3 py-1.5">
            {store.offer}
          </span>
        )}

        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Items</p>
          <div className="space-y-2">
            {store.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="tap w-full flex items-center justify-between rounded-2xl bg-cream-soft px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-sm font-semibold text-charcoal truncate">{item.name}</p>
                  <p className="text-xs text-charcoal-faint truncate">{item.description}</p>
                </div>
                <span className="text-sm font-bold text-primary-dark shrink-0">${item.price}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
