import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, ChevronDown } from "lucide-react";
import { CALC_KEYS, NUTRIENT_SECTIONS, type NutrientSection } from "../../../data/nutrientSchema";
import { t } from "../../../i18n/core";
import { ALWAYS_DASH_NAMES, buildRowView, formatAmount, rowHasData, type NutrientData, type RowView } from "./nutrientRows";

// Website viewport v1 · WC-FO (FO Nutrient Sections Web): the Nutrient Summary
// cards at web sizes. "panel" is the Diary's right column (one column, 8
// apart, Popular Nutrients open, or every card open for the full summary);
// "masonry" is the Nutrient Summary page (three columns 24 apart, every card
// open, the eight cards placed so the columns end as evenly as they can in
// reading order, the last card of each column stretched to the bottom). The
// rows are the mobile page's: amounts, targets, %, bars, partial, calculated
// and over-limit notes.

const LAV = "#5F5093";

function RowLine({ view, groupLabel }: { view: RowView; groupLabel?: string }) {
  const { row, target, percent, isOverLimit, partial } = view;
  const alwaysDash = ALWAYS_DASH_NAMES.has(row.name);
  const hasAmount = view.hasAmount && !alwaysDash;
  const amount = alwaysDash ? undefined : view.amount;
  const unit = row.unit ? ` ${row.unit}` : "";
  const amountText = hasAmount && amount !== undefined ? (row.key === CALC_KEYS.omega6to3.key ? `${amount.toFixed(1)} : 1` : `${formatAmount(amount)}${unit}`) : "–";
  let targetText: string;
  if (row.kind === "ref") targetText = t("Ref {ref} · {source}", { ref: row.refText ?? "", source: row.source });
  else if (row.kind === "limit" && target !== null) targetText = t("Limit {amount} · {source}", { amount: `${formatAmount(target)}${unit}`, source: row.source });
  else if (row.kind === "goal" && target !== null)
    targetText =
      row.mgPerKgBodyWeight != null
        ? t("of {amount} · {source} · based on your body weight", { amount: `${formatAmount(target)}${unit}`, source: row.source })
        : t("of {amount} · {source}", { amount: `${formatAmount(target)}${unit}`, source: row.source });
  else targetText = row.source;
  const showPercent = hasAmount && percent !== null;
  const showBar = hasAmount && amount !== undefined && target !== null && row.kind !== "none" && row.kind !== "calc";
  const barPct = showBar && amount !== undefined && target !== null && target > 0 ? Math.min(100, (amount / target) * 100) : 0;
  const isOver = hasAmount && isOverLimit;
  const hasPartial = !!partial && hasAmount;
  const chip: React.CSSProperties = { fontSize: 11, lineHeight: "16px", fontWeight: 700, borderRadius: 6, padding: "2px 6px", whiteSpace: "nowrap" };
  return (
    <div>
      {groupLabel && (
        <p style={{ margin: "0 0 8px", fontSize: 11, lineHeight: "16px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(95,80,147,0.7)" }}>{t(groupLabel)}</p>
      )}
      <div className="flex items-baseline" style={{ gap: 8 }}>
        <span className="flex-1 min-w-0" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
          {row.name}
        </span>
        <span className="flex-none whitespace-nowrap tabular-nums" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: hasAmount ? "#241F1B" : "#B8B1A8" }}>
          {amountText}
        </span>
        <span className="flex-none tabular-nums" style={{ width: 42, textAlign: "end", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: isOver ? "#B4761F" : LAV }}>
          {showPercent && percent !== null ? `${Math.round(percent)}%` : ""}
        </span>
      </div>
      <div className="flex items-center" style={{ gap: 6 }}>
        <span className="flex-1 min-w-0" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378", textWrap: "pretty" } as React.CSSProperties}>
          {targetText}
        </span>
        {hasPartial && partial && (
          <span title={t("Based on {shown} of {of} foods", { shown: partial.shown, of: partial.of })} className="flex-none inline-flex items-center" style={{ ...chip, gap: 3, color: "#8A6A1E", background: "#FBF3E4" }}>
            <AlertCircle size={11} strokeWidth={2.4} aria-hidden />
            {t("partial")}
          </span>
        )}
        {row.kind === "calc" && <span className="flex-none" style={{ ...chip, color: LAV, background: "rgba(174,161,220,0.2)" }}>{t("calculated")}</span>}
      </div>
      {showBar && (
        <span className="block overflow-hidden" style={{ height: 4, borderRadius: 9999, background: "rgba(174,161,220,0.2)", marginTop: 6 }}>
          <span className="block h-full" style={{ borderRadius: 9999, width: `${barPct}%`, background: isOver ? "#D9A441" : row.kind === "ref" ? "#C6BCE9" : "#AEA1DC" }} />
        </span>
      )}
      {isOver && target !== null && (
        <span className="flex items-center" style={{ gap: 6, marginTop: 6, background: "#FBF3E4", borderRadius: 8, padding: "4px 8px" }}>
          <AlertTriangle size={14} color="#B4761F" strokeWidth={2} className="flex-none" aria-hidden />
          <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8A6A1E" }}>{t("Over the {amount} limit", { amount: `${formatAmount(target)}${unit}` })}</span>
        </span>
      )}
      {row.note && <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{row.note}</p>}
      {hasPartial && partial && (
        <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "#8A6A1E" }}>{t("Based on {shown} of {of} foods", { shown: partial.shown, of: partial.of })}</p>
      )}
    </div>
  );
}

