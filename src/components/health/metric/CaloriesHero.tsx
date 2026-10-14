import React from "react";
import { textPx, linePx } from "../../../theme/textSize";
import { useLoopWhileVisible } from "../useLoopWhileVisible";
import { HeroPill, MetricHero, mc, metricTextInk, useHealthMode } from "./MetricKit";

// HE1.4 #10-#11 hero: tint card 358 r22 pad 18 16 14 16 with p2.svg. The
// gauge is not in the layout table; measured from HE1.4-full.png (pt):
// half ring centre (163, 132.4) in the 326-wide content, r 104, stroke 16
// round caps; track #F1DDC2 (main at 37%; dark main at 25%*); filled arc
// main #D9A15B; the workouts share (B1 workout_sessions.kcal, HA-07) runs
// from the left end in #B07A35 (both modes; HE1.4 / HE1.4.d only, the month
// and year frames draw none); goal tick 2 wide #B07A35 at the right end;
// "0" / "2,600" 10.5/15.8 600 metric ink under the ends; flame 20
// (calories-flame.svg geometry) at y 52; value 36/36 800 ls-1.4 (m-top 6);
// "of 2,600 kcal" 12/18 600 metric ink (m-top 6); pills pad 3 9 gap 6 at
// y 174. Legend under the pills (measured, HE1.4-full.png): m-top 6,
// centred, gap 14 between items; swatch 10 x 6 r3 (#B07A35 workouts, #D9A15B
// rest), gap 6; text 11/16.5 600 metric ink (#8A5A1F) "Workouts 570" /
// "Rest of day 1,370". The card grows to the table height 250.4.
//
// MOTION (motion-specs HE1.4, 4.8 s loop): the flame grows to 1.12 high and
// 1.05 wide from three rhythms (1.2 / 1.6 / 0.8 s), the inner flame on its
// own 0.96 s rhythm; a shimmer runs along the filled arc every 2.4 s.
// useLoopWhileVisible gates it; Reduce motion = static frame.

