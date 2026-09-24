import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { useApp } from "../../context/AppContext";
import {
  BP_ARMS,
  BP_LIMITS,
  BP_POSITIONS,
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
  BP_HOW_TO_MEASURE_STEPS,
  BP_HOW_TO_MEASURE_TITLE,
  BP_WHY_ARM_AND_POSITION,
  SEVERE_READING_MESSAGE,
} from "../../services/blood-pressure/guidance";
import { AlertTriangle, ChevronDown, Info, Trash2 } from "lucide-react";

// Entering one blood-pressure reading.
//
// ITS OWN SHEET, WHERE TWO FIELDS USED TO SIT INLINE. AddMetricSheet had a
// systolic/diastolic pair that autosaved on a 700 ms debounce, which is the
// wrong shape for this: a reading also carries a pulse, a time, an arm, a
// position and a note, and autosaving after the numbers would write a row and
// then update it two or three times while the user was still choosing the arm.
// A reading is one event, saved once, when the person says so.
//
// DEFAULTS ARE DISPLAY ONLY, and the empty form has none. The old pair opened
// on "120/80" — a real, normal, classifiable reading sitting in the fields of
// somebody who had measured nothing. The fields here start blank.

const ARM_LABEL: Record<BpArm, string> = { left: "Left", right: "Right" };
const POSITION_LABEL: Record<BpPosition, string> = {
  sitting: "Sitting",
  standing: "Standing",
  lying: "Lying down",
};

