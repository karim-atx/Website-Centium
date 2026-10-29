import React, { useEffect, useRef, useState } from "react";
import { Info, Pin } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { sessionChipStyle } from "./sessionSheetStyles";
import { typeStyles } from "./setTypeStyle";
import { useIsDark } from "../../hooks/useIsDark";
import type { LoggedSet, SetTarget } from "../../types";
import { rpeOptions } from "../../services/workout";
import { HANDOVER_SET_TYPES, setKind, type HandoverSetType } from "../../services/workout/stats";
import { SET_TARGET_NOTE_MAX, TARGET_RPE_CHOICES } from "../../services/workout/setTargets";
import { textPx } from "../../theme/textSize";

/** What the popup hands back; the logger applies the type through its own rules. */
export interface SetOptionsResult {
  kind: HandoverSetType;
  rpe: number | undefined;
  mood: number;
  pain: number;
  notes: string | undefined;
  /** Pin on: the note becomes the exercise's pinned note in the routine. */
  pinned: boolean;
}

// The line under the Type buttons. Normal and PR are the frame's copy
// (WO10 a.); Warm up and Drop set keep the repo's existing lines. The
// handover gives none for Failed or Skipped, so they show nothing.
const TYPE_BLURB: Partial<Record<HandoverSetType, string>> = {
  normal: "A working set.",
  pr: "A new best for this exercise.",
  warmup: "Building up, not counted as work.",
  drop: "Straight into a lighter load.",
};

// RPE runs 6 → 10 in one row (WO10), scrollable if needed.
const RPE_ASCENDING = [...rpeOptions].sort((a, b) => a - b);

/** Release 3 · W5 (TR11 v2, HANDOVER g): the coach's three set types. */
const COACH_TYPES: HandoverSetType[] = ["warmup", "pr", "drop"];
/** HANDOVER g: choosing Warm up switches the target to RPE 6. */
const WARMUP_RPE = 6;

/**
 * Mobile v5.1 R3 (no light islands): the colours here with no token of the
 * same light value, as [light, dark]. The slider's empty track (the board's
 * dark empty track), the idle Type button's border (option border), the scale
 * captions (text.tertiary, 5.1:1 on the card), the notes box (surface.soft on
 * the card) and its label (text.secondary, 7.3:1), the idle pin (tertiary,
 * 4.6:1 on the box) and the pinned pin and caption (primary.deeper, 8.6:1).
 */
const SET_OPTIONS_COLORS = {
  track: ["#E5E5EA", "rgba(238,239,242,0.10)"],
  typeBorder: ["#E7E7EC", "rgba(238,239,242,0.10)"],
  caption: ["#9A9389", "#918DA0"],
  notesBox: ["#F2F3F5", "#242730"],
  notesLabel: ["#575863", "#B8B3C7"],
  pinIdle: ["#A39D95", "#918DA0"],
  pinned: ["rgb(var(--th-5f5093))", "rgb(var(--th-c8bfe9))"],
  // Release 3 (CU1 v5): the coach's target line (chF #8C8378 / #B8B3C7) and
  // the target RPE ring (tealDark #6F9993 / #4F8F8A, as the handover's tokens).
  targetInk: ["#8C8378", "#B8B3C7"],
  targetRing: ["#6F9993", "#4F8F8A"],
} as const;
const optionsColor = (key: keyof typeof SET_OPTIONS_COLORS, dark: boolean): string => SET_OPTIONS_COLORS[key][dark ? 1 : 0];

/** The filled part of a slider up to its value, on the frame's #E5E5EA track. */
const sliderStyle = (value: number, min: number, max: number, fill: string, thumb: string, dark: boolean): React.CSSProperties => {
  const pct = ((value - min) / (max - min)) * 100;
  const track = optionsColor("track", dark);
  return {
    background: `linear-gradient(to right, ${fill} 0%, ${fill} ${pct}%, ${track} ${pct}%, ${track} 100%)`,
    ["--thumb" as string]: thumb,
  };
};

const sectionLabel: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: textPx(11),
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgb(var(--c-charcoal-muted))",
};

/**
 * WO10 · Set options popup, opened from a set's ⋮ in the logger.
 *
 * One Type section (Warm up, Failed, Skipped, Personal record, Drop set; none
 * selected = Normal; tap the selected one again to go back to Normal), read
 * from the same set-type definition as the WO8 dropdown. RPE 6 → 10 in one
 * row. Pain level as before; Mood with a pink fill. Notes with a pin toggle
 * that saves the note as the exercise's pinned note in the routine template.
 */
