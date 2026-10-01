import React, { useState } from "react";
import { Search, X } from "lucide-react";
import {
  catalogueRange,
  convertUnit,
  searchMarkers,
  tidy,
  type CatalogueMarker,
} from "../../services/labs/catalogueLogic";

import { asNumber, emptyMarker, numeric, type MarkerDraft } from "./markerDraft";

const fieldClass =
  "w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20";

const fmt = (n: number | null) => (n === null ? "" : String(n));

/**
 * One row of "Add blood work": pick the marker from the standard list (its
 * names and aliases are searchable) or keep it as "Other"; the unit from the
 * units the list accepts; and the reference range, pre-filled from the list
 * for this person's sex where it differs and always editable.
 */
export const MarkerEntryRow: React.FC<{
  index: number;
  draft: MarkerDraft;
  catalogue: CatalogueMarker[] | null;
  sex: string | null | undefined;
  onChange: (patch: Partial<MarkerDraft>) => void;
  onRemove: () => void;
}> = ({ index, draft, catalogue, sex, onChange, onRemove }) => {
  const [query, setQuery] = useState("");
  const marker = draft.markerKey ? (catalogue?.find((c) => c.key === draft.markerKey) ?? null) : null;
  const choosing = !draft.markerKey && !draft.other && !!catalogue;
  const n = index + 1;

  const choose = (m: CatalogueMarker) => {
    const unit = m.canonicalUnit;
    const range = catalogueRange(m, sex, unit);
    onChange({
      markerKey: m.key,
      other: false,
      name: m.displayName,
      unit,
      low: fmt(range?.low ?? null),
      high: fmt(range?.high ?? null),
      rangeFrom: range ? "list" : null,
    });
    setQuery("");
  };

  const chooseOther = () => {
    onChange({ markerKey: null, other: true, name: query.trim(), unit: "", low: "", high: "", rangeFrom: null });
    setQuery("");
  };

  const change = () => onChange({ ...emptyMarker(), value: draft.value });

  /** A new unit converts the range by the list's factors; a list pre-fill is re-read exactly. */
  const setUnit = (unit: string) => {
    if (!marker) return onChange({ unit });
    if (draft.rangeFrom === "list") {
      const range = catalogueRange(marker, sex, unit);
      return onChange({ unit, low: fmt(range?.low ?? null), high: fmt(range?.high ?? null), rangeFrom: range ? "list" : null });
    }
    const conv = (s: string) => {
      const v = asNumber(s);
      if (v === null || !Number.isFinite(v)) return s;
      const out = convertUnit(marker, v, draft.unit, unit);
      return out === null ? s : String(tidy(out));
    };
    onChange({ unit, low: conv(draft.low), high: conv(draft.high) });
  };

  // Before anything is typed, the first few markers alphabetically; the list's
  // own sort_order groups by category, which reads as random in a flat row.
  const matches = catalogue
    ? query.trim()
      ? searchMarkers(query, catalogue).slice(0, 6)
      : [...catalogue].sort((a, b) => a.displayName.localeCompare(b.displayName)).slice(0, 8)
    : [];
  const listHasRange = marker ? catalogueRange(marker, sex, draft.unit) !== null : false;

  return (
    <div className="rounded-2xl bg-cream-card border border-charcoal/10 p-3">
      {/* --- which marker --- */}
      <div className="flex items-start gap-2 mb-2">
        {choosing ? (
          <div className="flex-1 min-w-0">
            <label className="relative block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markers, e.g. HbA1c"
                aria-label={`Marker ${n}: search the standard list`}
                className={`${fieldClass} pl-8`}
              />
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="listbox" aria-label={`Marker ${n} suggestions`}>
              {matches.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => choose(m)}
                  className="tap rounded-full bg-cream-soft px-3 py-1.5 text-xs font-semibold text-charcoal"
                >
                  {m.displayName}
                </button>
              ))}
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={chooseOther}
                className="tap rounded-full border border-dashed border-charcoal/25 px-3 py-1.5 text-xs font-semibold text-charcoal-soft"
              >
                {query.trim() ? `Other: “${query.trim()}”` : "Other (not on the list)"}
              </button>
            </div>
          </div>
        ) : draft.other || !catalogue ? (
          <input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value, other: true })}
            placeholder="Marker name, as on your report"
            aria-label={`Marker ${n} name`}
            className={fieldClass}
          />
        ) : (
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2 rounded-xl bg-cream-soft px-3 py-2.5">
            <span className="text-sm font-semibold text-charcoal truncate">{draft.name}</span>
            <button type="button" onClick={change} className="tap text-xs font-semibold text-primary-dark shrink-0">
              Change
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove marker ${n}`}
          className="tap w-8 h-8 rounded-full flex items-center justify-center text-charcoal-faint shrink-0"
        >
          <X size={15} />
        </button>
      </div>
      {draft.other && catalogue && (
        <button type="button" onClick={change} className="tap mb-2 text-[11px] font-semibold text-primary-dark">
          Pick from the standard list instead
        </button>
      )}

      {!choosing && (
        <>
          {/* --- value and unit --- */}
          <div className="grid grid-cols-2 gap-2">
            <input
              value={draft.value}
              onChange={(e) => onChange({ value: numeric(e.target.value) })}
              placeholder="Value"
              inputMode="decimal"
              aria-label={`Marker ${n} value`}
              className={fieldClass}
            />
            {marker ? (
              <select
                value={draft.unit}
                onChange={(e) => setUnit(e.target.value)}
                aria-label={`Marker ${n} unit`}
                className={fieldClass}
              >
                {marker.units.map((u) => (
                  <option key={u.unit} value={u.unit}>
                    {u.unit}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={draft.unit}
                onChange={(e) => onChange({ unit: e.target.value })}
                placeholder="Unit (optional)"
                aria-label={`Marker ${n} unit`}
                className={fieldClass}
              />
            )}
          </div>

          {/* --- reference range --- */}
          <p className="mt-2.5 mb-1 text-[11px] font-semibold text-charcoal-soft">Reference range</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={draft.low}
              onChange={(e) => onChange({ low: numeric(e.target.value), rangeFrom: "you" })}
              placeholder="Low"
              inputMode="decimal"
              aria-label={`Marker ${n} range low`}
              className={fieldClass}
            />
            <input
              value={draft.high}
              onChange={(e) => onChange({ high: numeric(e.target.value), rangeFrom: "you" })}
              placeholder="High"
              inputMode="decimal"
              aria-label={`Marker ${n} range high`}
              className={fieldClass}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-charcoal-faint leading-relaxed">
            Use the range printed on your report.
            {draft.rangeFrom === "list" &&
              " Pre-filled from Centium's standard list, which is still awaiting clinical review."}
            {marker && !listHasRange && draft.rangeFrom !== "you" && " The standard list has no range for this marker."}
          </p>
          {draft.low && draft.high && Number(draft.low) > Number(draft.high) && (
            <p className="mt-1 text-[11px] font-semibold text-status-high" role="alert">
              The low end is higher than the high end.
            </p>
          )}
        </>
      )}
    </div>
  );
};