/** yyyy-mm-ddThh:mm in LOCAL time, which is what <input type="datetime-local"> wants. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const digitsOnly = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

export const BloodPressureSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Present when correcting an existing reading rather than adding one. */
  editing?: BloodPressureReading | null;
  /** Called after a successful save or delete, so the caller can re-read. */
  onSaved: () => void;
}> = ({ open, onClose, editing, onSaved }) => {
  const { authUserId, selectedDate, today } = useApp();

  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [when, setWhen] = useState("");
  const [arm, setArm] = useState<BpArm | null>(null);
  const [position, setPosition] = useState<BpPosition | null>(null);
  const [notes, setNotes] = useState("");
  const [howToOpen, setHowToOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset on each fresh open, the pattern MetricDetailSheet uses: one instance
  // is reused for adding and for editing every row, so nothing may bleed from
  // the last visit.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setSys(editing ? String(editing.systolic) : "");
    setDia(editing ? String(editing.diastolic) : "");
    setPulse(editing?.pulse != null ? String(editing.pulse) : "");
    // Defaults to NOW for a new reading, because that is when a cuff is
    // almost always read — but it is an editable field, not an assumption.
    setWhen(toLocalInputValue(editing ? editing.recordedAt : new Date().toISOString()));
    setArm(editing?.arm ?? null);
    setPosition(editing?.position ?? null);
    setNotes(editing?.notes ?? "");
    setHowToOpen(false);
    setError(null);
    setConfirmDelete(false);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const systolic = sys === "" ? null : Number(sys);
  const diastolic = dia === "" ? null : Number(dia);
  // Classified live, so the chip moves as the numbers are typed — but only
  // once both are present, because one number does not have a category.
  const category =
    systolic !== null && diastolic !== null && systolic > diastolic
      ? classifyBloodPressure(systolic, diastolic)
      : null;
  const severe = systolic !== null && diastolic !== null && isSevere(systolic, diastolic);

  const save = async () => {
    if (systolic === null || diastolic === null) {
      setError("Enter both numbers.");
      return;
    }
    if (!when) {
      setError("Enter when you took this reading.");
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
    // The same validator the service runs, called here so the message appears
    // beside the fields rather than after a round trip.
    const invalid = validateBloodPressure(reading);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!authUserId) {
      setError("You need to be signed in to save a reading.");
      return;
    }

    setSaving(true);
    setError(null);
    const recordedAt = new Date(when).toISOString();
    const result = editing
      ? await updateBloodPressure({ id: editing.id, reading, recordedAt })
      : await logBloodPressure({ userId: authUserId, reading, day: selectedDate, today, recordedAt });
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved();
    // A SEVERE READING KEEPS THE SHEET OPEN. Closing straight onto the card
    // would show the same message a scroll away, which is not the same as
    // putting it in front of somebody who has just seen the number.
    if (!severe) onClose();
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

  const fieldStyle =
    "w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit reading" : "Add blood pressure"}
    >
      <div className="animate-fade-slide-up">
        {/* --- the two numbers ------------------------------------------- */}
        <div className="flex items-end gap-2.5 mb-1">
          <label className="flex-1 min-w-0">
            <span className="block text-[11px] font-semibold text-charcoal-soft mb-1">Systolic</span>
            <input
              autoFocus={!editing}
              value={sys}
              onChange={(e) => setSys(digitsOnly(e.target.value, 3))}
              inputMode="numeric"
              placeholder="—"
              aria-label="Systolic, in mmHg"
              className={`${fieldStyle} text-center text-xl font-bold tabular-nums`}
            />
          </label>
          <span className="pb-3 text-xl font-bold text-charcoal-faint">/</span>
          <label className="flex-1 min-w-0">
            <span className="block text-[11px] font-semibold text-charcoal-soft mb-1">Diastolic</span>
            <input
              value={dia}
              onChange={(e) => setDia(digitsOnly(e.target.value, 3))}
              inputMode="numeric"
              placeholder="—"
              aria-label="Diastolic, in mmHg"
              className={`${fieldStyle} text-center text-xl font-bold tabular-nums`}
            />
          </label>
          <label className="w-[86px] shrink-0">
            <span className="block text-[11px] font-semibold text-charcoal-soft mb-1">
              Pulse <span className="font-normal text-charcoal-faint">(optional)</span>
            </span>
            <input
              value={pulse}
              onChange={(e) => setPulse(digitsOnly(e.target.value, 3))}
              inputMode="numeric"
              placeholder="—"
              aria-label="Pulse, in beats per minute"
              className={`${fieldStyle} text-center text-base font-bold tabular-nums`}
            />
          </label>
        </div>
        <p className="text-[10.5px] text-charcoal-faint mb-3">mmHg · mmHg · bpm</p>

        {/* The live category. Text, never colour alone. */}
        {category && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-cream-soft px-3.5 py-2.5 mb-3">
            <span className="text-[12.5px] font-bold text-charcoal">{BP_CATEGORY_LABEL[category]}</span>
            <span className="text-[11px] text-charcoal-faint">{BP_CATEGORY_RANGE[category]}</span>
          </div>
        )}

        {severe && (
          <div
            role="alert"
            className="flex gap-2.5 rounded-2xl px-3.5 py-3 mb-3"
            style={{ background: "rgba(164,35,28,0.08)" }}
          >
            <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "#A4231C" }} />
            <p className="text-[12px] leading-[1.5] font-semibold" style={{ color: "#7E1B15" }}>
              {SEVERE_READING_MESSAGE}
            </p>
          </div>
        )}

        {/* --- when ------------------------------------------------------- */}
        <label className="block mb-3">
          <span className="block text-[11px] font-semibold text-charcoal-soft mb-1">When</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className={`${fieldStyle} text-sm`}
          />
        </label>

        {/* --- arm and position ------------------------------------------- */}
        <div className="mb-3">
          <span className="block text-[11px] font-semibold text-charcoal-soft mb-1.5">Arm</span>
          <div className="flex gap-2">
            {BP_ARMS.map((a) => (
              <Chip key={a} active={arm === a} onClick={() => setArm(arm === a ? null : a)}>
                {ARM_LABEL[a]}
              </Chip>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <span className="block text-[11px] font-semibold text-charcoal-soft mb-1.5">Position</span>
          <div className="flex flex-wrap gap-2">
            {BP_POSITIONS.map((p) => (
              <Chip key={p} active={position === p} onClick={() => setPosition(position === p ? null : p)}>
                {POSITION_LABEL[p]}
              </Chip>
            ))}
          </div>
        </div>

        {/* --- notes ------------------------------------------------------ */}
        <label className="block mb-3">
          <span className="block text-[11px] font-semibold text-charcoal-soft mb-1">
            Note <span className="font-normal text-charcoal-faint">(optional)</span>
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, BP_LIMITS.notesMaxLength))}
            rows={2}
            placeholder="e.g. after a walk, felt dizzy"
            className={`${fieldStyle} text-sm resize-none`}
          />
        </label>

        {/* --- how to measure --------------------------------------------- */}
        <div className="rounded-2xl bg-cream-soft mb-4 overflow-hidden">
          <button
            onClick={() => setHowToOpen((v) => !v)}
            aria-expanded={howToOpen}
            className="tap w-full flex items-center gap-2 px-3.5 py-3 text-left"
          >
            <Info size={14} className="text-primary-dark shrink-0" />
            <span className="flex-1 text-[12.5px] font-bold text-charcoal">{BP_HOW_TO_MEASURE_TITLE}</span>
            <ChevronDown
              size={14}
              className="text-charcoal-faint shrink-0 transition-transform duration-200"
              style={{ transform: howToOpen ? "rotate(180deg)" : undefined }}
            />
          </button>
          {howToOpen && (
            <div className="px-3.5 pb-3.5">
              <ol className="list-decimal pl-4 space-y-1">
                {BP_HOW_TO_MEASURE_STEPS.map((step) => (
                  <li key={step} className="text-[11.5px] leading-[1.5] text-charcoal-soft">
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-2.5 text-[11px] leading-[1.5] text-charcoal-faint">
                {BP_WHY_ARM_AND_POSITION}
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-3">
            {error}
          </p>
        )}

        <Button fullWidth onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Save reading"}
        </Button>

        {editing && (
          <div className="mt-2.5">
            {confirmDelete ? (
              <div className="rounded-2xl bg-cream-soft px-3.5 py-3">
                <p className="text-[12px] text-charcoal-soft mb-2.5">
                  Delete this reading? It won't be recoverable.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </Button>
                  <Button size="sm" onClick={() => void remove()} disabled={saving}>
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="tap w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-status-high"
              >
                <Trash2 size={13} /> Delete this reading
              </button>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
