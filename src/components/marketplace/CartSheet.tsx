import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { Minus, Plus, Trash2, ShoppingBag, Check, Store } from "lucide-react";

// V8 (QA 8.0): "When bought it goes to a cart that adopts the same
// features of checkout most store pages have" — quantity editing, a
// subtotal/total, and a placeholder checkout (no real payment, matching
// this prototype's existing purchase mocks like Subscription/Gym passes).
// QA 11.0: "Each store should have their own cart not a joint one" — the
// cart still shares one array (storeId already tags every item), but the
// UI groups by store with its own subtotal and its own independent
// Checkout, so buying from one store never touches another's items.
export const CartSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { cart, updateCartQuantity, removeFromCart } = useApp();
  const [placedStoreId, setPlacedStoreId] = useState<string | null>(null);

  const stores = Array.from(new Set(cart.map((c) => c.storeId))).map((storeId) => {
    const items = cart.filter((c) => c.storeId === storeId);
    return { storeId, storeName: items[0].storeName, items, subtotal: items.reduce((s, c) => s + c.price * c.quantity, 0) };
  });

  const placeOrder = (storeId: string, items: typeof cart) => {
    setPlacedStoreId(storeId);
    setTimeout(() => {
      items.forEach((i) => removeFromCart(i.itemId));
      setPlacedStoreId(null);
      if (cart.length === items.length) onClose();
    }, 1400);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Cart">
      {cart.length === 0 ? (
        <div className="text-center py-10 animate-fade-slide-up">
          <ShoppingBag size={26} className="text-charcoal-faint mx-auto mb-3" />
          <p className="text-sm text-charcoal-faint">Your cart is empty.</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-slide-up">
          {stores.map((s) => (
            <div key={s.storeId}>
              <div className="flex items-center gap-2 mb-2.5">
                <Store size={13} className="text-charcoal-faint" />
                <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">{s.storeName}</p>
              </div>

              {placedStoreId === s.storeId ? (
                <div className="text-center py-6 bg-primary-pale rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3">
                    <Check size={20} className="text-primary-dark" />
                  </div>
                  <p className="text-sm font-semibold text-charcoal">Order placed</p>
                  <p className="text-[11px] text-charcoal-faint mt-1">No real payment was processed.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2.5 mb-3">
                    {s.items.map((c) => (
                      <div key={c.itemId} className="flex items-center gap-3 bg-cream-soft rounded-2xl px-3.5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-charcoal truncate">{c.itemName}</p>
                          <p className="text-xs font-semibold text-primary-dark mt-0.5">${c.price} each</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => updateCartQuantity(c.itemId, c.quantity - 1)}
                            className="tap w-7 h-7 rounded-full bg-white shadow-soft flex items-center justify-center text-charcoal"
                            aria-label={`Decrease ${c.itemName} quantity`}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-semibold text-charcoal w-5 text-center">{c.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(c.itemId, c.quantity + 1)}
                            className="tap w-7 h-7 rounded-full bg-white shadow-soft flex items-center justify-center text-charcoal"
                            aria-label={`Increase ${c.itemName} quantity`}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(c.itemId)}
                          className="tap text-charcoal-faint shrink-0"
                          aria-label={`Remove ${c.itemName}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-sm font-semibold text-charcoal-soft">Subtotal</span>
                    <span className="text-lg font-bold text-charcoal">${s.subtotal.toFixed(2)}</span>
                  </div>

                  <Button fullWidth onClick={() => placeOrder(s.storeId, s.items)}>
                    Checkout {s.storeName}
                  </Button>
                </>
              )}
            </div>
          ))}
          <p className="text-[11px] text-charcoal-faint text-center">
            Prototype checkout for demo purposes — no payment will be processed.
          </p>
        </div>
      )}
    </BottomSheet>
  );
};
