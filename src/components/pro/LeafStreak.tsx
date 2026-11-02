import React from "react";
import { Flower2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { STREAK_LEAF_PATH } from "../icons/StreakLeaf";
import { textPx } from "../../theme/textSize";
import { INK, NO_ICON_SCALE } from "./proInk";
import { t } from "../../i18n/core";

/**
 * Release 3 · LeafStreak (HANDOVER e; TR9 v5 "leaf streak, one fixed
 * drawing", source gen/r14.js streak14 on the gen/r11.js streak11 card).
 *
 * One drawing on a 300 × 120 box: a fixed stem (M14 104 C 100 110, 176 70,
 * 288 22; 2.4, teal dark) with 14 leaf slots alternating sides, sizes
 * stepping up (21 + 0.55 i). A slot only fills: done leaves #6F9993 (dark
 * #7FB3A9), today's leaf primary; slots still to reach the best are buds
 * (r 2.4, text.tertiary at 55%). Past 14 the drawing stays full with "+n" at
 * the tip. Milestone (7 in a row): five gold petals fixed at the stem tip.
 * The animation only fades leaves in (380 ms ease-out, 70 ms apart); with
 * reduced motion the finished drawing shows.
 *
 * Card (streak11): r20, card fill and border, pad 14; title 13 / 700; the
 * count 34 / 800 -0.03em with its label 12 / 700 text.soft; Best 11 / 16
 * 800; "Last 4 weeks" grid, Monday first, 7 columns, cells 22 high r7.
 */
export type StreakDay = 0 | 1 | 2 | null;

export interface LeafStreakProps {
  title: string;
  /** Current run. */
  current: number;
  best: number;
  /** "days logged", "days above goal"... */
  label: string;
  /** The last 4 weeks, Monday first, 28 entries: 1 done, 2 today (done), 0 missed, null not yet. */
  days: StreakDay[];
}

const STEM: [number, number][] = [
  [14, 104],
  [100, 110],
  [176, 70],
  [288, 22],
];

function bez(u: number): [number, number, number] {
  const p = STEM;
  const a = 1 - u;
  const x = a * a * a * p[0][0] + 3 * a * a * u * p[1][0] + 3 * a * u * u * p[2][0] + u * u * u * p[3][0];
  const y = a * a * a * p[0][1] + 3 * a * a * u * p[1][1] + 3 * a * u * u * p[2][1] + u * u * u * p[3][1];
  const dx = 3 * a * a * (p[1][0] - p[0][0]) + 6 * a * u * (p[2][0] - p[1][0]) + 3 * u * u * (p[3][0] - p[2][0]);
  const dy = 3 * a * a * (p[1][1] - p[0][1]) + 6 * a * u * (p[2][1] - p[1][1]) + 3 * u * u * (p[3][1] - p[2][1]);
  return [x, y, (Math.atan2(dy, dx) * 180) / Math.PI];
}

/** The 14 fixed slots (x, y, angle, size), as the board's SLOTS14. */
const LEAF_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const [x, y, ang] = bez(0.07 + i * 0.065);
  const up = i % 2 === 0;
  return { x, y, rot: ang + (up ? -58 : 58) + 90, s: 21 + i * 0.55 };
});

