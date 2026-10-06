import { useRef, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { PopupMenu } from "../ui/PopupMenu";
import { SwipeActions } from "../ui/SwipeActions";
import { ConfirmCard } from "../ui/ConfirmCard";
import { TrendChart } from "../charts/TrendChart";
import { formatDisplayDate } from "../../utils/date";
import { checkValue, siteFor, type MeasurementType } from "../../services/measurements/sites";
import type { MeasurementReading } from "../../services/measurements";
import { localDay } from "../../services/measurements/measuredAt";
import {
  GOAL_COLOR,
  GOAL_LABEL,
  changeSummary,
  goalTone,
  type MeasurementGoal,
} from "../../services/measurements/trend";
import { useIsDark } from "../../hooks/useIsDark";
import { DARK_SURFACE, liftTo } from "../../data/folderColors";
import { textPx } from "../../theme/textSize";

// Mobile v5.1 R3, dark mode (no light islands), as [light, dark]: the goal
// button's border takes option-border dark and the reading rows surface.raised
// dark. The change summary is lifted to 4.5:1 on the dark card, as the chart's
// own colour is (TrendChart).
const COLORS = {
  goalBorder: ["#E5E4E5", "rgba(238,239,242,0.10)"],
  row: ["#F7F6FB", "#262932"],
} as const;

// Handover 2026-09-29 WO16: one site's history. The value and reading count,
// the goal selector, the change summary and the chart in the goal's colour,
// then every reading: swipe one left for the delete tile, or tap its value to
// edit it in place (Enter or tapping away saves; an empty field reverts).
//
// OLDEST-TO-NEWEST FOR THE CHART, NEWEST-FIRST FOR THE LIST, deliberately.
// A trend line reads left to right in time; a list of things you might want
// to correct puts the most recent one where your thumb is.

const GOAL_OPTIONS = (["decrease", "increase", "maintain", "none"] as const).map((value) => ({
  value,
  label: GOAL_LABEL[value],
}));

const shortDate = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
// The day it was measured, in the user's own time: a reading taken at 2:45 on
// Sep 28 is a Sep 28 reading even where that instant is still Sep 27 in UTC.
const dayOf = (r: MeasurementReading) => localDay(new Date(r.recordedAt));
const timeOf = (r: MeasurementReading) => Date.parse(`${dayOf(r)}T00:00:00Z`);

export const MeasurementHistorySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  type: MeasurementType | null;
  /** Newest first. */
  readings: MeasurementReading[];
  goal: MeasurementGoal | null;
  onGoalChange: (goal: MeasurementGoal | null) => void;
  onEdit: (id: string, type: MeasurementType, value: number) => Promise<string | null>;
  /** Confirmed: the caller hides it and owns the Undo toast. */
  onDelete: (reading: MeasurementReading) => void;
}> = ({ open, onClose, type, readings, goal, onGoalChange, onEdit, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [goalAnchor, setGoalAnchor] = useState<HTMLElement | null>(null);
  const [deleting, setDeleting] = useState<MeasurementReading | null>(null);
  const dark = useIsDark();
  // Enter blurs the field, and the blur is what saves: this stops a second save.
  const committing = useRef(false);

  if (!type) return null;
  const site = siteFor(type);
  if (!site) return null;
  const unit = site.unit;

  const oldestFirst = [...readings].reverse();
  const points = oldestFirst.map((r) => ({ t: timeOf(r), value: r.value, label: shortDate(timeOf(r)) }));
  const color = GOAL_COLOR[goalTone(points.map((p) => p.value), goal)];
  const summary = changeSummary(points, unit);
  const latest = readings[0];

  const commit = async (reading: MeasurementReading) => {
    if (committing.current) return;
    committing.current = true;
    const text = draft.trim();
    setEditingId(null);
    // An empty field, or the same number, restores what was there.
    if (text === "" || Number(text) === reading.value) {
      committing.current = false;
      return;
    }
    const value = Number(text);
    const problem = Number.isFinite(value) ? checkValue(type, value) : "Enter a number.";
    if (problem) {
      setError(problem);
      committing.current = false;
      return;
    }
    setError(null);
    const message = await onEdit(reading.id, type, value);
    if (message) setError(message);
    committing.current = false;
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={site.label}>
      <div className="animate-fade-slide-up">
        {latest && (
          <div className="flex items-start justify-between" style={{ gap: 12 }}>
            <p style={{ color: "rgb(var(--c-charcoal))", fontSize: textPx(24), fontWeight: 800, lineHeight: 1.1 }}>
              {latest.value}
              <span style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(15), fontWeight: 500, marginLeft: 4 }}>{unit}</span>
            </p>
            <p style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(11), marginTop: 4 }}>
              {readings.length} reading{readings.length === 1 ? "" : "s"}
            </p>
          </div>
        )}

        <button
          onClick={(e) => setGoalAnchor(e.currentTarget)}
          aria-haspopup="listbox"
          className="tap inline-flex items-center"
          style={{
            marginTop: 10,
            height: 26,
            padding: "0 10px",
            gap: 4,
            borderRadius: 8,
            background: "rgb(var(--c-cream-soft))",
            border: `1px solid ${COLORS.goalBorder[dark ? 1 : 0]}`,
            fontSize: textPx(11.5),
          }}
        >
          <span style={{ color: "rgb(var(--c-charcoal-muted))" }}>Goal:</span>
          <span style={{ color: "rgb(var(--c-charcoal))", fontWeight: 700 }}>{GOAL_LABEL[goal ?? "none"]}</span>
          <ChevronDown size={12} style={{ color: "rgb(var(--c-charcoal-muted))" }} />
        </button>
        <PopupMenu
          open={!!goalAnchor}
          anchor={goalAnchor}
          onClose={() => setGoalAnchor(null)}
          options={GOAL_OPTIONS}
          selected={goal ?? "none"}
          onSelect={(value) => {
            setGoalAnchor(null);
            onGoalChange(value === "none" ? null : value);
          }}
          width={152}
          align="left"
        />

        {summary && (
          <p style={{ marginTop: 10, color: dark ? liftTo(color, DARK_SURFACE.card) : color, fontSize: textPx(11), fontWeight: 600 }}>{summary}</p>
        )}

        {points.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <TrendChart
              points={points}
              color={color}
              unit={unit}
              formatDate={shortDate}
              ariaLabel={`${site.label} over time`}
            />
          </div>
        )}

        {error && (
          <p className="text-xs font-semibold text-status-high" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}

        <div className="flex flex-col" style={{ marginTop: 16, gap: 6 }}>
          {readings.map((reading) => {
            const date = formatDisplayDate(dayOf(reading));
            return (
              <SwipeActions
                key={reading.id}
                radius={12}
                shrink
                disabled={editingId === reading.id}
                actions={[
                  {
                    key: "delete",
                    label: `Delete ${site.label} from ${date}`,
                    icon: <Trash2 size={17} />,
                    destructive: true,
                    onClick: () => setDeleting(reading),
                  },
                ]}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ height: 44, padding: "0 12px", gap: 10, borderRadius: 12, background: COLORS.row[dark ? 1 : 0] }}
                >
                  <span className="truncate" style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(12.5) }}>
                    {date}
                  </span>
                  {editingId === reading.id ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                          setDraft("");
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={() => void commit(reading)}
                      inputMode="decimal"
                      enterKeyHint="done"
                      aria-label={`${site.label} on ${date}`}
                      className="focus:outline-none"
                      style={{
                        width: 76,
                        height: 32,
                        padding: "0 9px",
                        textAlign: "right",
                        borderRadius: 8,
                        background: "rgb(var(--c-cream-card))",
                        border: "2px solid rgb(var(--th-aea1dc))",
                        color: "rgb(var(--c-charcoal))",
                        fontSize: textPx(14),
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(reading.id);
                        setDraft(String(reading.value));
                        setError(null);
                      }}
                      aria-label={`Edit ${site.label} from ${date}`}
                      className="tap flex-none"
                      style={{ color: "rgb(var(--c-charcoal))", fontSize: textPx(14), fontWeight: 700 }}
                    >
                      {reading.value}
                      <span style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(11), fontWeight: 500, marginLeft: 3 }}>{unit}</span>
                    </button>
                  )}
                </div>
              </SwipeActions>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="tap w-full flex items-center justify-center"
          style={{ marginTop: 16, height: 48, borderRadius: 16, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(15), fontWeight: 700 }}
        >
          Done
        </button>
      </div>

      <ConfirmCard
        open={!!deleting}
        title="Delete this reading?"
        subtitle={deleting ? `${site.label} · ${formatDisplayDate(dayOf(deleting))} · ${deleting.value} ${unit}` : undefined}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) onDelete(deleting);
          setDeleting(null);
        }}
      />
    </BottomSheet>
  );
};
