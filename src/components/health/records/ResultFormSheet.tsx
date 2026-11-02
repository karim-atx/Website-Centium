import { partBSheetTone } from "../log/LogSheetParts";
import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { PopupMenu } from "../../ui/PopupMenu";
import { Toast } from "../../ui/Toast";
import { CalendarPickerSheet } from "../../dashboard/CalendarPickerSheet";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { addStandaloneResult, moveLabResult, updateLabResult, type LabResult } from "../../../services/labs/results";
import {
  LAB_PHASES,
  convertUnit,
  needsPhase,
  noStandardRange,
  prefillRange,
  tidy,
  type CatalogueMarker,
  type LabPhase,
} from "../../../services/labs/catalogueLogic";
import { textPx, linePx } from "../../../theme/textSize";
import { asNumber, draftRange, draftUsable, emptyMarker, numeric, type MarkerDraft } from "../markerDraft";
import { draftFromMarker } from "../MarkerEntryRow";
import { MarkerPickerSheet } from "./MarkerPickerSheet";
import { useHealthMode, fieldStyle, fmtDate, FieldLabel, HelpLine, INK, INK_FAINT } from "./kit";
import { t, tx } from "../../../i18n/core";

// OURS-add-result: HE1.9 ⋮ "Add manually", HE1.9.1 "+ Add result" and a
// history row's swipe Edit. Lavender-header Part B sheet: Marker (picker, or
// fixed when opened from a marker page), Value + unit (the unit choice is
// kept: K1), the editable printed reference range with the app's wording
// (V6-11, KEEP-SAFETY), the cycle phase for a woman's LH / FSH / estradiol,
// Date (standard calendar, future disabled), pinned Save. Adding writes a
// standalone result with its own date (B2 result_date, no panel). Editing
// updates the result; a new date moves it (services/labs/results).

const fmt = (n: number | null) => (n === null ? "" : String(n));

