import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { sheetChipStyle } from "../ui/sheetChip";
import { Trash2 } from "lucide-react";
import type { BlockKind, WorkoutBlock } from "../../types";
import { checkBlock, defaultBlockParams, normalizeBlock } from "../../services/workout/blocks";
import { blockHeading } from "../../services/workout/prescription";

// Choosing what a group of exercises IS, and what governs its repetition.
//
// THE PARAMETERS ARE PER KIND, because the database's CHECK is: a superset
// carrying rounds is refused as firmly as an EMOM missing them. Switching kind
// therefore rebuilds the parameters rather than keeping whatever was typed
// under the last one — see normalizeBlock, which is where that rule lives so
// the sheet and the save path cannot disagree about it.
//
// AN AMRAP HAS NO ROUNDS FIELD, and that is not an omission. Its round count
// is the RESULT of doing it, recorded against the session; putting it in the
// plan would be asking the athlete to predict their own score.

const KINDS: { value: BlockKind; label: string; blurb: string }[] = [
  { value: "superset", label: "Superset", blurb: "Run together, no clock. Needs two or more." },
  { value: "amrap", label: "AMRAP", blurb: "As many rounds as possible inside a time window." },
  { value: "emom", label: "EMOM", blurb: "One round at the top of every interval." },
  { value: "for_time", label: "For Time", blurb: "Finish the rounds as fast as possible." },
];

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#5B5349",
  marginBottom: 6,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  background: "#FFFFFF",
  border: "1px solid rgba(36,31,27,0.1)",
  padding: "9px 11px",
  fontSize: 14,
  color: "#241F1B",
};

const digits = (raw: string): number | undefined => {
  const cleaned = raw.replace(/[^\d]/g, "");
  return cleaned === "" ? undefined : Number(cleaned);
};

const Num: React.FC<{
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <label className="block" style={{ flex: 1, minWidth: 0 }}>
    <span style={{ ...labelStyle, fontSize: 11 }}>{label}</span>
    <input
      value={value === undefined ? "" : String(value)}
      onChange={(e) => onChange(digits(e.target.value))}
      placeholder={placeholder}
      inputMode="numeric"
      aria-label={label}
      className="placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
      style={{ ...inputStyle, textAlign: "center" }}
    />
  </label>
);

export const BlockSettingsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** The block being edited, or null when one is being created. */
  block: WorkoutBlock | null;
  /** How many exercises it will hold — a superset needs two. */
  memberCount: number;
  onSave: (block: WorkoutBlock) => void;
  /** Absent while creating: there is nothing yet to ungroup. */
  onUngroup?: () => void;
}> = ({ open, onClose, block, memberCount, onSave, onUngroup }) => {
  // SEEDED ONCE, AND REMOUNTED PER BLOCK. The caller keys this on the block
  // being edited, so opening a different one gives a fresh component rather
  // than an effect copying props into state on every change — which is the
  // pattern that leaves a half-typed draft attached to the wrong block.
  const [draft, setDraft] = useState<WorkoutBlock | null>(block);
  const [problem, setProblem] = useState<string | null>(null);

  if (!draft) return null;

  const setKind = (kind: BlockKind) => {
    if (kind === draft.kind) return;
    setDraft(normalizeBlock({ id: draft.id, kind, label: draft.label, ...defaultBlockParams(kind) }));
    setProblem(null);
  };

  // Minutes are what people say — "a 12-minute AMRAP", "a 20-minute cap" —
  // while the column is seconds, so the conversion happens at the field.
  const capMinutes = draft.timeCapSeconds ? Math.round(draft.timeCapSeconds / 60) : undefined;
  const intervalSeconds = draft.intervalSeconds;

  return (
    <BottomSheet open={open} onClose={onClose} title={block?.kind ? "Block" : "Group as"}>
      <div className="flex flex-col animate-fade-slide-up" style={{ gap: 16 }}>
        <div>
          <span style={labelStyle}>Kind</span>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {KINDS.map((k) => (
              <button
                key={k.value}
                onClick={() => setKind(k.value)}
                aria-pressed={draft.kind === k.value}
                className="tap transition-colors"
                style={sheetChipStyle(draft.kind === k.value)}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p style={{ margin: "7px 2px 0", fontSize: 11, color: "#8C8378" }}>
            {KINDS.find((k) => k.value === draft.kind)?.blurb}
          </p>
        </div>

        {draft.kind === "amrap" && (
          <Num
            label="Minutes"
            value={capMinutes}
            onChange={(v) => setDraft({ ...draft, timeCapSeconds: v ? v * 60 : undefined })}
            placeholder="12"
          />
        )}

        {draft.kind === "emom" && (
          <div className="flex" style={{ gap: 10 }}>
            <Num
              label="Every (seconds)"
              value={intervalSeconds}
              onChange={(v) => setDraft({ ...draft, intervalSeconds: v })}
              placeholder="60"
            />
            <Num
              label="Rounds"
              value={draft.rounds}
              onChange={(v) => setDraft({ ...draft, rounds: v })}
              placeholder="10"
            />
          </div>
        )}

        {draft.kind === "for_time" && (
          <div className="flex" style={{ gap: 10 }}>
            <Num
              label="Rounds"
              value={draft.rounds}
              onChange={(v) => setDraft({ ...draft, rounds: v })}
              placeholder="5"
            />
            <Num
              label="Cap (minutes, optional)"
              value={capMinutes}
              onChange={(v) => setDraft({ ...draft, timeCapSeconds: v ? v * 60 : undefined })}
              placeholder="20"
            />
          </div>
        )}

        <label className="block">
          <span style={labelStyle}>Name (optional)</span>
          <input
            value={draft.label ?? ""}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="Finisher"
            aria-label="Block name"
            className="placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={inputStyle}
          />
          <span style={{ fontSize: 11, color: "#8C8378", marginTop: 6, display: "block" }}>
            Shown instead of “{blockHeading({ ...draft, label: undefined })}”.
          </span>
        </label>

        {problem && <p className="text-xs font-semibold text-status-high">{problem}</p>}

        <Button
          fullWidth
          size="lg"
          onClick={() => {
            const normalized = normalizeBlock(draft);
            const issue = checkBlock(normalized, memberCount);
            if (issue) {
              setProblem(issue);
              return;
            }
            onSave(normalized);
            onClose();
          }}
        >
          {block?.kind && onUngroup ? "Save block" : "Create block"}
        </Button>

        {onUngroup && (
          <Button
            fullWidth
            variant="outline"
            className="!border-teal/30 !text-teal-dark"
            onClick={() => {
              onUngroup();
              onClose();
            }}
          >
            <Trash2 size={14} /> Ungroup
          </Button>
        )}
      </div>
    </BottomSheet>
  );
};
