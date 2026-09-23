import { useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { NUTRIENT_SECTIONS, CALC_KEYS, type NutrientRow, type NutrientSection } from "../../data/nutrientSchema";

// Pure, page-agnostic renderer for the Nutrient Summary's 8 sections —
// shared between the full Nutrient Summary page (mobile handoff item 9) and
// the embedded "Advanced" nutrient view (items 2 and 10). Everything
// page-level (PageHeader, the filter popover chrome, the empty-day banner's
// framing) stays out of this file on purpose so it can be dropped into a
// sheet step later without carrying routing/header assumptions with it.

export type NutrientFilter = "all" | "logged";

export interface NutrientSectionsData {
  /** Summed amount per canonical nutrient key (src/data/nutrientSchema.ts). */
  totals: Record<string, number>;
  /** How many of the day's/item's inputs actually had that key. */
  present: Record<string, number>;
  itemCount: number;
}

export interface NutrientSectionsProps extends NutrientSectionsData {
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  /** null when the user has no body weight on record — amino-acid rows then show no target rather than guessing one. */
  bodyWeightKg: number | null;
  filter: NutrientFilter;
  /**
   * Suppresses the full-day "nothing logged" banner. The Nutrient Summary
   * page sums a whole diary day, where itemCount === 0 means the day is
   * empty; items 2/10 embed this component for a single food's or recipe's
   * totals, where itemCount === 0 just means that one item carries no
   * nutrient data — not an empty day — so the page-level empty-day framing
   * doesn't apply there.
   */
  suppressEmptyState?: boolean;
}

// ---- Calculated-row resolvers ---------------------------------------------
// Calc keys are never looked up in imported data — they're derived here from
// the other keys already summed into `totals`. A component missing from the
// day entirely (not just logged at 0) means the derived figure can't be
// honestly stated either, so it falls back to "—" rather than assuming 0.

function sumPresent(totals: Record<string, number>, keys: readonly string[]): number | undefined {
  const values = keys.map((k) => totals[k]).filter((v): v is number => v !== undefined);
  if (values.length === 0) return undefined;
  return values.reduce((s, v) => s + v, 0);
}

function computeCalcAmount(key: string, totals: Record<string, number>): number | undefined {
  if (key === CALC_KEYS.netCarbs.key) {
    const [carbsKey, fiberKey] = CALC_KEYS.netCarbs.from;
    const carbs = totals[carbsKey];
    const fiber = totals[fiberKey];
    if (carbs === undefined || fiber === undefined) return undefined;
    return Math.max(0, carbs - fiber);
  }
  if (key === CALC_KEYS.totalMcts.key) {
    return sumPresent(totals, CALC_KEYS.totalMcts.from);
  }
  if (key === CALC_KEYS.omega6to3.key) {
    const n6 = sumPresent(totals, CALC_KEYS.omega6to3.n6);
    const n3 = sumPresent(totals, CALC_KEYS.omega6to3.n3);
    if (n6 === undefined && n3 === undefined) return undefined;
    if (!n3) return undefined; // no omega-3 data to express a ratio against
    return (n6 ?? 0) / n3;
  }
  return undefined;
}

// ---- Target resolution ------------------------------------------------

const FROM_GOALS_TARGET_BY_NAME: Record<string, "calorieTarget" | "proteinTarget" | "carbTarget" | "fatTarget"> = {
  Calories: "calorieTarget",
  Protein: "proteinTarget",
  "Total fat": "fatTarget",
  "Total carbohydrates": "carbTarget",
};

function resolveTarget(
  row: NutrientRow,
  ctx: Pick<NutrientSectionsProps, "calorieTarget" | "proteinTarget" | "carbTarget" | "fatTarget" | "bodyWeightKg">
): number | null {
  if (row.fromGoals) {
    const targetKey = FROM_GOALS_TARGET_BY_NAME[row.name];
    return targetKey ? ctx[targetKey] : null;
  }
  if (row.mgPerKgBodyWeight) {
    if (ctx.bodyWeightKg == null) return null;
    return (row.mgPerKgBodyWeight * ctx.bodyWeightKg) / 1000;
  }
  return row.target;
}

// ---- Formatting -----------------------------------------------------------

function formatAmount(n: number): string {
  const rounded = Math.abs(n) < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// ---- Row view model ---------------------------------------------------

interface RowView {
  row: NutrientRow;
  amount: number | undefined;
  hasAmount: boolean;
  target: number | null;
  percent: number | null;
  isOverLimit: boolean;
  partial: { shown: number; of: number } | null;
}

function buildRowView(row: NutrientRow, props: NutrientSectionsProps): RowView {
  const { totals, present, itemCount } = props;
  const amount = row.kind === "calc" ? computeCalcAmount(row.key, totals) : totals[row.key];
  const hasAmount = amount !== undefined;
  const target = row.kind === "none" || row.kind === "calc" ? null : resolveTarget(row, props);

  let percent: number | null = null;
  let isOverLimit = false;
  if (hasAmount && amount !== undefined && target !== null && target > 0 && (row.kind === "goal" || row.kind === "limit")) {
    percent = (amount / target) * 100;
    isOverLimit = row.kind === "limit" && amount > target;
  }

  // Calc rows have no `present` entry of their own (they're derived, not
  // looked up), so a partial-data chip isn't attempted for them.
  const presentCount = row.kind === "calc" ? undefined : present[row.key];
  const partial =
    row.kind !== "calc" && hasAmount && itemCount > 0 && presentCount !== undefined && presentCount < itemCount
      ? { shown: presentCount, of: itemCount }
      : null;

  return { row, amount, hasAmount, target, percent, isOverLimit, partial };
}

function rowIsZero(view: RowView): boolean {
  return !view.hasAmount || view.amount === 0;
}

// ---- Row rendering ----------------------------------------------------

function NutrientRowLine({ view }: { view: RowView }) {
  const { row, amount, hasAmount, target, percent, isOverLimit, partial } = view;
  const isRatioRow = row.key === CALC_KEYS.omega6to3.key;

  const amountText =
    hasAmount && amount !== undefined
      ? isRatioRow
        ? `${amount.toFixed(1)} : 1`
        : `${formatAmount(amount)}${row.unit ? ` ${row.unit}` : ""}`
      : "—";

  const targetText =
    row.kind === "ref"
      ? row.refText ?? "Ref"
      : row.kind === "none" || row.kind === "calc"
        ? null
        : target !== null
          ? `${formatAmount(target)}${row.unit ? ` ${row.unit}` : ""}`
          : "—";

  const showBar = row.kind === "ref" ? target !== null : (row.kind === "goal" || row.kind === "limit") && target !== null;
  const barPct =
    showBar && hasAmount && amount !== undefined && target !== null && target > 0
      ? Math.min(100, (amount / target) * 100)
      : 0;

  return (
    <div className="py-[9px] border-b border-charcoal/[0.06] last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 text-[12px] font-semibold text-charcoal truncate">{row.name}</span>
        <div className="flex items-center gap-1 shrink-0">
          {row.kind === "limit" && (
            <span className="text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-[2px] bg-status-caution-bg text-status-caution">
              Limit
            </span>
          )}
          {row.kind === "ref" && (
            <span className="text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-[2px] bg-charcoal/[0.07] text-charcoal-faint">
              Ref
            </span>
          )}
          {row.kind === "calc" && (
            <span className="text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-[2px] bg-team-lavender/[0.18] text-team-lavender-deep">
              Calculated
            </span>
          )}
          {partial && (
            <span className="text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-[2px] bg-status-caution-bg text-status-caution">
              Partial
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-[3px]">
        <span className="text-[11.5px] font-bold text-charcoal-soft tabular-nums">{amountText}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          {targetText && <span className="text-[10px] text-charcoal-faint tabular-nums">{targetText}</span>}
          {percent !== null && (
            <span
              className={clsx(
                "text-[10.5px] font-bold tabular-nums",
                isOverLimit ? "text-status-caution" : "text-charcoal-soft"
              )}
            >
              {Math.round(percent)}%
            </span>
          )}
        </span>
      </div>

      {showBar && (
        <div className="mt-1.5 h-1 rounded-full bg-charcoal/[0.07] overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-full",
              row.kind === "ref" ? "bg-charcoal/25" : isOverLimit ? "bg-status-caution" : "bg-primary"
            )}
            style={{ width: `${barPct}%` }}
          />
        </div>
      )}

      {isOverLimit && target !== null && (
        <p className="mt-1 text-[10px] font-semibold text-status-caution">
          Over the {formatAmount(target)}
          {row.unit ? ` ${row.unit}` : ""} limit
        </p>
      )}

      {partial && (
        <p className="mt-1 text-[10px] text-charcoal-faint">
          Based on {partial.shown} of {partial.of} foods
        </p>
      )}

      {row.mgPerKgBodyWeight != null && target !== null && (
        <p className="mt-1 text-[10px] text-charcoal-faint">Target based on your body weight.</p>
      )}

      {row.note && <p className="mt-1 text-[10px] italic text-charcoal-faint">{row.note}</p>}
    </div>
  );
}

// ---- Section rendering --------------------------------------------------

function NutrientSectionBlock({
  section,
  expanded,
  onToggle,
  data,
}: {
  section: NutrientSection;
  expanded: boolean;
  onToggle: () => void;
  data: NutrientSectionsProps;
}) {
  const mainViews = section.rows.map((row) => buildRowView(row, data));
  const subViews = section.sub ? section.sub.rows.map((row) => buildRowView(row, data)) : [];
  const allViews = [...mainViews, ...subViews];
  const loggedCount = allViews.filter((v) => v.hasAmount).length;

  const visibleMain = data.filter === "logged" ? mainViews.filter((v) => !rowIsZero(v)) : mainViews;
  const visibleSub = data.filter === "logged" ? subViews.filter((v) => !rowIsZero(v)) : subViews;
  const nothingUnderFilter = data.filter === "logged" && visibleMain.length === 0 && visibleSub.length === 0;

  return (
    <div
      className={clsx(
        "rounded-[15px] px-3.5 py-[13px]",
        !expanded && "border border-charcoal/[0.08]"
      )}
      style={{ background: expanded ? "rgba(174,161,220,0.12)" : "#FFFFFF" }}
    >
      <button
        onClick={onToggle}
        className="tap w-full flex items-center gap-2.5"
        aria-label={expanded ? `Collapse ${section.name}` : `Expand ${section.name}`}
      >
        <h3 className="flex-1 min-w-0 text-left text-[13.5px] font-bold text-charcoal">{section.name}</h3>
        <span className="shrink-0 text-[11px] font-semibold text-charcoal-faint tabular-nums">
          {loggedCount} of {allViews.length}
        </span>
        <ChevronDown
          size={14}
          className="text-charcoal-faint shrink-0"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s" }}
        />
      </button>

      {expanded && (
        <div className="mt-[11px]">
          {nothingUnderFilter ? (
            <p className="py-3 text-center text-[11.5px] text-charcoal-faint">Nothing logged in this group yet</p>
          ) : (
            <>
              <div className="flex flex-col">
                {visibleMain.map((v) => (
                  <NutrientRowLine key={v.row.key} view={v} />
                ))}
              </div>
              {section.sub && visibleSub.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-charcoal-faint mb-1">
                    {section.sub.name}
                  </p>
                  <div className="flex flex-col">
                    {visibleSub.map((v) => (
                      <NutrientRowLine key={v.row.key} view={v} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function NutrientSections(props: NutrientSectionsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(["popular"]));

  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isEmptyDay = props.itemCount === 0 && !props.suppressEmptyState;

  return (
    <div className="flex flex-col gap-2">
      {isEmptyDay && (
        <div className="rounded-[15px] bg-cream-card border border-charcoal/[0.08] px-3.5 py-3 text-center">
          <p className="text-[12px] font-semibold text-charcoal-soft">Nothing logged for this day yet</p>
          <p className="mt-0.5 text-[10.5px] text-charcoal-faint">
            Log a meal to see your nutrient breakdown fill in below.
          </p>
        </div>
      )}
      {NUTRIENT_SECTIONS.map((section) => (
        <NutrientSectionBlock
          key={section.id}
          section={section}
          expanded={expandedIds.has(section.id)}
          onToggle={() => toggle(section.id)}
          data={props}
        />
      ))}
    </div>
  );
}
