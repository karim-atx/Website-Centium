import React, { useState } from "react";
import { EllipsisVertical, Plus } from "lucide-react";
import { useWebLayout } from "../../web/useWebLayout";
import type { PlanItem } from "../../../services/pro/nutrition";
import { itemMacros } from "../nutrition/itemFacts";
import { SLOT_LABEL, SLOT_ORDER, sumMacros, type Macros } from "../nutrition/nutritionModel";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";
import { InlineFoodSearch } from "./InlineFoodSearch";
import { UnitChip, QtyField, type MealIO } from "./WeekBuilderWeb";

// Professional handover v1, WP-LI.7 / WP-NU-MP.7 Day view, web only (WP-LI
// Plan Day Web). Under the 64 header: a 1280 cap, 32 padding and a 12-column
// grid (8 on the rail), 24 apart. Days 3: the dietary needs card (r16
// #FAFAFB) and the days as a vertical segmented list (#F3F3FD, r16, 6
// padding, 5 apart; the day 17/24 and its kcal line 13/20, the open day
// #A79AD5). The editor 9 (5 on the rail): the day total card (r20, 16 24, the
// 128 ring with the value 22/26 800, "of {target} kcal" and the left line;
// Protein, Carbs and Fat 3 across, 1 on the rail, bars 14 high), then the
// meals 2 across (1 on the rail), each r16, 12 14: the title 17/24 800 with
// its kcal 13, Add food 15/24, the lavender header band, the items (figures
// 15/24, ⋮ for the item menu, a recipe reads "Recipe · {n} serving"), the
// search box at rest and Totals. No Add Food panel: each meal searches inline.

const fmt = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));
const FIGS = "minmax(0,1fr) 44px 32px 32px 32px 16px";
const zero: Macros = { kcal: 0, p: 0, c: 0, f: 0 };

export interface DayTab {
  dayIndex: number;
  name: string;
  short: string;
  items: PlanItem[];
}

