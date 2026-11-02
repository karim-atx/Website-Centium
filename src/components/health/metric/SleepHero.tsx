import React from "react";
import { Moon } from "lucide-react";
import { textPx, linePx } from "../../../theme/textSize";
import { useLoopWhileVisible } from "../useLoopWhileVisible";
import { MetricHero, hairline, useHealthMode } from "./MetricKit";
import { t } from "../../../i18n/core";

// HE1.3 #10-#16 night hero: solid #2E4A48 in both modes (no pattern),
// r22 pad 16 16 14 16, 226.2 tall. Arc SVG 326 x 150 (viewBox 0 0 326 150),
// measured from HE1.3-full.png: a half circle centre (163, 137) r 120;
// track #47605E 9 wide; the night band inside it 5 wide; bedtime end an
// open circle r 7.75 (stroke 1.5 #A2C8C2, fill #2E4A48), wake end a filled
// #A2C8C2 r 6.75. Moon 18 #A2C8C2 at (154, 46); value 36/36 800 ls-1.4
// #F5F3FA m-top 6; sub 12/18 600 #C9DEDA m-top 6.
// FALLBACK (bed_start / wake_end, HA-06 / PB-H-07, Database stage B1): the
// arc carries no clock labels and the band is one colour (#A2C8C2) instead
// of the stage-by-time segments; the Bedtime / Wake labels are hidden.
// "in bed" is asleep + awake from the stored stage totals when they exist.
//
// MOTION (motion-specs HE1.3, 4 s sine in-out): the moon scales 1 → 1.07 with
// a soft glow; 10 four-point stars (2 to 4 px, three sizes, on a loose grid
// clear of the text and arc) twinkle 30% → 95% once a loop, staggered 0.4 s
// in scattered order. Gated by useLoopWhileVisible; Reduce motion = static.

const STARS: { x: number; y: number; s: number; d: number }[] = [
  { x: 18, y: 30, s: 4, d: 0 },
  { x: 300, y: 32, s: 3, d: 1.6 },
  { x: 60, y: 70, s: 2, d: 0.8 },
  { x: 258, y: 64, s: 4, d: 2.4 },
  { x: 120, y: 20, s: 2, d: 3.2 },
  { x: 214, y: 22, s: 3, d: 0.4 },
  { x: 24, y: 104, s: 2, d: 2.0 },
  { x: 304, y: 100, s: 3, d: 1.2 },
  { x: 90, y: 40, s: 3, d: 2.8 },
  { x: 236, y: 44, s: 2, d: 3.6 },
];

const star = (x: number, y: number, s: number) => {
  const h = s / 2;
  const q = s / 8;
  return `M${x} ${y - h} L${x + q} ${y - q} L${x + h} ${y} L${x + q} ${y + q} L${x} ${y + h} L${x - q} ${y + q} L${x - h} ${y} L${x - q} ${y - q} Z`;
};

