import React from "react";
import clsx from "clsx";
import { Minus, Maximize2, Minimize2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import type { WidgetSize } from "../../types";

interface WidgetShellProps {
  size: WidgetSize;
  editMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemove: () => void;
  onResize: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  children: React.ReactNode;
}

export const WidgetShell: React.FC<WidgetShellProps> = ({
  size,
  editMode,
  canMoveUp,
  canMoveDown,
  onRemove,
  onResize,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  children,
}) => {
  return (
    <div
      draggable={editMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={clsx(
        "relative bg-cream-card rounded-3xl shadow-soft border border-charcoal/[0.04] p-4 transition-transform",
        size === "large" ? "col-span-2" : "col-span-1",
        editMode && "cursor-grab active:cursor-grabbing ring-2 ring-sohati/30"
      )}
    >
      {editMode && (
        <>
          <div className="absolute -top-2 -right-2 flex gap-1 z-10">
            <button
              onClick={onResize}
              className="tap w-7 h-7 rounded-full bg-charcoal text-cream flex items-center justify-center shadow-lift"
              aria-label="Resize widget"
            >
              {size === "small" ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
            </button>
            <button
              onClick={onRemove}
              className="tap w-7 h-7 rounded-full bg-ember text-white flex items-center justify-center shadow-lift"
              aria-label="Remove widget"
            >
              <Minus size={13} strokeWidth={3} />
            </button>
          </div>
          <div className="absolute -top-2 -left-2 flex flex-col gap-1 z-10">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="tap w-6 h-6 rounded-full bg-charcoal/80 text-cream flex items-center justify-center shadow-lift disabled:opacity-30"
              aria-label="Move widget earlier"
            >
              <ChevronUp size={12} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="tap w-6 h-6 rounded-full bg-charcoal/80 text-cream flex items-center justify-center shadow-lift disabled:opacity-30"
              aria-label="Move widget later"
            >
              <ChevronDown size={12} />
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-1 text-charcoal-faint/40">
            <GripVertical size={14} />
          </div>
        </>
      )}
      {children}
    </div>
  );
};
