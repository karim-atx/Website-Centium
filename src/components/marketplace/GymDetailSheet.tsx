import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { Gym } from "../../types";
import { Star, MapPin, Check, Clock, XCircle, AlertTriangle } from "lucide-react";

// Decorative QR-style grid — a deterministic pseudo-random pattern seeded
// by the gym id + plan, not a real scannable code (this prototype has no
// backend to redeem it against). Different plans get visibly different
// codes since the seed includes the plan name.
function QrPattern({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const cells = Array.from({ length: 100 }, () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h >> 16) % 3 === 0;
  });
  return (
    <div className="grid grid-cols-10 gap-0.5 w-32 h-32 bg-white p-2 rounded-xl shrink-0">
      {cells.map((filled, i) => (
        <div key={i} className={filled ? "bg-charcoal" : "bg-white"} />
      ))}
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
const isOneTimePlan = (plan: string) => /day|drop-in/i.test(plan);

const formatRemaining = (ms: number) => {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
};

// V8 (QA 8.0): a day pass expires 24h after purchase and stacks alongside
// an active monthly/annual plan; monthly/annual plans stay active until
// explicitly cancelled (with a warning), and each plan gets its own QR.
export const GymDetailSheet: React.FC<{ open: boolean; onClose: () => void; gym: Gym | null }> = ({
  open,
  onClose,
  gym,
}) => {
  const { gymPurchases, purchaseGymPlan, cancelGymPlan } = useApp();
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => forceTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [open]);

  if (!gym) return null;

  const now = Date.now();
  const purchases = gymPurchases[gym.id] ?? [];
  const activePurchases = purchases.filter((p) => !p.oneTime || now - p.purchasedAt < DAY_MS);
  const isActive = (plan: string) => activePurchases.some((p) => p.plan === plan);

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setConfirmCancel(null);
        onClose();
      }}
      title={gym.name}
    >
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

        <span className="inline-block text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-3 py-1.5">
          {gym.perk}
        </span>

        {activePurchases.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Your passes</p>
            <div className="space-y-3">
              {activePurchases.map((p) => (
                <div key={p.plan} className="flex items-center gap-3 rounded-2xl bg-cream-soft p-3">
                  <QrPattern seed={`${gym.id}-${p.plan}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal">{p.plan}</p>
                    {p.oneTime ? (
                      <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-0.5">
                        <Clock size={11} /> Expires in {formatRemaining(p.purchasedAt + DAY_MS - now)}
                      </p>
                    ) : (
                      <p className="text-xs text-primary-dark font-semibold mt-0.5">Active membership</p>
                    )}
                    <p className="text-[10px] text-charcoal-faint mt-1">Not a real entry code — prototype only.</p>
                    {!p.oneTime &&
                      (confirmCancel === p.plan ? (
                        <div className="mt-2 bg-teal-pale rounded-xl p-2.5">
                          <p className="flex items-center gap-1 text-[11px] font-semibold text-teal-dark mb-1.5">
                            <AlertTriangle size={11} /> Cancel {p.plan.toLowerCase()}? This can't be undone.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmCancel(null)}
                              className="tap text-[11px] font-semibold text-charcoal-soft px-2.5 py-1"
                            >
                              Keep it
                            </button>
                            <button
                              onClick={() => {
                                cancelGymPlan(gym.id, p.plan);
                                setConfirmCancel(null);
                              }}
                              className="tap text-[11px] font-semibold text-white bg-teal-dark rounded-full px-2.5 py-1"
                            >
                              Yes, cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCancel(p.plan)}
                          className="tap flex items-center gap-1 text-[11px] font-semibold text-teal-dark mt-1.5"
                        >
                          <XCircle size={11} /> Cancel membership
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Membership</p>
          <div className="space-y-2">
            {gym.pricing.map((p) => {
              const active = isActive(p.plan);
              const oneTime = isOneTimePlan(p.plan);
              return (
                <div
                  key={p.plan}
                  className="flex items-center justify-between rounded-2xl bg-cream-soft px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{p.plan}</p>
                    <p className="text-xs text-charcoal-faint">
                      {p.price}
                      {oneTime && " · valid 24h"}
                    </p>
                  </div>
                  {active ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-3 py-1.5">
                      <Check size={13} /> Active
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => purchaseGymPlan(gym.id, p.plan, oneTime)}>
                      <Check size={13} /> Get
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-charcoal-faint mt-2">
            A day pass and a membership can be active at the same time — each gets its own QR code.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
};
