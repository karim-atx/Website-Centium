import React, { useRef, useState } from "react";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import {
  LAB_PHASES,
  needsPhase,
  noStandardRange,
  prefillRange,
  convertUnit,
  tidy,
  type CatalogueMarker,
  type LabPhase,
} from "../../services/labs/catalogueLogic";
import { PopupMenu } from "../ui/PopupMenu";
import { SwipeActions } from "../ui/SwipeActions";
import { textPx, linePx } from "../../theme/textSize";
import { asNumber, numeric, type MarkerDraft } from "./markerDraft";
import { useHealthMode, hairline, fieldFill, rangeText, INK, INK_SOFT, INK_FAINT } from "./records/kit";
import { t, tx } from "../../i18n/core";

const fmt = (n: number | null) => (n === null ? "" : String(n));

/** What a catalogue pick sets on a draft (unit, range pre-fill, phase). */
export function draftFromMarker(m: CatalogueMarker, sex: string | null | undefined, suggestedPhase: LabPhase | null): Partial<MarkerDraft> {
  const unit = m.canonicalUnit;
  const phase = needsPhase(m, sex) ? suggestedPhase : null;
  const range = prefillRange(m, sex, unit, phase);
  return {
    markerKey: m.key,
    other: false,
    name: m.displayName,
    unit,
    low: fmt(range?.low ?? null),
    high: fmt(range?.high ?? null),
    rangeFrom: range ? "list" : null,
    phase,
    phaseSuggested: phase !== null,
  };
}

/**
 * HE1.9.2.2 #16-#38: one result row in the Results card, 52 tall, pad 0 12,
 * gap 8: tick 22 (#9A8CD6 + Check 13 white; unticked a 1.1px #241F1B@30% ring
 * and the row at 40%), marker name 13/19.5 600 + ChevronDown 13 (opens the
 * marker picker), value box 56 × 34 r9 14/21 700 tnum, unit 11/16.5 600
 * #5B5349, range 10/15 #8C8378. Swipe left deletes the row.
 *
 * KEPT (KEEP-SAFETY, HE1.9.2.2 K1-K3): tapping the unit opens the marker's
 * units (the range converts by the list's factors); tapping the range opens
 * the editable printed range, pre-filled only from a reviewed marker with the
 * app's wording (the printed range wins, V6-11); a woman's LH / FSH /
 * estradiol asks for the cycle phase. An "Other" marker types its own unit.
 */
