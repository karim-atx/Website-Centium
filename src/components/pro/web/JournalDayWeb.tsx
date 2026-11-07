import React from "react";
import { Utensils } from "lucide-react";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";

// Professional handover v1, WP-NU-MP.2 (WP-NU Meal Plans Web v3, isJournals):
// web only. The food journal is one white section (r20, the 0.08 border) with
// its head (20 24 0: the 13/20 caps eyebrow, the 22/28 name, the 40 calendar
// button) over a scrolling body (16 24 24, 16 apart): the dietary needs, the
// day tabs (40, r12, equal), the day totals band (r18, the 16% violet tint,
// 20 24, 28 apart: the 140 ring, 120 on the rail, and the Protein / Carbs /
// Fat bars) and the meal cards (2 across, 1 on the rail, 12 apart; r18,
// 14 16: the slot caps, the 132 macro bar with P / C / F, the kcal, then one
// 15/24 row per food).

export const JournalCardWeb: React.FC<{ eyebrow: string; title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ eyebrow, title, right, children }) => (
  <section aria-label={t("Food journal")} className="min-w-0 flex flex-col overflow-hidden" style={{ boxSizing: "border-box", borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)" }}>
    <div className="flex items-start justify-between" style={{ gap: 12, padding: "20px 24px 0" }}>
      <div className="min-w-0">
        <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8C8378" }}>{eyebrow}</p>
        <h2 style={{ margin: "2px 0 0", fontSize: 22, lineHeight: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B", overflowWrap: "anywhere" }}>{title}</h2>
      </div>
      {right}
    </div>
    <div className="flex flex-col" style={{ padding: "16px 24px 24px", gap: 16 }}>
      {children}
    </div>
  </section>
);

export const DayTabsWeb: React.FC<{ days: { key: string; label: string }[]; current: string; onDay: (d: string) => void }> = ({ days, current, onDay }) => (
  <div role="tablist" aria-label={t("Day")} className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(days.length, 3)},minmax(0,1fr))`, gap: 8 }}>
    {days.map((d) => {
      const on = d.key === current;
      return (
        <button
          key={d.key}
          type="button"
          role="tab"
          aria-selected={on}
          onClick={() => onDay(d.key)}
          className="flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ height: 40, borderRadius: 12, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A79AD5" : "#F3F3FD", color: on ? "#FFFFFF" : "#5F5093", whiteSpace: "nowrap" }}
        >
          {d.label}
        </button>
      );
    })}
  </div>
);

export interface MacroTargets {
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

const RC = 2 * Math.PI * 62;
const n0 = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));

export const DayTotalsWeb: React.FC<{ rail: boolean; totals: { kcal: number; protein: number; carbs: number; fat: number }; target: MacroTargets | null }> = ({ rail, totals, target }) => {
  const s = rail ? 120 : 140;
  const k = target?.kcal ?? null;
  const dash = k ? `${(RC * Math.min(1, totals.kcal / k)).toFixed(1)} ${RC.toFixed(1)}` : `0 ${RC.toFixed(1)}`;
  const leftK = k == null ? null : k - totals.kcal;
  const bars = [
    [t("Protein"), totals.protein, target?.protein ?? null, "#7D6BB5"],
    [t("Carbs"), totals.carbs, target?.carbs ?? null, "#AEA1DC"],
    [t("Fat"), totals.fat, target?.fat ?? null, "#A2C8C2"],
  ] as const;
  const cols = rail ? "72px minmax(0,1fr) 92px" : "80px minmax(0,1fr) 96px 72px";
  return (
    <section aria-label={t("Food, day totals")} className="flex items-center" style={{ gap: 28, borderRadius: 18, background: "rgba(174,161,220,0.16)", padding: "20px 24px" }}>
      <span role="img" aria-label={k ? t("Calories {n} of {target}", { n: n0(totals.kcal), target: n0(k) }) : t("Calories {n}", { n: n0(totals.kcal) })} className="relative flex items-center justify-center shrink-0" style={{ width: s, height: s }}>
        <svg width={s} height={s} viewBox="0 0 140 140" className="absolute inset-0" aria-hidden>
          <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="12" />
          <circle cx="70" cy="70" r="62" fill="none" stroke="#7D6BB5" strokeWidth="12" strokeLinecap="round" strokeDasharray={dash} transform="rotate(-90 70 70)" />
        </svg>
        <span className="relative flex flex-col items-center text-center">
          <span style={{ fontSize: 28, lineHeight: "32px", fontWeight: 800, letterSpacing: "-0.03em", color: "#241F1B", fontVariantNumeric: "tabular-nums" }}>{n0(totals.kcal)}</span>
          <span style={{ fontSize: 13, lineHeight: "18px", fontWeight: 600, color: "#5F5093" }}>{k ? t("of {n} kcal", { n: n0(k) }) : t("No target set")}</span>
          {leftK != null && <span style={{ fontSize: 12, lineHeight: "16px", fontWeight: 800, color: leftK >= 0 ? "#3F9165" : "#C0392B" }}>{leftK >= 0 ? t("{n} left", { n: n0(leftK) }) : t("{n} over", { n: n0(-leftK) })}</span>}
        </span>
      </span>
      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 14 }}>
        <span className="flex items-center" style={{ gap: 8 }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.85)" }}>
            <Utensils size={17} strokeWidth={1.5} aria-hidden style={{ color: "#5F5093" }} />
          </span>
          <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(95,80,147,0.8)" }}>{t("Food")}</span>
        </span>
        {bars.map(([l, a, tg, c]) => {
          const pct = tg ? Math.min(100, (a / tg) * 100) : 0;
          const diff = tg == null ? null : tg - a;
          return (
            <div key={l} className="grid items-center" style={{ gridTemplateColumns: cols, gap: 12 }}>
              <span className="flex items-center" style={{ gap: 6, fontSize: 15, lineHeight: "20px", fontWeight: 700, color: "#241F1B" }}>
                <span aria-hidden className="shrink-0" style={{ width: 8, height: 8, borderRadius: 999, background: c }} />
                {l}
              </span>
              <span className="overflow-hidden" style={{ height: 10, borderRadius: 5, background: "rgba(36,31,27,0.07)" }}>
                <span className="block" style={{ height: "100%", width: `${pct.toFixed(1)}%`, borderRadius: 5, background: c }} />
              </span>
              <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5F5093", textAlign: "end", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{tg == null ? t("{n} g", { n: n0(a) }) : `${n0(a)} / ${n0(tg)} g`}</span>
              {!rail && <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: diff != null && diff < 0 ? "#C0392B" : "#3F9165", textAlign: "end", whiteSpace: "nowrap" }}>{diff == null ? "" : diff >= 0 ? t("{n} g left", { n: n0(diff) }) : t("{n} g over", { n: n0(-diff) })}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

/** One meal's card. `items` are the foods logged in that slot; `footer` holds the feedback or the actions. */
export const MealCardWeb: React.FC<{ slot: string; totals: { kcal: number; protein: number; carbs: number; fat: number }; items: { id: string; name: string; kcal: number; flag?: React.ReactNode }[]; footer: React.ReactNode }> = ({ slot, totals, items, footer }) => {
  const mt = totals.protein + totals.carbs + totals.fat;
  const seg = mt > 0 ? [[totals.protein, "#7D6BB5"], [totals.carbs, "#AEA1DC"], [totals.fat, "#A2C8C2"]] as const : [];
  const p = Math.round(totals.protein), c = Math.round(totals.carbs), f = Math.round(totals.fat);
  return (
    <div className="min-w-0 flex flex-col" style={{ boxSizing: "border-box", gap: 10, borderRadius: 18, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", padding: "14px 16px" }}>
      <div className="flex items-center" style={{ gap: 12 }}>
        <span className="flex-1 min-w-0" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8C8378" }}>{slot}</span>
        <span role="img" aria-label={t("{slot}: {kcal} kcal, protein {p} g, carbs {c} g, fat {f} g", { slot, kcal: n0(totals.kcal), p, c, f })} className="flex flex-col shrink-0" style={{ gap: 4, width: 132 }}>
          <span className="flex overflow-hidden" style={{ height: 8, borderRadius: 3, background: "rgba(36,31,27,0.07)" }}>
            {seg.map(([v, col], i) => (
              <span key={i} className="block" style={{ height: "100%", width: `${(v / mt) * 100}%`, background: col }} />
            ))}
          </span>
          <span className="flex justify-between" style={{ gap: 4, fontSize: 11, lineHeight: "16px", fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: "#7D6BB5" }}>{t("P {n}g", { n: p })}</span>
            <span style={{ color: "#8175C2" }}>{t("C {n}g", { n: c })}</span>
            <span style={{ color: "#6F9993" }}>{t("F {n}g", { n: f })}</span>
          </span>
        </span>
        <span className="shrink-0" style={{ width: 64, textAlign: "end", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5B5349", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{t("{n} kcal", { n: n0(totals.kcal) })}</span>
      </div>
      <div className="flex flex-col">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center justify-between" style={{ gap: 12, padding: "6px 0", borderTop: i ? "1px solid rgba(36,31,27,0.06)" : "none" }}>
            <span className="min-w-0 flex flex-wrap items-center" style={{ columnGap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B", overflowWrap: "anywhere" }}>
              {it.name}
              {it.flag}
            </span>
            <span className="shrink-0" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#5B5349", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{t("{n} kcal", { n: n0(it.kcal) })}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto" }}>{footer}</div>
    </div>
  );
};
