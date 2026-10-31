import React, { useState } from "react";
import { Check, ChevronDown, ExternalLink, Globe } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { FOOD_DARK } from "./foodDark";
import { textPx } from "../../theme/textSize";
import { saveFoundFood } from "../../services/food/onlineSearch";
import {
  SOURCE_NAME,
  brandServing,
  formatNutrientAmount,
  foundNutrientLines,
  macroLine,
  sourceLine,
  sourcesNote,
  type OnlineFood,
  type OnlineSearchOutcome,
  type OnlineSource,
} from "../../services/food/onlineSearchModel";
import type { FoodSearchResult } from "../../services/food";

// Round D · DP (PLAN D-S17 / D-S18): the online results inside Add Food, and
// the card a result is checked on before anything is saved. In
// recovery-sensitive mode both show the name, brand, serving and source only.

/** "USDA" teal, "Open Food Facts" amber (the MemberTag pill tokens, light and dark). */
export const SourceBadge: React.FC<{ source: OnlineSource }> = ({ source }) => (
  <span
    className={
      source === "usda_fdc"
        ? "bg-th-e7f2f0 text-th-3c6b65 dark:bg-teal-pale dark:text-teal-deep-text"
        : "bg-[#FBF3E2] text-[color:var(--gold-pill-ink)] dark:bg-gold-pale dark:text-[#CAB082]"
    }
    style={{ flex: "none", borderRadius: 6, padding: "2px 7px", fontSize: textPx(10.5), fontWeight: 700, whiteSpace: "nowrap" }}
  >
    {SOURCE_NAME[source]}
  </span>
);

/** "Not what you want? Search online" under the results, or the button in the nothing-found state. */
export const SearchOnlineButton: React.FC<{ variant: "row" | "empty"; onClick: () => void }> = ({ variant, onClick }) => {
  const dark = useIsDark();
  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="tap w-full flex items-center text-start shrink-0"
        style={{ gap: 10, margin: "4px 0 8px", padding: "11px 13px", borderRadius: 14, border: `1px dashed ${dark ? FOOD_DARK.outline : "#D9D5E8"}`, color: "rgb(var(--c-charcoal-soft))", fontSize: textPx(13) }}
      >
        <Globe size={16} className="shrink-0" style={{ color: dark ? FOOD_DARK.lavInk : "rgb(var(--thi-7d67d9))" }} />
        <span className="min-w-0">
          Not what you want? <span style={{ fontWeight: 700, color: dark ? FOOD_DARK.lavInk : "rgb(var(--thi-7d67d9))" }}>Search online</span>
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap inline-flex items-center justify-center self-center"
      style={{ gap: 8, height: 42, padding: "0 18px", borderRadius: 12, background: "rgb(var(--c-cream-card))", border: `1px solid ${dark ? FOOD_DARK.outline : "#E4E4E9"}`, color: "rgb(var(--c-charcoal))", fontSize: textPx(13.5), fontWeight: 700 }}
    >
      <Globe size={15} /> Search online
    </button>
  );
};

const secondaryButton = (dark: boolean): React.CSSProperties => ({
  height: 48,
  borderRadius: 14,
  background: "rgb(var(--c-cream-card))",
  border: `1px solid ${dark ? FOOD_DARK.outline : "#E4E4E9"}`,
  color: "rgb(var(--c-charcoal))",
  fontSize: textPx(14),
  fontWeight: 600,
});
const primaryButton: React.CSSProperties = {
  height: 48,
  borderRadius: 14,
  border: "none",
  background: "rgb(var(--c-fill-cta))",
  color: "rgb(var(--c-on-primary-fill))",
  fontSize: textPx(14),
  fontWeight: 700,
};

