import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Ellipsis, GripVertical, Maximize2, Minimize2, Pencil, Plus, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import type { WidgetConfig, WidgetSize } from "../../../types";
import { BottomSheet } from "../../ui/BottomSheet";
import { HomeWidget } from "../HomeWidget";
import { allWidgetTypes, PickerRow } from "../WidgetBoard";
import { WebTileHeight } from "../widgets/tileHeight";
import { useWidgetConfigSync } from "../useWidgetConfigSync";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { useIsDark } from "../../../hooks/useIsDark";
import { createEditTapGuard, dropSlot, storedMove } from "../../../utils/widgetGrid";
import { t } from "../../../i18n/core";

/**
 * Website viewport v1, WC-HO "Today" board (HO Board v11, literal values): the
 * same widgets as the mobile board on a 12-column grid (8 on the rail), gap
 * 24. Each widget is drawn 138 tall at the mobile proportions and zoomed to
 * its cell (1.37 at 1440, 4/3 on the rail), so a row is 189 (184) tall; small
 * widgets span 3 (2), large ones 6 (4). Hover shows a 28 kebab that opens
 * Edit (the mobile long-press); Edit rings the tiles (2px #8F68F6 at 30%),
 * wiggles them, puts Resize and Remove (28 circles) over the top corner and
 * the grip at the bottom start, and adds the 44 dashed "Add widget" bar under
 * the grid. Add widget opens the mobile picker as the 440 side sheet.
 */

const CSS = `
@keyframes hb11-wiggle { from { transform: rotate(-1deg) } to { transform: rotate(1deg) } }
.wtile { transition: transform .15s cubic-bezier(0.22,1,0.36,1), opacity .2s cubic-bezier(0.22,1,0.36,1); }
.wtile:not([data-edit]):hover { transform: scale(0.98); }
.wtile:not([data-edit]):active { transform: scale(0.96); }
.wtile[data-edit] { animation: hb11-wiggle 260ms ease-in-out infinite alternate; }
.wtile .wtile-kebab { opacity: 0; pointer-events: none; transition: opacity .15s; }
.wtile:hover .wtile-kebab, .wtile:focus-within .wtile-kebab { opacity: 1; pointer-events: auto; }
.wtile-ctl:focus-visible, .wtile-kebab:focus-visible, .wboard-btn:focus-visible { outline: 2px solid #AEA1DC; outline-offset: 2px; }
.wboard-add:hover { background: #F5F5F6; }
@media (prefers-reduced-motion: reduce) { .wtile[data-edit] { animation: none; } }
html.reduce-motion .wtile[data-edit] { animation: none; }
`;

const chip: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.92)",
  boxShadow: "0 2px 8px rgba(36,31,27,0.18)",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

interface Drag {
  id: string;
  fromIndex: number;
  dropIndex: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  size: WidgetSize;
}

