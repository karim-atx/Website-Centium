import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { mockGyms } from "../../data/mockProfessionals";
import { QrPattern, DAY_MS } from "./GymDetailSheet";
import { KeyRound, ChevronLeft, ChevronRight } from "lucide-react";

// V9 (QA 9.0): "add a widget in the homescreen that has a logo of a
// minimalistic key that when pressed shows you the QR the gym memberships.
// The are not shown all at once rather individually, being able to swipe
// through them." — one gym pass at a time, prev/next through every
// currently-active pass across every gym the client has bought into.
// Mobile (QA 10.0) swaps the prev/next buttons for a touch-swipe gesture;
// kept as visible, keyboard-focusable arrow buttons here instead, since
// this is a mouse/keyboard surface with no swipe equivalent.
export const GymPassesSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { gymPurchases } = useApp();
  const [index, setIndex] = useState(0);

  const now = Date.now();
  const passes = Object.entries(gymPurchases).flatMap(([gymId, purchases]) => {
    const gym = mockGyms.find((g) => g.id === gymId);
    if (!gym) return [];
    return purchases
      .filter((p) => !p.oneTime || now - p.purchasedAt < DAY_MS)
      .map((p) => ({ gymId, gymName: gym.name, plan: p.plan }));
  });

  const current = passes[Math.min(index, passes.length - 1)];

  return (
    <BottomSheet open={open} onClose={onClose} title="Gym Passes">
      <div className="animate-fade-slide-up">
        {passes.length === 0 ? (
          <div className="text-center py-10">
            <KeyRound size={26} className="text-charcoal-faint mx-auto mb-3" />
            <p className="text-sm text-charcoal-faint">
              No gym passes yet — purchase a membership or day pass from Explore.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-3">
              {passes.length > 1 && (
                <button
                  onClick={() => setIndex((i) => (i - 1 + passes.length) % passes.length)}
                  aria-label="Previous pass"
                  className="tap w-9 h-9 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft hover:bg-charcoal/10 shrink-0"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <div className="flex flex-col items-center">
                <QrPattern seed={`${current.gymId}-${current.plan}`} className="w-48 h-48 mb-4" />
                <p className="font-display text-lg font-semibold text-charcoal">{current.gymName}</p>
                <p className="text-sm text-charcoal-faint">{current.plan}</p>
              </div>
              {passes.length > 1 && (
                <button
                  onClick={() => setIndex((i) => (i + 1) % passes.length)}
                  aria-label="Next pass"
                  className="tap w-9 h-9 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft hover:bg-charcoal/10 shrink-0"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
            {passes.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-5">
                {passes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to pass ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === Math.min(index, passes.length - 1) ? "w-5 bg-primary" : "w-1.5 bg-charcoal/15"
                    }`}
                  />
                ))}
              </div>
            )}
            <p className="text-[11px] text-charcoal-faint text-center mt-5">
              Not a real entry code — prototype only.
            </p>
          </>
        )}
      </div>
    </BottomSheet>
  );
};