export const ResultFormSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Edit this result; none = add. */
  result?: LabResult | null;
  /** Every result (a move needs to know what each report keeps). */
  allResults?: LabResult[];
  /** Add for this marker (from its page); the marker field is then fixed. */
  fixed?: { marker: CatalogueMarker | null; name: string; unit: string } | null;
  catalogue: CatalogueMarker[] | null;
  onSaved?: (message: string) => void;
}> = ({ open, onClose, result = null, allResults = [], fixed = null, catalogue, onSaved }) => {
  const { authUserId, user, today, reloadHealthRecords } = useApp();
  const { dark, hc } = useHealthMode();
  const online = useOnline();
  const [draft, setDraft] = useState<MarkerDraft>(emptyMarker());
  const [date, setDate] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const unitRef = useRef<HTMLButtonElement | null>(null);

  // Filled once per opening (the caller passes a fresh `fixed` object each
  // render, so its identity must not re-run this).
  const wasOpen = useRef(false);
  useEffect(() => {
    const opening = open && !wasOpen.current;
    wasOpen.current = open;
    if (!opening) return;
    if (result) {
      setDraft({
        ...emptyMarker(),
        markerKey: result.markerKey,
        other: !result.markerKey,
        name: result.name,
        value: String(result.value),
        unit: result.unit,
        low: fmt(result.rangeLow),
        high: fmt(result.rangeHigh),
        rangeFrom: result.rangeLow !== null || result.rangeHigh !== null ? "you" : null,
      });
      setDate(result.date);
    } else if (fixed) {
      setDraft(fixed.marker ? { ...emptyMarker(), ...draftFromMarker(fixed.marker, user.sex, null) } : { ...emptyMarker(), other: true, name: fixed.name, unit: fixed.unit });
      setDate(today);
    } else {
      setDraft(emptyMarker());
      setDate(today);
    }
  }, [open, result, fixed, today, user.sex]);

  const marker = draft.markerKey ? (catalogue?.find((c) => c.key === draft.markerKey) ?? null) : null;
  const patch = (p: Partial<MarkerDraft>) => setDraft((d) => ({ ...d, ...p }));
  const setUnit = (unit: string) => {
    if (!marker) return patch({ unit });
    if (draft.rangeFrom === "list") {
      const range = prefillRange(marker, user.sex, unit, draft.phase);
      return patch({ unit, low: fmt(range?.low ?? null), high: fmt(range?.high ?? null), rangeFrom: range ? "list" : null });
    }
    const conv = (s: string) => {
      const v = asNumber(s);
      if (v === null || !Number.isFinite(v)) return s;
      const out = convertUnit(marker, v, draft.unit, unit);
      return out === null ? s : String(tidy(out));
    };
    patch({ unit, low: conv(draft.low), high: conv(draft.high) });
  };
  const setPhase = (phase: LabPhase) => {
    if (!marker || draft.rangeFrom === "you") return patch({ phase, phaseSuggested: false });
    const range = prefillRange(marker, user.sex, draft.unit, phase);
    patch({ phase, phaseSuggested: false, low: fmt(range?.low ?? null), high: fmt(range?.high ?? null), rangeFrom: range ? "list" : null });
  };

  const save = async () => {
    if (!draftUsable(draft) || !authUserId) return;
    if (!online) return setToast(t("You're offline. Try again when you're connected."));
    setSaving(true);
    const range = draftRange(draft);
    let ok = false;
    if (result) {
      const r = await updateLabResult(result.id, { value: Number(draft.value), unit: draft.unit.trim(), rangeLow: range.low, rangeHigh: range.high });
      ok = r.ok;
      if (ok && date !== result.date) {
        const moved = await moveLabResult(authUserId, { ...result, value: Number(draft.value), unit: draft.unit.trim(), rangeLow: range.low, rangeHigh: range.high }, allResults, date);
        ok = moved.ok;
      }
    } else {
      // B2: a typed single result stands alone with its own date (no panel).
      const r = await addStandaloneResult(authUserId, { name: draft.name, value: Number(draft.value), unit: draft.unit, markerKey: draft.markerKey, rangeLow: range.low, rangeHigh: range.high }, date);
      ok = r.ok;
    }
    if (ok) await reloadHealthRecords();
    setSaving(false);
    if (!ok) return setToast(t("Couldn't save. Try again."));
    onSaved?.(result ? t("Changes saved.") : t("Result added."));
    onClose();
  };

  const box = (w: number | string): React.CSSProperties => ({ ...fieldStyle(dark, hc), width: w, minHeight: 34, height: 34, borderRadius: 9, textAlign: "center", padding: "0 6px", fontWeight: 700, fontVariantNumeric: "tabular-nums" });
  const askPhase = marker ? needsPhase(marker, user.sex) : false;
  const noRange = marker ? noStandardRange(marker, user.sex, draft.unit, draft.phase) : false;
  const markerFixed = !!result || !!fixed;

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={result ? t("Edit result") : t("Add a result")}
        chrome="partB" tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={<CtaButton label={result ? t("Save changes") : t("Save result")} onClick={() => void save()} loading={saving} disabled={!draftUsable(draft)} />}
      >
        <FieldLabel>{t("Marker")}</FieldLabel>
        {markerFixed ? (
          <p style={{ ...fieldStyle(dark, hc, 600), display: "flex", alignItems: "center" }}>{draft.name}</p>
        ) : (
          <button type="button" onClick={() => setPickerOpen(true)} className="tap flex items-center justify-between text-start" style={{ ...fieldStyle(dark, hc, 600), color: draft.name ? INK : INK_FAINT }}>
            {draft.name || t("Choose a marker")}
            <ChevronDown size={16} style={{ color: INK_FAINT }} aria-hidden />
          </button>
        )}
        {draft.other && !markerFixed && (
          <input
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={t("Marker name, as on your report")}
            aria-label={t("Marker name")}
            className="outline-none"
            style={{ ...fieldStyle(dark, hc), marginTop: 8 }}
          />
        )}
        <FieldLabel style={{ marginTop: 16 }}>{t("Value")}</FieldLabel>
        <div className="flex items-center" style={{ gap: 10 }}>
          <input value={draft.value} onChange={(e) => patch({ value: numeric(e.target.value) })} inputMode="decimal" placeholder="–" aria-label={t("Value")} className="outline-none" style={box(80)} />
          {marker && marker.units.length > 1 ? (
            <button ref={unitRef} type="button" onClick={() => setUnitOpen(true)} className="tap flex items-center min-h-[44px]" style={{ gap: 3, fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>
              {draft.unit} <ChevronDown size={13} aria-hidden />
            </button>
          ) : marker ? (
            <span style={{ fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{draft.unit}</span>
          ) : (
            <input value={draft.unit} onChange={(e) => patch({ unit: e.target.value })} placeholder={t("Unit")} aria-label={t("Unit")} className="outline-none" style={box(90)} />
          )}
        </div>
        {askPhase && (
          <>
            <FieldLabel style={{ marginTop: 16 }}>{t("Cycle phase when the sample was taken")}</FieldLabel>
            <select value={draft.phase ?? ""} onChange={(e) => e.target.value && setPhase(e.target.value as LabPhase)} aria-label={t("Cycle phase")} className="outline-none" style={fieldStyle(dark, hc, 600)}>
              <option value="" disabled>
                {t("Choose a phase")}
              </option>
              {LAB_PHASES.map((p) => (
                <option key={p.value} value={p.value}>
                  {t(p.label)}
                </option>
              ))}
            </select>
            <HelpLine>{t("The normal range depends on the phase.")}</HelpLine>
          </>
        )}
        <FieldLabel style={{ marginTop: 16 }}>{t("Reference range")}</FieldLabel>
        <div className="flex items-center" style={{ gap: 8 }}>
          <input value={draft.low} onChange={(e) => patch({ low: numeric(e.target.value), rangeFrom: "you" })} inputMode="decimal" placeholder={t("Low")} aria-label={t("Range low")} className="outline-none" style={box(80)} />
          <span style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-soft))" }}>{tx("to", "range")}</span>
          <input value={draft.high} onChange={(e) => patch({ high: numeric(e.target.value), rangeFrom: "you" })} inputMode="decimal" placeholder={t("High")} aria-label={t("Range high")} className="outline-none" style={box(80)} />
        </div>
        <HelpLine>
          {draft.rangeFrom === "list" ? t("Use the range printed on your report. Pre-filled from Centium's standard list.") : t("Enter the range printed on your report.")}
          {` ${t("If it gives only one limit, leave the other empty.")}`}
          {noRange && ` ${t("The standard list has no range for this marker.")}`}
        </HelpLine>
        {draft.low && draft.high && Number(draft.low) > Number(draft.high) && <HelpLine error>{t("The low end is higher than the high end.")}</HelpLine>}
        <FieldLabel style={{ marginTop: 16 }}>{t("Date")}</FieldLabel>
        <button type="button" onClick={() => setCalendarOpen(true)} className="tap flex items-center text-start" style={{ ...fieldStyle(dark, hc), gap: 8 }}>
          <CalendarDays size={15} style={{ color: INK_FAINT }} aria-hidden />
          {fmtDate(date)}
        </button>
      </BottomSheet>
      <MarkerPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        catalogue={catalogue}
        sex={user.sex}
        onPick={(m) => patch(draftFromMarker(m, user.sex, null))}
        onOther={(name) => patch({ markerKey: null, other: true, name, unit: "", low: "", high: "", rangeFrom: null, phase: null, phaseSuggested: false })}
      />
      {marker && (
        <PopupMenu
          open={unitOpen}
          onClose={() => setUnitOpen(false)}
          anchor={unitRef.current}
          options={marker.units.map((u) => ({ value: u.unit, label: u.unit }))}
          selected={draft.unit}
          onSelect={setUnit}
          width={140}
          align="left"
          hairline
          backdrop={false}
        />
      )}
      <CalendarPickerSheet variant="partB"
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={date}
        today={today}
        maxDate={today}
        onSelect={(d) => {
          setDate(d);
          setCalendarOpen(false);
        }}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );
};
