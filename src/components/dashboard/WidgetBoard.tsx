import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { WidgetShell } from "./WidgetShell";
import { HomeWidget } from "./HomeWidget";
import type { WidgetType } from "../../types";
import { Pencil, Check, Plus } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";

const allWidgetTypes: { type: WidgetType; label: string; emoji: string }[] = [
  { type: "steps", label: "Steps", emoji: "👣" },
  { type: "weight", label: "Weight", emoji: "⚖️" },
  { type: "water", label: "Water", emoji: "💧" },
  { type: "sleep", label: "Sleep", emoji: "😴" },
  { type: "nutrition", label: "Nutrition", emoji: "🍽️" },
  { type: "workout", label: "Workout", emoji: "🏋️" },
  { type: "bodyFat", label: "Body Fat", emoji: "📏" },
  { type: "habits", label: "Habits", emoji: "✅" },
  { type: "journal", label: "Journal", emoji: "📓" },
  { type: "meditation", label: "Meditation", emoji: "🧘" },
];

export const WidgetBoard: React.FC = () => {
  const { widgets, removeWidget, reorderWidgets, resizeWidget, addWidget } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const visibleWidgets = widgets;
  const availableToAdd = allWidgetTypes.filter(
    (t) => !widgets.some((w) => w.type === t.type)
  );

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    reorderWidgets(dragIndex, targetIndex);
    setDragIndex(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
          Your health today
        </p>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="tap flex items-center gap-1.5 text-xs font-semibold text-sohati"
        >
          {editMode ? (
            <>
              <Check size={13} /> Done
            </>
          ) : (
            <>
              <Pencil size={12} /> Edit widgets
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visibleWidgets.map((w, i) => (
          <WidgetShell
            key={w.id}
            size={w.size}
            editMode={editMode}
            canMoveUp={i > 0}
            canMoveDown={i < visibleWidgets.length - 1}
            onRemove={() => removeWidget(w.id)}
            onResize={() => resizeWidget(w.id, w.size === "small" ? "large" : "small")}
            onMoveUp={() => reorderWidgets(i, i - 1)}
            onMoveDown={() => reorderWidgets(i, i + 1)}
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
          >
            <HomeWidget widget={w} />
          </WidgetShell>
        ))}

        {editMode && (
          <button
            onClick={() => setPickerOpen(true)}
            disabled={availableToAdd.length === 0}
            className="tap col-span-1 rounded-3xl border-2 border-dashed border-charcoal/15 flex flex-col items-center justify-center gap-1.5 py-8 text-charcoal-faint disabled:opacity-40"
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
              <span className="text-xl">{t.emoji}</span>
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
