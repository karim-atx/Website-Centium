import { usePregnancyFlags } from "../pregnancy/usePregnancyFlags";
import { FlagNote } from "../ui/FlagNote";
import { HealthDisclaimer } from "../ui/HealthDisclaimer";
import React, { useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { Toast } from "../ui/Toast";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import {
  BP_LIMITS,
  deleteBloodPressure,
  logBloodPressure,
  updateBloodPressure,
  validateBloodPressure,
  type BloodPressureReading,
  type BpArm,
  type BpPosition,
} from "../../services/blood-pressure";
import { classifyBloodPressure, isSevere } from "../../services/blood-pressure/classify";
import {
  BP_CATEGORY_LABEL,
  BP_CATEGORY_RANGE,
  BP_HOW_TO_MEASURE_TITLE,
  BP_LOG_SHEET_DISCLAIMER,
  SEVERE_READING_MESSAGE,
} from "../../services/blood-pressure/guidance";
import { BpVeryHighPopup, shouldOpenBpVeryHigh } from "./BpVeryHighPopup";
import { BpHowToMeasureSheet } from "./BpHowToMeasureSheet";
import { browserOffline, enqueueLog, isOfflineFailure, QUEUED_COPY } from "../../services/health-log/offlineQueue";
import { FieldLabel, MeasuredOnPopup, Segmented, WhenField, hairAt, isoDay, partBSheetTone, whenLabel } from "./log/LogSheetParts";
import type { BloodPressureInput } from "../../services/blood-pressure/reading";
import { useLogQueueFlush } from "./log/useLogQueue";
import { AlertTriangle, Info, Trash2 } from "lucide-react";

// HE1.6.1 "Log blood pressure" (health-b-handover.md 3014-3145): the shared
// Log sheet for one reading. Systolic / Diastolic / Pulse boxes in one row,
// Arm and Position as segmented controls, When (the Measured on popup,
// HE1.6.1.a), Note, "How to measure", the sheet's disclaimer line, pinned
// "Save reading".
//
// A READING IS ONE EVENT, saved once, when the person says so: no autosave,
// and the empty form has no numbers in it (a "120/80" default would be a
// real, classifiable reading for somebody who measured nothing).
//
// SAFETY, KEPT AS IT WAS (HE1.6.1 K1-K4):
// - SEVERE_READING_MESSAGE shows inline (role=alert) while the numbers are
//   very high, above Save. A saved reading that is very high (or Urgent in a
//   pregnancy) opens Health A's HE1.6.a popup (BpVeryHighPopup, its own
//   rule shouldOpenBpVeryHigh) in place of the sheet; "Measure again"
//   brings the sheet back empty, Close closes both.
// - During a pregnancy its own levels replace the general category and the
//   severe alert (usePregnancyFlags), shown above Save.
// - The database limits and the repo's validation copy (V6-17).
// - Editing and deleting a reading.

const ARMS: { value: BpArm; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];
// V6-167: "Lying" (was "Lying down").
const POSITIONS: { value: BpPosition; label: string }[] = [
  { value: "sitting", label: "Sitting" },
  { value: "standing", label: "Standing" },
  { value: "lying", label: "Lying" },
];

const digitsOnly = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

export const BloodPressureSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Present when correcting an existing reading rather than adding one. */
  editing?: BloodPressureReading | null;
  /** Called after a successful save or delete, so the caller can re-read. */
  onSaved: () => void;
}> = ({ open, onClose, editing, onSaved }) => {
  const { authUserId, today, refreshAchievements } = useApp();
  const dark = useIsDark();
  useLogQueueFlush();

  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [when, setWhen] = useState<Date>(() => new Date());
  const [whenOpen, setWhenOpen] = useState(false);
  const [arm, setArm] = useState<BpArm | null>(null);
  const [position, setPosition] = useState<BpPosition | null>(null);
  const [notes, setNotes] = useState("");
  const [howToOpen, setHowToOpen] = useState(false);
  const [veryHigh, setVeryHigh] = useState<(BloodPressureInput & { recordedAt: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const diaRef = useRef<HTMLInputElement | null>(null);
  const pulseRef = useRef<HTMLInputElement | null>(null);

  // Reset on each fresh open: one instance is reused for adding and for
  // editing every row, so nothing may bleed from the last visit.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setSys(editing ? String(editing.systolic) : "");
    setDia(editing ? String(editing.diastolic) : "");
    setPulse(editing?.pulse != null ? String(editing.pulse) : "");
    // Defaults to NOW for a new reading, because that is when a cuff is
    // almost always read; it is an editable field, not an assumption.
    setWhen(editing ? new Date(editing.recordedAt) : new Date());
    setArm(editing?.arm ?? null);
    setPosition(editing?.position ?? null);
    setNotes(editing?.notes ?? "");
    setHowToOpen(false);
    setError(null);
    setConfirmDelete(false);
    setVeryHigh(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const systolic = sys === "" ? null : Number(sys);
  const diastolic = dia === "" ? null : Number(dia);
  // Classified live once both are present: one number has no category.
  const category = systolic !== null && diastolic !== null && systolic > diastolic ? classifyBloodPressure(systolic, diastolic) : null;
  // Task Y: during a pregnancy its own levels replace the general category
  // and the severe-reading alert.
  const pregnancyFlags = usePregnancyFlags();
  const inPregnancy = pregnancyFlags.replacesBpBands;
  const severe = !inPregnancy && systolic !== null && diastolic !== null && isSevere(systolic, diastolic);
  const pFlag = systolic !== null && diastolic !== null && systolic > diastolic ? pregnancyFlags.bp({ systolic, diastolic }) : null;

  const save = async () => {
    if (systolic === null || diastolic === null) {
      setError("Enter both numbers.");
      return;
    }
    const reading = {
      systolic,
      diastolic,
      pulse: pulse === "" ? null : Number(pulse),
      arm,
      position,
      notes: notes.trim() ? notes.trim() : null,
    };
    // The same validator the service runs, so the message appears beside the
    // fields rather than after a round trip.
    const invalid = validateBloodPressure(reading);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!authUserId) {
      setError("You need to be signed in to save a reading.");
      return;
    }
    const recordedAt = when.toISOString();
    const day = isoDay(when);
    const opensPopup = shouldOpenBpVeryHigh({ systolic, diastolic }, pregnancyFlags);
    const queue = () => {
      enqueueLog(authUserId, { kind: "bp", reading, day, recordedAt });
      setToast(QUEUED_COPY);
      // The severe check still runs on the device: the message is put in
      // front of the person while the reading waits for a connection.
      if (opensPopup) setVeryHigh({ ...reading, recordedAt });
      else onClose();
    };
    if (!editing && browserOffline()) {
      queue();
      return;
    }

    setSaving(true);
    setError(null);
    const result = editing
      ? await updateBloodPressure({ id: editing.id, reading, recordedAt })
      : await logBloodPressure({ userId: authUserId, reading, day, today, recordedAt });
    // first_bp and the bp_days count both read blood_pressure_readings, so a
    // saved reading is a moment an achievement can land.
    if (result.ok) refreshAchievements();
    setSaving(false);

    if (!result.ok) {
      if (!editing && isOfflineFailure(result)) {
        queue();
        return;
      }
      setError(result.message);
      return;
    }
    onSaved();
    // A VERY HIGH READING IS PUT IN FRONT OF THE PERSON (HE1.6.a).
    if (opensPopup) {
      setVeryHigh({ ...reading, recordedAt });
      return;
    }
    onClose();
  };

  const remove = async () => {
    if (!editing) return;
    setSaving(true);
    const result = await deleteBloodPressure(editing.id);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved();
    onClose();
  };

  const box = (filled: boolean): React.CSSProperties => ({
    width: "100%",
    height: 56,
    borderRadius: 14,
    border: `0.5px solid ${filled ? (dark ? "rgba(169,145,254,0.9)" : "rgba(174,161,220,0.9)") : hairAt(dark, 0.1)}`,
    textAlign: "center",
    fontSize: textPx(24),
    lineHeight: "36px",
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
  });
  const boxClass = "bg-cream-soft text-charcoal placeholder:text-charcoal-faint focus:outline-none";
  const valueLabel = { margin: "0 0 5px", fontSize: textPx(12), lineHeight: "18px", fontWeight: 600 } as const;
  const unit = { margin: "5px 0 0", fontSize: textPx(11), lineHeight: "16.5px", fontWeight: 700 } as const;
  const unitClass = "text-center text-th-7d6bb5 dark:text-primary-deep-text";

  return (
    <>
      <BottomSheet
        open={open && !veryHigh && !howToOpen}
        onClose={onClose}
        title={editing ? "Edit reading" : "Log blood pressure"}
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={
          <div>
            {pFlag && (
              <FlagNote tone={pFlag.level} label={pFlag.label} className="mb-3">
                <p className="mt-0.5 text-[11.5px] leading-[1.45] text-charcoal-soft">{pFlag.text}</p>
              </FlagNote>
            )}
            {severe && (
              <div role="alert" className="flex gap-2.5 rounded-2xl px-3.5 py-3 mb-3" style={{ background: "rgba(164,35,28,0.08)" }}>
                {/* Mobile v5.1 R3, dark mode: danger #FF6B5E for ink and icon (5.7:1 on the 8% red tint over the dark sheet). */}
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-[#A4231C] dark:text-[#FF6B5E]" />
                <p className="text-[12px] leading-[1.5] font-semibold text-[#7E1B15] dark:text-[#FF6B5E]">{SEVERE_READING_MESSAGE}</p>
              </div>
            )}
            {error && (
              <p role="alert" className="text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-3">
                {error}
              </p>
            )}
            <CtaButton
              label={editing ? "Save changes" : "Save reading"}
              disabled={sys === "" || dia === ""}
              loading={saving}
              onClick={() => void save()}
              style={{ lineHeight: "21px" }}
            />
          </div>
        }
      >
        {/* --- the three numbers (HE1.6.1 #56-#59) ----------------------- */}
        <div className="flex items-start">
          <label className="block shrink-0" style={{ width: 100.3 }}>
            <p className="text-center text-charcoal-faint" style={valueLabel}>
              Systolic
            </p>
            <input
              autoFocus={!editing}
              value={sys}
              onChange={(e) => {
                const v = digitsOnly(e.target.value, 3);
                setSys(v);
                if (v.length === 3) diaRef.current?.focus();
              }}
              inputMode="numeric"
              placeholder="–"
              aria-label="Systolic, in mmHg"
              className={boxClass}
              style={box(sys !== "")}
            />
            <p className={unitClass} style={unit}>
              mmHg
            </p>
          </label>
          <span
            aria-hidden
            className="shrink-0 text-charcoal"
            style={{ margin: "36px 9px 0 8px", width: 10.1, fontSize: textPx(26), lineHeight: "39px", fontWeight: 300, opacity: 0.35 }}
          >
            /
          </span>
          <label className="block shrink-0" style={{ width: 100 }}>
            <p className="text-center text-charcoal-faint" style={valueLabel}>
              Diastolic
            </p>
            <input
              ref={diaRef}
              value={dia}
              onChange={(e) => {
                const v = digitsOnly(e.target.value, 3);
                setDia(v);
                if (v.length === 3) pulseRef.current?.focus();
              }}
              inputMode="numeric"
              placeholder="–"
              aria-label="Diastolic, in mmHg"
              className={boxClass}
              style={box(dia !== "")}
            />
            <p className={unitClass} style={unit}>
              mmHg
            </p>
          </label>
          <span className="flex-1" />
          <label className="block shrink-0" style={{ width: 100 }}>
            <p className="text-center text-charcoal-faint whitespace-nowrap" style={valueLabel}>
              Pulse (optional)
            </p>
            <input
              ref={pulseRef}
              value={pulse}
              onChange={(e) => setPulse(digitsOnly(e.target.value, 3))}
              inputMode="numeric"
              placeholder="–"
              aria-label="Pulse, in beats per minute (optional)"
              className={boxClass}
              style={box(pulse !== "")}
            />
            <p className={unitClass} style={unit}>
              bpm
            </p>
          </label>
        </div>

        {/* The live category (kept, not drawn): text, never colour alone. */}
        {category && !inPregnancy && (
          <p className="flex items-center justify-between gap-2 text-charcoal-soft" style={{ margin: "10px 0 0", fontSize: textPx(11.5), lineHeight: "17px" }}>
            <span className="font-bold text-charcoal">{BP_CATEGORY_LABEL[category]}</span>
            <span className="text-charcoal-faint">{BP_CATEGORY_RANGE[category]}</span>
          </p>
        )}

        {/* --- arm and position (HE1.6.1 #60-#63, S7) --------------------- */}
        <div style={{ marginTop: 16 }}>
          <FieldLabel>Arm</FieldLabel>
          <Segmented label="Arm" options={ARMS} value={arm} onChange={setArm} clearable />
        </div>
        <div style={{ marginTop: 16 }}>
          <FieldLabel>Position</FieldLabel>
          <Segmented label="Position" options={POSITIONS} value={position} onChange={setPosition} clearable />
        </div>

        {/* --- when (HE1.6.1 #64-#68) -------------------------------------- */}
        <div style={{ marginTop: 16 }}>
          <FieldLabel>When</FieldLabel>
          <WhenField value={whenLabel(when, today)} onClick={() => setWhenOpen(true)} ariaLabel={`When: ${whenLabel(when, today)}`} />
        </div>

        {/* --- note (HE1.6.1 #69-#70) -------------------------------------- */}
        <div style={{ marginTop: 16 }}>
          <FieldLabel htmlFor="bp-note">Note</FieldLabel>
          <textarea
            id="bp-note"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, BP_LIMITS.notesMaxLength))}
            placeholder="e.g. after a walk, felt dizzy"
            className="block w-full bg-cream-soft text-charcoal placeholder:text-charcoal-faint resize-none focus:outline-none"
            style={{ height: 70, borderRadius: 12, padding: 12, fontSize: textPx(14), lineHeight: "20px", border: `0.5px solid ${hairAt(dark, 0.1)}` }}
          />
        </div>

        {/* --- how to measure (HE1.6.1 #71-#72, S4) ------------------------ */}
        <button
          type="button"
          onClick={() => setHowToOpen(true)}
          aria-haspopup="dialog"
          className="tap relative flex items-center text-th-7d6bb5 dark:text-primary-deep-text before:absolute before:-inset-y-3 before:-inset-x-1 before:content-['']"
          style={{ marginTop: 16, gap: 6, fontSize: textPx(13), lineHeight: "19.5px", fontWeight: 700 }}
        >
          <Info size={15} aria-hidden />
          {BP_HOW_TO_MEASURE_TITLE}
        </button>
        {/* --- disclaimer (HE1.6.1 #73, V6-13) ----------------------------- */}
        <p className="text-center text-charcoal-faint" style={{ margin: "16px 0 0", fontSize: textPx(10.5), lineHeight: "15.8px", fontWeight: 400 }}>
          {BP_LOG_SHEET_DISCLAIMER}
        </p>

        {editing && (
          <div className="mt-3">
            {confirmDelete ? (
              <div className="rounded-2xl bg-cream-soft px-3.5 py-3">
                <p className="text-[12px] text-charcoal-soft mb-2.5">Delete this reading? It won't be recoverable.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmDelete(false)} className="tap flex-1 h-10 rounded-xl text-[13px] font-bold text-charcoal-soft border border-charcoal/[0.14]">
                    Keep it
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove()}
                    disabled={saving}
                    className="tap flex-1 h-10 rounded-xl text-[13px] font-bold bg-status-high text-on-destructive disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="tap w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-status-high"
              >
                <Trash2 size={13} /> Delete this reading
              </button>
            )}
          </div>
        )}
        <HealthDisclaimer className="mt-2" />
      </BottomSheet>
      <BpHowToMeasureSheet open={open && howToOpen} onClose={() => setHowToOpen(false)} />
      <BpVeryHighPopup
        open={open && !!veryHigh}
        reading={veryHigh}
        pregnancy={inPregnancy}
        onClose={() => {
          setVeryHigh(null);
          onClose();
        }}
        onMeasureAgain={() => {
          setVeryHigh(null);
          setSys("");
          setDia("");
          setPulse("");
          setNotes("");
          setWhen(new Date());
        }}
      />
      <MeasuredOnPopup open={whenOpen} onClose={() => setWhenOpen(false)} value={when} today={today} onDone={setWhen} />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );
};
