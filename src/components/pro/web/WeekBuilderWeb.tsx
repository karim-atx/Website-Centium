import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, MoreHorizontal, Plus } from "lucide-react";
import { useWebLayout } from "../../web/useWebLayout";
import type { PlanItem } from "../../../services/pro/nutrition";
import { itemMacros, type FactSources } from "../nutrition/itemFacts";
import { SLOT_LABEL, SLOT_ORDER, sumMacros, type Macros, type MealSlot } from "../nutrition/nutritionModel";
import { appLocale } from "../../../i18n/format";
import { t, tx } from "../../../i18n/core";

// Professional handover v1, WP-LI.7.3 / WP-NU-MP.7 Week states (WP-LI Week
// Builder Web v3): the meal-plan week builder, web only. A 96 header (back
// 40, the kicker, the plan name 28/36 and its targets line, the Day | Week
// control 2 × 88, More 40), the week strip (7 tiles: day, kcal / target, a 4
// bar, C P F), then the planner on #F8F7FD: a 40 rail with the meal bands
// written vertically, and one 296 column per day (274 on the rail; 4 visible,
// 3 on the rail; the rest scroll sideways): the day's figures card, then per
// meal a block with the lavender header band (FOOD ITEM · QTY, Cals, C, P, F),
// the items (the name in a 9% strip, quantity 56 × 32 and the unit, the
// figures), Search food and Totals. Mobile has no week builder.
//
// Repo deviations, noted in PROGRESS.md: "Search food" opens the repo's Add
// food sheet for that day and meal (a 440 side sheet) rather than the drawn
// inline dropdown, and the unit is the item's own (grams or servings), not a
// unit menu. The quantity edits in place and saves on Enter or blur.

const L_WIDE = { padX: 32, colW: 296, gap: 16, railW: 40, bp: 12, figs: "minmax(0,1fr) 40px 30px 30px 30px", tileGap: 8, tilePad: "10px 12px", tileRow: true };
const L_RAIL = { padX: 24, colW: 274, gap: 12, railW: 36, bp: 8, figs: "minmax(0,1fr) 38px 28px 28px 28px", tileGap: 6, tilePad: "8px 10px", tileRow: false };

const C_INK = "#8175C2";
const P_INK = "#7D6BB5";
const F_INK = "#4F8079";

const fmt = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));
const pct = (v: number, tg: number | null) => (tg ? `${Math.min(100, Math.round((v / tg) * 100))}%` : "0%");
const zero: Macros = { kcal: 0, p: 0, c: 0, f: 0 };

export interface WeekDay {
  id: string;
  dayIndex: number;
  /** "Monday" or "Day 1". */
  name: string;
  /** "Mon" or "Day 1". */
  short: string;
  items: PlanItem[];
}

