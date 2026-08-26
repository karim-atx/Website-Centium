import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { Minus, Plus, Trash2, ShoppingBag, Check } from "lucide-react";

// V8 (QA 8.0): "When bought it goes to a cart that adopts the same
// features of checkout most store pages have" — quantity editing, a
// subtotal/total, and a placeholder checkout (no real payment, matching
// this prototype's existing purchase mocks like Subscription/Gym passes).
export const CartSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { cart, updateCartQuantity, removeFromCart, clearCart } = useApp();
  const [placed, setPlaced] = useState(false);

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const placeOrder = () => {
    setPlaced(true);
    setTimeout(() => {
      clearCart();
      setPlaced(false);
      onClose();
    }, 1400);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Cart">
      {placed ? (
        <div className="text-center py-8 animate-fade-slide-up">
          <div className="w-14 h-14 rounded-full bg-primary-pale flex items-center justify-center mx-auto mb-4">
            <Check size={24} className="text-primary-dark" />
          </div>
          <p className="font-display font-semibold text-charcoal mb-1.5">Order placed</p>
          <p className="text-xs text-charcoal-faint">Prototype checkout — no real payment was processed.</p>
        </div>
      ) : cart.length === 0 ? (
        <div className="text-center py-10 animate-fade-slide-up">
          <ShoppingBag size={26} className="text-charcoal-faint mx-auto mb-3" />
          <p className="text-sm text-charcoal-faint">Your cart is empty.</p>
        </div>
      ) : (
        <div className="animate-fade-slide-up">
          <div className="space-y-2.5 mb-5">
            {cart.map((c) => (
              <div key={c.itemId} className="flex items-center gap-3 bg-cream-soft rounded-2xl px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal truncate">{c.itemName}</p>
                  <p className="text-[11px] text-charcoal-faint truncate">{c.storeName}</p>
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

          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm font-semibold text-charcoal-soft">Total</span>
            <span className="text-xl font-bold text-charcoal">${total.toFixed(2)}</span>
          </div>

          <Button fullWidth size="lg" onClick={placeOrder}>
            Checkout
          </Button>
          <p className="text-[11px] text-charcoal-faint text-center mt-3">
            Prototype checkout for demo purposes — no payment will be processed.
          </p>
        </div>
      )}
    </BottomSheet>
  );
};
