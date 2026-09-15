import React from "react";
import clsx from "clsx";
import { X, Maximize2, Minimize2, GripVertical } from "lucide-react";
import type { WidgetSize } from "../../types";

interface WidgetShellProps {
  size: WidgetSize;
  editMode: boolean;
  onRemove: () => void;
  onResize: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  children: React.ReactNode;
}

// V4: reordering is drag-only now — the up/down arrow buttons were removed
// per QA ("done via dragging not via using the up and down arrows").
// Iteration 6.2 "Team" canonical widget library: every widget tile is a
// fixed 114×114 (small) or 358×150 (large) with its own flat tinted ground,
// radius and padding baked into the widget's own root element (see
// HomeWidget.tsx) — the shell no longer supplies a uniform white card
// around it, only sizing and the edit-mode chrome.
export const WidgetShell: React.FC<WidgetShellProps> = ({
  size,
  editMode,
  onRemove,
  onResize,
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
        "relative shrink-0 rounded-[15px] transition-transform",
        size === "large" ? "w-full max-w-[358px]" : "w-[114px]",
        editMode && "cursor-grab active:cursor-grabbing ring-2 ring-team-nav-accent/30"
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
              className="tap w-7 h-7 rounded-full bg-teal text-white flex items-center justify-center shadow-lift"
              aria-label="Remove widget"
            >
              <X size={13} strokeWidth={3} />
            </button>
          </div>
          <div className="absolute -top-2 -left-2 text-charcoal-faint/60 bg-cream-card rounded-full p-1 shadow-soft z-10">
            <GripVertical size={14} />
          </div>
        </>
      )}
      {children}
    </div>
  );
};