export const WidgetBoardWeb: React.FC<{ rail: boolean; onWaterClick?: () => void }> = ({ rail, onWaterClick }) => {
  const { widgets, removeWidget, reorderWidgets, resizeWidget, addWidget, cycleOffered, cycleSettings } = useApp();
  const hideNumbers = useHideNumbers();
  const dark = useIsDark();
  useWidgetConfigSync();
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [tapGuard] = useState(createEditTapGuard);

  const cols = rail ? 8 : 12;
  const Lg = rail ? 4 : 6;
  const Sm = rail ? 2 : 3;
  const Z = rail ? 4 / 3 : 1.37;
  const rowH = Math.round(138 * Z);
  const hz = +(rowH / Z).toFixed(2);

  // As the mobile board: Body Fat never shows, Weight hides in the
  // recovery-sensitive experience, Cycle only while the section is offered.
  const visible = widgets.filter(
    (w) => (w.type as string) !== "bodyFat" && !(hideNumbers && w.type === "weight") && !(w.type === "cycle" && !cycleOffered)
  );
  const available = allWidgetTypes.filter(
    (x) =>
      !widgets.some((w) => w.type === x.type) &&
      !(hideNumbers && x.type === "weight") &&
      !(x.type === "cycle" && !(cycleOffered && cycleSettings?.trackerEnabled))
  );

  const resizeTile = (w: WidgetConfig) => {
    if (!tapGuard.allowed(Date.now())) return;
    tapGuard.resized(Date.now());
    resizeWidget(w.id, w.size === "small" ? "large" : "small");
  };
  const removeTile = (id: string) => {
    if (!tapGuard.allowed(Date.now()) || leaving) return;
    setLeaving(id);
    window.setTimeout(() => {
      removeWidget(id);
      setLeaving(null);
    }, 200);
  };

  // ---- Reorder by the grip (the mobile board's pointer drag, for a mouse):
  // the tile lifts and follows the pointer, a dashed placeholder shows where
  // it lands (utils/widgetGrid dropSlot), a release outside the board puts it
  // back.
  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef(new Map<string, HTMLDivElement>());
  const dragRef = useRef<Drag | null>(null);
  const visibleRef = useRef(visible);
  const widgetsRef = useRef(widgets);
  useEffect(() => {
    visibleRef.current = visible;
    widgetsRef.current = widgets;
  });

  const onMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const g = ghostRef.current;
    if (g) {
      g.style.left = `${e.clientX - d.offsetX}px`;
      g.style.top = `${e.clientY - d.offsetY}px`;
    }
    const bb = boardRef.current?.getBoundingClientRect();
    if (!bb || e.clientX < bb.left - 40 || e.clientX > bb.right + 40 || e.clientY < bb.top - 40 || e.clientY > bb.bottom + 40) return;
    const others = visibleRef.current.filter((w) => w.id !== d.id);
    const rects = others.map((w) => tileRefs.current.get(w.id)?.getBoundingClientRect() ?? { left: -1e6, top: -1e6, right: -1e6, bottom: -1e6 });
    const next = dropSlot(e.clientX, e.clientY, rects, placeholderRef.current?.getBoundingClientRect() ?? null);
    if (next !== null && next !== d.dropIndex) {
      d.dropIndex = next;
      setDrag({ ...d });
    }
  }, []);

  const onUp = useCallback(
    (e: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return setDrag(null);
      const bb = boardRef.current?.getBoundingClientRect();
      const inBoard = !!bb && e.clientX >= bb.left - 40 && e.clientX <= bb.right + 40 && e.clientY >= bb.top - 40 && e.clientY <= bb.bottom + 40;
      if (inBoard && d.dropIndex !== d.fromIndex) {
        const move = storedMove(widgetsRef.current.map((w) => w.id), visibleRef.current.map((w) => w.id), d.id, d.dropIndex);
        if (move) reorderWidgets(move.from, move.to);
      }
      setDrag(null);
    },
    [onMove, reorderWidgets]
  );

  useEffect(
    () => () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    },
    [onMove, onUp]
  );

  const startDrag = (e: React.PointerEvent, w: WidgetConfig) => {
    if (e.button !== 0 || !tapGuard.allowed(Date.now())) return;
    e.preventDefault();
    const tile = tileRefs.current.get(w.id);
    const fromIndex = visible.findIndex((x) => x.id === w.id);
    if (!tile || fromIndex < 0) return;
    const r = tile.getBoundingClientRect();
    const d: Drag = { id: w.id, fromIndex, dropIndex: fromIndex, offsetX: e.clientX - r.left, offsetY: e.clientY - r.top, width: r.width, height: r.height, size: w.size };
    dragRef.current = d;
    setDrag(d);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
  };

  // The ghost starts where the tile was.
  useEffect(() => {
    const d = dragRef.current;
    const g = ghostRef.current;
    const tile = d ? tileRefs.current.get(d.id) : null;
    if (!d || !g) return;
    const r = tile?.getBoundingClientRect();
    if (r) {
      g.style.left = `${r.left}px`;
      g.style.top = `${r.top}px`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id]);

  const dragged = drag ? visible.find((w) => w.id === drag.id) ?? null : null;
  const list: (WidgetConfig | "placeholder")[] = drag
    ? (() => {
        const others: (WidgetConfig | "placeholder")[] = visible.filter((w) => w.id !== drag.id);
        others.splice(Math.min(drag.dropIndex, others.length), 0, "placeholder");
        return others;
      })()
    : visible;

  const tileBody = (w: WidgetConfig) => (
    <div style={{ zoom: Z }}>
      <WebTileHeight.Provider value={hz}>
        <HomeWidget widget={w} editMode={editMode} onWaterClick={w.type === "water" ? onWaterClick : undefined} />
      </WebTileHeight.Provider>
    </div>
  );

  return (
    <div>
      <style href="home-board-web" precedence="default">{CSS}</style>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <p className="uppercase" style={{ margin: 0, fontSize: 12, lineHeight: "16px", fontWeight: 600, letterSpacing: "0.08em", color: "#9A94B3" }}>
          {t("Today")}
        </p>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className="wboard-btn flex items-center active:scale-[0.96]"
          style={{ gap: 6, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#8F68F6", borderRadius: 6 }}
        >
          {editMode ? <Check size={16} aria-hidden /> : <Pencil size={16} aria-hidden />}
          {editMode ? t("Done") : t("Edit")}
        </button>
      </div>

      <div ref={boardRef} data-web-board style={{ display: "grid", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gridAutoRows: rowH, gap: 24 }}>
        {list.map((item, i) =>
          item === "placeholder" ? (
            <div
              key="__placeholder__"
              ref={placeholderRef}
              style={{ gridColumn: `span ${drag!.size === "large" ? Lg : Sm}`, borderRadius: 20, border: "2px dashed rgba(143,104,246,0.45)", background: "rgba(143,104,246,0.06)", boxSizing: "border-box" }}
            />
          ) : (
            <div
              key={item.id}
              ref={(el) => {
                if (el) tileRefs.current.set(item.id, el);
                else tileRefs.current.delete(item.id);
              }}
              data-widget={item.type}
              data-edit={editMode ? "" : undefined}
              className="wtile relative min-w-0"
              style={{
                gridColumn: `span ${item.size === "large" ? Lg : Sm}`,
                borderRadius: 20,
                boxShadow: editMode ? "0 0 0 2px rgba(143,104,246,0.3)" : "none",
                animationDelay: editMode ? `${i * 60}ms` : undefined,
                opacity: leaving === item.id ? 0 : 1,
              }}
            >
              <div style={editMode ? { pointerEvents: "none" } : undefined}>{tileBody(item)}</div>
              {!editMode && (
                <button type="button" className="wtile-kebab" aria-label={t("Edit")} title={t("Edit")} onClick={() => setEditMode(true)} style={{ ...chip, position: "absolute", top: 9, insetInlineEnd: 9, zIndex: 10 }}>
                  <Ellipsis size={16} color="#241F1B" aria-hidden />
                </button>
              )}
              {editMode && (
                <>
                  <div style={{ position: "absolute", top: -12, insetInlineEnd: -10, display: "flex", gap: 4, zIndex: 10 }}>
                    <button type="button" className="wtile-ctl" style={chip} aria-label={t("Resize widget")} title={t("Resize widget")} onClick={() => resizeTile(item)}>
                      {item.size === "small" ? <Maximize2 size={16} color="#241F1B" aria-hidden /> : <Minimize2 size={16} color="#241F1B" aria-hidden />}
                    </button>
                    <button type="button" className="wtile-ctl" style={chip} aria-label={t("Remove widget")} title={t("Remove widget")} onClick={() => removeTile(item.id)}>
                      <X size={16} strokeWidth={3} color="#4F7F78" aria-hidden />
                    </button>
                  </div>
                  <div
                    role="button"
                    aria-label={t("Drag to reorder")}
                    title={t("Drag to reorder")}
                    onPointerDown={(e) => startDrag(e, item)}
                    className="cursor-grab active:cursor-grabbing"
                    style={{ position: "absolute", bottom: 9, insetInlineStart: 10, zIndex: 10, display: "inline-flex", touchAction: "none" }}
                  >
                    <GripVertical size={16} color="rgba(36,31,27,0.35)" aria-hidden />
                  </div>
                </>
              )}
            </div>
          )
        )}
      </div>

      {editMode && (
        <button
          type="button"
          onClick={() => {
            if (tapGuard.allowed(Date.now())) setPickerOpen(true);
          }}
          disabled={available.length === 0}
          className="wboard-add wboard-btn w-full flex items-center justify-center disabled:opacity-40"
          style={{ marginTop: 24, height: 44, borderRadius: 14, gap: 8, border: "1.46px dashed rgba(36,31,27,0.18)", color: "#5F5093", boxSizing: "border-box" }}
        >
          <Plus size={20} aria-hidden />
          <span style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600 }}>{t("Add widget")}</span>
        </button>
      )}

      {drag && dragged && (
        <div
          ref={ghostRef}
          style={{ position: "fixed", width: drag.width, height: drag.height, zIndex: 45, pointerEvents: "none", borderRadius: 20, transform: "scale(1.03)", transformOrigin: `${drag.offsetX}px ${drag.offsetY}px`, boxShadow: "0 16px 40px rgb(0 0 0 / 0.20)" }}
        >
          {tileBody(dragged)}
        </div>
      )}

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title={t("Add a widget")}>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {available.map((w) => (
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
          {available.length === 0 && (
            <p className="text-center py-6" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "rgb(var(--c-charcoal-faint))" }}>
              {t("All available widgets are already on your board.")}
            </p>
          )}
        </div>
      </BottomSheet>
    </div>
  );
};
