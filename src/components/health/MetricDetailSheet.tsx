import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Sparkline } from "./Sparkline";
import { sleepDetail } from "../../data/mockHealthData";
import type { HealthMetric } from "../../types";

export const MetricDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  metric: HealthMetric | null;
  current: number;
}> = ({ open, onClose, metric, current }) => {
  if (!metric) return null;

  const isSleep = metric.type === "sleep";

  return (
    <BottomSheet open={open} onClose={onClose} title={metric.label}>
      <div className="animate-fade-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-4xl font-bold text-charcoal leading-none">
              {metric.type === "sleep"
                ? `${Math.floor(current)}h ${Math.round((current % 1) * 60)}m`
                : current.toLocaleString()}
              {metric.type !== "sleep" && (
                <span className="text-base font-normal text-charcoal-faint ml-1">{metric.unit}</span>
              )}
            </p>
            <p className="text-xs text-charcoal-faint mt-1">
              {metric.trend >= 0 ? "↑" : "↓"} {Math.abs(metric.trend)} {metric.unit} vs last week
            </p>
          </div>
          <Sparkline values={metric.history.map((h) => h.value)} color="#1B6B52" width={130} height={48} />
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-6">
          {metric.history.map((h, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] text-charcoal-faint mb-1">
                {new Date(`${h.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "narrow" })}
              </p>
              <p className="text-xs font-semibold text-charcoal">{Math.round(h.value)}</p>
            </div>
          ))}
        </div>

        {isSleep && (
          <div className="animate-fade-slide-up">
            <div className="flex items-center justify-between bg-sohati-pale rounded-2xl px-4 py-3 mb-4">
              <span className="text-sm font-semibold text-sohati-dark">Sleep score</span>
              <span className="text-2xl font-bold text-sohati-dark">{sleepDetail.score}</span>
            </div>
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              Sleep stages
            </p>
            <div className="space-y-2 mb-4">
              {[
                { label: "REM", min: sleepDetail.remMin, color: "#9C4F7C" },
                { label: "Deep", min: sleepDetail.deepMin, color: "#1B6B52" },
                { label: "Light", min: sleepDetail.lightMin, color: "#4C8FD1" },
                { label: "Awake", min: sleepDetail.awakeMin, color: "#E97452" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-charcoal-soft w-12">{s.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-cream-soft overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(s.min / (sleepDetail.remMin + sleepDetail.deepMin + sleepDetail.lightMin + sleepDetail.awakeMin)) * 100}%`,
                        background: s.color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-charcoal-faint w-14 text-right">
                    {Math.floor(s.min / 60)}h {s.min % 60}m
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-charcoal-soft leading-relaxed">{sleepDetail.summary}</p>
            <p className="text-[11px] text-charcoal-faint mt-3">
              Sleep stage data is sourced from Apple/Android Health when connected — mocked here.
            </p>
          </div>
        )}

        {!isSleep && (
          <p className="text-xs text-charcoal-faint">
            Last 7 days shown above. Tap the pencil on the card to log a new reading.
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
