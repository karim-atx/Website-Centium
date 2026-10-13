import React from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { textPx, linePx } from "../../../theme/textSize";
import { useLoopWhileVisible } from "../useLoopWhileVisible";
import { HeroPill, MetricHero, mc, metricTextInk, useHealthMode } from "./MetricKit";

// HE1.1 #8-#21 hero: tint card 358 r22 pad 16 with p0.svg; the bottle (asset
// svg/illustrations/inline/water-bottle-hero.svg, viewBox 0 0 80 140 drawn
// 92 x 161) beside the value column, centred as a group (gap 16, measured:
// bottle right 181.4 to text 197.4); quick-add chips 34 tall, gap 8, 14
// under the bottle.
//
// FILL: the asset's own geometry puts 100% on the dashed goal line (y 44)
// and its drawn 64% surface at y 77.1, so the surface is y = 136 - 92 x
// min(intake / goal, 1); goal-quarter ticks at 113 / 90 / 67 as drawn; the
// "1 L" / "2 L" labels follow the goal. (The checklist row's "110" would
// put 100% at the neck, above the drawn goal line: the asset wins.)
// DRINK DOTS (asset's left markers) wait for drink entries (PB-H-04, B1).
//
// MOTION (motion-specs HE1.1, 3 s): the surface is a 1.6-unit sine wave
// (amplitude 0.8), 50-unit wavelength, moving one wavelength a loop; one
// bubble a loop rising for 1.5 s in white 60%. Runs only while visible
// (useLoopWhileVisible); Reduce motion = static frame.

const WAVE = (() => {
  // Two wavelengths either side of the 80-unit width, sampled every 2 units.
  const pts: string[] = [];
  for (let x = -50; x <= 130; x += 2) pts.push(`${x} ${(0.8 * Math.sin((2 * Math.PI * x) / 50)).toFixed(3)}`);
  return `M${pts.join(" L")} L130 120 L-50 120 Z`;
})();

const BOTTLE = "M31 26 L31 30 C31 36 12 38 12 50 L12 126 Q12 136 22 136 L58 136 Q68 136 68 126 L68 50 C68 38 49 36 49 30 L49 26 Z";

export const WaterBottle: React.FC<{ pct: number; goalMl: number; running: boolean }> = ({ pct, goalMl, running }) => {
  const { dark, hc } = useHealthMode();
  const p = Math.max(0, Math.min(1, pct));
  const surface = 136 - 92 * p;
  const stroke = mc("water", "accent");
  const body = dark ? "rgba(255,255,255,0.08)" : "#FFFFFF";
  const play = running ? "running" : "paused";
  const litres: number[] = [];
  for (let l = 1; l * 1000 < goalMl; l++) litres.push(l);
  return (
    <svg viewBox="0 0 80 140" width={92} height={161} aria-hidden style={{ display: "block", overflow: "visible" }}>
      <defs>
        <clipPath id="he11-bottle-clip">
          <path d={BOTTLE} />
        </clipPath>
      </defs>
      <path d={BOTTLE} fill={body} />
      {p > 0 && (
        <g clipPath="url(#he11-bottle-clip)">
          <g transform={`translate(0 ${surface})`}>
            <g className="he11-wave" style={{ animationPlayState: play }}>
              <path d={WAVE} fill={mc("water", "main")} />
              <rect x={-50} y={0} width={180} height={3} fill="#FFFFFF" fillOpacity={0.35} />
            </g>
          </g>
          {running && <circle className="he11-bubble" cx={44} cy={128} r={1.6} fill="#FFFFFF" fillOpacity={0.6} style={{ ["--he11-rise" as string]: `${surface - 128 + 4}px` }} />}
        </g>
      )}
      <path d={BOTTLE} fill="none" stroke={stroke} strokeWidth={1.25} strokeLinejoin="round" />
      <rect x={27} y={4} width={26} height={12} rx={3} fill={body} stroke={stroke} strokeWidth={1.25} />
      {[113, 90, 67].map((y) => (
        <line key={y} x1={60} y1={y} x2={66} y2={y} stroke={stroke} strokeWidth={1.25} strokeOpacity={hc ? 1 : 0.5} />
      ))}
      <line x1={4} y1={44} x2={76} y2={44} stroke={stroke} strokeWidth={1.5} strokeDasharray="3 3" />
      {litres.map((l) => (
        <text key={l} x={78} y={136 - (92 * l * 1000) / goalMl + 3} fontSize={7} fontWeight={700} fill={stroke}>
          {l} L
        </text>
      ))}
      <style>{`
        .he11-wave { animation: he11-wave 3s linear infinite; }
        @keyframes he11-wave { from { transform: translateX(0); } to { transform: translateX(-50px); } }
        .he11-bubble { animation: he11-bubble 3s ease-in-out infinite; }
        @keyframes he11-bubble {
          0% { transform: translateY(0); opacity: 0; }
          8% { opacity: 1; }
          46% { opacity: 1; }
          50% { transform: translateY(var(--he11-rise)); opacity: 0; }
          100% { transform: translateY(var(--he11-rise)); opacity: 0; }
        }
      `}</style>
    </svg>
  );
};