export const SleepHero: React.FC<{
  value: string | null;
  sub: string;
  /** Empty night: "No sleep recorded last night". */
  emptyTitle?: string;
  loading?: boolean;
  ariaLabel: string;
  /** B1 sleep_details bed_start / wake_end (HE1.3 #15-#16): "11:18 PM" and "6:42 AM"; the labels row shows only with both. */
  bed?: string | null;
  wake?: string | null;
  /** Month / year (HE1.3.m #16 / #18, HE1.3.y): "Avg bedtime" / "Avg wake"; default "Bedtime" / "Wake". */
  bedLabel?: string;
  wakeLabel?: string;
  /** B1 sleep_segments as fractions of the night (0-1, bed to wake): the band takes the stage colours (Deep #4F8F8A, Light #A2C8C2, REM #A2C8C2@45%, Awake #E4E1EE). */
  segments?: { stage: "awake" | "light" | "deep" | "rem"; from: number; to: number }[];
}> = ({ value, sub, emptyTitle, loading, ariaLabel, bed, wake, segments, bedLabel = t("Bedtime"), wakeLabel = t("Wake") }) => {
  const [ref, running] = useLoopWhileVisible<HTMLDivElement>();
  const play = running ? "running" : "paused";
  const arc = "M43 137 A120 120 0 0 1 283 137";
  return (
    <div ref={ref}>
      <MetricHero metric="sleep" pattern={null} padding="16px 16px 14px" background="#2E4A48" loading={loading} ariaLabel={ariaLabel}>
        <div className="relative" style={{ height: 150 }}>
          <svg viewBox="0 0 326 150" width="100%" height={150} aria-hidden style={{ display: "block", position: "absolute", inset: 0 }}>
            {STARS.map((st, i) => (
              <path key={i} className={running ? "he13-star" : undefined} d={star(st.x, st.y, st.s * 2)} fill="#F5F3FA" opacity={running ? undefined : 0.95} style={{ animationDelay: `${st.d}s`, animationPlayState: play }} />
            ))}
            <path d={arc} fill="none" stroke="#47605E" strokeWidth={9} strokeLinecap="round" />
            {value !== null && !(segments && segments.length) && <path d={arc} fill="none" stroke="#A2C8C2" strokeWidth={5} strokeLinecap="round" />}
            {value !== null &&
              segments?.map((g, i) => (
                <path
                  key={i}
                  d={arc}
                  fill="none"
                  pathLength={100}
                  strokeDasharray={`${Math.max(0.01, (g.to - g.from) * 100)} 100`}
                  strokeDashoffset={-g.from * 100}
                  stroke={g.stage === "deep" ? "#4F8F8A" : g.stage === "light" ? "#A2C8C2" : g.stage === "rem" ? "rgba(162,200,194,0.45)" : "#E4E1EE"}
                  strokeWidth={5}
                />
              ))}
            <circle cx={43} cy={137} r={7} fill="#2E4A48" stroke="#A2C8C2" strokeWidth={1.5} />
            <circle cx={283} cy={137} r={6.75} fill={value !== null ? "#A2C8C2" : "#47605E"} />
            <style>{`
              .he13-star { animation: he13-star 4s ease-in-out infinite; }
              @keyframes he13-star { 0%, 100% { opacity: 0.3; } 10% { opacity: 0.95; } 25% { opacity: 0.3; } }
              .he13-moon { animation: he13-moon 4s ease-in-out infinite; transform-origin: 50% 50%; }
              @keyframes he13-moon { 0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(162,200,194,0)); } 50% { transform: scale(1.07); filter: drop-shadow(0 0 4px rgba(162,200,194,0.6)); } }
            `}</style>
          </svg>
          <div className="relative flex flex-col items-center text-center" style={{ paddingTop: 46 }}>
            <span className={running ? "he13-moon" : undefined} style={{ display: "block", width: 18, height: 18, animationPlayState: play }}>
              <Moon size={18} strokeWidth={1.5} style={{ color: "#A2C8C2" }} aria-hidden />
            </span>
            {value !== null ? (
              <>
                <span data-hero-value style={{ marginTop: 6, fontSize: 36, lineHeight: "36px", fontWeight: 800, letterSpacing: -1.4, color: "#F5F3FA" }}>{value}</span>
                <span style={{ marginTop: 6, maxWidth: 160, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "#C9DEDA" }}>{sub}</span>
              </>
            ) : (
              <span style={{ marginTop: 10, fontSize: textPx(17), lineHeight: linePx(25.5), fontWeight: 800, letterSpacing: -0.3, color: "#F5F3FA" }}>{emptyTitle}</span>
            )}
          </div>
        </div>
        {value !== null && bed && wake && (
          // HE1.3 #15-#16: time 15/22.5 800 #F5F3FA over its label 10.5/15.8 600 #C9DEDA, under each arc end.
          // dir ltr: the labels sit under the arc's ends, which run bedtime (left) to wake (right) in both directions.
          <div dir="ltr" className="flex justify-between" style={{ marginTop: 8 }}>
            {[
              { t: bed, l: bedLabel, align: "left" as const },
              { t: wake, l: wakeLabel, align: "right" as const },
            ].map((x) => (
              <span key={x.l} className="flex flex-col" style={{ textAlign: x.align }}>
                <span style={{ fontSize: textPx(15), lineHeight: linePx(22.5), fontWeight: 800, color: "#F5F3FA" }}>{x.t}</span>
                <span style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: "#C9DEDA" }}>{x.l}</span>
              </span>
            ))}
          </div>
        )}
      </MetricHero>
    </div>
  );
};

