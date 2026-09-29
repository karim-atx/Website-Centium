import React, { useMemo } from "react";

const COLORS = ["#AEA1DC", "#A2C8C2", "#D9A441", "#C0392B", "#4C8FD1", "#7D6BB5"];

// QA 11.0: "If a set was selected as a PR and the checkmark was selected
// confetti flies through the page as a celebration." A lightweight
// CSS-only burst — no animation library needed for a one-shot effect.
//
// prefers-reduced-motion IS HONOURED HERE, not at each call site. Forty
// elements falling across the viewport is exactly what that setting is asking
// not to see, and putting the check inside means every caller — the PR
// celebration, the achievement unlock, anything later — gets it without having
// to remember. The caller is still told the burst is over, so a sheet waiting
// on onDone does not hang waiting for an animation that never ran.
export const Confetti: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const reducedMotion =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

  React.useEffect(() => {
    if (reducedMotion) onDone();
    // Once, on the mount that decided not to animate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.4 + Math.random() * 0.8,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 120,
        size: 6 + Math.random() * 6,
      })),
    []
  );

  if (reducedMotion) return null;

  return (
    <div
      className="fixed inset-0 z-[70] pointer-events-none overflow-hidden"
      onAnimationEnd={onDone}
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-16px] rounded-sm animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            // Passed as CSS custom properties so the keyframe can read a
            // per-piece drift/rotation without generating 40 keyframes.
            ["--confetti-drift" as string]: `${p.drift}px`,
            ["--confetti-rotate" as string]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
};
