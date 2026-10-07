import React from "react";
import { Flame } from "lucide-react";

// Design refinement §7.3: the flame flickers on a 1.6s loop behind a 2.4s
// radial ember glow — two layers, no colour change, no motion elsewhere on
// the card.
//
// Restore round 2 (user, 2026-10-07): back on Health, inside the HE1
// Calories burned tile. The flame's colour and the glow are props so it can
// sit white on the solid #D9A441 tile (a gold flame would vanish into it);
// the defaults are the original gold flame and amber glow.
export const CalorieFlame: React.FC<{ size?: number; className?: string; glow?: string }> = ({
  size = 14,
  className = "text-gold",
  glow = "rgba(217,164,65,0.45)",
}) => (
  <div className="relative flex items-center justify-center" style={{ width: size + 10, height: size + 10 }}>
    <span
      className="absolute inset-0 rounded-full animate-calorie-glow pointer-events-none"
      style={{ background: `radial-gradient(circle, ${glow}, transparent 70%)` }}
    />
    <Flame
      size={size}
      className={`relative animate-calorie-flame ${className}`}
      style={{ transformOrigin: "50% 90%" }}
    />
  </div>
);
