import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { StoreItem } from "../../data/mockProfessionals";
import { Star, MapPin, ChevronLeft, Minus, Plus, ShoppingBag, Check } from "lucide-react";

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
  const [added, setAdded] = useState(false);

  const reset = () => {
    setSelectedItem(null);
    setQuantity(1);
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

          <div className="flex items-center justify-between bg-cream-soft rounded-2xl px-4 py-3 mb-5">
            <span className="text-sm font-semibold text-charcoal-soft">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="tap w-8 h-8 rounded-full bg-white shadow-soft flex items-center justify-center text-charcoal"
              >
                <Minus size={14} />
              </button>
              <span className="font-semibold text-charcoal w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="tap w-8 h-8 rounded-full bg-white shadow-soft flex items-center justify-center text-charcoal"
              >
                <Plus size={14} />
              </button>
            </div>
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
