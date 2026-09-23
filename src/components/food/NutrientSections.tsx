import { useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { NUTRIENT_SECTIONS, CALC_KEYS, type NutrientRow, type NutrientSection } from "../../data/nutrientSchema";

// Pure, page-agnostic renderer for the Nutrient Summary page's 8 sections
// (master handover item 10). The sheet nutrient steps — Add Food, Edit Logged
// Food (item 4) and Meal Prep (item 11) — use NutrientDetailSections below
// instead. Everything
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
    // Item 10: never state a ratio from one side's data alone — omega-6 with
    // no values is unknown, not zero.
    if (n6 === undefined || n3 === undefined) return undefined;
    if (!n3) return undefined; // no omega-3 amount to express a ratio against
    return n6 / n3;
  }
  return undefined;
}

function calcPresentCount(
  key: string,
  totals: Record<string, number>,
  present: Record<string, number>
): number | undefined {
  const components =
    key === CALC_KEYS.netCarbs.key
      ? CALC_KEYS.netCarbs.from
      : key === CALC_KEYS.totalMcts.key
        ? CALC_KEYS.totalMcts.from
        : key === CALC_KEYS.omega6to3.key
          ? [...CALC_KEYS.omega6to3.n6, ...CALC_KEYS.omega6to3.n3]
          : [];
  const counts = components.filter((k) => totals[k] !== undefined).map((k) => present[k] ?? 0);
  return counts.length ? Math.min(...counts) : undefined;
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
  // looked up). Master handover item 10: a figure derived from partial inputs
  // is itself partial — its known-food count is the lowest of the components
  // it was actually computed from.
  const presentCount = row.kind === "calc" ? calcPresentCount(row.key, totals, present) : present[row.key];
  const partial =
    hasAmount && itemCount > 0 && presentCount !== undefined && presentCount < itemCount
      ? { shown: presentCount, of: itemCount }
      : null;

  return { row, amount, hasAmount, target, percent, isOverLimit, partial };
}

// Item 10: the six limit nutrients carry the "limit" chip — trans fat too,
// though it has no Daily Value and so renders amount-only.
const LIMIT_CHIP_NAMES = new Set(["Saturated fat", "Trans fat", "Cholesterol", "Sodium", "Added sugars", "Caffeine"]);

// Item 10: a Daily Value exists for these, but food data never reports them,
// so they always read as a dash — never a zero.
const ALWAYS_DASH_NAMES = new Set(["Chromium", "Chloride"]);

// Item 10: a row has data when it has an amount (a logged 0 counts) and is not
// one of the always-dash rows. Drives the section count and "Logged only".
function rowHasData(view: RowView): boolean {
  return view.hasAmount && !ALWAYS_DASH_NAMES.has(view.row.name);
}

// Item 10 chip: 9px 700, radius 5.
const chipClass = "text-[9px] font-bold rounded-[5px] px-[5px] py-px";

// ---- Row rendering ----------------------------------------------------