export const SetOptionsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  set: LoggedSet | null;
  /** "Set 2 options": follows the set's label in the logger. */
  title: string;
  /** The routine the pinned note belongs to, for the caption. */
  routineName: string;
  /** The exercise's current pinned note, to show whether this note is it. */
  pinnedNote: string | undefined;
  onSave: (result: SetOptionsResult) => void;
  /**
   * Release 3 · W5 (TR11 v2): the professional's set options for a
   * prescription. Unset = the client logger's sheet exactly as before. Set:
   * Type is Warm up, Personal record or Drop set only; Target RPE shows the
   * coach's exercise RPE, switching to 6 while Warm up is on and back when it
   * is cleared; no Pain or Mood.
   *
   * Round D (TR11): the Target RPE row is editable per set (1 to 10 in
   * halves, set_targets), "Set by you" once picked, tap again to go back to
   * the exercise's RPE; and Notes is this set's note for the client (up to
   * 200 characters). The result's `rpe` is the set's own target (undefined
   * when it is the exercise's) and `notes` its note.
   */
  coach?: { coachRpe?: number; target?: SetTarget | null };
  /**
   * Release 3 · W7 (CU1 v5 "set 2 options"): the client logging a coach's
   * routine. Adds the coach's target above Type ("Alex's target: 6 × 82.5 kg
   * at RPE 8") and outlines the target RPE chip in teal, with its caption.
   * Unset = the sheet exactly as before. Additions only.
   */
  target?: { text: string; rpe?: number; coachName: string };
}> = ({ open, onClose, set, title, routineName, pinnedNote, onSave, coach, target }) => {
  const [kind, setKindState] = useState<HandoverSetType>("normal");
  const [notes, setNotes] = useState("");
  const [pinned, setPinned] = useState(false);
  const [rpe, setRpe] = useState<number | undefined>(undefined);
  const [mood, setMood] = useState(5);
  const [pain, setPain] = useState(0);
  /** Round D (TR11, coach): this set's own target RPE; undefined = the exercise's. */
  const [pickedRpe, setPickedRpe] = useState<number | undefined>(undefined);
  const rpeRowRef = useRef<HTMLDivElement | null>(null);
  const dark = useIsDark();
  const coachTargetRpe = coach?.target?.rpe;
  const coachTargetNote = coach?.target?.note;

  useEffect(() => {
    if (set) {
      const k = setKind(set);
      setKindState(k);
      setNotes(coach ? coachTargetNote ?? "" : set.notes ?? "");
      setPinned(!coach && !!set.notes?.trim() && set.notes.trim() === pinnedNote?.trim());
      setRpe(set.rpe);
      setMood(set.mood ?? 5);
      setPain(set.pain ?? 0);
      // A warm-up's stored 6 is the automatic warm-up RPE, not a pick, so
      // clearing Warm up still restores the exercise's RPE.
      setPickedRpe(k === "warmup" && coachTargetRpe === WARMUP_RPE ? undefined : coachTargetRpe);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, pinnedNote, coachTargetRpe, coachTargetNote]);

  // Round D (TR11): the 1–10 row opens scrolled to the chosen RPE (or 6).
  const shownRpe = coach ? pickedRpe ?? (kind === "warmup" ? WARMUP_RPE : coach.coachRpe) : undefined;
  useEffect(() => {
    if (!open || !coach) return;
    const row = rpeRowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-rpe="${shownRpe ?? WARMUP_RPE}"]`);
    if (row && chip) row.scrollLeft = Math.max(0, chip.offsetLeft - row.offsetLeft - 48);
    // Only on opening, not on every pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, set]);

  if (!set) return null;

  // V9 (QA 9.0): green at 0 shading to red at 10, unchanged.
  const painColor = (() => {
    const t = pain / 10;
    const from = [63, 145, 101]; // #3F9165
    const to = [192, 57, 43]; // #C0392B
    const [r, g, b] = from.map((c, i) => Math.round(c + (to[i] - c) * t));
    return `rgb(${r}, ${g}, ${b})`;
  })();

  const hasNote = notes.trim().length > 0;
  const coachTarget = shownRpe;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      // Tall: on a short phone the popup can use the height under the
      // status bar, so it fits without scrolling (WO10); taller screens hug.
      size="tall"
      footer={
        <Button
          fullWidth
          size="lg"
          onClick={() => {
            onSave(
              coach
                ? {
                    kind,
                    // The set's own target only when it differs from the exercise's RPE.
                    rpe: coachTarget !== coach.coachRpe ? coachTarget : undefined,
                    mood,
                    pain,
                    notes: notes.trim().slice(0, SET_TARGET_NOTE_MAX) || undefined,
                    pinned: false,
                  }
                : { kind, rpe, mood, pain, notes: notes.trim() || undefined, pinned: pinned && hasNote }
            );
            onClose();
          }}
        >
          Save set options
        </Button>
      }
    >
      {target && (
        // CU1 v5: 12px in text.faint, pulled 6 up under the title, 12 above Type.
        <p style={{ margin: "-6px 0 12px", fontSize: textPx(12), color: optionsColor("targetInk", dark) }}>{target.text}</p>
      )}
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div>
          <p style={sectionLabel}>Type</p>
          <div className="grid grid-cols-3" style={{ gap: 6 }}>
            {HANDOVER_SET_TYPES.filter((t) => (coach ? COACH_TYPES.includes(t.value) : t.value !== "normal")).map((t) => {
              const on = kind === t.value;
              const color = typeStyles(dark)[t.value as Exclude<HandoverSetType, "normal">].dot;
              return (
                <button
                  key={t.value}
                  onClick={() => setKindState(on ? "normal" : t.value)}
                  aria-pressed={on}
                  className="tap transition-colors"
                  style={{
                    height: 34,
                    borderRadius: 8,
                    border: `1px solid ${on ? color : optionsColor("typeBorder", dark)}`,
                    background: on ? color : "rgb(var(--c-cream-card))",
                    color: on ? "#FFFFFF" : "rgb(var(--c-charcoal))",
                    fontSize: textPx(12),
                    fontWeight: on ? 600 : 500,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {TYPE_BLURB[kind] && <p style={{ margin: "6px 0 0", fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>{TYPE_BLURB[kind]}</p>}
        </div>

        {coach && (
          <div>
            <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
              <p style={{ ...sectionLabel, margin: 0 }}>Target RPE</p>
              <span style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>
                {pickedRpe != null
                  ? "Set by you"
                  : kind === "warmup"
                    ? `Warm-up RPE ${WARMUP_RPE}`
                    : coach.coachRpe != null
                      ? "Same as the exercise"
                      : "Optional"}
              </span>
            </div>
            {/* Round D (TR11): one target per set, 1 to 10 in halves. Tap the
                chosen one again to go back to the exercise's RPE. */}
            <div ref={rpeRowRef} className="flex scroll-row no-scrollbar" style={{ gap: 6 }} role="group" aria-label="Target RPE">
              {TARGET_RPE_CHOICES.map((r) => (
                <button
                  key={r}
                  type="button"
                  data-rpe={r}
                  onClick={() => setPickedRpe(pickedRpe === r ? undefined : r)}
                  aria-pressed={coachTarget === r}
                  className="tap flex-none inline-flex items-center justify-center"
                  style={{ ...sessionChipStyle(coachTarget === r, dark), minWidth: 30, height: 30, padding: "0 8px", borderRadius: 6 }}
                >
                  {r}
                </button>
              ))}
            </div>
            {pickedRpe == null && kind === "warmup" && coach.coachRpe != null && coach.coachRpe !== WARMUP_RPE && (
              <p className="flex items-start" style={{ gap: 6, margin: "8px 0 0", fontSize: textPx(11.5), color: "rgb(var(--c-charcoal-muted))" }}>
                <Info size={13} className="shrink-0" style={{ marginTop: 2 }} aria-hidden />
                {`Switched to the warm-up RPE automatically. Clear Warm up to restore your RPE ${coach.coachRpe}.`}
              </p>
            )}
          </div>
        )}

        {coach && (
          // Round D (TR11): this set's note for the client, in the client
          // sheet's notes box (no pin: a template has no pinned note).
          <div style={{ background: optionsColor("notesBox", dark), borderRadius: 14, padding: "10px 12px" }}>
            <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
              <label htmlFor="set-target-note" style={{ fontSize: textPx(13), fontWeight: 500, color: optionsColor("notesLabel", dark) }}>
                Notes
              </label>
              <span className="tabular-nums" style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>
                {notes.length}/{SET_TARGET_NOTE_MAX}
              </span>
            </div>
            <input
              id="set-target-note"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, SET_TARGET_NOTE_MAX))}
              maxLength={SET_TARGET_NOTE_MAX}
              placeholder="e.g. keep the back flat"
              className="w-full text-charcoal placeholder:text-charcoal-faint focus:outline-none"
              style={{ borderRadius: 10, background: "rgb(var(--c-cream-card))", border: "none", padding: "9px 12px", fontSize: textPx(14) }}
            />
            <p style={{ margin: "6px 0 0", fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>Your client sees this under the set.</p>
          </div>
        )}

        {!coach && (
        <>
        <div>
          <p style={sectionLabel}>RPE</p>
          <div className="flex scroll-row no-scrollbar" style={{ gap: 6 }}>
            {RPE_ASCENDING.map((r) => (
              <button
                key={r}
                onClick={() => setRpe(rpe === r ? undefined : r)}
                aria-pressed={rpe === r}
                className="tap flex-none"
                aria-describedby={target?.rpe === r ? "rpe-target-note" : undefined}
                style={{
                  ...sessionChipStyle(rpe === r, dark),
                  minWidth: 30,
                  height: 30,
                  padding: "0 8px",
                  borderRadius: 6,
                  // CU1 v5: the coach's target RPE, an inset 1.5 teal (tealDark) outline.
                  ...(target?.rpe === r ? { boxShadow: `inset 0 0 0 1.5px ${optionsColor("targetRing", dark)}` } : {}),
                }}
              >
                {r}
              </button>
            ))}
          </div>
          {target?.rpe != null && (
            <p id="rpe-target-note" style={{ margin: "6px 0 0", fontSize: textPx(11), color: optionsColor("targetInk", dark) }}>
              Teal outline: {target.coachName}'s target.
            </p>
          )}
        </div>

        <div>
          {/* V9 (QA 9.0): Pain level above Mood, starting at zero. */}
          <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
            <p style={{ ...sectionLabel, margin: 0 }}>Pain level</p>
            <span className="tabular-nums" style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>{pain} / 10</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={pain}
            onChange={(e) => setPain(Number(e.target.value))}
            aria-label="Pain level"
            className="set-slider w-full"
            style={sliderStyle(pain, 0, 10, painColor, painColor, dark)}
          />
          <div className="flex items-center justify-between" style={{ fontSize: textPx(10), color: optionsColor("caption", dark), marginTop: 2 }}>
            <span>No injury</span>
            <span>Severe pain</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
            <p style={{ ...sectionLabel, margin: 0 }}>Mood</p>
            <span className="tabular-nums" style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>{mood} / 10</span>
          </div>
          {/* WO10: matches Pain level, with a pink fill (frame #D987AC thumb). */}
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            aria-label="Mood"
            className="set-slider w-full"
            style={sliderStyle(mood, 1, 10, "#E8A3C0", "#D987AC", dark)}
          />
          <div className="flex items-center justify-between" style={{ fontSize: textPx(10), color: optionsColor("caption", dark), marginTop: 2 }}>
            <span>Bad mood</span>
            <span>Very good</span>
          </div>
        </div>

        <div style={{ background: optionsColor("notesBox", dark), borderRadius: 14, padding: "10px 12px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <label htmlFor="set-notes" style={{ fontSize: textPx(13), fontWeight: 500, color: optionsColor("notesLabel", dark) }}>
              Notes
            </label>
            <button
              onClick={() => setPinned((p) => !p)}
              disabled={!hasNote}
              aria-pressed={pinned && hasNote}
              aria-label={pinned && hasNote ? "Unpin this note from the exercise" : "Pin this note to the exercise"}
              className="tap relative flex items-center justify-center disabled:opacity-40 before:absolute before:-inset-[12px] before:content-['']"
              style={{ width: 20, height: 20, color: pinned && hasNote ? optionsColor("pinned", dark) : optionsColor("pinIdle", dark) }}
            >
              <Pin size={15} fill={pinned && hasNote ? "currentColor" : "none"} />
            </button>
          </div>
          <input
            id="set-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. felt heavy, elbow twinge…"
            className="w-full text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            style={{ borderRadius: 10, background: "rgb(var(--c-cream-card))", border: "none", padding: "9px 12px", fontSize: textPx(14) }}
          />
          {pinned && hasNote && (
            <p style={{ margin: "8px 0 0", fontSize: textPx(11), fontWeight: 600, color: optionsColor("pinned", dark) }}>
              Pinned to this exercise in {routineName}
            </p>
          )}
        </div>
        </>
        )}
      </div>
    </BottomSheet>
  );
};
