import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { Gym } from "../../types";
import { Star, MapPin, Check } from "lucide-react";

// Decorative QR-style grid — a deterministic pseudo-random pattern seeded
// by the gym id, not a real scannable code (this prototype has no backend
// to redeem it against).
function QrPattern({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const cells = Array.from({ length: 100 }, () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h >> 16) % 3 === 0;
  });
  return (
    <div className="grid grid-cols-10 gap-0.5 w-40 h-40 bg-white p-2 rounded-xl">
      {cells.map((filled, i) => (
        <div key={i} className={filled ? "bg-charcoal" : "bg-white"} />
      ))}
    </div>
  );
}

export const GymDetailSheet: React.FC<{ open: boolean; onClose: () => void; gym: Gym | null }> = ({
  open,
  onClose,
  gym,
}) => {
  const [purchasedPlan, setPurchasedPlan] = useState<string | null>(null);

  if (!gym) return null;

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setPurchasedPlan(null);
        onClose();
      }}
      title={gym.name}
    >
      {purchasedPlan ? (
        <div className="text-center animate-fade-slide-up">
          <p className="text-sm text-charcoal-soft mb-4">
            Show this code at the front desk to enter {gym.name}.
          </p>
          <div className="flex justify-center mb-4">
            <QrPattern seed={`${gym.id}-${purchasedPlan}`} />
          </div>
          <p className="text-sm font-semibold text-charcoal mb-1">{purchasedPlan}</p>
          <p className="text-xs text-charcoal-faint mb-5">Prototype membership pass — not a real entry code.</p>
          <Button fullWidth onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-5 animate-fade-slide-up">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm font-bold text-gold">
              <Star size={14} className="fill-gold" /> {gym.rating}
            </span>
            <span className="text-xs text-charcoal-faint">{gym.reviewCount} reviews</span>
            <span className="flex items-center gap-1 text-xs text-charcoal-faint">
              <MapPin size={11} /> {gym.location}
            </span>
          </div>

          <p className="text-sm text-charcoal-soft leading-relaxed">{gym.bio}</p>

          <span className="inline-block text-xs font-semibold text-sohati-dark bg-sohati-pale rounded-full px-3 py-1.5">
            {gym.perk}
          </span>

          <div>
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Membership</p>
            <div className="space-y-2">
              {gym.pricing.map((p) => (
                <div
                  key={p.plan}
                  className="flex items-center justify-between rounded-2xl bg-cream-soft px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{p.plan}</p>
                    <p className="text-xs text-charcoal-faint">{p.price}</p>
                  </div>
                  <Button size="sm" onClick={() => setPurchasedPlan(p.plan)}>
                    <Check size={13} /> Get
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
