import React, { useId } from "react";
import { CaloriesFlameIcon } from "../icons/PartBIcons";
import { useLoopWhileVisible } from "./useLoopWhileVisible";

// HE1 widget graphics (#12-#14, #23, #32, #42, #52, #61, #72-#76). The
// handover gives the viewBoxes only (110 x 40, 120 x 40); every shape below
// was traced from png/health/HE1-full.png (2x, pt = px / 2) and the coordinates
// are recorded beside each path. Colours: metric vars (fixed in every theme),
// so dark mode needs no second drawing except where the Dark column differs.
//
// MOTION (V6-128, motion-specs.md "HE1.1-HE1.7 hero motion", "Widget:" lines):
// every graphic loops a small version of its hero motion only while on
// screen and in the foreground (useLoopWhileVisible); Reduce motion keeps the
// static final frame (the in-app switch also zeroes CSS animation globally).

const KEYFRAMES = `
@keyframes hw-wave { from { transform: translateX(0) } to { transform: translateX(-50px) } }
@keyframes hw-endpulse { 0% { r: 3.5; opacity: .55 } 100% { r: 6.5; opacity: 0 } }
@keyframes hw-glow { 0%,100% { opacity: 0 } 50% { opacity: .45 } }
@keyframes hw-flicker { 0%,100% { transform: scale(1,1) rotate(0deg) } 25% { transform: scale(1.03,1.12) rotate(3deg) } 55% { transform: scale(1.05,1.04) rotate(-1deg) } 80% { transform: scale(0.98,0.94) rotate(-3deg) } }
@keyframes hw-ecg { from { transform: translateX(0) } to { transform: translateX(-120px) } }
@keyframes hw-trace { 0% { stroke-dashoffset: 100 } 53% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 0 } }
@keyframes hw-settle { 0% { transform: translateX(-6px) } 30% { transform: translateX(0) } 100% { transform: translateX(0) } }
@keyframes hw-ring { 0% { opacity: .5; transform: scale(1) } 47% { opacity: 0; transform: scale(1.9) } 100% { opacity: 0; transform: scale(1.9) } }
`;

/** One <style> per document is enough; React dedupes identical hoisted styles. */
const Keyframes: React.FC = () => <style href="health-widget-motion" precedence="default">{KEYFRAMES}</style>;

/** The animation only while running; otherwise none, so the element rests at its final (static) frame. */
const anim = (running: boolean, animation: string): React.CSSProperties => (running ? { animation } : {});
/** Graphics are drawings, not icons: excluded from the Larger text icon scale (.larger-icons svg:not(.qa-shape)). */
const NO_ICON_SCALE = "qa-shape";

// ---------------------------------------------------------------------------
// Water: the HE1.1 hero bottle (svg/illustrations/inline/water-bottle-hero.svg,
// viewBox 0 0 80 140) at 26 x 46 (0.33), strokes kept at about 0.85 px
// (= 2.6 units), ticks and dots faint; fill = water / goal (K6, clamped 0-1);
// the dashed goal line at the goal level. Progress track 70 x 6 r9999
// #FFFFFF@90% (dark #FFFFFF@8%*) with the #6E8FC9 fill, gap 10 (#13-#14).

const BOTTLE = "M31 26 L31 30 C31 36 12 38 12 50 L12 126 Q12 136 22 136 L58 136 Q68 136 68 126 L68 50 C68 38 49 36 49 30 L49 26 Z";

