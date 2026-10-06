import React, { useEffect, useState } from "react";
import { Pin } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { sessionChipStyle } from "./sessionSheetStyles";
import { typeStyles } from "./setTypeStyle";
import { useIsDark } from "../../hooks/useIsDark";
import type { LoggedSet } from "../../types";
import { rpeOptions } from "../../services/workout";
import { HANDOVER_SET_TYPES, setKind, type HandoverSetType } from "../../services/workout/stats";
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
}> = ({ open, onClose, set, title, routineName, pinnedNote, onSave }) => {
  const [kind, setKindState] = useState<HandoverSetType>("normal");
  const [notes, setNotes] = useState("");
  const [pinned, setPinned] = useState(false);
  const [rpe, setRpe] = useState<number | undefined>(undefined);
  const [mood, setMood] = useState(5);
  const [pain, setPain] = useState(0);
  const dark = useIsDark();

  useEffect(() => {
    if (set) {
      setKindState(setKind(set));
      setNotes(set.notes ?? "");
      setPinned(!!set.notes?.trim() && set.notes.trim() === pinnedNote?.trim());
      setRpe(set.rpe);
      setMood(set.mood ?? 5);
      setPain(set.pain ?? 0);
    }
  }, [set, pinnedNote]);

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
            onSave({ kind, rpe, mood, pain, notes: notes.trim() || undefined, pinned: pinned && hasNote });
            onClose();
          }}
        >
          Save set options
        </Button>
      }
    >
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div>
          <p style={sectionLabel}>Type</p>
          <div className="grid grid-cols-3" style={{ gap: 6 }}>
            {HANDOVER_SET_TYPES.filter((t) => t.value !== "normal").map((t) => {
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

        <div>
          <p style={sectionLabel}>RPE</p>
          <div className="flex scroll-row no-scrollbar" style={{ gap: 6 }}>
            {RPE_ASCENDING.map((r) => (
              <button
                key={r}
                onClick={() => setRpe(rpe === r ? undefined : r)}
                aria-pressed={rpe === r}
                className="tap flex-none"
                style={{ ...sessionChipStyle(rpe === r, dark), minWidth: 30, height: 30, padding: "0 8px", borderRadius: 6 }}
              >
                {r}
              </button>
            ))}
          </div>
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
      </div>
    </BottomSheet>
  );
};