export const MarkerEntryRow: React.FC<{
  index: number;
  draft: MarkerDraft;
  catalogue: CatalogueMarker[] | null;
  sex: string | null | undefined;
  /** The cycle tracker's phase today, when it is on: offered for a phase-dependent marker. */
  suggestedPhase: LabPhase | null;
  onChange: (patch: Partial<MarkerDraft>) => void;
  onRemove: () => void;
  onChooseMarker: () => void;
  /** Outline the empty field in red (Save tapped with a ticked row incomplete). */
  showErrors?: boolean;
  first?: boolean;
  /**
   * Round E (a report read on the device): what was read for this row, or
   * what still needs typing (attention), under the row with a visible Remove.
   */
  note?: { text: string; attention?: boolean };
}> = ({ index, draft, catalogue, sex, onChange, onRemove, onChooseMarker, showErrors, first, note }) => {
  const { dark, hc } = useHealthMode();
  const marker = draft.markerKey ? (catalogue?.find((c) => c.key === draft.markerKey) ?? null) : null;
  const [expanded, setExpanded] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const unitRef = useRef<HTMLButtonElement | null>(null);
  const n = index + 1;
  const red = dark ? "#F09A8E" : "#C0392B";
  const missingName = showErrors && draft.ticked && !draft.name.trim();
  const missingValue = showErrors && draft.ticked && draft.value.trim() === "";

  const setUnit = (unit: string) => {
    if (!marker) return onChange({ unit });
    if (draft.rangeFrom === "list") {
      const range = prefillRange(marker, sex, unit, draft.phase);
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

  const setPhase = (phase: LabPhase) => {
    if (!marker || draft.rangeFrom === "you") return onChange({ phase, phaseSuggested: false });
    const range = prefillRange(marker, sex, draft.unit, phase);
    onChange({ phase, phaseSuggested: false, low: fmt(range?.low ?? null), high: fmt(range?.high ?? null), rangeFrom: range ? "list" : null });
  };

  const noRange = marker ? noStandardRange(marker, sex, draft.unit, draft.phase) : false;
  const askPhase = marker ? needsPhase(marker, sex) : false;
  const ring = hc ? "rgb(var(--c-charcoal) / 0.6)" : dark ? "rgba(245,243,250,0.3)" : "rgba(36,31,27,0.3)";
  const box: React.CSSProperties = {
    width: 56,
    height: 34,
    borderRadius: 9,
    background: fieldFill(dark),
    border: `0.5px solid ${hairline(dark, hc, 0.1)}`,
    textAlign: "center",
    fontSize: textPx(14),
    lineHeight: linePx(21),
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    color: INK,
  };
  const small: React.CSSProperties = { fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 600, color: INK_SOFT };

  const row = (
    <div style={{ background: "rgb(var(--c-cream-card))" }}>
      <div className="flex items-center" style={{ minHeight: 52, padding: "0 12px", gap: 8, opacity: draft.ticked ? 1 : 0.4 }}>
        <button
          type="button"
          role="checkbox"
          aria-checked={draft.ticked}
          aria-label={draft.name ? t("Include result {n}, {name}", { n, name: draft.name }) : t("Include result {n}", { n })}
          onClick={() => onChange({ ticked: !draft.ticked })}
          className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-[11px] before:content-['']"
          style={draft.ticked ? { width: 22, height: 22, background: "rgb(var(--c-fill-pinned))" } : { width: 22, height: 22, border: `1.1px solid ${ring}` }}
        >
          {draft.ticked && <Check size={13} strokeWidth={2.6} color="#FFFFFF" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={onChooseMarker}
          className="tap flex items-center min-w-0 text-start"
          style={{ flex: "1 1 125px", gap: 3, minHeight: 44, outline: missingName ? `1px solid ${red}` : undefined, borderRadius: 6 }}
          aria-label={t("Marker {n}: {name}", { n, name: draft.name || t("Choose a marker") })}
        >
          <span className="truncate" style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 600, color: draft.name ? INK : INK_FAINT }}>
            {draft.name || t("Choose a marker")}
          </span>
          <ChevronDown size={13} className="shrink-0" style={{ color: INK_FAINT }} aria-hidden />
        </button>
        <input
          value={draft.value}
          onChange={(e) => onChange({ value: numeric(e.target.value) })}
          placeholder="–"
          inputMode="decimal"
          aria-label={t("Marker {n} value", { n })}
          className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          style={{ ...box, outline: missingValue ? `1px solid ${red}` : undefined }}
        />
        <button
          ref={unitRef}
          type="button"
          onClick={() => (marker && marker.units.length > 1 ? setUnitOpen(true) : setExpanded(true))}
          className="tap shrink-0 text-start truncate"
          style={{ ...small, width: 42, minHeight: 44 }}
          aria-label={draft.unit ? t("Marker {n} unit, {unit}", { n, unit: draft.unit }) : t("Marker {n} unit", { n })}
        >
          {draft.unit || t("unit")}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="tap shrink-0 text-end truncate"
          style={{ width: 56, minHeight: 44, fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 400, color: INK_FAINT }}
          aria-label={t("Marker {n} reference range, {range}", { n, range: rangeText(asNumber(draft.low), asNumber(draft.high)) })}
        >
          {rangeText(asNumber(draft.low), asNumber(draft.high))}
        </button>
      </div>
      {note && (
        <div className="flex items-start" style={{ paddingBlock: "0 10px", paddingInline: "42px 12px", gap: 10, marginTop: -4, opacity: draft.ticked ? 1 : 0.4 }}>
          <p className="flex-1 min-w-0" style={{ fontSize: textPx(11), lineHeight: linePx(16), fontWeight: note.attention ? 600 : 400, color: note.attention ? red : INK_FAINT, overflowWrap: "anywhere" }}>
            {note.text}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']"
            style={{ fontSize: textPx(11), lineHeight: linePx(16), fontWeight: 700, color: INK_SOFT }}
            aria-label={draft.name ? t("Remove result {n}, {name}", { n, name: draft.name }) : t("Remove result {n}", { n })}
          >
            {t("Remove")}
          </button>
        </div>
      )}
      {expanded && (
        <div style={{ paddingBlock: "0 12px", paddingInline: "42px 12px" }}>
          {draft.other && (
            <div className="flex" style={{ gap: 8, marginBottom: 8 }}>
              <input
                value={draft.name}
                onChange={(e) => onChange({ name: e.target.value, other: true })}
                placeholder={t("Marker name, as on your report")}
                aria-label={t("Marker {n} name", { n })}
                className="flex-1 min-w-0 outline-none"
                style={{ ...box, width: "auto", textAlign: "start", padding: "0 10px", fontSize: textPx(13), fontWeight: 600 }}
              />
              <input
                value={draft.unit}
                onChange={(e) => onChange({ unit: e.target.value })}
                placeholder={t("Unit")}
                aria-label={t("Marker {n} unit", { n })}
                className="outline-none"
                style={{ ...box, width: 72, fontSize: textPx(12), fontWeight: 600 }}
              />
            </div>
          )}
          {askPhase && (
            <label className="block" style={{ marginBottom: 8 }}>
              <span className="block" style={{ ...small, marginBottom: 4 }}>
                {t("Cycle phase when the sample was taken")}
              </span>
              <select
                value={draft.phase ?? ""}
                onChange={(e) => e.target.value && setPhase(e.target.value as LabPhase)}
                aria-label={t("Marker {n} cycle phase", { n })}
                className="w-full outline-none"
                style={{ ...box, width: "100%", textAlign: "start", padding: "0 10px", fontSize: textPx(13), fontWeight: 600 }}
              >
                <option value="" disabled>
                  {t("Choose a phase")}
                </option>
                {LAB_PHASES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {t(p.label)}
                  </option>
                ))}
              </select>
              <span className="block" style={{ marginTop: 4, fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>
                {draft.phaseSuggested
                  ? t("Suggested from your cycle tracker. The normal range depends on the phase.")
                  : t("The normal range depends on the phase.")}
              </span>
            </label>
          )}
          <span className="block" style={{ ...small, marginBottom: 4 }}>
            {t("Reference range")}
          </span>
          <div className="flex items-center" style={{ gap: 8 }}>
            <input
              value={draft.low}
              onChange={(e) => onChange({ low: numeric(e.target.value), rangeFrom: "you" })}
              placeholder={t("Low")}
              inputMode="decimal"
              aria-label={t("Marker {n} range low", { n })}
              className="outline-none"
              style={box}
            />
            <span style={small}>{tx("to", "range")}</span>
            <input
              value={draft.high}
              onChange={(e) => onChange({ high: numeric(e.target.value), rangeFrom: "you" })}
              placeholder={t("High")}
              inputMode="decimal"
              aria-label={t("Marker {n} range high", { n })}
              className="outline-none"
              style={box}
            />
            {draft.unit && <span style={small}>{draft.unit}</span>}
          </div>
          <p style={{ marginTop: 6, fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>
            {/* Pre-filled only from a reviewed marker (prefillRange), and
                always editable: the range printed on the report wins. A
                one-sided range leaves Low or High empty. */}
            {draft.rangeFrom === "list"
              ? t("Use the range printed on your report. Pre-filled from Centium's standard list.")
              : t("Enter the range printed on your report.")}
            {` ${t("If it gives only one limit, leave the other empty.")}`}
            {noRange && ` ${t("The standard list has no range for this marker.")}`}
          </p>
          {draft.low && draft.high && Number(draft.low) > Number(draft.high) && (
            <p role="alert" style={{ marginTop: 4, fontSize: textPx(11), lineHeight: linePx(16), fontWeight: 600, color: red }}>
              {t("The low end is higher than the high end.")}
            </p>
          )}
        </div>
      )}
      {marker && (
        <PopupMenu
          open={unitOpen}
          onClose={() => setUnitOpen(false)}
          anchor={unitRef.current}
          options={marker.units.map((u) => ({ value: u.unit, label: u.unit }))}
          selected={draft.unit}
          onSelect={(u) => setUnit(u)}
          width={140}
          align="right"
          hairline
          backdrop={false}
        />
      )}
    </div>
  );

  return (
    <div style={{ borderTop: first ? undefined : `0.5px solid ${hairline(dark, hc)}` }}>
      <SwipeActions
        radius={0}
        tileMax={45}
        tileRadius={12}
        edgeInset={8}
        keyboardLabel={draft.name ? t("Result {n}, {name}", { n, name: draft.name }) : t("Result {n}", { n })}
        actions={[{ key: "delete", label: t("Remove result {n}", { n }), icon: <Trash2 size={16} />, onClick: onRemove, destructive: true }]}
      >
        {row}
      </SwipeActions>
    </div>
  );
};
