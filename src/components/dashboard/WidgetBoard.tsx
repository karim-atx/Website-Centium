import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { WidgetShell } from "./WidgetShell";
import { HomeWidget } from "./HomeWidget";
import type { WidgetType, WidgetConfig, WidgetSize } from "../../types";
import { Pencil, Check, Plus, Footprints, Droplet, Moon, Utensils, Dumbbell, CircleCheck, BookOpen, HeartPulse } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { createEditTapGuard, dropSlot, storedMove, widgetColumns, widgetSpans } from "../../utils/widgetGrid";
import { CycleCalendarIcon, WeightScaleIcon } from "../icons/PartBIcons";
import { LotusGlyph } from "./LotusGlyph";
import { useIsDark } from "../../hooks/useIsDark";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { textPx, linePx } from "../../theme/textSize";
import { useWidgetConfigSync } from "./useWidgetConfigSync";
import { t, tk, tx } from "../../i18n/core";

// HO1.1: 2 small widgets per row below a 400px-wide viewport, 3 from 400.
function useWidgetColumns() {
  const [columns, setColumns] = useState(() => widgetColumns(window.innerWidth));
  useEffect(() => {
    const onResize = () => setColumns(widgetColumns(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return columns;
}

type PickerIcon = React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
const Lotus: PickerIcon = ({ size = 12, style }) => <LotusGlyph size={size} stroke={style?.color as string | undefined} />;

/**
 * OURS-home-shell "Add widget picker": one row per widget type in the
 * widget's own tint, its header tile and icon (the same as the widget), the
 * name 13.5/18 600 and "Small or large" 11/15 400, and S / L chips.
 * V4: Body Fat is not offered (a Health-page metric only). Tints and inks:
 * [light, dark] from each HO1 table; Water and Food keep their repo tints.
 */
const allWidgetTypes: { type: WidgetType; label: string; icon: PickerIcon; tint: [string, string]; ink: [string, string] }[] = [
  { type: "steps", label: tk("Steps"), icon: Footprints, tint: ["#EAF1E4", "rgb(var(--metric-steps-tint))"], ink: ["#55733F", "rgb(var(--metric-steps-main))"] },
  { type: "weight", label: tk("Weight"), icon: WeightScaleIcon, tint: ["rgb(var(--th-f0edf9))", "rgb(var(--metric-weight-tint))"], ink: ["rgb(var(--thi-5f5093))", "rgb(var(--metric-weight-main))"] },
  { type: "water", label: tk("Water"), icon: Droplet, tint: ["rgba(143,192,232,.17)", "rgba(143,192,232,.17)"], ink: ["#3F6F98", "#9CC8EE"] },
  { type: "sleep", label: tk("Sleep"), icon: Moon, tint: ["#E8F2F0", "rgb(var(--metric-sleep-tint))"], ink: ["#3E716D", "rgb(var(--metric-sleep-main))"] },
  { type: "nutrition", label: tk("Food"), icon: Utensils, tint: ["rgb(var(--th-aea1dc) / .16)", "rgb(var(--th-aea1dc) / .16)"], ink: ["rgb(var(--c-primary-deep-text))", "rgb(var(--c-primary-deep-text))"] },
  { type: "workout", label: tk("Workout"), icon: Dumbbell, tint: ["#EDEFF3", "rgb(var(--c-widget-workout-tint))"], ink: ["#5F6878", "#B8C0CE"] },
  // V10 (QA 10.0): "Add a heart rate widget that syncs with the one found
  // in health metrics."
  { type: "heartRate", label: tk("Heart rate"), icon: HeartPulse, tint: ["#F7E2E2", "rgb(var(--metric-heart-rate-tint))"], ink: ["#962F2F", "rgb(var(--metric-heart-rate-main))"] },
  { type: "habits", label: tk("Habits"), icon: CircleCheck, tint: ["rgb(var(--th-f0edf9))", "rgb(var(--th-303141))"], ink: ["rgb(var(--thi-5f5093))", "rgb(var(--thi-c3b3fb))"] },
  { type: "journal", label: tk("Journal"), icon: BookOpen, tint: ["#F8F0DC", "#3A342C"], ink: ["#8A6418", "#DCBB7F"] },
  { type: "meditation", label: tk("Meditation"), icon: Lotus, tint: ["#E3F0EC", "#293339"], ink: ["#3F7A6B", "#93C1B9"] },
  // HO1.W11: only offered when the cycle section is offered and the tracker is on.
  { type: "cycle", label: tk("Cycle"), icon: CycleCalendarIcon, tint: ["#FBEDF2", "rgb(var(--metric-cycle-tint))"], ink: ["#B8607F", "rgb(var(--metric-cycle-main))"] },
];

/** One picker row (OURS-home-shell picker #2-#3). The S / L chips choose the size; the row adds it. */
const PickerRow: React.FC<{ item: (typeof allWidgetTypes)[number]; dark: boolean; onAdd: (size: WidgetSize) => void }> = ({ item, dark, onAdd }) => {
  const [size, setSize] = useState<WidgetSize>("small");
  const ink = item.ink[dark ? 1 : 0];
  return (
    <div className="flex items-center" style={{ height: 56, padding: "0 14px", gap: 10, borderRadius: 15, background: item.tint[dark ? 1 : 0] }}>
      <button type="button" onClick={() => onAdd(size)} className="tap flex-1 min-w-0 flex items-center text-start self-stretch" style={{ gap: 10 }}>
        <span className="shrink-0 grid place-items-center" style={{ width: 20, height: 20, borderRadius: 6, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)" }} aria-hidden>
          <item.icon size={12} strokeWidth={1.5} style={{ color: ink }} />
        </span>
        <span className="min-w-0">
          <span className="block truncate" style={{ fontSize: textPx(13.5), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
            {t(item.label)}
          </span>
          <span className="block truncate" style={{ fontSize: textPx(11), lineHeight: linePx(15), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" }}>
            {t("Small or large")}
          </span>
        </span>
      </button>
      <span className="flex shrink-0" style={{ gap: 6 }} role="radiogroup" aria-label={t("{widget} widget size", { widget: t(item.label) })}>
        {(["small", "large"] as const).map((s) => {
          const on = size === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={s === "small" ? t("Small") : t("Large")}
              onClick={() => setSize(s)}
              className="tap grid place-items-center rounded-full"
              style={{
                width: 44,
                height: 28,
                fontSize: textPx(11),
                fontWeight: 700,
                color: on ? ink : "rgb(var(--c-charcoal-faint))",
                background: dark ? (on ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)") : on ? "#FFFFFF" : "rgba(255,255,255,0.6)",
              }}
            >
              {s === "small" ? tx("S", "widget size") : tx("L", "widget size")}
            </button>
          );
        })}
      </span>
    </div>
  );
};

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

export const WidgetBoard: React.FC<{ onWaterClick?: () => void }> = ({
  onWaterClick,
}) => {
  const { widgets, removeWidget, reorderWidgets, resizeWidget, addWidget, cycleOffered, cycleSettings } = useApp();
  // Recovery-sensitive mode, pending included (AJ R13): fails closed, so the
  // Weight widget never flashes while the setting loads.
  const hideNumbers = useHideNumbers();
  const dark = useIsDark();
  // V6-141 D22: the board lives in widget_configs (platform web).
  useWidgetConfigSync();
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragRender, setDragRender] = useState<DragRenderState | null>(null);
  const columns = useWidgetColumns();

  // Defensive: self-heals any old persisted board that still carries the
  // now-removed "bodyFat" widget type.
  // QA 12.0 recovery-sensitive experience: "Hide weight, BMI, and body
  // measurement features." The widget itself is only hidden from view (not
  // removed from the underlying board), so turning the mode back off
  // restores it exactly where it was, per "without losing any data."
  // MO11 / HO1.W11: the Cycle widget is hidden the same way while the cycle
  // section is not offered to this profile, and offered in the picker only
  // when the tracker is on.
  const visibleWidgets = widgets.filter(
    (w) => (w.type as string) !== "bodyFat" && !(hideNumbers && w.type === "weight") && !(w.type === "cycle" && !cycleOffered)
  );
  const availableToAdd = allWidgetTypes.filter(
    (t) =>
      !widgets.some((w) => w.type === t.type) &&
      !(hideNumbers && t.type === "weight") &&
      !(t.type === "cycle" && !(cycleOffered && cycleSettings?.trackerEnabled))
  );

  // OURS-home-widget-motion #11: a tile added after the board first drew
  // fades and scales in (250 ms); a removed one fades out (200 ms) before the
  // grid reflows.
  const seenIds = useRef<Set<string> | null>(null);
  const [entering, setEntering] = useState<Set<string>>(() => new Set());
  const [leaving, setLeaving] = useState<string | null>(null);
  useEffect(() => {
    if (seenIds.current === null) {
      seenIds.current = new Set(widgets.map((w) => w.id));
      return;
    }
    const added = widgets.filter((w) => !seenIds.current!.has(w.id)).map((w) => w.id);
    widgets.forEach((w) => seenIds.current!.add(w.id));
    if (added.length === 0) return;
    setEntering((prev) => new Set([...prev, ...added]));
    const t = window.setTimeout(() => setEntering((prev) => new Set([...prev].filter((id) => !added.includes(id)))), 260);
    return () => window.clearTimeout(t);
  }, [widgets]);

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
  const widgetsRef = useRef(widgets);
  // The last pointer position, so the drop slot can be recomputed while the
  // page scrolls under a still finger (no pointermove fires then).
  const pointerRef = useRef({ x: 0, y: 0 });
  const autoScrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    visibleWidgetsRef.current = visibleWidgets;
    widgetsRef.current = widgets;
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

  // Live reflow: the placeholder moves to where the tile would land if
  // released here (utils/widgetGrid dropSlot, against the other tiles' live
  // rects). Called on every pointer move AND whenever the page scrolls under
  // a still pointer -- the auto-scroll at the edges or a wheel -- since no
  // pointermove fires then and the slot would otherwise scroll away with the
  // page, a screen or more from the finger. Only over the board (with the
  // same 40px allowance a release uses): over the nav or the header above,
  // the slot stays where it is.
  const updateDrop = useCallback(() => {
    const info = dragInfoRef.current;
    const boardEl = boardRef.current;
    if (!info || !boardEl) return;
    const { x, y } = pointerRef.current;
    const bb = boardEl.getBoundingClientRect();
    if (x < bb.left - 40 || x > bb.right + 40 || y < bb.top - 40 || y > bb.bottom + 40) return;
    const others = visibleWidgetsRef.current.filter((w) => w.id !== info.id);
    const rects = others.map((w) => {
      const el = tileRefs.current.get(w.id);
      return el ? el.getBoundingClientRect() : { left: -1e6, top: -1e6, right: -1e6, bottom: -1e6 };
    });
    const ph = placeholderRef.current?.getBoundingClientRect() ?? null;
    const newDrop = dropSlot(x, y, rects, ph);
    if (newDrop !== null && newDrop !== info.dropIndex) {
      info.dropIndex = newDrop;
      setDragRender((prev) => (prev ? { ...prev, dropIndex: newDrop } : prev));
    }
  }, []);

  // The bottom edge that starts an auto-scroll sits above the floating nav,
  // not under it: the nav covers the last ~90px of the screen, and a finger
  // can't reach "60px from the bottom" without being over the nav.
  const bottomEdge = () => {
    const nav = document.querySelector("[data-bottom-nav]");
    const top = nav ? nav.getBoundingClientRect().top : window.innerHeight;
    return Math.min(window.innerHeight, top) - 60;
  };

  const startAutoScroll = () => {
    const step = () => {
      if (!dragInfoRef.current) return;
      const y = pointerRef.current.y;
      const before = window.scrollY;
      if (y < 60) window.scrollBy(0, -12);
      else if (y > bottomEdge()) window.scrollBy(0, 12);
      if (window.scrollY !== before) updateDrop();
      autoScrollRafRef.current = requestAnimationFrame(step);
    };
    autoScrollRafRef.current = requestAnimationFrame(step);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const info = dragInfoRef.current;
      if (!info) return;
      pointerRef.current = { x: e.clientX, y: e.clientY };
      const g = ghostRef.current;
      if (g) {
        g.style.left = `${e.clientX - info.offsetX}px`;
        g.style.top = `${e.clientY - info.offsetY}px`;
      }
      updateDrop();
    },
    [updateDrop]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", updateDrop);
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
        // The SAME ordering mechanism the board already had (AppContext's
        // reorderWidgets on the persisted list), but given positions in that
        // stored list: the board's indices count only the visible widgets,
        // and a hidden one before the drop used to land the tile one slot
        // away from where the placeholder showed it.
        const move = storedMove(
          widgetsRef.current.map((w) => w.id),
          visibleWidgetsRef.current.map((w) => w.id),
          info.id,
          finalDropIndex
        );
        if (move) reorderWidgets(move.from, move.to);
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
      });
      // The hand-back does NOT wait on the frame above: a page that goes to
      // the background mid-drag (switching apps) gets no animation frames,
      // and the lifted copy used to stay stuck over the board until it came
      // back. A timer still runs, so the drag always ends.
      window.setTimeout(() => {
        dragInfoRef.current = null;
        setDragRender(null);
      }, 190);
    },
    [handlePointerMove, reorderWidgets, updateDrop]
  );

  // A resize reflows the grid, so a quick second tap lands on whatever moved
  // under the finger: a tile body, a neighbour's control, or its REMOVE.
  // Every edit action waits until the board has settled (createEditTapGuard).
  const [tapGuard] = useState(createEditTapGuard);
  const resizeTile = (widget: WidgetConfig) => {
    if (!tapGuard.allowed(Date.now())) return;
    tapGuard.resized(Date.now());
    resizeWidget(widget.id, widget.size === "small" ? "large" : "small");
  };
  const removeTile = (id: string) => {
    if (!tapGuard.allowed(Date.now()) || leaving) return;
    setLeaving(id);
    window.setTimeout(() => {
      removeWidget(id);
      setLeaving(null);
    }, 200);
  };

  const handleGripPointerDown = useCallback(
    (e: React.PointerEvent, widget: WidgetConfig) => {
      e.preventDefault();
      if (!tapGuard.allowed(Date.now())) return;
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
      pointerRef.current = { x: e.clientX, y: e.clientY };
      setDragRender({ id: widget.id, size: widget.size, width: r.width, height: r.height, dropIndex: fromIndex });
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
      window.addEventListener("pointercancel", handlePointerUp, { once: true });
      window.addEventListener("scroll", updateDrop, { passive: true });
      startAutoScroll();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handlePointerMove, handlePointerUp, tapGuard, updateDrop]
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
    // The lift scales AROUND THE GRAB POINT. Scaled around its centre (the
    // default), a 3% lift moved the point under the finger by up to ~6px on
    // a large tile, so the tile looked skewed off the finger.
    const info = dragInfoRef.current;
    g.style.transformOrigin = info ? `${info.offsetX}px ${info.offsetY}px` : "50% 50%";
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
      window.removeEventListener("scroll", updateDrop);
      stopAutoScroll();
    },
    [handlePointerMove, handlePointerUp, updateDrop]
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
  // Spans follow the live order, placeholder included (as the dragged
  // tile's size) and the Add tile as one more small, so edit-mode reflow
  // obeys the same row rules.
  const spans = widgetSpans(
    [
      ...renderList.map((item) => (item === "placeholder" ? dragRender!.size : item.size)),
      ...(editMode ? (["small"] as const) : []),
    ],
    columns
  );

  return (
    <div>
      {/* OURS-home-shell H8: the HE1 caps-label pattern (HE1 #4), 9.5/14.3
          700 ls 1.9 #9A94B3 (dark #8A8698); the Edit button stays (V6-137:
          long-press is a second way in). */}
      <div className="flex items-center justify-between mb-[9px]">
        <p
          className="uppercase"
          style={{ margin: 0, fontSize: textPx(9.5), lineHeight: linePx(14.3), fontWeight: 700, letterSpacing: 1.9, color: dark ? "rgb(var(--th-8a8698))" : "rgb(var(--th-9a94b3))" }}
        >
          {t("Today")}
        </p>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="tap flex items-center gap-[5px] text-[10.5px] font-bold text-team-nav-accent"
        >
          {editMode ? (
            <>
              <Check size={11} /> {t("Done")}
            </>
          ) : (
            <>
              <Pencil size={11} /> {t("Edit")}
            </>
          )}
        </button>
      </div>

      {/* HO1.1 (01_GLOBAL / 03): a 6-track CSS grid with a fixed gap.
          Small tiles span 6/columns; a large tile spans the full row; a
          partial row of smalls shares the row equally (utils/widgetGrid). */}
      <div ref={boardRef} className="grid grid-cols-6 gap-[7px]">
        {renderList.map((item, i) =>
          item === "placeholder" ? (
            <div
              key="__drag-placeholder__"
              ref={placeholderRef}
              style={{
                gridColumn: `span ${spans[i]}`,
                height: dragRender!.height,
                borderRadius: 15,
                border: "2px dashed rgb(var(--th-8f68f6) / 0.45)",
                background: "rgb(var(--th-8f68f6) / 0.06)",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <WidgetShell
              key={item.id}
              ref={setTileRef(item.id)}
              size={item.size}
              span={spans[i]}
              editMode={editMode}
              index={i}
              motion={leaving === item.id ? "leave" : entering.has(item.id) ? "enter" : null}
              onLongPress={() => setEditMode(true)}
              onRemove={() => removeTile(item.id)}
              onResize={() => resizeTile(item)}
              onGripPointerDown={(e) => handleGripPointerDown(e, item)}
            >
              <HomeWidget
                widget={item}
                editMode={editMode}
                onWaterClick={item.type === "water" ? onWaterClick : undefined}
              />
            </WidgetShell>
          )
        )}

        {editMode && (
          <button
            onClick={() => {
              if (tapGuard.allowed(Date.now())) setPickerOpen(true);
            }}
            disabled={availableToAdd.length === 0}
            // OURS-home-shell H10: dashed 1.09545 #241F1B@18% (the HO1.W6·e dot
            // outline), Plus 20 and "Add widget" 12/700 in #5F5093.
            style={{
              gridColumn: `span ${spans[spans.length - 1]}`,
              border: `1.09545px dashed ${dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)"}`,
              color: dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-5f5093))",
            }}
            className="tap h-[114px] rounded-[15px] flex flex-col items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Plus size={20} />
            <span style={{ fontSize: textPx(12), lineHeight: linePx(16), fontWeight: 700 }}>{t("Add widget")}</span>
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

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title={t("Add a widget")}>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {availableToAdd.map((w) => (
            <PickerRow
              key={w.type}
              item={w}
              dark={dark}
              onAdd={(size) => {
                addWidget(w.type, size);
                setPickerOpen(false);
              }}
            />
          ))}
          {availableToAdd.length === 0 && (
            <p className="text-center py-6" style={{ fontSize: textPx(13), lineHeight: linePx(18), fontWeight: 500, color: "rgb(var(--c-charcoal-faint))" }}>
              {t("All available widgets are already on your board.")}
            </p>
          )}
        </div>
      </BottomSheet>
    </div>
  );
};