function NutrientRowLine({ view }: { view: RowView }) {
  const { row, target, percent, isOverLimit, partial } = view;
  const alwaysDash = ALWAYS_DASH_NAMES.has(row.name);
  const hasAmount = view.hasAmount && !alwaysDash;
  const amount = alwaysDash ? undefined : view.amount;
  const isRatioRow = row.key === CALC_KEYS.omega6to3.key;

  const amountText =
    hasAmount && amount !== undefined
      ? isRatioRow
        ? `${amount.toFixed(1)} : 1`
        : `${formatAmount(amount)}${row.unit ? ` ${row.unit}` : ""}`
      : "—";

  const targetText =
    row.kind === "ref"
      ? `Ref ${row.refText ?? ""}`.trim()
      : row.kind === "none" || row.kind === "calc"
        ? null
        : target !== null
          ? `${formatAmount(target)}${row.unit ? ` ${row.unit}` : ""}`
          : "—";

  // Bars only for a real amount against a real target (goal, limit, or a
  // muted reference bar); an empty day renders no bars at all.
  const showBar =
    hasAmount && target !== null && (row.kind === "ref" || row.kind === "goal" || row.kind === "limit");
  const barPct =
    showBar && amount !== undefined && target !== null && target > 0 ? Math.min(100, (amount / target) * 100) : 0;
  const showPercent = hasAmount && percent !== null;

  return (
    <div className="py-[9px] border-b border-charcoal/[0.06] last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 text-[12px] font-semibold text-charcoal truncate">{row.name}</span>
        <div className="flex items-center gap-1 shrink-0">
          {LIMIT_CHIP_NAMES.has(row.name) && (
            <span className={chipClass} style={{ color: "#8A6A1E", background: "rgba(217,164,65,0.16)" }}>
              limit
            </span>
          )}
          {row.kind === "calc" && (
            <span className={`${chipClass} bg-team-lavender/[0.18] text-team-lavender-deep`}>calculated</span>
          )}
          {partial && hasAmount && (
            <span className={chipClass} style={{ color: "#8A6A1E", background: "rgba(217,164,65,0.16)" }}>
              partial
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-[3px]">
        <span className="text-[11.5px] font-bold text-charcoal-soft tabular-nums">{amountText}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          {targetText && <span className="text-[10px] text-charcoal-faint tabular-nums">{targetText}</span>}
          {showPercent && percent !== null && (
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

      {hasAmount && isOverLimit && target !== null && (
        <p className="mt-1 text-[10px] font-semibold text-status-caution">
          Over the {formatAmount(target)}
          {row.unit ? ` ${row.unit}` : ""} limit
        </p>
      )}

      {partial && hasAmount && (
        <p className="mt-1 text-[10px] text-charcoal-faint">
          Based on {partial.shown} of {partial.of} foods
        </p>
      )}

      {row.mgPerKgBodyWeight != null && target !== null && (
        <p className="mt-1 text-[10px] text-charcoal-faint">based on your body weight</p>
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
  const loggedCount = allViews.filter(rowHasData).length;

  const visibleMain = data.filter === "logged" ? mainViews.filter(rowHasData) : mainViews;
  const visibleSub = data.filter === "logged" ? subViews.filter(rowHasData) : subViews;
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

// ---- Sheet nutrient step (mobile handoff item 4) ---------------------------
// The "Nutrient details" step inside Add Food and Edit Logged Food: one
// food, scaled live to the detail step's amount. Only what has data is
// shown; a group with nothing reads "No data for this food in this group."
// Percentages only against the user's Goals (calories, protein, total fat,
// total carbohydrates) or an FDA Daily Value — the footnote calls every % an
// FDA DV, so reference-intake and body-weight figures (omegas, amino acids)
// show the amount alone. The Nutrient Summary page keeps NutrientSections
// above until item 10.

const LIMIT_NUTRIENTS = new Set(["Saturated fat", "Trans fat", "Cholesterol", "Sodium", "Added sugars", "Caffeine"]);

function formatDetailAmount(n: number): string {
  if (Math.abs(n) < 0.1) return String(Number(n.toFixed(3)));
  if (Math.abs(n) < 10) return n.toFixed(1);
  return Math.round(n).toLocaleString();
}

export interface NutrientDetailSectionsProps {
  /** Amount per canonical nutrient key for this food at the chosen amount. A missing key means no data. */
  totals: Record<string, number>;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  /**
   * Master handover item 11 (Meal Prep): several ingredients. `present[key]`
   * is how many of the `itemCount` ingredients have a value for it. Every row
   * then shows: the value (and % when all ingredients have it), the value
   * with a "partial" chip and "Based on X of N ingredients" when only some
   * do, or "No data" when none do. Omitted for a single food (item 4).
   */
  present?: Record<string, number>;
  itemCount?: number;
}

function detailTarget(row: NutrientRow, props: NutrientDetailSectionsProps): number | null {
  if (row.fromGoals) {
    const targetKey = FROM_GOALS_TARGET_BY_NAME[row.name];
    return targetKey ? props[targetKey] : null;
  }
  if (row.source !== "FDA DV") return null;
  return row.target;
}

function NutrientDetailSection({
  section,
  expanded,
  onToggle,
  props,
}: {
  section: NutrientSection;
  expanded: boolean;
  onToggle: () => void;
  props: NutrientDetailSectionsProps;
}) {
  const rows = section.sub ? [...section.rows, ...section.sub.rows] : section.rows;
  const multi = props.itemCount !== undefined && props.present !== undefined;
  const allRows = rows.map((row) => {
    const amount = row.kind === "calc" ? computeCalcAmount(row.key, props.totals) : props.totals[row.key];
    const known =
      amount === undefined
        ? 0
        : !multi
          ? undefined
          : row.kind === "calc"
            ? calcPresentCount(row.key, props.totals, props.present!) ?? 0
            : props.present![row.key] ?? 0;
    return { row, amount, known };
  });
  const withAmounts = allRows.filter(
    (r): r is { row: NutrientRow; amount: number; known: number | undefined } => r.amount !== undefined
  );
  // A single food hides what it has no value for; several ingredients list
  // every nutrient, saying "No data" where none of them has one.
  const visible = multi ? allRows : withAmounts;

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(174,161,220,0.34)", borderRadius: 12, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        className="tap w-full flex items-center text-left"
        style={{ padding: "10px 12px", gap: 8, background: expanded ? "rgba(174,161,220,0.12)" : "#FFFFFF" }}
        aria-expanded={expanded}
      >
        <span className="flex-1 min-w-0" style={{ fontSize: 12.5, fontWeight: 700, color: "#241F1B" }}>
          {section.name}
        </span>
        <span className="shrink-0 tabular-nums" style={{ fontSize: 10.5, fontWeight: 600, color: "#8C8378" }}>
          {withAmounts.length} of {rows.length}
        </span>
        <ChevronDown
          size={14}
          className="shrink-0"
          style={{ color: "#8C8378", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && (
        <div style={{ padding: "2px 12px 10px" }}>
          {visible.length === 0 ? (
            <p style={{ margin: 0, padding: "7px 0", fontSize: 11.5, color: "#8C8378" }}>
              No data for this food in this group.
            </p>
          ) : (
            visible.map(({ row, amount, known }, i) => {
              const n = props.itemCount ?? 1;
              const hasValue = amount !== undefined;
              const partial = multi && hasValue && known !== undefined && known > 0 && known < n;
              const target = detailTarget(row, props);
              // Several ingredients: a percentage only when every one of them
              // has a value — a partial sum is never presented as complete.
              const percent =
                hasValue && !partial && target !== null && target > 0 ? Math.round((amount / target) * 100) : null;
              const overLimit = hasValue && row.kind === "limit" && target !== null && amount > target;
              const amountText = !hasValue
                ? "No data"
                : row.key === CALC_KEYS.omega6to3.key
                  ? `${formatDetailAmount(amount)} : 1`
                  : `${formatDetailAmount(amount)}${row.unit ? ` ${row.unit}` : ""}`;
              return (
                <div key={row.key} style={{ padding: "7px 0", borderTop: i > 0 ? "1px solid rgba(36,31,27,0.05)" : undefined }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <span className="flex-1 min-w-0" style={{ fontSize: 12.5, color: "#241F1B" }}>
                    {row.name}
                    {LIMIT_NUTRIENTS.has(row.name) && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#8A6A1E",
                          background: "rgba(217,164,65,0.16)",
                          borderRadius: 5,
                          padding: "1px 5px",
                        }}
                      >
                        limit
                      </span>
                    )}
                    {partial && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#8A6A1E",
                          background: "rgba(217,164,65,0.22)",
                          borderRadius: 5,
                          padding: "1px 5px",
                        }}
                      >
                        partial
                      </span>
                    )}
                  </span>
                  <span
                    className="shrink-0 tabular-nums"
                    style={{ fontSize: 12.5, fontWeight: hasValue ? 700 : 500, color: hasValue ? "#241F1B" : "#B3ADA4" }}
                  >
                    {amountText}
                  </span>
                  <span
                    className="shrink-0 tabular-nums"
                    style={{
                      width: 46,
                      textAlign: "right",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: percent === null ? "transparent" : overLimit ? "#B4491F" : "#5F5093",
                    }}
                  >
                    {percent === null ? "—" : `${percent}%`}
                  </span>
                </div>
                {partial && (
                  <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "#8C8378" }}>
                    Based on {known} of {n} ingredients
                  </p>
                )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function NutrientDetailSections(props: NutrientDetailSectionsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(["popular"]));
  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {NUTRIENT_SECTIONS.map((section) => (
        <NutrientDetailSection
          key={section.id}
          section={section}
          expanded={expandedIds.has(section.id)}
          onToggle={() => toggle(section.id)}
          props={props}
        />
      ))}
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
