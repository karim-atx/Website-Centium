import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { BiomarkerLineChart } from "./BiomarkerLineChart";
import type { BloodMarker } from "../../types";

// V8 (QA 8.0): "the graph changes color between blue, red or green if
// normal, decreasing or increasing respectively" — a literal 3-way mapping
// on the trend between the two most recent readings, not a "good vs bad
// for this marker" judgement.
function trendColor(history: BloodMarker["history"]): { color: string; label: string } {
  const last = history[history.length - 1]?.value ?? 0;
  const prev = history[history.length - 2]?.value ?? last;
  const delta = last - prev;
  if (delta === 0) return { color: "#4C8FD1", label: "Stable" };
  if (delta < 0) return { color: "#C0392B", label: "Decreasing" };
  return { color: "#3F9165", label: "Increasing" };
}

export const BiomarkerDetailSheet: React.FC<{ open: boolean; onClose: () => void; marker: BloodMarker | null }> = ({
  open,
  onClose,
  marker,
}) => {
  if (!marker) return null;
  const trend = trendColor(marker.history);

  return (
    <BottomSheet open={open} onClose={onClose} title={marker.name}>
      <div className="animate-fade-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-charcoal leading-none">
              {marker.value} <span className="text-sm font-normal text-charcoal-faint">{marker.unit}</span>
            </p>
            <p className="text-xs text-charcoal-faint mt-1">Range: {marker.range} {marker.unit}</p>
          </div>
          <span className="text-xs font-bold" style={{ color: trend.color }}>
            {trend.label}
          </span>
        </div>

        <div className="flex justify-center mb-2">
          <BiomarkerLineChart history={marker.history} unit={marker.unit} color={trend.color} width={280} height={140} />
        </div>

        <p className="text-[11px] text-charcoal-faint text-center mt-3">
          Blue = stable, red = decreasing, green = increasing since the previous reading.
        </p>
      </div>
    </BottomSheet>
  );
};
