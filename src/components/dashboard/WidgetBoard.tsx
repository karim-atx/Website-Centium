import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { WidgetShell } from "./WidgetShell";
import { HomeWidget } from "./HomeWidget";
import type { WidgetType } from "../../types";
import { Pencil, Check, Plus, Footprints, Scale, Droplet, Moon, Utensils, Dumbbell, CheckSquare, BookOpen, Sparkles, KeyRound, HeartPulse } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";

// V4: Body Fat removed as a Home widget option per QA (repeated from the
// V1 pass — it stays as a Health-page metric, just not offered here).
const allWidgetTypes: { type: WidgetType; label: string; icon: LucideIcon }[] = [
  { type: "steps", label: "Steps", icon: Footprints },
  { type: "weight", label: "Weight", icon: Scale },
  { type: "water", label: "Water", icon: Droplet },
  { type: "sleep", label: "Sleep", icon: Moon },
  { type: "nutrition", label: "Nutrition", icon: Utensils },
  { type: "workout", label: "Workout", icon: Dumbbell },
  // V10 (QA 10.0): "Add a heart rate widget that syncs with the one found
  // in health metrics."
  { type: "heartRate", label: "Heart Rate", icon: HeartPulse },
  { type: "habits", label: "Habits", icon: CheckSquare },
  { type: "journal", label: "Journal", icon: BookOpen },
  { type: "meditation", label: "Meditation", icon: Sparkles },
  { type: "gymPasses", label: "Gym Passes", icon: KeyRound },
];

export const WidgetBoard: React.FC<{ onWaterClick?: () => void; onGymPassesClick?: () => void }> = ({
  onWaterClick,
  onGymPassesClick,
}) => {
  const { widgets, removeWidget, reorderWidgets, resizeWidget, addWidget, recoverySensitive } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Defensive: self-heals any old persisted board that still carries the
  // now-removed "bodyFat" widget type.
  // QA 12.0 recovery-sensitive experience: "Hide weight, BMI, and body
  // measurement features." The widget itself is only hidden from view (not
  // removed from the underlying board), so turning the mode back off
  // restores it exactly where it was, per "without losing any data."
  const visibleWidgets = widgets.filter(
    (w) => (w.type as string) !== "bodyFat" && !(recoverySensitive && w.type === "weight")
  );
  const availableToAdd = allWidgetTypes.filter(
    (t) => !widgets.some((w) => w.type === t.type) && !(recoverySensitive && t.type === "weight")
  );

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    reorderWidgets(dragIndex, targetIndex);
    setDragIndex(null);
  };

  return (
    <div>
      {/* Iteration 6 "Team" §1.5: context-only, token restyle — same
          mechanic, recoloured to the fixed nav-accent lavender (not the
          theme-reactive `primary`) and the literal "Today" copy. */}
      <div className="flex items-center justify-between mb-[9px]">
        <p className="text-[9px] font-bold tracking-[.2em] uppercase text-primary-deep-text/60">Today</p>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="tap flex items-center gap-[5px] text-[10.5px] font-bold text-team-nav-accent"
        >
          {editMode ? (
            <>
              <Check size={11} /> Done
            </>
          ) : (
            <>
              <Pencil size={11} /> Edit
            </>
          )}
        </button>
      </div>

      {/* Iteration 6.2: small tiles are a fixed 114px and pack three to a
          358px-wide row; a large tile takes the full row. flex-wrap (not a
          2-col grid) is what lets an arbitrary user-chosen mix of
          small/large widgets — this board is freely reorderable and
          resizable — flow correctly instead of assuming pairs. */}
      <div className="flex flex-wrap gap-[7px]">
        {visibleWidgets.map((w, i) => (
          <WidgetShell
            key={w.id}
            size={w.size}
            editMode={editMode}
            onRemove={() => removeWidget(w.id)}
            onResize={() => resizeWidget(w.id, w.size === "small" ? "large" : "small")}
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
          >
            <HomeWidget
              widget={w}
              onWaterClick={w.type === "water" ? onWaterClick : undefined}
              onGymPassesClick={w.type === "gymPasses" ? onGymPassesClick : undefined}
            />
          </WidgetShell>
        ))}

        {editMode && (
          <button
            onClick={() => setPickerOpen(true)}
            disabled={availableToAdd.length === 0}
            className="tap w-[114px] h-[114px] shrink-0 rounded-[15px] border-2 border-dashed border-charcoal/15 flex flex-col items-center justify-center gap-1.5 text-charcoal-faint disabled:opacity-40"
          >
            <Plus size={20} />
            <span className="text-xs font-semibold">Add widget</span>
          </button>
        )}
      </div>

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add a widget">
        <div className="space-y-2">
          {availableToAdd.map((t) => (
            <button
              key={t.type}
              onClick={() => {
                addWidget(t.type, "small");
                setPickerOpen(false);
              }}
              className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
            >
              <t.icon size={18} className="text-primary" />
              <span className="text-sm font-semibold text-charcoal">{t.label}</span>
            </button>
          ))}
          {availableToAdd.length === 0 && (
            <p className="text-center text-sm text-charcoal-faint py-6">
              All available widgets are already on your board.
            </p>
          )}
        </div>
      </BottomSheet>
    </div>
  );
};
