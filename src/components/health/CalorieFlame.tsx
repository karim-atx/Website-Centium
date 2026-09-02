import React from "react";
import { Flame } from "lucide-react";

// Design refinement §7.3: the flame flickers on a 1.6s loop behind a 2.4s
// radial ember glow — two layers, no colour change, no motion elsewhere on
// the card.
export const CalorieFlame: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <div className="relative flex items-center justify-center" style={{ width: size + 10, height: size + 10 }}>
    <span
      className="absolute inset-0 rounded-full animate-calorie-glow pointer-events-none"
      style={{ background: "radial-gradient(circle, rgba(217,164,65,0.45), transparent 70%)" }}
    />
    <Flame
      size={size}
      className="relative text-gold animate-calorie-flame"
      style={{ transformOrigin: "50% 90%" }}
    />
  </div>
);
