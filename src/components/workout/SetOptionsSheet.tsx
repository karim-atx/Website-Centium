import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { sessionChipStyle, sessionOptionStyle } from "./sessionSheetStyles";
import { Button } from "../ui/Button";
import type { LoggedSet, SetOutcome, SetType } from "../../types";
import { rpeOptions } from "../../services/workout";

// WHAT KIND OF SET IT WAS, and nothing else.
//
// Failure, Superset and PR are gone from this list, which is not a removal of
// features: they were three different questions jammed into one enum, so a set
// could never be both a warm-up and a failure. How a set went is now an
// outcome on the row itself, a record is its own flag beside it, and a
// superset is a block in the routine. The enum keeps those members for
// sessions already logged; nothing offers them.
const setTypes: { value: SetType; label: string; blurb: string }[] = [
  { value: "normal", label: "Normal", blurb: "A working set." },
  { value: "warmup", label: "Warm up", blurb: "Building up, not counted as work." },
  { value: "dropset", label: "Drop set", blurb: "Straight into a lighter load." },
];

export const SetOptionsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  set: LoggedSet | null;
  onSave: (patch: Partial<LoggedSet>) => void;
}> = ({ open, onClose, set, onSave }) => {
  const [setType, setSetType] = useState<SetType>("normal");
  const [outcome, setOutcome] = useState<SetOutcome | undefined>(undefined);
  const [isPr, setIsPr] = useState(false);
  const [notes, setNotes] = useState("");
  const [rpe, setRpe] = useState<number | undefined>(undefined);
  const [mood, setMood] = useState(5);
  const [pain, setPain] = useState(0);

  useEffect(() => {
    if (set) {
      setSetType(set.setType ?? "normal");
      setOutcome(set.outcome);
      setIsPr(!!set.isPr);
      setNotes(set.notes ?? "");
      setRpe(set.rpe);
      setMood(set.mood ?? 5);
      setPain(set.pain ?? 0);
    }
  }, [set]);

  if (!set) return null;

  // V9 (QA 9.0): "starts as the color green on 0 and gradually changes
  // color to red when it reaches 10" — linear interpolation between the
  // app's existing green/red semantic colors, driven by the slider value.
  const painColor = (() => {
    const t = pain / 10;
    const from = [63, 145, 101]; // #3F9165
    const to = [192, 57, 43]; // #C0392B
    const [r, g, b] = from.map((c, i) => Math.round(c + (to[i] - c) * t));
    return `rgb(${r}, ${g}, ${b})`;
  })();

  return (
    <BottomSheet open={open} onClose={onClose} title={`Set ${set.setNumber} options`} variant="session">
      <div className="space-y-5 animate-fade-slide-up">
        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            How it went
          </p>
          {/* THE SAME THREE ACTIONS AS THE ROW, reachable from here too. A set
              opened for a note is often the one that went badly, and making
              somebody close the sheet to say so is the reason notes and
              outcomes drift apart. Toggleable, and PR combines with any of
              them — an outcome answers "how", is_pr answers "was it a
              record", and they are not alternatives. */}
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            {([
              ["completed", "Completed"],
              ["failed", "Failed"],
              ["skipped", "Skipped"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setOutcome((o) => (o === value ? undefined : value))}
                aria-pressed={outcome === value}
                className="tap transition-colors"
                style={sessionOptionStyle(outcome === value, { borderRadius: 12, padding: "10px 0" })}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setIsPr((v) => !v)}
              aria-pressed={isPr}
              className="tap transition-colors"
              style={{
                ...sessionOptionStyle(isPr, { borderRadius: 12, padding: "10px 0" }),
                ...(isPr ? { background: "rgba(200,145,43,0.16)", color: "#8A6318", borderColor: "#C8912B" } : {}),
              }}
            >
              Personal record
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Classification
          </p>
          {/* SCROLLABLE IN ITS OWN RIGHT. The sheet scrolls as a whole, but on
              a short screen — a phone in landscape, or one with the keyboard
              up because the notes field has focus — the shell's 88vh left this
              list clipped with no way to reach the last option. Capping it and
              letting it scroll means the list is always complete, whatever is
              above or below it. */}
          <div
            className="grid grid-cols-2 gap-2 overflow-y-auto overscroll-contain"
            style={{ maxHeight: 168 }}
          >
            {setTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setSetType(t.value)}
                aria-pressed={setType === t.value}
                className="tap transition-colors"
                style={sessionOptionStyle(setType === t.value, { borderRadius: 12, padding: "10px 0" })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-charcoal-faint mt-1.5">
            {setTypes.find((t) => t.value === setType)?.blurb}
          </p>
        </div>


        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">RPE</p>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {rpeOptions.map((r) => (
              <button
                key={r}
                onClick={() => setRpe(rpe === r ? undefined : r)}
                className="tap"
                style={sessionChipStyle(rpe === r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          {/* V9 (QA 9.0): "above the mood slider should also be a slider for
              Pain level ranging from zero being no injury to 10 being severe
              pain. It automatically should start at zero." */}
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Pain level</p>
            <span className="text-xs text-charcoal-faint">{pain} / 10</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={pain}
            onChange={(e) => setPain(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: painColor }}
          />
          <div className="flex items-center justify-between text-[10px] text-charcoal-faint mt-1">
            <span>No injury</span>
            <span>Severe pain</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Mood</p>
            <span className="text-xs text-charcoal-faint">{mood} / 10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: "#AEA1DC" }}
          />
          <div className="flex items-center justify-between text-[10px] text-charcoal-faint mt-1">
            <span>Bad mood</span>
            <span>Very good</span>
          </div>
        </div>

        {/* CentiumFrame field(): grey #F2F3F5 container, white borderless input. */}
        <label className="block" style={{ background: "#F2F3F5", borderRadius: 14, padding: "12px 14px" }}>
          <span className="block" style={{ fontSize: 13, fontWeight: 500, color: "#575863", marginBottom: 8 }}>
            Notes
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. felt heavy, elbow twinge…"
            className="w-full text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            style={{ borderRadius: 10, background: "#FFFFFF", border: "none", padding: "11px 13px", fontSize: 14 }}
          />
        </label>

        <Button
          fullWidth
          size="lg"
          onClick={() => {
            onSave({
              setType,
              outcome,
              // Kept in step with what the database's trigger derives, so
              // the row on screen matches the row that comes back.
              completed: outcome != null && outcome !== "skipped",
              isPr,
              notes: notes.trim() || undefined,
              rpe,
              mood,
              pain,
            });
            onClose();
          }}
        >
          Save set options
        </Button>
      </div>
    </BottomSheet>
  );
};