const CX = 163;
const CY = 132.4;
const R = 104;
const arcPath = (from: number, to: number) => {
  // angles in turns of the half ring: 0 = left end, 1 = right end.
  const a0 = Math.PI * (1 - from);
  const a1 = Math.PI * (1 - to);
  const x0 = CX + R * Math.cos(a0);
  const y0 = CY - R * Math.sin(a0);
  const x1 = CX + R * Math.cos(a1);
  const y1 = CY - R * Math.sin(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
const HALF = Math.PI * R;

const OUTER = "M12 21.5c-3.9 0-6.5-2.6-6.5-6.1 0-2.3 1.3-4.2 2.6-5.6.3 1.4 1 2.4 2 2.9-.5-3.4 1-6.4 3.7-8.7.1 2.6 1.6 4.4 3.1 6 1.1 1.2 1.6 2.9 1.6 4.6 0 4.2-2.6 6.9-6.5 6.9Z";
const INNER = "M12 19.2c-1.7 0-2.8-1.1-2.8-2.7 0-1.3.8-2.3 1.7-3.1.1.8.5 1.3 1 1.5-.1-1.5.5-2.7 1.6-3.6.2 1.1.9 1.9 1.4 2.6.4.6.6 1.3.6 2 0 1.9-1.4 3.3-3.5 3.3Z";

export const CaloriesHero: React.FC<{
  pct: number;
  value: string;
  sub: string;
  goalLabel: string;
  pills: string[];
  loading?: boolean;
  ariaLabel: string;
  /** HE1.4 / HE1.4.d: the day's workout kcal share (0-1 of the goal) and the legend texts; null = no share drawn. */
  workouts?: { pct: number; workoutsLabel: string; restLabel: string } | null;
}> = ({ pct, value, sub, goalLabel, pills, loading, ariaLabel, workouts }) => {
  const { dark } = useHealthMode();
  const [ref, running] = useLoopWhileVisible<HTMLDivElement>();
  const p = Math.max(0, Math.min(1, pct));
  const wp = workouts ? Math.max(0, Math.min(p, workouts.pct)) : 0;
  const ink = metricTextInk("calories", dark);
  const play = running ? "running" : "paused";
  return (
    <div ref={ref}>
      <MetricHero metric="calories" pattern={2} padding="18px 16px 14px" loading={loading} ariaLabel={ariaLabel}>
        <div className="relative" style={{ height: 166 }}>
          <svg viewBox="0 0 326 166" width="100%" height={166} aria-hidden style={{ display: "block", position: "absolute", inset: 0, overflow: "visible" }}>
            <path d={arcPath(0, 1)} fill="none" stroke={dark ? mc("calories", "main", 0.25) : "#F1DDC2"} strokeWidth={16} strokeLinecap="round" />
            {p > 0 && <path d={arcPath(0, p)} fill="none" stroke={mc("calories", "main")} strokeWidth={16} strokeLinecap="round" />}
            {p > 0 && wp > 0 && <path d={arcPath(0, wp)} fill="none" stroke="#B07A35" strokeWidth={16} strokeLinecap="round" data-workouts-share />}
            {p > 0 && running && (
              <path
                className="he14-shimmer"
                d={arcPath(0, p)}
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity={0.35}
                strokeWidth={16}
                strokeLinecap="round"
                strokeDasharray={`18 ${HALF * 2}`}
                style={{ ["--he14-len" as string]: `${-HALF * p}` }}
              />
            )}
            <line x1={CX + R} x2={CX + R} y1={CY - 18} y2={CY + 16} stroke={mc("calories", "accent")} strokeWidth={2} />
            <text x={CX - R} y={CY + 30} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={ink}>
              0
            </text>
            <text x={CX + R} y={CY + 30} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={ink}>
              {goalLabel}
            </text>
            <style>{`
              .he14-shimmer { animation: he14-shimmer 2.4s ease-in-out infinite; }
              @keyframes he14-shimmer { from { stroke-dashoffset: 18; } to { stroke-dashoffset: var(--he14-len); } }
              .he14-flame { transform-origin: 50% 90%; animation: he14-a 1.2s ease-in-out infinite, he14-b 1.6s ease-in-out infinite; }
              .he14-flame-w { transform-origin: 50% 90%; animation: he14-c 0.8s ease-in-out infinite; }
              .he14-inner { transform-origin: 50% 90%; animation: he14-d 0.96s ease-in-out infinite; }
              @keyframes he14-a { 0%, 100% { scale: 1 1; } 50% { scale: 1 1.12; } }
              @keyframes he14-b { 0%, 100% { rotate: -2deg; } 50% { rotate: 2deg; } }
              @keyframes he14-c { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.05); } }
              @keyframes he14-d { 0%, 100% { transform: scale(1); opacity: 0.55; } 50% { transform: scale(1.1, 1.18); opacity: 0.8; } }
            `}</style>
          </svg>
          <div className="relative flex flex-col items-center text-center" style={{ paddingTop: 52 }}>
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden style={{ overflow: "visible" }}>
              <g className={running ? "he14-flame-w" : undefined} style={{ animationPlayState: play }}>
                <g className={running ? "he14-flame" : undefined} style={{ animationPlayState: play }}>
                  <path d={OUTER} fill="none" stroke={mc("calories", "accent")} strokeWidth={1.25} strokeLinejoin="round" />
                </g>
              </g>
              <g className={running ? "he14-inner" : undefined} style={{ animationPlayState: play }}>
                <path d={INNER} fill={mc("calories", "main")} fillOpacity={0.55} />
              </g>
            </svg>
            <span data-hero-value style={{ marginTop: 6, fontSize: 36, lineHeight: "36px", fontWeight: 800, letterSpacing: -1.4, color: "rgb(var(--c-charcoal))" }}>{value}</span>
            <span style={{ marginTop: 6, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: ink }}>{sub}</span>
          </div>
        </div>
        <div className="flex justify-center flex-wrap" style={{ marginTop: 8, gap: 6 }}>
          {pills.map((t) => (
            <HeroPill key={t} metric="calories">
              {t}
            </HeroPill>
          ))}
        </div>
        {workouts && (
          <div className="flex justify-center flex-wrap" style={{ marginTop: 6, columnGap: 14, rowGap: 4 }} data-workouts-legend>
            {[
              { c: "#B07A35", t: workouts.workoutsLabel },
              { c: "#D9A15B", t: workouts.restLabel },
            ].map((x) => (
              <span key={x.t} className="inline-flex items-center" style={{ gap: 6, fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 600, color: ink }}>
                <span aria-hidden style={{ width: 10, height: 6, borderRadius: 3, background: x.c, display: "inline-block" }} />
                {x.t}
              </span>
            ))}
          </div>
        )}
      </MetricHero>
    </div>
  );
};

/**
 * The hero's estimate note (handover HE1.4 States, "repo copy" per the
 * handover notes). No constant held it in the repo when this page was
 * built, so it lives here, once, and every Calories surface reads it.
 */
export const ESTIMATED_INCL_WORKOUTS = "Estimated, incl. workouts";
