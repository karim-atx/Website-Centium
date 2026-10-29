import React, { useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import type { WorkoutTemplate } from "../../../types";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";

/**
 * Round D · DT1 D-S1 "Add a workout to {day}": the professional's own workout
 * templates (set_programme_day accepts only those, ATX09), searchable; a tap
 * adds it to the end of that day. New workouts are built in Library ›
 * Templates as before.
 */
export const AddWorkoutSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  dayLabel: string;
  templates: WorkoutTemplate[];
  onPick: (templateId: string) => void;
}> = ({ open, onClose, dayLabel, templates, onPick }) => {
  const [query, setQuery] = useState("");
  // The search starts empty each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery("");
  }
  const q = query.trim().toLowerCase();
  const list = templates.filter((t) => !q || t.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <BottomSheet open={open} onClose={onClose} title={`Add a workout to ${dayLabel}`}>
      <div className="space-y-3 animate-fade-slide-up">
        <label className="flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", gap: 8 }}>
          <Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your workouts"
            aria-label="Search your workouts"
            className="flex-1 min-w-0 bg-transparent focus:outline-none placeholder:text-charcoal-faint"
            style={{ fontSize: textPx(14), color: INK.ch }}
          />
        </label>
        {templates.length === 0 ? (
          <p className="text-center py-6" style={{ fontSize: textPx(13), color: INK.chF }}>
            No workouts yet. Build one under Templates first.
          </p>
        ) : list.length === 0 ? (
          <p className="text-center py-6" style={{ fontSize: textPx(13), color: INK.chF }}>
            No matches.
          </p>
        ) : (
          <div>
            {list.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick(t.id)}
                className="tap w-full flex items-center text-left"
                style={{ gap: 12, padding: "11px 0", minHeight: 44, borderBottom: i < list.length - 1 ? `1px solid ${INK.b06}` : "none" }}
              >
                <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 11, background: INK.prPale }}>
                  <ClipboardList size={16} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                    {t.name}
                  </span>
                  <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>
                    {[`${t.exercises.length} ${t.exercises.length === 1 ? "exercise" : "exercises"}`, t.durationMin ? `${t.durationMin} min` : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
