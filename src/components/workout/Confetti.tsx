import React, { useMemo } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// Restore round 2 (user, 2026-10-07): only the WO8 PR burst is restored. The
// full-page QA 11.0 Confetti export that used to sit here had no caller on main
// and is not brought back. Reduced motion (the in-app switch or the OS
// setting, useReducedMotion) is honoured inside the component, not at the call
// site: nothing is drawn and the caller is still told the burst is over.
//
// WO8 "PR confetti": when a set becomes Personal record, a short burst rises
// from that row — gold, lavender and teal pieces in mixed shapes and sizes,
// falling gently and fading out in about 1.2 s. Never blocks taps
// (pointer-events none), and skipped entirely under reduced motion.
const BURST_COLORS = ["#C8912B", "#D9A441", "rgb(var(--th-aea1dc))", "rgb(var(--th-c3b3fb))", "rgb(var(--th-a2c8c2))", "rgb(var(--th-63968b))"];
const BURST_SHAPES = ["rect", "circle", "triangle", "streamer"] as const;

export const PrBurst: React.FC<{ rect: { left: number; top: number; width: number; height: number }; onDone: () => void }> = ({
  rect,
  onDone,
}) => {
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    const id = window.setTimeout(onDone, reducedMotion ? 0 : 1300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const shape = BURST_SHAPES[i % BURST_SHAPES.length];
        const size = 5 + Math.random() * 5;
        return {
          id: i,
          shape,
          x: rect.left + rect.width * (0.15 + Math.random() * 0.7),
          y: rect.top + rect.height * 0.5,
          w: shape === "streamer" ? size * 0.45 : size,
          h: shape === "streamer" ? size * 1.9 : shape === "rect" ? size * 0.65 : size,
          color: BURST_COLORS[i % BURST_COLORS.length],
          dx: (Math.random() - 0.5) * 110,
          rise: 38 + Math.random() * 52,
          fall: 14 + Math.random() * 30,
          rot: (Math.random() - 0.5) * 540,
          delay: Math.random() * 0.12,
        };
      }),
    [rect]
  );

  if (reducedMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 70 }} aria-hidden>
      <style>{`@keyframes pr-burst {
        0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 0; }
        8% { opacity: 1; }
        38% { transform: translate(-50%, -50%) translate(calc(var(--dx) * 0.55), calc(var(--rise) * -1)) rotate(calc(var(--rot) * 0.4)); opacity: 1; }
        100% { transform: translate(-50%, -50%) translate(var(--dx), calc(var(--rise) * -1 + var(--fall))) rotate(var(--rot)); opacity: 0; }
      }`}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={
            {
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.w,
              height: p.h,
              background: p.color,
              borderRadius: p.shape === "circle" ? "50%" : p.shape === "streamer" ? 2 : 1.5,
              clipPath: p.shape === "triangle" ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
              animation: `pr-burst 1.2s cubic-bezier(.2,.7,.3,1) ${p.delay}s both`,
              ["--dx" as string]: `${p.dx}px`,
              ["--rise" as string]: `${p.rise}px`,
              ["--fall" as string]: `${p.fall}px`,
              ["--rot" as string]: `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