export const WaterBottleMini: React.FC<{ fraction: number; dark: boolean }> = ({ fraction, dark }) => {
  const [ref, running] = useLoopWhileVisible<HTMLSpanElement>();
  const clip = useId().replace(/:/g, "");
  const f = Math.max(0, Math.min(1, fraction));
  // Fill spans the body from y 136 (empty) to y 44 (the goal line).
  const top = 136 - f * (136 - 44);
  const stroke = dark ? "rgb(var(--metric-water-main))" : "rgb(var(--metric-water-accent))";
  const sw = 2.6; // 0.85 px at 0.33 scale
  // 1.6-unit sine wave, 50-unit wavelength, two wavelengths wide so a 50-unit slide loops seamlessly.
  const wave = Array.from({ length: 41 }, (_, i) => {
    const x = i * 5 - 10;
    return `${i ? "L" : "M"}${x} ${(top + 1.6 * Math.sin((x / 50) * 2 * Math.PI)).toFixed(2)}`;
  }).join(" ");
  return (
    <span ref={ref} className="inline-flex items-center" style={{ gap: 10 }}>
      <Keyframes />
      <svg viewBox="0 0 80 140" width={26} height={46} aria-hidden className={NO_ICON_SCALE} style={{ margin: "-3px 0", overflow: "visible" }}>
        <defs>
          <clipPath id={clip}>
            <path d={BOTTLE} />
          </clipPath>
        </defs>
        <path d={BOTTLE} fill={dark ? "rgba(255,255,255,0.08)" : "#FFFFFF"} />
        {f > 0 && (
          <g clipPath={`url(#${clip})`}>
            <path
              d={`${wave} L190 140 L-10 140 Z`}
              fill="rgb(var(--metric-water-main))"
              style={anim(running, "hw-wave 3s linear infinite")}
            />
          </g>
        )}
        <path d={BOTTLE} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <rect x="27" y="4" width="26" height="12" rx="3" fill={dark ? "transparent" : "#FFFFFF"} stroke={stroke} strokeWidth={sw} />
        {[113, 90, 67].map((y) => (
          <line key={y} x1="60" y1={y} x2="66" y2={y} stroke={stroke} strokeWidth={sw} strokeOpacity={0.35} />
        ))}
        <line x1="4" y1="44" x2="76" y2="44" stroke={stroke} strokeWidth={sw} strokeDasharray="5 5" strokeOpacity={0.7} />
        {[126.8, 108.4, 99.2, 86.3, 77.1].map((y) => (
          <circle key={y} cx="6" cy={y} r="2.6" fill={stroke} fillOpacity={0.35} />
        ))}
      </svg>
      <span className="relative block rounded-full overflow-hidden" style={{ width: 70, height: 6, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)" }} aria-hidden>
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${f * 100}%`, background: "#6E8FC9" }} />
      </span>
    </span>
  );
};

// ---------------------------------------------------------------------------
// Steps: thin arc (#23, 110 x 40). Traced: ends (7, 36) and (104, 36), apex
// y 20 (radius 81.5), stroke 3, round caps; track #FFFFFF@90% (dark @8%*),
// progress = steps / goal in the metric main. Widget loop: the ring end
// pulse (end dot ring grows and fades once per 3.2 s).

const STEP_ARC = "M7 36 A81.5 81.5 0 0 1 104 36";

export const StepsArcMini: React.FC<{ fraction: number; dark: boolean }> = ({ fraction, dark }) => {
  const [ref, running] = useLoopWhileVisible<SVGSVGElement>();
  const f = Math.max(0, Math.min(1, fraction));
  // End point of the progress along the arc (centre (55.5, 117.5), R 81.5).
  const a0 = Math.atan2(36 - 117.5, 7 - 55.5);
  const a1 = Math.atan2(36 - 117.5, 104 - 55.5);
  const a = a0 + (a1 - a0) * f;
  const ex = 55.5 + 81.5 * Math.cos(a);
  const ey = 117.5 + 81.5 * Math.sin(a);
  return (
    <svg ref={ref} viewBox="0 0 110 40" width={110} height={40} aria-hidden className={NO_ICON_SCALE}>
      <Keyframes />
      <path d={STEP_ARC} fill="none" stroke={dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"} strokeWidth={3} strokeLinecap="round" />
      {f > 0 && (
        <>
          <path d={STEP_ARC} fill="none" stroke="rgb(var(--metric-steps-main))" strokeWidth={3} strokeLinecap="round" pathLength={100} strokeDasharray={`${f * 100} 100`} />
          <circle cx={ex} cy={ey} r={3.5} fill="none" stroke="rgb(var(--metric-steps-main))" strokeWidth={1} style={{ opacity: 0, ...anim(running, "hw-endpulse 3.2s ease-in-out infinite") }} />
        </>
      )}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Sleep: night arc with bed and wake dots (#32, 110 x 40). Traced: ends
// (8.5, 36) and (103.5, 36), apex y 18 (radius 71.7), stroke 3 in the metric
// main #A2C8C2; bed dot r 4 hollow (white, 2 stroke in the dark accent), wake
// dot r 4.5 filled in the dark accent. Widget loop: moon glow (4 s) on the
// wake dot.

const SLEEP_ARC = "M8.5 36 A71.7 71.7 0 0 1 103.5 36";

export const SleepArcMini: React.FC<{ dark: boolean }> = ({ dark }) => {
  const [ref, running] = useLoopWhileVisible<SVGSVGElement>();
  const accent = dark ? "rgb(var(--metric-sleep-main))" : "rgb(var(--metric-sleep-accent))";
  return (
    <svg ref={ref} viewBox="0 0 110 40" width={110} height={40} aria-hidden className={NO_ICON_SCALE} overflow="visible">
      <Keyframes />
      <path d={SLEEP_ARC} fill="none" stroke="rgb(var(--metric-sleep-main))" strokeWidth={3} strokeLinecap="round" />
      <circle cx={8.5} cy={36} r={4} fill={dark ? "#313C42" : "#FFFFFF"} stroke={accent} strokeWidth={2} />
      <circle cx={103.5} cy={36} r={8} fill={accent} style={{ opacity: 0, ...anim(running, "hw-glow 4s ease-in-out infinite") }} />
      <circle cx={103.5} cy={36} r={4.5} fill={accent} />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Calories: half gauge with flame (#42, 110 x 40). Traced: centre (55, 37),
// radius 32.5, stroke 4 round; track #FFFFFF@90% (dark @8%*), fill = kcal /
// 2,600 in the metric main; flame (calories-flame.svg) 12 at (82, 7). Widget
// loop: flame flicker (4.8 s). Keeps K12 (the CalorieFlame motion).

export const CaloriesGaugeMini: React.FC<{ fraction: number; dark: boolean }> = ({ fraction, dark }) => {
  const [ref, running] = useLoopWhileVisible<SVGSVGElement>();
  const f = Math.max(0, Math.min(1, fraction));
  const arc = "M22.5 37 A32.5 32.5 0 0 1 87.5 37";
  return (
    <svg ref={ref} viewBox="0 0 110 40" width={110} height={40} aria-hidden className={NO_ICON_SCALE} overflow="visible">
      <Keyframes />
      <path d={arc} fill="none" stroke={dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"} strokeWidth={4} strokeLinecap="round" />
      {f > 0 && <path d={arc} fill="none" stroke="rgb(var(--metric-calories-main))" strokeWidth={4} strokeLinecap="round" pathLength={100} strokeDasharray={`${f * 100} 100`} />}
      <g transform="translate(82 6)">
        <g style={{ transformOrigin: "6px 11px", ...anim(running, "hw-flicker 4.8s ease-in-out infinite") }}>
          <CaloriesFlameIcon
            size={12}
            className={NO_ICON_SCALE}
            stroke={dark ? "rgb(var(--metric-calories-main))" : "rgb(var(--metric-calories-accent))"}
            fill="rgb(var(--metric-calories-main))"
          />
        </g>
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Heart rate: short ECG line (#52, 120 x 40). Traced from HE1-full.png:
// baseline y 24, P bump (33-38, up 3.5), R peak (55, 5.5), S dip (61, 36.5),
// T bump (79-86, up 3.5); stroke 1.5 in the metric main #C24E4E (K7: the
// trace recoloured; no rhythm label anywhere, V6-07). Widget loop: the trace
// scrolls left one beat per beat at the reading's bpm (motion-specs "HO1.W7
// ECG v1": translate by exactly one window per beat, no seam).

const ECG_BEAT = "H30 L33 20.5 L36 22 L38 24 H48 L50 26 L55 5.5 L61 36.5 L65 24 H79 L82 20.5 L86 24 H120";

export const EcgMini: React.FC<{ bpm: number }> = ({ bpm }) => {
  const [ref, running] = useLoopWhileVisible<SVGSVGElement>();
  const beat = 60 / Math.max(30, Math.min(220, bpm));
  return (
    <svg ref={ref} viewBox="0 0 120 40" width={120} height={40} aria-hidden className={NO_ICON_SCALE}>
      <Keyframes />
      <g style={anim(running, `hw-ecg ${beat}s linear infinite`)}>
        <path d={`M0 24 ${ECG_BEAT}`} fill="none" stroke="rgb(var(--metric-heart-rate-main))" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <path d={`M120 24 ${ECG_BEAT.replace(/([HL])(\d+(?:\.\d+)?)/g, (_m, c, x) => `${c}${Number(x) + 120}`)}`} fill="none" stroke="rgb(var(--metric-heart-rate-main))" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Blood pressure: pulse wave (#61, 120 x 40). Traced: two arterial pulses,
// systolic peaks (9.5, 11) and (67, 12), dicrotic notches (22, 24) and
// (79.5, 24), ends (1, 30) and (120, 30.5); stroke 1.5 in the metric main
// #A65C87. Widget loop: the wave traces in 1.6 s of a 3 s loop and holds
// (static final frame = the whole wave).

const BP_WAVE = "M1 30 L9.5 11 C14 14 18 20 22 24 L25 21 C35 24 50 27 59.5 28 L67 12 C71 15 76 21 79.5 24 L83.5 21 C95 25 108 28 120 30.5";

export const BpWaveMini: React.FC = () => {
  const [ref, running] = useLoopWhileVisible<SVGSVGElement>();
  return (
    <svg ref={ref} viewBox="0 0 120 40" width={120} height={40} aria-hidden className={NO_ICON_SCALE}>
      <Keyframes />
      <path
        d={BP_WAVE}
        fill="none"
        stroke="rgb(var(--metric-blood-pressure-main))"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100 100"
        style={running ? { animation: "hw-trace 3s ease-in-out infinite" } : undefined}
      />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Weight trend: journey strip start · now · goal (#72-#76). Track 240 x 4
// r9999 #FFFFFF@90% (dark @8%*); fill #9A8CD6 (dark #A991FE, theme primary)
// to `now`; start dot 8 #5F5093 (dark #9A8CD6); now dot 14 #9A8CD6 (dark
// #A991FE) with a 2.7 border #FFFFFF (dark #1C1F28), m-left -7; goal dot 10
// #FFFFFF (dark #1C1F28) with 1.1 dashed #5F5093 (dark #9A8CD6). High
// contrast: fill and now dot #5B48B8 (HE1 O7). No goal: start → now only
// (OURS-health-empty-weight), the now dot at the right end. Row height 24.
// Widget loop: the now marker slides its last 6 px in (3 s), no overshoot.

export const WeightJourneyStrip: React.FC<{ fraction: number | null; dark: boolean; hc: boolean }> = ({ fraction, dark, hc }) => {
  const [ref, running] = useLoopWhileVisible<HTMLDivElement>();
  const f = fraction === null ? 1 : Math.max(0, Math.min(1, fraction));
  const fill = hc && !dark ? "#5B48B8" : dark ? "rgb(var(--th-a991fe))" : "rgb(var(--th-9a8cd6))";
  const deep = dark ? "rgb(var(--th-9a8cd6))" : "rgb(var(--th-5f5093))";
  const card = dark ? "#1C1F28" : "#FFFFFF";
  return (
    <div ref={ref} className="relative" style={{ width: 240, height: 24 }} aria-hidden>
      <Keyframes />
      <span className="absolute left-0 right-0 rounded-full" style={{ top: 10, height: 4, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)" }} />
      <span
        className="absolute left-0 rounded-full"
        style={{ top: 10, height: 4, width: `${f * 100}%`, background: fill, ...anim(running, "hw-settle 3s ease-out infinite") }}
      />
      <span className="absolute rounded-full" style={{ left: 0, top: 8, width: 8, height: 8, background: deep }} />
      {fraction !== null && (
        <span className="absolute rounded-full" style={{ right: 0, top: 7, width: 10, height: 10, background: card, border: `1.1px dashed ${deep}`, boxSizing: "border-box" }} />
      )}
      <span
        className="absolute"
        style={{ left: `${f * 100}%`, top: 5, width: 14, height: 14, marginLeft: -7, ...anim(running, "hw-settle 3s ease-out infinite") }}
      >
        <span className="absolute inset-0 rounded-full" style={{ background: fill, opacity: 0, ...anim(running, "hw-ring 3s ease-out infinite") }} />
        <span className="absolute inset-0 rounded-full" style={{ background: fill, border: `2.7px solid ${card}`, boxSizing: "border-box" }} />
      </span>
    </div>
  );
};
