import React from "react";
import { Footprints } from "lucide-react";
import { textPx, linePx } from "../../../theme/textSize";
import { useLoopWhileVisible } from "../useLoopWhileVisible";
import { HeroPill, MetricHero, StatCard, mc, metricIconInk, metricTextInk, useHealthMode, type Stat } from "./MetricKit";

// HE1.2 #10-#27 hero: tint card 358 r22 pad 18 16 16 16 with p1.svg; the
// ring 196 x 196 (viewBox 0 0 196 196) centred, measured from HE1.2.png:
// outer diameter 178, stroke 14 (r 82), track #D5E1CC, progress #7FA06A
// from 12 o'clock clockwise with round caps (dark track UNSPECIFIED: main
// at 25%*). Inside: Footprints 20 at 55, value 36/36 800 ls-1.4 (m-top 6),
// sub 12/18 600 metric ink (m-top 6). Pills pad 3 9 gap 6, 12 under the
// ring; the shared stat card 326 wide m-top 12 inside the hero.
//
// MOTION (motion-specs HE1.2, 3.2 s): the feet step at 0 / 0.8 / 1.6 / 2.4 s
// (stepping foot 100%, the other 25%, 2px lift); the ring's end dot ring
// grows 7 to 13 px and fades once a loop. useLoopWhileVisible gates it;
// Reduce motion keeps the static frame (both feet full, no dot ring).

const R = 82;
const C = 2 * Math.PI * R;

export const StepsRing: React.FC<{ pct: number; running: boolean }> = ({ pct, running }) => {
  const { dark } = useHealthMode();
  const p = Math.max(0, Math.min(1, pct));
  const angle = -Math.PI / 2 + p * 2 * Math.PI;
  const ex = 98 + R * Math.cos(angle);
  const ey = 98 + R * Math.sin(angle);
  return (
    <svg viewBox="0 0 196 196" width={196} height={196} aria-hidden style={{ display: "block", overflow: "visible" }}>
      <circle cx={98} cy={98} r={R} fill="none" stroke={dark ? mc("steps", "main", 0.25) : "#D5E1CC"} strokeWidth={14} />
      {p > 0 && (
        <circle
          cx={98}
          cy={98}
          r={R}
          fill="none"
          stroke={mc("steps", "main")}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${C * p} ${C}`}
          transform="rotate(-90 98 98)"
        />
      )}
      {p > 0 && running && (
        <circle className="he12-dot" cx={ex} cy={ey} r={3.5} fill="none" stroke={mc("steps", "main")} strokeWidth={1.5} style={{ transformOrigin: `${ex}px ${ey}px` }} />
      )}
      <style>{`
        .he12-dot { animation: he12-dot 3.2s ease-in-out infinite; }
        @keyframes he12-dot { 0% { transform: scale(1); opacity: 0.9; } 40% { transform: scale(1.857); opacity: 0; } 100% { transform: scale(1.857); opacity: 0; } }
        .he12-foot { animation: he12-foot 3.2s ease-in-out infinite; }
        @keyframes he12-foot {
          0%, 24% { opacity: 1; transform: translateY(-2px); }
          25%, 49% { opacity: 0.25; transform: translateY(0); }
          50%, 74% { opacity: 1; transform: translateY(-2px); }
          75%, 100% { opacity: 0.25; transform: translateY(0); }
        }
      `}</style>
    </svg>
  );
};

/** Footprints 20 split into its two feet so each can step (left / right halves of the glyph). */
const SteppingFeet: React.FC<{ running: boolean; color: string }> = ({ running, color }) => (
  <span className="relative block" style={{ width: 20, height: 20 }} aria-hidden>
    {[0, 1].map((half) => (
      <span
        key={half}
        className={running ? "he12-foot absolute top-0 overflow-hidden" : "absolute top-0 overflow-hidden"}
        style={{ left: half ? 10 : 0, width: 10, height: 20, animationDelay: half ? "-0.8s" : "0s" }}
      >
        <span className="absolute top-0" style={{ left: half ? -10 : 0 }}>
          <Footprints size={20} strokeWidth={1.5} style={{ color }} />
        </span>
      </span>
    ))}
  </span>
);

export const StepsHero: React.FC<{
  pct: number;
  value: string;
  sub: string;
  pills: string[];
  stats: Stat[];
  loading?: boolean;
  ariaLabel: string;
}> = ({ pct, value, sub, pills, stats, loading, ariaLabel }) => {
  const { dark } = useHealthMode();
  const [ref, running] = useLoopWhileVisible<HTMLDivElement>();
  return (
    <div ref={ref}>
      <MetricHero metric="steps" pattern={1} padding="18px 16px 16px" loading={loading} ariaLabel={ariaLabel}>
        <div className="relative mx-auto" style={{ width: 196, height: 196 }}>
          <StepsRing pct={pct} running={running} />
          <div className="absolute inset-0 flex flex-col items-center" style={{ paddingTop: 55 }}>
            <SteppingFeet running={running} color={metricIconInk("steps", dark)} />
            <span data-hero-value style={{ marginTop: 6, fontSize: 36, lineHeight: "36px", fontWeight: 800, letterSpacing: -1.4, color: "rgb(var(--c-charcoal))" }}>{value}</span>
            <span className="text-center" style={{ marginTop: 6, maxWidth: 140, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: metricTextInk("steps", dark) }}>
              {sub}
            </span>
          </div>
        </div>
        {pills.length > 0 && (
          <div className="flex justify-center flex-wrap" style={{ marginTop: 12, gap: 6 }}>
            {pills.map((p) => (
              <HeroPill key={p} metric="steps">
                {p}
              </HeroPill>
            ))}
          </div>
        )}
        <StatCard metric="steps" stats={stats} style={{ marginTop: 12 }} />
      </MetricHero>
    </div>
  );
};