export const PlanDayWeb: React.FC<{
  days: DayTab[];
  current: number;
  onDay: (dayIndex: number) => void;
  targets: Macros | null;
  /** The dietary needs card (a client's copy), or null on a template. */
  needs: React.ReactNode;
  io: MealIO;
  /** A recipe or meal row's portion line ("Recipe · 1 serving"). */
  recipeLine: (item: PlanItem) => string;
  /** Flags on a client's copy, beside the item name. */
  flag: (item: PlanItem) => React.ReactNode;
}> = ({ days, current, onDay, targets, needs, io, recipeLine, flag }) => {
  const { rail } = useWebLayout();
  const theDay = days.find((d) => d.dayIndex === current) ?? days[0] ?? null;
  const dayTotal = (d: DayTab) => sumMacros(d.items.map((i) => itemMacros(i, io.src)));
  const total = theDay ? dayTotal(theDay) : zero;
  const C = 2 * Math.PI * 46;
  const ring = targets?.kcal ? Math.min(1, total.kcal / targets.kcal) : 0;
  const left = targets?.kcal ? targets.kcal - total.kcal : null;
  const macros: [string, string, number, number | null][] = [
    [t("Protein"), "#7D6BB5", total.p, targets?.p || null],
    [t("Carbs"), "#AEA1DC", total.c, targets?.c || null],
    [t("Fat"), "#A2C8C2", total.f, targets?.f || null],
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: 32, boxSizing: "border-box" }}>
      <div className="grid" style={{ gridTemplateColumns: rail ? "repeat(8,minmax(0,1fr))" : "repeat(12,minmax(0,1fr))", gap: 24, alignItems: "start" }}>
        <section aria-label={t("Days")} className="flex flex-col" style={{ gridColumn: "span 3", gap: 16, position: "sticky", top: 24 }}>
          {needs}
          <div role="tablist" aria-label={t("Day")} aria-orientation="vertical" className="flex flex-col" style={{ gap: 5, background: "#F3F3FD", borderRadius: 16, padding: 6 }}>
            {days.map((d, i) => {
              const on = d.dayIndex === theDay?.dayIndex;
              const k = dayTotal(d).kcal;
              const sub = d.items.length === 0 ? t("Nothing planned yet") : targets?.kcal ? t("{n} of {target} kcal", { n: fmt(k), target: fmt(targets.kcal) }) : t("{n} kcal", { n: fmt(k) });
              return (
                <button
                  key={d.dayIndex}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => onDay(d.dayIndex)}
                  onKeyDown={(e) => {
                    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
                    if (!step) return;
                    e.preventDefault();
                    const next = days[(i + step + days.length) % days.length];
                    onDay(next.dayIndex);
                    (e.currentTarget.parentElement?.children[(i + step + days.length) % days.length] as HTMLElement | undefined)?.focus();
                  }}
                  className={`flex flex-col justify-center text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8] ${on ? "" : "hover:bg-[#ECE8FB]"}`}
                  style={{ minHeight: 72, boxSizing: "border-box", padding: "0 16px", borderRadius: 12, background: on ? "#A79AD5" : "#F5F4FE", color: on ? "#FFFFFF" : "#6D50D3" }}
                >
                  <span style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600 }}>{d.short}</span>
                  <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, opacity: on ? 0.9 : 0.75 }}>{sub}</span>
                </button>
              );
            })}
          </div>
        </section>

        {theDay && (
          <section aria-label={theDay.name} className="flex flex-col min-w-0" style={{ gridColumn: rail ? "span 5" : "span 9", gap: 16 }}>
            <div className="flex items-center" style={{ boxSizing: "border-box", borderRadius: 20, border: "1px solid rgba(36,31,27,0.08)", padding: "16px 24px", gap: 32, background: "#FFFFFF" }}>
              <div style={{ position: "relative", width: 128, height: 128, flex: "none" }}>
                <svg width="128" height="128" viewBox="0 0 112 112" aria-hidden>
                  <circle cx="56" cy="56" r="46" fill="none" stroke="rgba(36,31,27,0.07)" strokeWidth="10" />
                  <circle cx="56" cy="56" r="46" fill="none" stroke="#7D6BB5" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(C * ring).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 56 56)" />
                </svg>
                <div role="img" aria-label={targets?.kcal ? t("{n} of {target} kcal", { n: fmt(total.kcal), target: fmt(targets.kcal) }) : t("{n} kcal", { n: fmt(total.kcal) })} className="flex flex-col items-center justify-center text-center" style={{ position: "absolute", inset: 0 }}>
                  <span style={{ fontSize: 22, lineHeight: "26px", fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{fmt(total.kcal)}</span>
                  <span style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378", whiteSpace: "nowrap" }}>{targets?.kcal ? t("of {target} kcal", { target: fmt(targets.kcal) }) : t("kcal")}</span>
                  {left != null && (
                    <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: left >= 0 ? "#3F9165" : "#C0392B", whiteSpace: "nowrap" }}>
                      {left >= 0 ? t("{n} left", { n: fmt(left) }) : t("{n} over", { n: fmt(-left) })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#5B5349" }}>{t("{day} total", { day: theDay.name })}</p>
                <div className="grid" style={{ gridTemplateColumns: rail ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: "12px 28px" }}>
                  {macros.map(([label, c, v, tg]) => (
                    <div key={label} className="min-w-0">
                      <div className="flex justify-between items-baseline" style={{ gap: 8 }}>
                        <span className="flex items-center" style={{ gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 700 }}>
                          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                          {label}
                        </span>
                        <span style={{ fontSize: 15, lineHeight: "24px", color: "#5B5349", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          <b style={{ color: "#241F1B" }}>{fmt(v)}</b>
                          {tg ? ` / ${t("{n} g", { n: fmt(tg) })}` : ` ${t("g")}`}
                        </span>
                      </div>
                      <span className="block overflow-hidden" style={{ height: 14, borderRadius: 999, background: "#F5F5F6", marginTop: 4 }}>
                        <span className="block" style={{ width: tg ? `${Math.min(100, Math.round((v / tg) * 100))}%` : "0%", height: "100%", borderRadius: 999, background: c }} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: rail ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 16, alignItems: "start" }}>
              {SLOT_ORDER.map((slot) => (
                <DayMeal key={slot} slot={slot} day={theDay} io={io} recipeLine={recipeLine} flag={flag} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const DayMeal: React.FC<{ slot: (typeof SLOT_ORDER)[number]; day: DayTab; io: MealIO; recipeLine: (item: PlanItem) => string; flag: (item: PlanItem) => React.ReactNode }> = ({ slot, day, io, recipeLine, flag }) => {
  const [focus, setFocus] = useState(0);
  const list = day.items.filter((i) => i.slot === slot);
  const tt = sumMacros(list.map((i) => itemMacros(i, io.src)));
  const label = t(SLOT_LABEL[slot]);
  const fig = (v: number, c?: string, w = 400) => <span style={{ textAlign: "end", fontSize: 15, lineHeight: "24px", fontWeight: w, color: c }}>{fmt(v)}</span>;
  return (
    <section aria-label={label} className="min-w-0 flex flex-col" style={{ position: "relative", boxSizing: "border-box", background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(143,104,246,0.16)", padding: "12px 14px" }}>
      <div className="flex items-center justify-between" style={{ gap: 8, minHeight: 32, marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 800, whiteSpace: "nowrap" }}>
          {label} <span style={{ fontWeight: 600, fontSize: 13, color: "#8C8378", padding: "1px 4px" }}>{t("{n} kcal", { n: fmt(tt.kcal) })}</span>
        </h2>
        {!io.readOnly && (
          <button
            type="button"
            onClick={() => setFocus((n) => n + 1)}
            aria-label={t("Add food to {meal}", { meal: label })}
            className="flex items-center whitespace-nowrap hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ flex: "none", gap: 4, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5F5093", borderRadius: 6 }}
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden />
            {t("Add food")}
          </button>
        )}
      </div>
      <div className="grid items-center" style={{ gridTemplateColumns: FIGS, margin: "0 0 6px", padding: "4px 8px", borderRadius: 8, background: "rgba(143,104,246,0.2)", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#4A3A8C" }}>
        <span className="whitespace-nowrap">{t("Food item · Qty")}</span>
        <span style={{ textAlign: "end" }}>{t("Cals")}</span>
        <span style={{ textAlign: "end" }}>C</span>
        <span style={{ textAlign: "end" }}>P</span>
        <span style={{ textAlign: "end", color: "#2F5F58" }}>F</span>
        <span />
      </div>
      {list.map((it, k) => {
        const m = itemMacros(it, io.src) ?? zero;
        const food = it.kind === "food" || it.kind === "custom_food";
        return (
          <div key={it.id} className="grid items-center" style={{ gridTemplateColumns: FIGS, rowGap: 4, padding: 6, margin: "0 -6px", borderTop: k ? "1px solid rgba(36,31,27,0.06)" : "none", borderRadius: 10, fontVariantNumeric: "tabular-nums" }}>
            <span className="flex items-center min-w-0" style={{ gridColumn: "1 / -1", boxSizing: "border-box", padding: "2px 8px", borderRadius: 6, background: "rgba(143,104,246,0.09)" }}>
              <span title={it.name} className="truncate" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 500, color: "#241F1B" }}>
                {it.name}
              </span>
              {flag(it)}
            </span>
            <span className="flex items-center min-w-0" style={{ gap: 4 }}>
              {food ? (
                <>
                  {io.readOnly ? (
                    <span className="flex items-center justify-center" style={{ width: 56, height: 32, borderRadius: 8, background: "#F5F5F6", fontSize: 15, fontWeight: 600 }}>
                      {it.grams ?? it.servings ?? 1}
                    </span>
                  ) : (
                    <QtyField key={`${it.id}:${it.grams ?? it.servings ?? 1}`} item={it} onSave={io.onQty} />
                  )}
                  <UnitChip item={it} readOnly={io.readOnly} onUnit={io.onUnit} />
                </>
              ) : (
                <span style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349", textWrap: "balance" }}>{recipeLine(it)}</span>
              )}
            </span>
            {fig(m.kcal, undefined, 700)}
            {fig(m.c, "#8175C2")}
            {fig(m.p, "#7D6BB5")}
            {fig(m.f, "#4F8079")}
            <button
              type="button"
              aria-label={t("{name} options", { name: it.name })}
              aria-haspopup="menu"
              disabled={io.readOnly}
              onClick={(e) => io.onItemMenu(it, day.dayIndex, e.currentTarget)}
              className="flex justify-end hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ borderRadius: 4 }}
            >
              <EllipsisVertical size={16} strokeWidth={2} aria-hidden style={{ color: "#8C8378" }} />
            </button>
          </div>
        );
      })}
      {!io.readOnly && (
        <InlineFoodSearch
          variant="day"
          focusKey={focus}
          slot={slot}
          clientId={io.clientId}
          width={0}
          onPick={(draft) => io.onPick(day.dayIndex, draft)}
          onFlagged={(q) => io.onFlagged(day.dayIndex, slot, q)}
          onClose={() => {}}
        />
      )}
      <div className="grid items-center" style={{ gridTemplateColumns: FIGS, marginTop: 8, padding: "6px 8px 0", borderTop: "1px solid rgba(36,31,27,0.08)", fontVariantNumeric: "tabular-nums" }}>
        <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#5B5349" }}>{t("Totals")}</span>
        {fig(tt.kcal, undefined, 800)}
        {fig(tt.c, "#8175C2", 700)}
        {fig(tt.p, "#7D6BB5", 700)}
        {fig(tt.f, "#4F8079", 700)}
        <span />
      </div>
    </section>
  );
};