export interface WaterHeroText {
  value: string;
  unit: string;
  lines: string[];
  pill: string;
}

const chipStyle = (dark: boolean): React.CSSProperties => ({
  height: 34,
  padding: "0 13px",
  gap: 5,
  borderRadius: 9999,
  fontSize: textPx(12.5),
  lineHeight: linePx(18.8),
  fontWeight: 700,
  border: `0.5px solid ${dark ? "rgb(var(--c-primary-fill) / 0.5)" : "rgb(var(--th-aea1dc) / 0.5)"}`,
});

export const WaterHero: React.FC<{
  pct: number;
  goalMl: number;
  text: WaterHeroText;
  loading?: boolean;
  onQuickAdd: (ml: number) => void;
  onCustom: () => void;
  quickDisabled?: boolean;
  ariaLabel: string;
}> = ({ pct, goalMl, text, loading, onQuickAdd, onCustom, quickDisabled, ariaLabel }) => {
  const { dark } = useHealthMode();
  const [ref, running] = useLoopWhileVisible<HTMLDivElement>();
  const ink = metricTextInk("water", dark);
  return (
    <div ref={ref}>
      <MetricHero metric="water" pattern={0} padding="16px" loading={loading} ariaLabel={ariaLabel} style={{ marginTop: 0 }}>
        <div className="flex justify-center" style={{ gap: 16 }}>
          <div className="relative shrink-0" style={{ width: 92, height: 161 }}>
            <span
              className="absolute whitespace-nowrap"
              style={{ right: "calc(100% + 2px)", top: 43.5, fontSize: textPx(9.5), lineHeight: linePx(14.3), fontWeight: 700, color: ink }}
            >
              Goal
            </span>
            <WaterBottle pct={pct} goalMl={goalMl} running={running} />
          </div>
          <div className="min-w-0 flex flex-col items-start">
            <p className="flex items-end whitespace-nowrap" style={{ gap: 5 }}>
              <span data-hero-value style={{ fontSize: 40, lineHeight: "40px", fontWeight: 800, letterSpacing: -1.6, color: "rgb(var(--c-charcoal))" }}>{text.value}</span>
              <span style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 700, color: ink }}>{text.unit}</span>
            </p>
            <div style={{ marginTop: 6 }}>
              {text.lines.map((l) => (
                <p key={l} style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>
                  {l}
                </p>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <HeroPill metric="water">{text.pill}</HeroPill>
            </div>
          </div>
        </div>
        <div className="flex justify-center flex-wrap" style={{ marginTop: 14, gap: 8 }}>
          {[250, 500].map((ml) => (
            <button
              key={ml}
              type="button"
              disabled={quickDisabled}
              onClick={() => onQuickAdd(ml)}
              aria-label={`Add ${ml} ml today`}
              className="tap relative inline-flex items-center bg-th-f0edf9 dark:bg-th-303141 text-primary-deep-text disabled:opacity-40 before:absolute before:-inset-y-[5px] before:inset-x-0 before:content-['']"
              style={chipStyle(dark)}
            >
              <Plus size={13} aria-hidden />
              {ml} ml
            </button>
          ))}
          <button
            type="button"
            disabled={quickDisabled}
            onClick={onCustom}
            className="tap relative inline-flex items-center bg-th-f0edf9 dark:bg-th-303141 text-primary-deep-text disabled:opacity-40 before:absolute before:-inset-y-[5px] before:inset-x-0 before:content-['']"
            style={chipStyle(dark)}
          >
            <SlidersHorizontal size={13} aria-hidden />
            Custom
          </button>
        </div>
      </MetricHero>
    </div>
  );
};
