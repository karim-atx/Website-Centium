import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { WidgetShell } from "./WidgetShell";
import { HomeWidget } from "./HomeWidget";
import type { WidgetType, WidgetConfig, WidgetSize } from "../../types";
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

// Handoff §7b — a drag in progress. Kept out of `widgets`/`visibleWidgets`
// (the persisted order) until drop; only what's needed to render the
// live reflow + placeholder lives in React state. Continuous
// pointer-following of the ghost tile is done imperatively (direct style
// mutation on `ghostRef`, see below) rather than through state, both for
// perf and so a mid-drag re-render (e.g. the drop slot changing) can't
// stomp the ghost's own animated position.
interface DragRenderState {
  id: string;
  size: WidgetSize;
  width: number;
  height: number;
  dropIndex: number;
}

interface DragInfo {
  id: string;
  fromIndex: number;
  offsetX: number;
  offsetY: number;
  dropIndex: number;
}

export const WidgetBoard: React.FC<{ onWaterClick?: () => void; onGymPassesClick?: () => void }> = ({
  onWaterClick,
  onGymPassesClick,
}) => {
  const { widgets, removeWidget, reorderWidgets, resizeWidget, addWidget, recoverySensitive } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragRender, setDragRender] = useState<DragRenderState | null>(null);

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

  // ---- Handoff §7b: pointer-events touch drag (native HTML5 draggable
  // never fires on touch, so it's replaced entirely). Only the grip handle
  // starts a drag — see WidgetShell.tsx's onGripPointerDown wiring. Ported
  // from the handoff's own reference script (bindDrag() in
  // design/CentiumHomeV2.dc.html): lift + follow the pointer, live reflow
  // via a dashed placeholder, edge auto-scroll, settle-into-place on drop,
  // revert on a release outside the board.
  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragInfoRef = useRef<DragInfo | null>(null);
  const ghostInitialRef = useRef<{ left: number; top: number } | null>(null);
  const visibleWidgetsRef = useRef(visibleWidgets);
  const pointerYRef = useRef(0);
  const autoScrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    visibleWidgetsRef.current = visibleWidgets;
  });

  const setTileRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) tileRefs.current.set(id, el);
    else tileRefs.current.delete(id);
  };

  const stopAutoScroll = () => {
    if (autoScrollRafRef.current != null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  };

  const startAutoScroll = () => {
    const step = () => {
      if (!dragInfoRef.current) return;
      const y = pointerYRef.current;
      const edge = 60;
      if (y < edge) window.scrollBy(0, -12);
      else if (y > window.innerHeight - edge) window.scrollBy(0, 12);
      autoScrollRafRef.current = requestAnimationFrame(step);
    };
    autoScrollRafRef.current = requestAnimationFrame(step);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const info = dragInfoRef.current;
    if (!info) return;
    pointerYRef.current = e.clientY;
    const g = ghostRef.current;
    if (g) {
      g.style.left = `${e.clientX - info.offsetX}px`;
      g.style.top = `${e.clientY - info.offsetY}px`;
    }
    // Live reflow: the placeholder jumps beside whichever tile the pointer
    // is currently over, on the side it's over (mirrors the handoff script
    // exactly — hit-test against the *other* tiles' live rects).
    const others = visibleWidgetsRef.current.filter((w) => w.id !== info.id);
    for (let idx = 0; idx < others.length; idx++) {
      const el = tileRefs.current.get(others[idx].id);
      if (!el) continue;
      const b = el.getBoundingClientRect();
      if (e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom) {
        const after = e.clientX > b.left + b.width / 2;
        const newDrop = after ? idx + 1 : idx;
        if (newDrop !== info.dropIndex) {
          info.dropIndex = newDrop;
          setDragRender((prev) => (prev ? { ...prev, dropIndex: newDrop } : prev));
        }
        break;
      }
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      stopAutoScroll();
      const info = dragInfoRef.current;
      if (!info) {
        setDragRender(null);
        return;
      }

      // A release outside the widget board entirely is a cancelled drag —
      // the tile returns to its original slot, not wherever it landed.
      const boardEl = boardRef.current;
      let inBoard = false;
      if (boardEl) {
        const b = boardEl.getBoundingClientRect();
        inBoard = e.clientX >= b.left - 40 && e.clientX <= b.right + 40 && e.clientY >= b.top - 40 && e.clientY <= b.bottom + 40;
      }

      const finalDropIndex = inBoard ? info.dropIndex : info.fromIndex;
      if (inBoard && finalDropIndex !== info.fromIndex) {
        // Reuses the same ordering mechanism the board already had
        // (AppContext's reorderWidgets, backing the persisted widget list)
        // rather than a parallel one.
        reorderWidgets(info.fromIndex, finalDropIndex);
      }
      info.dropIndex = finalDropIndex;
      setDragRender((prev) => (prev ? { ...prev, dropIndex: finalDropIndex } : prev));

      // Settle the ghost onto the placeholder's (or, if cancelled, the
      // original slot's) live rect over ~160ms, then hand back to the real
      // grid, which is by then already in its final order/position.
      requestAnimationFrame(() => {
        const ph = placeholderRef.current;
        const g = ghostRef.current;
        if (ph && g) {
          const r = ph.getBoundingClientRect();
          g.style.transition = "left 160ms cubic-bezier(0.22, 1, 0.36, 1), top 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms ease";
          g.style.left = `${r.left}px`;
          g.style.top = `${r.top}px`;
          g.style.transform = "scale(1)";
        }
        window.setTimeout(() => {
          dragInfoRef.current = null;
          setDragRender(null);
        }, 170);
      });
    },
    [handlePointerMove, reorderWidgets]
  );

  const handleGripPointerDown = useCallback(
    (e: React.PointerEvent, widget: WidgetConfig) => {
      e.preventDefault();
      const tile = tileRefs.current.get(widget.id);
      if (!tile) return;
      const fromIndex = visibleWidgetsRef.current.findIndex((w) => w.id === widget.id);
      if (fromIndex === -1) return;
      const r = tile.getBoundingClientRect();
      dragInfoRef.current = {
        id: widget.id,
        fromIndex,
        offsetX: e.clientX - r.left,
        offsetY: e.clientY - r.top,
        dropIndex: fromIndex,
      };
      ghostInitialRef.current = { left: r.left, top: r.top };
      pointerYRef.current = e.clientY;
      setDragRender({ id: widget.id, size: widget.size, width: r.width, height: r.height, dropIndex: fromIndex });
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
      window.addEventListener("pointercancel", handlePointerUp, { once: true });
      startAutoScroll();
    },
    [handlePointerMove, handlePointerUp]
  );

  // Ghost's initial position + "lifted" treatment, set imperatively once
  // per drag so later re-renders (the placeholder moving) never reset the
  // pointer-following position React doesn't otherwise manage.
  useEffect(() => {
    if (!dragRender || !ghostRef.current || !ghostInitialRef.current) return;
    const g = ghostRef.current;
    g.style.transition = "none";
    g.style.left = `${ghostInitialRef.current.left}px`;
    g.style.top = `${ghostInitialRef.current.top}px`;
    g.style.transform = "scale(1.03)";
    // Reuses the shell's existing lift shadow (Tailwind `shadow-lift`)
    // rather than inventing a new one.
    g.style.boxShadow = "0 16px 40px rgb(0 0 0 / 0.20)";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragRender?.id]);

  useEffect(
    () => () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      stopAutoScroll();
    },
    [handlePointerMove, handlePointerUp]
  );

  const draggedWidget = dragRender ? visibleWidgets.find((w) => w.id === dragRender.id) ?? null : null;
  const renderList: (WidgetConfig | "placeholder")[] = dragRender
    ? (() => {
        const others = visibleWidgets.filter((w) => w.id !== dragRender.id);
        const list: (WidgetConfig | "placeholder")[] = [...others];
        list.splice(Math.min(dragRender.dropIndex, list.length), 0, "placeholder");
        return list;
      })()
    : visibleWidgets;

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
      <div ref={boardRef} className="flex flex-wrap gap-[7px]">
        {renderList.map((item) =>
          item === "placeholder" ? (
            <div
              key="__drag-placeholder__"
              ref={placeholderRef}
              style={{
                width: dragRender!.width,
                height: dragRender!.height,
                flex: "none",
                borderRadius: 15,
                border: "2px dashed rgba(143,104,246,0.45)",
                background: "rgba(143,104,246,0.06)",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <WidgetShell
              key={item.id}
              ref={setTileRef(item.id)}
              size={item.size}
              editMode={editMode}
              onRemove={() => removeWidget(item.id)}
              onResize={() => resizeWidget(item.id, item.size === "small" ? "large" : "small")}
              onGripPointerDown={(e) => handleGripPointerDown(e, item)}
            >
              <HomeWidget
                widget={item}
                editMode={editMode}
                onWaterClick={item.type === "water" ? onWaterClick : undefined}
                onGymPassesClick={item.type === "gymPasses" ? onGymPassesClick : undefined}
              />
            </WidgetShell>
          )
        )}

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

      {/* The dragged tile itself: detached to fixed positioning and
          followed to the pointer imperatively (see handlePointerMove /
          the ghost-init effect above); everything else in the grid reflows
          around the placeholder in normal flow. */}
      {dragRender && draggedWidget && (
        <div
          ref={ghostRef}
          style={{
            position: "fixed",
            width: dragRender.width,
            height: dragRender.height,
            zIndex: 45,
            pointerEvents: "none",
            borderRadius: 15,
          }}
        >
          <WidgetShell size={draggedWidget.size} editMode={editMode} onRemove={() => {}} onResize={() => {}}>
            <HomeWidget widget={draggedWidget} editMode={editMode} />
          </WidgetShell>
        </div>
      )}

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