export interface StageMinutes {
  deepMin: number;
  lightMin: number;
  remMin: number;
  awakeMin: number;
}

export const hm = (minutes: number) => {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h === 0 ? t("{m}m", { m: r }) : t("{h}h {m}m", { h, m: String(r).padStart(2, "0") });
};

/**
 * HE1.3 #19-#29 Stages card: white r18 pad 14 m-top 12; "Stages" 13/19.5 700
 * + right label 10.5/15.8 600 #8C8378; band 14 tall, gap 2, segments in
 * Deep · Light · REM · Awake order (Deep #4F8F8A dark #A2C8C2, Light #A2C8C2,
 * REM #A2C8C2@45%, Awake #E4E1EE dark #3A3D48*), measured ends r4; rows gap
 * 8: dot 9, name 12.5/18.8 600, minutes 12.5/18.8 800 tnum, share 11/16.5 600
 * #3E716D (dark #B8B3C7).
 */
export const SleepStagesCard: React.FC<{ stages: StageMinutes | null; right: string; note?: string }> = ({ stages, right, note }) => {
  const { dark, hc } = useHealthMode();
  const rows = stages
    ? [
        { key: "Deep", label: t("Deep"), min: stages.deepMin, color: dark ? "#A2C8C2" : "#4F8F8A" },
        { key: "Light", label: t("Light"), min: stages.lightMin, color: "#A2C8C2" },
        { key: "REM", label: t("REM"), min: stages.remMin, color: "rgba(162,200,194,0.45)" },
        { key: "Awake", label: t("Awake"), min: stages.awakeMin, color: dark ? "#3A3D48" : "#E4E1EE" },
      ]
    : [];
  const total = rows.reduce((s, r) => s + r.min, 0) || 1;
  const ink = (light: string) => (dark ? "#B8B3C7" : light);
  return (
    <section
      aria-label={
        stages
          ? t("Stages, {right}. {list}.", {
              right,
              list: rows.map((r) => t("{stage} {time}, {pct}%", { stage: r.label, time: hm(r.min), pct: Math.round((r.min / total) * 100) })).join(". "),
            })
          : undefined
      }
      style={{ marginTop: 12, borderRadius: 18, padding: 14, background: dark ? "#1C1F28" : "#FFFFFF", border: `0.5px solid ${hairline(dark, hc)}` }}
    >
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{t("Stages")}</h2>
        {stages && <span style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: hc ? "rgb(var(--c-charcoal))" : ink("#8C8378") }}>{right}</span>}
      </div>
      {stages ? (
        <div aria-hidden>
          <div className="flex overflow-hidden" style={{ marginTop: 10, height: 14, gap: 2, borderRadius: 4 }}>
            {rows.map((r) => (
              <span key={r.key} style={{ flex: `${r.min} 0 0`, minWidth: r.min > 0 ? 2 : 0, background: r.color }} />
            ))}
          </div>
          <div className="flex flex-col" style={{ marginTop: 12, gap: 8 }}>
            {rows.map((r) => (
              <div key={r.key} className="flex items-center" style={{ gap: 8 }}>
                <span className="shrink-0 rounded-full" style={{ width: 9, height: 9, background: r.color }} />
                <span className="flex-1" style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>{r.label}</span>
                <span style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "rgb(var(--c-charcoal))" }}>{hm(r.min)}</span>
                <span className="text-end" style={{ width: 36, fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 600, color: ink("#3E716D") }}>
                  {Math.round((r.min / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 6, fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 400, color: "rgb(var(--c-charcoal-soft))" }}>{note}</p>
      )}
    </section>
  );
};