const Leaf: React.FC<{ x: number; y: number; rot: number; s: number; fill: string; delay: number; animate: boolean }> = ({ x, y, rot, s, fill, delay, animate }) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`}>
    <g className={animate ? "pro-leaf-in" : undefined} style={animate ? { animationDelay: `${delay}ms` } : undefined}>
      <path d={STREAK_LEAF_PATH} fill={fill} transform={`scale(${(s / 915).toFixed(4)}) translate(-245 -915)`} />
    </g>
  </g>
);

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export const LeafStreak: React.FC<LeafStreakProps> = ({ title, current, best, label, days }) => {
  const { theme } = useApp();
  const dark = theme === "dark";
  const animate = !useReducedMotion();
  const n = LEAF_SLOTS.length;
  const shown = Math.min(Math.max(0, current), n);
  const bloom = current >= 7;
  const tip = STEM[3];
  const cellDone = dark ? "rgba(127,179,169,0.22)" : "#EAF4F2";
  const leafDone = dark ? "#7FB3A9" : "#4F8F8A";

  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14, marginBottom: 12 }}>
      <style>{"@keyframes pro-leaf-in{from{opacity:0}to{opacity:1}}.pro-leaf-in{animation:pro-leaf-in 380ms ease-out backwards}@media (prefers-reduced-motion: reduce){.pro-leaf-in{animation:none}}html.reduce-motion .pro-leaf-in{animation:none}"}</style>
      <div className="flex items-end justify-between" style={{ gap: 10 }}>
        <div>
          <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>{title}</p>
          <p className="flex items-baseline" style={{ gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: textPx(34), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: INK.ch, fontVariantNumeric: "tabular-nums" }}>{current}</span>
            <span style={{ fontSize: textPx(12), fontWeight: 700, color: INK.chS }}>{label}</span>
          </p>
        </div>
        <div className="text-end">
          <p style={{ fontSize: textPx(11), color: INK.chF }}>{t("Best")}</p>
          <p style={{ fontSize: textPx(16), fontWeight: 800, color: INK.ch }}>{best}</p>
        </div>
      </div>
      <svg viewBox="0 0 300 120" width="100%" role="img" aria-label={t("{current} {label}, best {best}", { current, label, best })} style={{ display: "block", marginTop: 6, overflow: "visible", ...NO_ICON_SCALE }}>
        <path
          d={`M${STEM[0].join(" ")} C ${STEM[1].join(" ")}, ${STEM[2].join(" ")}, ${STEM[3].join(" ")}`}
          fill="none"
          stroke={INK.tealDark}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        {LEAF_SLOTS.slice(shown, Math.min(best, n)).map((q, j) => (
          <circle key={`b${j}`} cx={q.x.toFixed(1)} cy={q.y.toFixed(1)} r={2.4} fill={INK.chT} opacity={0.55} />
        ))}
        {LEAF_SLOTS.slice(0, shown).map((p, i) => (
          <Leaf key={i} x={p.x} y={p.y} rot={p.rot} s={p.s} fill={i === shown - 1 ? INK.pr : INK.doneLeaf} delay={70 * i} animate={animate} />
        ))}
        {bloom && (
          <>
            {[0, 1, 2, 3, 4].map((a) => (
              <Leaf key={`p${a}`} x={tip[0] - 2} y={tip[1] - 2} rot={a * 72} s={13} fill="#D9A441" delay={700 + a * 40} animate={animate} />
            ))}
            <g className={animate ? "pro-leaf-in" : undefined} style={animate ? { animationDelay: "920ms" } : undefined}>
              <circle cx={tip[0] - 2} cy={tip[1] - 2} r={3.4} fill="#FFFFFF" />
            </g>
          </>
        )}
        {current > n && (
          <text x={tip[0] - 8} y={tip[1] + 20} textAnchor="end" fontSize={11} fontWeight={800} fill={INK.chS}>
            +{current - n}
          </text>
        )}
      </svg>
      {bloom && (
        <p className="flex items-center" style={{ gap: 6, fontSize: textPx(12), fontWeight: 700, color: INK.goldInk, marginTop: 2 }}>
          <Flower2 size={13} strokeWidth={2} aria-hidden />
          {t("Milestone: {current} in a row", { current })}
        </p>
      )}
      <p style={{ fontSize: textPx(11), fontWeight: 600, color: INK.chF, marginTop: 8 }}>{t("Last 4 weeks")}</p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginTop: 10 }}>
        {WEEKDAYS.map((d, i) => (
          <span key={`h${i}`} aria-hidden className="text-center" style={{ fontSize: textPx(9.5), fontWeight: 700, color: INK.chT }}>
            {d}
          </span>
        ))}
        {days.slice(-28).map((v, i) => (
          <span
            key={i}
            className="flex items-center justify-center"
            style={{ height: 22, borderRadius: 7, background: v === 1 ? cellDone : v === 2 ? INK.prPale : INK.soft }}
          >
            {v ? (
              <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden style={NO_ICON_SCALE}>
                <g transform="translate(12 22) scale(0.022) translate(-245 -915)">
                  <path d={STREAK_LEAF_PATH} fill={v === 2 ? INK.pr : leafDone} />
                </g>
              </svg>
            ) : null}
          </span>
        ))}
      </div>
      <div className="flex" style={{ gap: 12, marginTop: 8, fontSize: textPx(10.5), color: INK.chF }}>
        <span>{t("Leaf: done")}</span>
        <span style={{ color: INK.prDeep, fontWeight: 700 }}>{t("Purple: today")}</span>
        <span>{t("Empty: missed")}</span>
      </div>
    </div>
  );
};
