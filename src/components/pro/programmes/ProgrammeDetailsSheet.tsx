import React, { useState } from "react";
import { BottomSheet } from "../../ui/BottomSheet";
import { Button } from "../../ui/Button";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { createProgramme, updateProgramme, type Programme } from "../../../services/programmes";
import { MAX_WEEKS, NAME_MAX, TEXT_MAX } from "../../../services/programmes/model";

/**
 * Round D · DT1: a week-by-day programme's details, new or edited: name
 * (1–120), length (1–52 weeks), description and coach note (up to 2,000
 * each). create_programme / update_programme; a length that would cut off
 * a week with workouts is refused (22023) and said plainly.
 */
const FIELD = "w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20";

export const ProgrammeDetailsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** null: a new programme. */
  programme: Programme | null;
  /** Called with the programme's id after a save. */
  onSaved: (id: string) => void;
}> = ({ open, onClose, programme, onSaved }) => {
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState("4");
  const [description, setDescription] = useState("");
  const [coachNote, setCoachNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filled from the programme each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(programme?.name ?? "");
      setWeeks(String(programme?.durationWeeks ?? 4));
      setDescription(programme?.description ?? "");
      setCoachNote(programme?.coachNote ?? "");
      setError(null);
      setBusy(false);
    }
  }

  const n = Number(weeks);
  const weeksOk = Number.isInteger(n) && n >= 1 && n <= MAX_WEEKS;
  const ok = name.trim().length > 0 && weeksOk && !busy;

  const save = async () => {
    setBusy(true);
    setError(null);
    const fields = { name, durationWeeks: n, description, coachNote };
    const r = programme ? await updateProgramme(programme.id, fields) : await createProgramme(fields);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onSaved(programme ? programme.id : (r.data as string));
    onClose();
  };

  const label = (text: string) => <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{text}</span>;

  return (
    <BottomSheet open={open} onClose={onClose} title={programme ? "Edit programme" : "New programme"}>
      <div className="space-y-4 animate-fade-slide-up">
        <label className="block">
          {label("Name")}
          <input value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} className={FIELD} placeholder="Strength block" />
        </label>
        <label className="block">
          {label("Length in weeks")}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_WEEKS}
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            className={FIELD}
            style={{ maxWidth: 140 }}
          />
          {!weeksOk && weeks !== "" && <span className="block mt-1.5" style={{ fontSize: textPx(11.5), color: INK.hi }}>Between 1 and 52 weeks.</span>}
        </label>
        <label className="block">
          {label("Description (optional)")}
          <textarea value={description} maxLength={TEXT_MAX} onChange={(e) => setDescription(e.target.value)} rows={3} className={FIELD} />
        </label>
        <label className="block">
          {label("Coach note (clients see this)")}
          <textarea value={coachNote} maxLength={TEXT_MAX} onChange={(e) => setCoachNote(e.target.value)} rows={3} className={FIELD} placeholder="Keep the last two reps hard but clean." />
        </label>
        {error && (
          <p role="alert" style={{ fontSize: textPx(11.5), fontWeight: 600, color: INK.hi }}>
            {error}
          </p>
        )}
        <Button fullWidth size="lg" disabled={!ok} onClick={() => void save()}>
          {busy ? "Saving…" : programme ? "Save" : "Create programme"}
        </Button>
      </div>
    </BottomSheet>
  );
};