function SectionCard({
  section,
  open,
  onToggle,
  data,
  grow,
  cardRef,
}: {
  section: NutrientSection;
  open: boolean;
  onToggle: () => void;
  data: NutrientData;
  grow: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
}) {
  const main = section.rows.map((r) => buildRowView(r, data));
  const sub = section.sub ? section.sub.rows.map((r) => buildRowView(r, data)) : [];
  const all = [...main, ...sub];
  const logged = all.filter(rowHasData).length;
  const flat = [...main.map((v) => ({ view: v, group: v.row.group })), ...sub.map((v) => ({ view: v, group: section.sub?.name }))];
  const visible = data.filter === "logged" ? flat.filter((x) => rowHasData(x.view)) : flat;
  const seen = new Set<string>();
  const rows = visible.map(({ view, group }) => {
    const first = !!group && !seen.has(group);
    if (group) seen.add(group);
    return { view, groupLabel: first ? group : undefined };
  });
  const name = t(section.name);
  return (
    <div
      ref={cardRef}
      data-ns-card={section.id}
      style={{ flex: grow ? "1 0 auto" : "none", boxSizing: "border-box", borderRadius: 16, background: "#FFFFFF", padding: 16, border: "1px solid rgba(174,161,220,0.34)", boxShadow: "0 4px 14px rgba(95,80,147,0.08)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? t("Collapse {section}", { section: name }) : t("Expand {section}", { section: name })}
        className="w-full flex items-center rounded-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2"
        style={{ gap: 10, padding: 0, background: "none", border: "none" }}
      >
        <h3 className="flex-1 min-w-0 text-start" style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
          {name}
        </h3>
        <span className="flex-none whitespace-nowrap tabular-nums" style={{ fontSize: 11, lineHeight: "16px", fontWeight: 700, color: LAV, background: "rgba(174,161,220,0.18)", borderRadius: 8, padding: "2px 8px" }}>
          {t("{n} of {total}", { n: logged, total: all.length })}
        </span>
        <ChevronDown size={14} aria-hidden className="flex-none" style={{ color: "#8C8378", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s" }} />
      </button>
      {open && (
        <div style={{ marginTop: 12, animation: "fade-slide-up .35s cubic-bezier(.22,1,.36,1) both" }}>
          {rows.length === 0 ? (
            <p style={{ margin: 0, padding: "12px 0", textAlign: "center", fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("Nothing logged in this group yet")}</p>
          ) : (
            <div className="flex flex-col" style={{ gap: 12 }}>
              {rows.map(({ view, groupLabel }) => (
                <RowLine key={view.row.key} view={view} groupLabel={groupLabel} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const IDS = NUTRIENT_SECTIONS.map((s) => s.id);
const DEFAULT_COLUMNS = [0, 0, 1, 1, 2, 2, 2, 2];

/**
 * The design's placement (FO Nutrient Sections Web, measure()): every way of
 * putting the eight cards in three non-empty columns whose first cards keep
 * reading order, scored by the spread between the tallest and the shortest
 * column (24 between cards) plus 60 for each card moved from the default
 * 2 · 2 · 4 split.
 */
function bestColumns(heights: number[]): number[] {
  let best = DEFAULT_COLUMNS;
  let bestScore = Infinity;
  const n = heights.length;
  for (let code = 0; code < 3 ** n; code++) {
    let x = code;
    const a: number[] = [];
    for (let i = 0; i < n; i++) {
      a.push(x % 3);
      x = Math.floor(x / 3);
    }
    const sums = [0, 0, 0];
    const cnt = [0, 0, 0];
    a.forEach((c, i) => {
      sums[c] += heights[i];
      cnt[c]++;
    });
    if (cnt.includes(0)) continue;
    const firsts = [0, 1, 2].map((c) => a.indexOf(c));
    if (!(firsts[0] < firsts[1] && firsts[1] < firsts[2])) continue;
    const tot = sums.map((s, c) => s + 24 * (cnt[c] - 1));
    const moves = a.reduce((m, c, i) => m + (c !== DEFAULT_COLUMNS[i] ? 1 : 0), 0);
    const score = Math.max(...tot) - Math.min(...tot) + moves * 60;
    if (score < bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

export function NutrientSectionsWeb({ data, layout, openAll = false }: { data: NutrientData; layout: "panel" | "masonry"; openAll?: boolean }) {
  const masonry = layout === "masonry";
  const allOpen = masonry || openAll;
  const [open, setOpen] = useState<Set<string>>(() => new Set(allOpen ? IDS : ["popular"]));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Masonry: measure each card's own height (its content, not the stretch)
  // and re-place the cards whenever one changes size.
  const cards = useRef<Record<string, HTMLDivElement | null>>({});
  const [assign, setAssign] = useState<number[] | null>(null);
  const measure = useCallback(() => {
    if (!masonry) return;
    const hs = IDS.map((id) => {
      const el = cards.current[id];
      if (!el) return 0;
      const style = getComputedStyle(el);
      const kids = Array.from(el.children) as HTMLElement[];
      const inner = kids.reduce((s, k) => s + k.offsetHeight, 0) + (kids.length > 1 ? 12 : 0);
      return inner + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    });
    if (hs.some((h) => !h)) return;
    const next = bestColumns(hs);
    setAssign((prev) => (prev && prev.join("") === next.join("") ? prev : next));
  }, [masonry]);
  const ro = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    if (!masonry || typeof ResizeObserver === "undefined") return;
    ro.current = new ResizeObserver(() => measure());
    Object.values(cards.current).forEach((el) => el && ro.current?.observe(el));
    return () => ro.current?.disconnect();
  }, [masonry, measure]);
  useLayoutEffect(() => {
    measure();
  }, [measure, open, data.filter]);
  const setCard = (id: string) => (el: HTMLDivElement | null) => {
    cards.current[id] = el;
    if (el) ro.current?.observe(el);
  };

  if (!masonry) {
    return (
      <div className="flex flex-col" style={{ gap: 8 }}>
        {NUTRIENT_SECTIONS.map((s) => (
          <SectionCard key={s.id} section={s} open={open.has(s.id)} onToggle={() => toggle(s.id)} data={data} grow={false} />
        ))}
      </div>
    );
  }

  const columns = assign ?? DEFAULT_COLUMNS;
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: 24 }}>
      {[0, 1, 2].map((c) => {
        const secs = NUTRIENT_SECTIONS.filter((_, i) => columns[i] === c);
        return (
          <div key={c} className="flex flex-col min-w-0" style={{ gap: 24 }}>
            {secs.map((s, j) => (
              <SectionCard key={s.id} section={s} open={open.has(s.id)} onToggle={() => toggle(s.id)} data={data} grow={j === secs.length - 1} cardRef={setCard(s.id)} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
