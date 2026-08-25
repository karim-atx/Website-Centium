import React from "react";

export interface SleepStages {
  remMin: number;
  deepMin: number;
  lightMin: number;
  awakeMin: number;
}

const stageColor = { rem: "#9C4F7C", deep: "#7D6BB5", light: "#4C8FD1", awake: "#6F9993" };

// A single night's sleep as one stacked horizontal bar — all stages in one
// track, Apple Health-inspired, not copied.
export const StackedSleepBar: React.FC<{ stages: SleepStages; label?: string }> = ({ stages, label }) => {
  const total = stages.remMin + stages.deepMin + stages.lightMin + stages.awakeMin || 1;
  const segments: { key: keyof typeof stageColor; min: number }[] = [
    { key: "awake", min: stages.awakeMin },
    { key: "rem", min: stages.remMin },
    { key: "light", min: stages.lightMin },
    { key: "deep", min: stages.deepMin },
  ];
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-cream-soft">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{ width: `${(s.min / total) * 100}%`, background: stageColor[s.key] }}
          />
        ))}
      </div>
      {label && <p className="text-[9px] text-charcoal-faint mt-1 text-center">{label}</p>}
    </div>
  );
};

// Compact vertical-bar variant for a row of periods (a week's worth of
// nights, or a month's worth of weeks) — each bar is itself stacked.
// V7 (QA 7.0): tappable — selecting a column is how you "specifically
// select a set sleep cycle to compare" against the rest.
export const StackedSleepColumns: React.FC<{
  items: { stages: SleepStages; label: string }[];
  height?: number;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
}> = ({ items, height = 90, selectedIndex = null, onSelect }) => {
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {items.map((it, i) => {
        const total = it.stages.remMin + it.stages.deepMin + it.stages.lightMin + it.stages.awakeMin || 1;
        const segments: { key: keyof typeof stageColor; min: number }[] = [
          { key: "awake", min: it.stages.awakeMin },
          { key: "rem", min: it.stages.remMin },
          { key: "light", min: it.stages.lightMin },
          { key: "deep", min: it.stages.deepMin },
        ];
        const selected = selectedIndex === i;
        return (
          <button
            key={i}
            onClick={() => onSelect?.(i)}
            className="tap flex-1 flex flex-col items-center gap-1 h-full justify-end"
          >
            <div
              className="w-full flex-1 rounded-md overflow-hidden flex flex-col-reverse"
              style={{ opacity: selectedIndex === null || selected ? 1 : 0.35 }}
            >
              {segments.map((s) => (
                <div key={s.key} style={{ height: `${(s.min / total) * 100}%`, background: stageColor[s.key] }} />
              ))}
            </div>
            <span
              className={`text-[9px] whitespace-nowrap ${selected ? "font-bold text-sohati-dark" : "text-charcoal-faint"}`}
            >
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const sleepStageLegend = [
  { key: "awake", label: "Awake", color: stageColor.awake },
  { key: "rem", label: "REM", color: stageColor.rem },
  { key: "light", label: "Light", color: stageColor.light },
  { key: "deep", label: "Deep", color: stageColor.deep },
];
