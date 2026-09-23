import { useState } from "react";
import { AlertCircle, AlertTriangle, ChevronDown } from "lucide-react";
import { NUTRIENT_SECTIONS, CALC_KEYS, type NutrientRow, type NutrientSection } from "../../data/nutrientSchema";

// Pure, page-agnostic renderer for the Nutrient Summary page's 8 sections
// (master handover item 10, CentiumNutrientSummary.dc.html). The sheet
// nutrient steps — Add Food, Edit Logged Food (item 4) and Meal Prep
// (item 11) — use NutrientDetailSections below instead. Everything
// page-level (the header, the filter popover chrome, the footnote) stays in
// NutrientSummaryPage. An empty day has no banner of its own: every amount
// simply reads as a dash, with no bars or percentages (the design's).

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

// The design's fmt(): 2 decimals below 10, 1 below 100, none from 100 up,
// trailing zeros dropped, thousands separators.
function formatAmount(v: number): string {
  const a = Math.abs(v);
  const dp = a >= 100 ? 0 : a >= 10 ? 1 : 2;
  const s = v.toFixed(dp).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
  return Number(s).toLocaleString(undefined, { maximumFractionDigits: dp });
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

// Item 10: a Daily Value exists for these, but food data never reports them,
// so they always read as a dash — never a zero.
const ALWAYS_DASH_NAMES = new Set(["Chromium", "Chloride"]);

// Item 10: a row has data when it has an amount (a logged 0 counts) and is not
// one of the always-dash rows. Drives the section count and "Logged only".
function rowHasData(view: RowView): boolean {
  return view.hasAmount && !ALWAYS_DASH_NAMES.has(view.row.name);
}

// ---- Row rendering ----------------------------------------------------
// Ported from the design's buildRow() and row markup: name / amount / a 42px
// percent slot on one baseline, the target line beneath with the partial and
// calculated chips, then the bar, the over-limit strip and the notes.

const chipStyle = { fontSize: 8.5, fontWeight: 700, borderRadius: 6, padding: "2px 6px", whiteSpace: "nowrap" } as const;

function NutrientRowLine({ view, groupLabel }: { view: RowView; groupLabel?: string }) {
  const { row, target, percent, isOverLimit, partial } = view;
  const alwaysDash = ALWAYS_DASH_NAMES.has(row.name);
  const hasAmount = view.hasAmount && !alwaysDash;
  const amount = alwaysDash ? undefined : view.amount;
  const isRatioRow = row.key === CALC_KEYS.omega6to3.key;
  const unitSuffix = row.unit ? ` ${row.unit}` : "";

  const amountText =
    hasAmount && amount !== undefined
      ? isRatioRow
        ? `${amount.toFixed(1)} : 1`
        : `${formatAmount(amount)}${unitSuffix}`
      : "—";

  let targetText: string;
  if (row.kind === "ref") targetText = `Ref ${row.refText ?? ""} · ${row.source}`;
  else if (row.kind === "limit" && target !== null) targetText = `Limit ${formatAmount(target)}${unitSuffix} · ${row.source}`;
  else if (row.kind === "goal" && target !== null)
    targetText = `of ${formatAmount(target)}${unitSuffix} · ${row.source}${
      row.mgPerKgBodyWeight != null ? " · based on your body weight" : ""
    }`;
  else targetText = row.source;

  // A reference is guidance, not a Daily Value, so it never shows a % —
  // buildRowView only computes one for goal/limit rows.
  const showPercent = hasAmount && percent !== null;
  const showBar = hasAmount && amount !== undefined && target !== null && row.kind !== "none" && row.kind !== "calc";
  const barPct = showBar && amount !== undefined && target !== null && target > 0 ? Math.min(100, (amount / target) * 100) : 0;
  const isOver = hasAmount && isOverLimit;
  const hasPartial = !!partial && hasAmount;

  return (
    <div>
      {groupLabel && (
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(95,80,147,0.7)",
          }}
        >
          {groupLabel}
        </p>
      )}
      <div className="flex items-baseline" style={{ gap: 8 }}>
        <span className="flex-1 min-w-0" style={{ fontSize: 12, fontWeight: 600, color: "#241F1B" }}>
          {row.name}
        </span>
        <span
          className="flex-none tabular-nums whitespace-nowrap"
          style={{ fontSize: 12, fontWeight: 700, color: hasAmount ? "#241F1B" : "#B8B1A8" }}
        >
          {amountText}
        </span>
        {showPercent && percent !== null ? (
          <span
            className="flex-none tabular-nums"
            style={{ width: 42, textAlign: "right", fontSize: 10, fontWeight: 700, color: isOver ? "#B4761F" : "#5F5093" }}
          >
            {Math.round(percent)}%
          </span>
        ) : (
          <span className="flex-none" style={{ width: 42 }} />
        )}
      </div>

      <div className="flex items-center" style={{ gap: 6, marginTop: 3 }}>
        <span
          className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ fontSize: 9.5, color: "#8C8378" }}
        >
          {targetText}
        </span>
        {hasPartial && partial && (
          <span
            title={`Based on ${partial.shown} of ${partial.of} foods`}
            className="flex-none inline-flex items-center"
            style={{ ...chipStyle, gap: 3, color: "#8A6A1E", background: "#FBF3E4" }}
          >
            <AlertCircle size={9} strokeWidth={2.4} style={{ display: "block" }} />
            partial
          </span>
        )}
        {row.kind === "calc" && (
          <span className="flex-none" style={{ ...chipStyle, color: "#5F5093", background: "rgba(174,161,220,0.2)" }}>
            calculated
          </span>
        )}
      </div>

      {showBar && (
        <span
          className="block overflow-hidden"
          style={{ height: 4, borderRadius: 9999, background: "rgba(174,161,220,0.2)", marginTop: 6 }}
        >
          <span
            className="block h-full"
            style={{
              borderRadius: 9999,
              width: `${barPct}%`,
              background: isOver ? "#D9A441" : row.kind === "ref" ? "#C6BCE9" : "#AEA1DC",
            }}
          />
        </span>
      )}

      {isOver && target !== null && (
        <span
          className="flex items-center"
          style={{ gap: 5, marginTop: 6, background: "#FBF3E4", borderRadius: 8, padding: "5px 8px" }}
        >
          <AlertTriangle size={11} color="#B4761F" strokeWidth={2} className="flex-none" style={{ display: "block" }} />
          <span className="whitespace-nowrap" style={{ fontSize: 9.5, fontWeight: 600, color: "#8A6A1E" }}>
            Over the {formatAmount(target)}
            {unitSuffix} limit
          </span>
        </span>
      )}

      {row.note && <p style={{ margin: "5px 0 0", fontSize: 9, lineHeight: 1.45, color: "#8C8378" }}>{row.note}</p>}

      {hasPartial && partial && (
        <p style={{ margin: "4px 0 0", fontSize: 9, lineHeight: 1.45, color: "#8A6A1E" }}>
          Based on {partial.shown} of {partial.of} foods
        </p>
      )}
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

  // The design flattens the sub-group into the section's rows (their group is
  // the sub-group's name) and labels the first row of every group. The label
  // goes on the first *visible* row so "Logged only" never strands a group's
  // rows under the previous group's label.
  const flat = [
    ...mainViews.map((v) => ({ view: v, group: v.row.group })),
    ...subViews.map((v) => ({ view: v, group: section.sub?.name })),
  ];
  const visible = data.filter === "logged" ? flat.filter((x) => rowHasData(x.view)) : flat;
  const seenGroups = new Set<string>();
  const rows = visible.map(({ view, group }) => {
    const first = !!group && !seenGroups.has(group);
    if (group) seenGroups.add(group);
    return { view, groupLabel: first ? group : undefined };
  });

  // Master handover (CentiumNutrientSummary): an always-white card with the
  // lavender hairline and shadow, padded 13px 14px as a whole; the header
  // carries no wash (the design's, chosen over item 10's prose), and an
  // opened body fades up 12px below it.
  return (
    <div
      className="rounded-[15px] bg-white"
      style={{ padding: "13px 14px", border: "1px solid rgba(174,161,220,0.34)", boxShadow: "0 4px 14px rgba(95,80,147,0.08)" }}
    >
      <button
        onClick={onToggle}
        className="tap w-full flex items-center gap-2.5"
        style={{ padding: 0, background: "none" }}
        aria-label={expanded ? `Collapse ${section.name}` : `Expand ${section.name}`}
      >
        <h3 className="flex-1 min-w-0 text-left text-[13.5px] font-bold text-charcoal">{section.name}</h3>
        <span
          className="shrink-0 tabular-nums whitespace-nowrap"
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            color: "#5F5093",
            background: "rgba(174,161,220,0.18)",
            borderRadius: 8,
            padding: "3px 8px",
          }}
        >
          {loggedCount} of {allViews.length}
        </span>
        <ChevronDown
          size={14}
          className="text-charcoal-faint shrink-0"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s" }}
        />
      </button>

      {expanded && (
        <div style={{ marginTop: 12, animation: "fade-slide-up .35s cubic-bezier(.22,1,.36,1) both" }}>
          {rows.length === 0 ? (
            <p style={{ margin: 0, padding: "14px 0", textAlign: "center", fontSize: 11.5, color: "#8C8378" }}>
              Nothing logged in this group yet
            </p>
          ) : (
            <div className="flex flex-col" style={{ gap: 11 }}>
              {rows.map(({ view, groupLabel }) => (
                <NutrientRowLine key={view.row.key} view={view} groupLabel={groupLabel} />
              ))}
            </div>
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

// The handover's detail formatter (CentiumFrame nutrientDetails fmt): zero is
// "0", small amounts keep up to three decimals, and a trailing ".0" drops
// ("2", not "2.0").
function formatDetailAmount(n: number): string {
  const a = Math.abs(n);
  if (a === 0) return "0";
  if (a < 0.1) return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  if (a < 10) return (Math.round(n * 10) / 10).toString();
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
          style={{ color: "#8C8378", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .18s ease" }}
        />
      </button>

      {expanded && (
        <div style={{ padding: "2px 12px 10px" }}>
          {visible.length === 0 ? (
            <p style={{ margin: "8px 0", fontSize: 11.5, color: "#8C8378" }}>
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

  return (
    <div className="flex flex-col gap-2">
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