export const PlanHeaderWeb: React.FC<{
  kicker: string;
  title: string;
  line: string | null;
  view: "day" | "week";
  onView: (v: "day" | "week") => void;
  onBack: () => void;
  onMore: (el: HTMLElement) => void;
  moreOpen: boolean;
  extra?: React.ReactNode;
}> = ({ kicker, title, line, view, onView, onBack, onMore, moreOpen, extra }) => {
  const { rail } = useWebLayout();
  const L = rail ? L_RAIL : L_WIDE;
  const moreRef = useRef<HTMLButtonElement | null>(null);
  return (
    <header className="flex items-center" style={{ height: 96, flex: "none", boxSizing: "border-box", gap: 16, padding: `0 ${L.padX}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
      <button
        type="button"
        onClick={onBack}
        aria-label={t("Back")}
        className="flex items-center justify-center shrink-0 hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 12, background: "#F5F5F6", border: "1px solid rgba(36,31,27,0.10)" }}
      >
        <ChevronLeft size={20} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" style={{ color: "#241F1B" }} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#8C8378" }}>
          {kicker}
        </p>
        <h1 className="truncate" title={title} style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", color: "#241F1B" }}>
          {title}
        </h1>
        {line && (
          <p className="truncate" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
            {line}
          </p>
        )}
      </div>
      {extra}
      <div role="tablist" aria-label={t("View")} className="grid shrink-0" style={{ gridTemplateColumns: "repeat(2,88px)", gap: 4, padding: 5, borderRadius: 14, background: "#F3F3FD" }}>
        {(["day", "week"] as const).map((v) => {
          const on = v === view;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onView(v)}
              className={`flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8] ${on ? "" : "hover:bg-[#E9E5F8]"}`}
              style={{ height: 30, borderRadius: 10, background: on ? "#A79AD5" : "transparent", color: on ? "#FFFFFF" : "#5F5093", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
            >
              {v === "day" ? t("Day") : t("Week")}
            </button>
          );
        })}
      </div>
      <button
        ref={moreRef}
        type="button"
        aria-label={t("More")}
        aria-haspopup="menu"
        aria-expanded={moreOpen}
        onClick={() => moreRef.current && onMore(moreRef.current)}
        className="flex items-center justify-center shrink-0 hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 999, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)" }}
      >
        <MoreHorizontal size={20} strokeWidth={2} aria-hidden style={{ color: "#5B5349" }} />
      </button>
    </header>
  );
};

const QtyField: React.FC<{ item: PlanItem; onSave: (item: PlanItem, value: number) => Promise<void> }> = ({ item, onSave }) => {
  const grams = item.grams != null;
  const value = grams ? item.grams! : item.servings ?? 1;
  // Keyed by the saved value (WeekBuilderWeb), so a reload resets the field.
  const [v, setV] = useState(String(value));
  const [focus, setFocus] = useState(false);
  const commit = () => {
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n === value) return setV(String(value));
    void onSave(item, n);
  };
  return (
    <input
      aria-label={t("Quantity of {name}", { name: item.name })}
      inputMode="decimal"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => {
        setFocus(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setV(String(value));
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="text-center outline-none"
      style={{
        width: 56,
        height: 32,
        boxSizing: "border-box",
        flex: "none",
        borderRadius: 8,
        background: focus ? "#FFFFFF" : "#F5F5F6",
        border: focus ? "1.5px solid #AEA1DC" : "1px solid rgba(36,31,27,0.10)",
        boxShadow: focus ? "0 0 0 3px rgba(174,161,220,0.25)" : "none",
        fontSize: 15,
        lineHeight: "24px",
        fontWeight: 600,
        color: "#241F1B",
        fontVariantNumeric: "tabular-nums",
      }}
    />
  );
};

export const WeekBuilderWeb: React.FC<{
  days: WeekDay[];
  targets: Macros | null;
  src: FactSources;
  readOnly: boolean;
  onAdd: (dayIndex: number, slot: MealSlot) => void;
  onItemMenu: (item: PlanItem, dayIndex: number, anchor: HTMLElement) => void;
  onQty: (item: PlanItem, value: number) => Promise<void>;
}> = ({ days, targets, src, readOnly, onAdd, onItemMenu, onQty }) => {
  const { rail } = useWebLayout();
  const L = rail ? L_RAIL : L_WIDE;
  const sc = useRef<HTMLDivElement | null>(null);
  const [scroll, setScroll] = useState({ sl: 0, cw: 0 });
  const measure = () => sc.current && setScroll({ sl: Math.abs(sc.current.scrollLeft), cw: sc.current.clientWidth });
  useEffect(() => {
    measure();
    const el = sc.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totals = days.map((d) => {
    const bySlot = Object.fromEntries(SLOT_ORDER.map((s) => [s, sumMacros(d.items.filter((i) => i.slot === s).map((i) => itemMacros(i, src)))])) as Record<MealSlot, Macros>;
    return { bySlot, day: sumMacros(SLOT_ORDER.map((s) => bySlot[s])) };
  });
  // A day column counts as visible when more than half of it shows (the strip's current days).
  const visible = (i: number) => {
    const x0 = L.railW + L.gap + i * (L.colW + L.gap) - scroll.sl;
    const a = Math.max(x0, L.railW + L.gap);
    const b = Math.min(x0 + L.colW, scroll.cw || Infinity);
    return b - a > L.colW / 2;
  };
  const goTo = (i: number) => {
    const el = sc.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollTo({ left: (rtl ? -1 : 1) * i * (L.colW + L.gap), behavior: "smooth" });
  };
  const railSh = `${L.gap}px 0 0 #F8F7FD`;
  const figs = (m: Macros, bold: boolean) => (
    <>
      <span style={{ textAlign: "end", fontSize: 13, lineHeight: "20px", fontWeight: bold ? 800 : 600 }}>{fmt(m.kcal)}</span>
      <span style={{ textAlign: "end", fontSize: 13, lineHeight: "20px", fontWeight: bold ? 800 : 600, color: C_INK }}>{fmt(m.c)}</span>
      <span style={{ textAlign: "end", fontSize: 13, lineHeight: "20px", fontWeight: bold ? 800 : 600, color: P_INK }}>{fmt(m.p)}</span>
      <span style={{ textAlign: "end", fontSize: 13, lineHeight: "20px", fontWeight: bold ? 800 : 600, color: F_INK }}>{fmt(m.f)}</span>
    </>
  );

  return (
    <>
      <nav aria-label={t("Week")} className="grid" style={{ flex: "none", gridTemplateColumns: `repeat(${Math.max(1, days.length)},minmax(0,1fr))`, gap: L.tileGap, padding: `12px ${L.padX}px`, background: "#FFFFFF", borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        {days.map((d, i) => {
          const on = visible(i);
          const m = totals[i].day;
          return (
            <button
              key={d.id}
              type="button"
              aria-current={on ? "true" : undefined}
              onClick={() => goTo(i)}
              className="min-w-0 flex flex-col text-start hover:border-[#AEA1DC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
              style={{ boxSizing: "border-box", gap: 6, padding: L.tilePad, borderRadius: 12, background: on ? "#F0EDF9" : "#FFFFFF", border: `1px solid ${on ? "#AEA1DC" : "rgba(36,31,27,0.08)"}` }}
            >
              <span className={`flex min-w-0 justify-between ${L.tileRow ? "flex-row items-baseline" : "flex-col items-start"}`} style={{ gap: "2px 8px" }}>
                <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: on ? "#5F5093" : "#5B5349" }}>{d.short}</span>
                <span style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  <b style={{ color: "#241F1B" }}>{fmt(m.kcal)}</b>
                  {targets ? ` / ${fmt(targets.kcal)}` : ""}
                </span>
              </span>
              <span className="block overflow-hidden" style={{ height: 4, borderRadius: 999, background: "rgba(36,31,27,0.07)" }}>
                <span className="block" style={{ width: pct(m.kcal, targets?.kcal ?? null), height: "100%", borderRadius: 999, background: "#9A8CD6" }} />
              </span>
              <span className="flex whitespace-nowrap" style={{ gap: 8, fontSize: 11, lineHeight: "16px", color: "#5B5349", fontVariantNumeric: "tabular-nums" }}>
                <span>
                  <b style={{ color: C_INK }}>C</b> {fmt(m.c)}
                </span>
                <span>
                  <b style={{ color: P_INK }}>P</b> {fmt(m.p)}
                </span>
                <span>
                  <b style={{ color: F_INK }}>F</b> {fmt(m.f)}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
      <section aria-label={t("Week planner")} style={{ background: "#F8F7FD", padding: `16px ${L.padX}px 12px` }}>
        <div ref={sc} onScroll={measure} style={{ overflowX: "auto", overflowY: "hidden", scrollbarColor: "#AEA1DC #ECE8F8" }}>
          <div className="grid" style={{ gridTemplateColumns: `${L.railW}px repeat(${days.length},${L.colW}px)`, columnGap: L.gap, rowGap: 12, width: "max-content", paddingBottom: 16 }}>
            <div style={{ position: "sticky", insetInlineStart: 0, zIndex: 3, background: "#F8F7FD", boxShadow: railSh }} />
            {days.map((d, i) => {
              const m = totals[i].day;
              const rows: [string, number, number | null, string, string][] = [
                [t("Calories"), m.kcal, targets?.kcal ?? null, "#9A8CD6", ""],
                [t("Carbs"), m.c, targets?.c || null, "#AEA1DC", " g"],
                [t("Protein"), m.p, targets?.p || null, "#7D6BB5", " g"],
                [t("Fat"), m.f, targets?.f || null, "#A2C8C2", " g"],
              ];
              return (
                <div key={d.id} className="min-w-0" style={{ boxSizing: "border-box", borderRadius: 12, background: "#FFFFFF", border: "1px solid rgba(143,104,246,0.16)", padding: "12px 14px" }}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5F5093" }}>{d.name}</p>
                  <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "10px 12px", marginTop: 10 }}>
                    {rows.map(([l, v, tg, c, u]) => (
                      <div key={l} className="min-w-0">
                        <span className="block" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8C8378" }}>{l}</span>
                        <span className="block whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378", fontVariantNumeric: "tabular-nums" }}>
                          <b style={{ color: "#241F1B" }}>{fmt(v)}</b>
                          {tg ? ` / ${fmt(tg)}${u}` : u}
                        </span>
                        <span className="block overflow-hidden" style={{ height: 4, marginTop: 4, borderRadius: 999, background: "rgba(36,31,27,0.07)" }}>
                          <span className="block" style={{ width: pct(v, tg), height: "100%", borderRadius: 999, background: c }} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {SLOT_ORDER.map((slot) => (
              <React.Fragment key={slot}>
                <div className="flex" style={{ position: "sticky", insetInlineStart: 0, zIndex: 2, background: "#F8F7FD", boxShadow: railSh }}>
                  <span className="flex-1 flex items-center justify-center" style={{ borderRadius: 999, background: "#F0EDF9" }}>
                    <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#5F5093", whiteSpace: "nowrap" }}>{t(SLOT_LABEL[slot])}</span>
                  </span>
                </div>
                {days.map((d, i) => {
                  const list = d.items.filter((it) => it.slot === slot);
                  const tt = totals[i].bySlot[slot] ?? zero;
                  return (
                    <div
                      key={d.id}
                      aria-label={`${d.name} ${t(SLOT_LABEL[slot]).toLowerCase()}`}
                      className="min-w-0 flex flex-col"
                      style={{ boxSizing: "border-box", background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(143,104,246,0.16)", padding: L.bp }}
                    >
                      <div className="grid items-center" style={{ gridTemplateColumns: L.figs, margin: "0 0 6px", padding: "4px 8px", borderRadius: 8, background: "rgba(143,104,246,0.2)", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#4A3A8C" }}>
                        <span className="whitespace-nowrap">{t("Food item · Qty")}</span>
                        <span style={{ textAlign: "end" }}>{t("Cals")}</span>
                        <span style={{ textAlign: "end" }}>C</span>
                        <span style={{ textAlign: "end" }}>P</span>
                        <span style={{ textAlign: "end", color: "#2F5F58" }}>F</span>
                      </div>
                      {list.map((it, k) => {
                        const m = itemMacros(it, src) ?? zero;
                        return (
                          <div key={it.id} className="grid items-center" style={{ gridTemplateColumns: L.figs, rowGap: 4, padding: "8px 6px", margin: "0 -6px", borderTop: k ? "1px solid rgba(36,31,27,0.06)" : "none", fontVariantNumeric: "tabular-nums" }}>
                            <button
                              type="button"
                              title={it.name}
                              aria-haspopup="menu"
                              disabled={readOnly}
                              onClick={(e) => onItemMenu(it, d.dayIndex, e.currentTarget)}
                              className="min-w-0 truncate text-start hover:bg-[rgba(143,104,246,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                              style={{ gridColumn: "1 / -1", boxSizing: "border-box", margin: "0 -2px", padding: "2px 8px", borderRadius: 6, background: "rgba(143,104,246,0.09)", fontSize: 15, lineHeight: "24px", fontWeight: 500, color: "#241F1B" }}
                            >
                              {it.name}
                            </button>
                            <span className="flex items-center min-w-0" style={{ gap: 4 }}>
                              {readOnly ? (
                                <span className="flex items-center justify-center" style={{ width: 56, height: 32, borderRadius: 8, background: "#F5F5F6", fontSize: 15, fontWeight: 600 }}>
                                  {it.grams ?? it.servings ?? 1}
                                </span>
                              ) : (
                                <QtyField key={`${it.id}:${it.grams ?? it.servings ?? 1}`} item={it} onSave={onQty} />
                              )}
                              <span className="flex items-center truncate" style={{ height: 32, boxSizing: "border-box", padding: "0 5px", borderRadius: 8, background: "#F0EDF9", color: "#5F5093", fontSize: 13, lineHeight: "20px", fontWeight: 600, maxWidth: 96 }}>
                                {it.grams != null ? tx("g", "unit") : it.kind === "food" || it.kind === "custom_food" ? it.facts?.servingLabel ?? t("serving") : t("serving")}
                              </span>
                            </span>
                            {figs(m, false)}
                          </div>
                        );
                      })}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => onAdd(d.dayIndex, slot)}
                          className="flex items-center hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                          style={{ margin: "4px -6px 0", height: 36, gap: 6, padding: "0 6px", borderRadius: 8, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5F5093" }}
                        >
                          <Plus size={16} strokeWidth={2.4} aria-hidden />
                          {t("Search food")}
                        </button>
                      )}
                      <div className="flex-1" />
                      <div className="grid items-center" style={{ gridTemplateColumns: L.figs, margin: "8px -6px 0", padding: "8px 6px", borderTop: "1px solid rgba(36,31,27,0.08)", fontSize: 13, lineHeight: "20px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        <span>{t("Totals")}</span>
                        {figs(tt, true)}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