/** D-S17: the results for `term`; `result` null while searching. */
export const OnlineResults: React.FC<{
  term: string;
  result: OnlineSearchOutcome | null;
  onPick: (food: OnlineFood) => void;
  onAddYourself: () => void;
  onRetry: () => void;
}> = ({ term, result, onPick, onAddYourself, onRetry }) => {
  const dark = useIsDark();
  const hide = useHideNumbers();
  const muted = { fontSize: textPx(12), color: "rgb(var(--c-charcoal-muted))" } as const;
  const offNotice = result?.ok ? result.results.find((f) => f.source === "open_food_facts")?.attribution.notice ?? null : null;
  const note = result?.ok ? sourcesNote(result.sources) : null;

  return (
    <div className="animate-fade-slide-up flex flex-col" style={{ gap: 6 }}>
      <div style={{ marginBottom: 6 }}>
        <p className="truncate" style={{ margin: 0, fontSize: textPx(15), fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>
          Online results for “{term}”
        </p>
        <p style={{ ...muted, margin: "2px 0 0" }}>From USDA FoodData Central and Open Food Facts</p>
      </div>

      {result === null &&
        [0, 1, 2, 3].map((i) => (
          <div key={i} aria-hidden className="flex items-center motion-safe:animate-pulse" style={{ gap: 12, padding: "10px 0" }}>
            <span style={{ width: 36, height: 36, borderRadius: 12, background: dark ? FOOD_DARK.box : "#F4F4F6" }} />
            <span className="flex-1 flex flex-col" style={{ gap: 6 }}>
              <span style={{ height: 11, width: "62%", borderRadius: 6, background: dark ? FOOD_DARK.box : "#F4F4F6" }} />
              <span style={{ height: 9, width: "40%", borderRadius: 6, background: dark ? FOOD_DARK.box : "#F4F4F6" }} />
            </span>
          </div>
        ))}
      {result === null && <span className="sr-only">Searching online…</span>}

      {result && !result.ok && (
        <div className="flex flex-col items-center text-center" style={{ gap: 12, padding: "20px 4px" }}>
          <p style={{ margin: 0, fontSize: textPx(13.5), color: "rgb(var(--c-charcoal-soft))" }}>{result.message}</p>
          <div className="flex" style={{ gap: 10 }}>
            {(result.kind === "error" || result.kind === "unavailable" || result.kind === "offline") && (
              <button type="button" onClick={onRetry} className="tap" style={{ ...secondaryButton(dark), height: 42, padding: "0 16px" }}>
                Try again
              </button>
            )}
            <button type="button" onClick={onAddYourself} className="tap" style={{ ...secondaryButton(dark), height: 42, padding: "0 16px" }}>
              Add it yourself
            </button>
          </div>
        </div>
      )}

      {result?.ok && result.results.length === 0 && (
        <div className="flex flex-col items-center text-center" style={{ gap: 12, padding: "20px 4px" }}>
          <p style={{ margin: 0, fontSize: textPx(13.5), color: "rgb(var(--c-charcoal-soft))" }}>Nothing online either.</p>
          {note && <p style={{ ...muted, margin: 0 }}>{note}</p>}
          <button type="button" onClick={onAddYourself} className="tap" style={{ ...secondaryButton(dark), height: 42, padding: "0 16px" }}>
            Add it yourself
          </button>
        </div>
      )}

      {result?.ok && result.results.length > 0 && (
        <>
          {note && <p style={{ ...muted, margin: "0 0 4px" }}>{note}</p>}
          <div className="flex flex-col no-scrollbar" style={{ gap: 2, maxHeight: 420, overflowY: "auto", margin: "0 -20px", padding: "0 20px" }}>
            {result.results.map((f) => (
              <button
                key={`${f.source}:${f.ref}`}
                type="button"
                onClick={() => onPick(f)}
                className="tap w-full flex items-center text-start shrink-0"
                style={{ gap: 10, padding: "10px 0", borderBottom: `1px solid ${dark ? FOOD_DARK.rule : "#EFEFF2"}` }}
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ fontSize: textPx(14), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
                    {f.name}
                  </span>
                  <span className="block truncate" style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>
                    {brandServing(f.brand, f.servingLabel)}
                  </span>
                  {!hide && (
                    <span className="block truncate" style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>
                      {macroLine(f)}
                    </span>
                  )}
                </span>
                <span className="flex flex-col items-end shrink-0" style={{ gap: 4 }}>
                  <SourceBadge source={f.source} />
                  {!hide && (
                    <span style={{ fontSize: textPx(12), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{Math.round(f.calories)} kcal</span>
                  )}
                </span>
              </button>
            ))}
          </div>
          {!hide && <p style={{ ...muted, fontSize: textPx(10.5), margin: "6px 0 0" }}>Values are per serving.</p>}
          {offNotice && <p style={{ ...muted, fontSize: textPx(10.5), margin: "4px 0 0", lineHeight: 1.45 }}>{offNotice}</p>}
        </>
      )}
    </div>
  );
};

/**
 * D-S18: a result checked before anything is saved. "Add to diary" saves it
 * to the user's own foods and opens the usual add step (quantity, meal, the
 * allergen check); "Save to my foods" saves it and then offers "Add to diary
 * too". Saving the same result twice is the same food.
 */
export const FoundFoodCard: React.FC<{
  food: OnlineFood;
  onLog: (saved: FoodSearchResult) => void;
  onDone: () => void;
}> = ({ food, onLog, onDone }) => {
  const dark = useIsDark();
  const hide = useHideNumbers();
  const [saving, setSaving] = useState<null | "log" | "save">(null);
  const [saved, setSaved] = useState<FoodSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nutrientsOpen, setNutrientsOpen] = useState(false);
  const lines = foundNutrientLines(food.nutrients);
  const link = dark ? FOOD_DARK.lavInk : "rgb(var(--thi-7d67d9))";

  const save = async (then: "log" | "save") => {
    if (saving) return;
    if (saved) {
      if (then === "log") onLog(saved);
      return;
    }
    setSaving(then);
    setError(null);
    const r = await saveFoundFood(food);
    setSaving(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setSaved(r.food);
    if (then === "log") onLog(r.food);
  };

  return (
    <div className="animate-fade-slide-up">
      <div style={{ background: dark ? FOOD_DARK.box : "#F4F4F6", borderRadius: 16, padding: "13px 14px" }}>
        <div className="flex items-start" style={{ gap: 10 }}>
          <div className="flex-1 min-w-0">
            <p style={{ margin: 0, fontSize: textPx(15), fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>{food.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: textPx(12), color: "rgb(var(--c-charcoal-muted))" }}>{brandServing(food.brand, food.servingLabel)}</p>
          </div>
          <SourceBadge source={food.source} />
        </div>
        {!hide && (
          <div className="grid grid-cols-4 text-center" style={{ marginTop: 12 }}>
            {[
              [`${Math.round(food.calories)}`, "kcal"],
              [`${Math.round(food.protein * 10) / 10}g`, "protein"],
              [`${Math.round(food.carbs * 10) / 10}g`, "carbs"],
              [`${Math.round(food.fat * 10) / 10}g`, "fat"],
            ].map(([v, l]) => (
              <div key={l}>
                <p style={{ margin: 0, fontSize: textPx(15), fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>{v}</p>
                <p style={{ margin: 0, fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>{l}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {!hide && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setNutrientsOpen((v) => !v)}
            aria-expanded={nutrientsOpen}
            className="tap w-full flex items-center text-start"
            style={{ gap: 8, padding: "6px 2px" }}
          >
            <span style={{ flex: 1, fontSize: textPx(12.5), fontWeight: 700, color: "rgb(var(--c-charcoal-soft))" }}>Vitamins and minerals</span>
            <span className="flex" style={{ color: "rgb(var(--c-charcoal-muted))", transform: nutrientsOpen ? "rotate(180deg)" : "none", transition: "transform .18s ease" }}>
              <ChevronDown size={14} />
            </span>
          </button>
          {nutrientsOpen &&
            (lines.length === 0 ? (
              <p style={{ margin: "2px 2px 0", fontSize: textPx(12), color: "rgb(var(--c-charcoal-muted))" }}>This source has no other nutrients for this food.</p>
            ) : (
              <div className="animate-fade-slide-up flex flex-col" style={{ marginTop: 2 }}>
                {lines.map((l) => (
                  <div key={l.key} className="flex items-center justify-between" style={{ padding: "6px 2px", fontSize: textPx(12.5), borderBottom: `1px solid ${dark ? FOOD_DARK.rule : "#EFEFF2"}` }}>
                    <span style={{ color: "rgb(var(--c-charcoal-soft))" }}>{l.name}</span>
                    <span style={{ color: "rgb(var(--c-charcoal))", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {formatNutrientAmount(l.amount)} {l.unit}
                    </span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      <p style={{ margin: "10px 2px 0", fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))", lineHeight: 1.45 }}>
        {food.source === "open_food_facts" ? food.attribution.notice ?? sourceLine(food.source) : sourceLine(food.source)}
        {food.source === "open_food_facts" && food.attribution.url && (
          <>
            {" "}
            <a
              href={food.attribution.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
              style={{ color: link, fontWeight: 600, gap: 3 }}
            >
              View on Open Food Facts <ExternalLink size={11} />
            </a>
          </>
        )}
      </p>
      <p style={{ margin: "6px 2px 0", fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))", lineHeight: 1.45 }}>
        It's saved to your own foods, where you can edit it.
      </p>

      {error && (
        <p className="text-xs font-semibold text-status-high text-center" style={{ margin: "10px 0 0" }}>
          {error}
        </p>
      )}

      {saved ? (
        <>
          <p className="flex items-center justify-center" style={{ gap: 6, margin: "14px 0 0", fontSize: textPx(13), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
            <Check size={15} /> Saved to your foods
          </p>
          <div className="flex" style={{ gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onDone} className="tap flex-1" style={secondaryButton(dark)}>
              Done
            </button>
            <button type="button" onClick={() => onLog(saved)} className="tap flex-1" style={primaryButton}>
              Add to diary too
            </button>
          </div>
        </>
      ) : (
        <div className="flex" style={{ gap: 10, marginTop: 14 }}>
          <button type="button" onClick={() => void save("save")} disabled={!!saving} className="tap flex-1 disabled:opacity-60" style={secondaryButton(dark)}>
            {saving === "save" ? "Saving…" : "Save to my foods"}
          </button>
          <button type="button" onClick={() => void save("log")} disabled={!!saving} className="tap flex-1 disabled:opacity-60" style={primaryButton}>
            {saving === "log" ? "Saving…" : "Add to diary"}
          </button>
        </div>
      )}
    </div>
  );
};
