import React, { useMemo } from "react";

// Design refinement §7.3: a real P-QRS-T waveform, not a decorative zigzag.
// One complex per RR interval in 10ms units inside a 300-unit (3s) window,
// so a fixed 3s marching loop yields exactly the displayed bpm. QRS holds
// ~90ms at every rate; ST/T compress as rate climbs and the TP baseline
// absorbs the remainder — which is how rate actually changes on paper.
function ekgPath(bpm: number) {
  const w = 6000 / bpm; // RR interval in 10ms units
  let st = 8,
    t = 16;
  if (w < 60) {
    const f = Math.max(0.34, (w - 26) / 34);
    st *= f;
    t *= f;
  }
  const block = 26 + st + t;
  const filler = Math.max(4, w - block); // TP baseline
  const step = block + filler;
  const B = 46; // baseline y
  let d = "",
    x = 0;
  while (x < 620) {
    d += `M${x.toFixed(1)},${B}l4,0q4,-8 8,0l6,0l2,5l3,-35l3,39l${st.toFixed(1)},-9q${(t / 2).toFixed(1)},-14 ${t.toFixed(1)},0l${filler.toFixed(1)},0`;
    x += step;
  }
  return d;
}

// All three states are sinus (P wave present, 1:1 with QRS) — that's what a
// resting-HR feed can honestly support. Do not invent arrhythmias the data
// cannot evidence: a resting heart rate tells you rate, not morphology.
function rhythmFor(bpm: number) {
  if (bpm < 60) return { label: "Sinus bradycardia", colorClass: "text-status-low" };
  if (bpm > 100) return { label: "Sinus tachycardia", colorClass: "text-status-high" };
  return { label: "Normal sinus rhythm", colorClass: "text-status-good" };
}

export const HeartRateEKG: React.FC<{ bpm: number }> = ({ bpm }) => {
  const path = useMemo(() => ekgPath(bpm), [bpm]);
  const rhythm = useMemo(() => rhythmFor(bpm), [bpm]);

  return (
    <div>
      <div className="overflow-hidden" style={{ height: 28 }}>
        <svg viewBox="0 0 300 70" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <g className="animate-ekg-scroll">
            <path
              d={path}
              fill="none"
              className={rhythm.colorClass}
              stroke="currentColor"
              strokeWidth={3.2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
      </div>
      <p className={`text-[10px] font-semibold mt-0.5 ${rhythm.colorClass}`}>{rhythm.label}</p>
    </div>
  );
};
