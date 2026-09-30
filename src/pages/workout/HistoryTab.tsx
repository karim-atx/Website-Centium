import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { formatCompactDuration } from "../../services/workout";
import { CalendarPickerSheet } from "../../components/dashboard/CalendarPickerSheet";
import { HeroCard } from "../../components/ui/HeroCard";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { SwipeActions } from "../../components/ui/SwipeActions";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { Toast } from "../../components/ui/Toast";
import { routineFamily, PURPLE, type FolderFamily } from "../../data/folderColors";
import {
  byNewest,
  comparisonPhrase,
  historySummary,
  inRange,
  PERIOD_LABEL,
  periodRange,
  topSet,
  type HistoryPeriod,
} from "../../services/workout/history";
import { Calendar, CalendarDays, ChevronDown, ChevronUp, Dumbbell, Pencil, Plus, Trash2 } from "lucide-react";
import type { WorkoutSession } from "../../types";

// WO3.1 · History as a card stack: a hero summary for the chosen period
// (Total volume, Time taken, the comparison phrase, workouts and sets), then
// one card per logged session in its routine's Routines-tab colours. Swipe a
// card left for Change date and Delete; tapping it expands a compact list of
// each exercise's top set. The period's Custom range uses the shared
// "Choose a date" picker (WO9), which is also where that single-day pick
// lives now: the frame has no separate calendar icon.

const PERIODS: HistoryPeriod[] = ["week", "month", "year", "all", "day", "custom"];
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

type ToastState = { message: string; undo?: () => void; icon?: React.ReactNode; commit?: () => Promise<string | undefined> };

export default function HistoryTab() {
  const { workoutSessions, routines, routineFolders, today, moveWorkoutSession, removeWorkoutSession } = useApp();
  const [period, setPeriod] = useState<HistoryPeriod>("month");
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [rangeStep, setRangeStep] = useState<{ step: "from" | "to"; from?: string } | null>(null);
  const [pickingDay, setPickingDay] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [moving, setMoving] = useState<WorkoutSession | null>(null);
  const [deleting, setDeleting] = useState<WorkoutSession | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = periodRange(period, today, custom);
  const listed = useMemo(
    () => workoutSessions.filter((s) => inRange(s.date, range)).sort(byNewest),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workoutSessions, range.from, range.to]
  );
  const summary = historySummary(listed);
  const phrase = comparisonPhrase(summary.volumeKg);
  const sessionDays = useMemo(() => new Set(workoutSessions.map((s) => s.date)), [workoutSessions]);

  // A delete waiting on its Undo toast is committed when another toast
  // replaces it, and when the tab goes away.
  const pending = useRef<ToastState | null>(null);
  const flush = () => {
    const p = pending.current;
    pending.current = null;
    if (p?.commit) void p.commit().then((m) => m && setError(m));
  };
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const showToast = (t: ToastState) => {
    flush();
    pending.current = t.commit ? t : null;
    setToast(t);
  };

  const familyOf = (s: WorkoutSession): FolderFamily => {
    const routine = s.routineId ? routines.find((r) => r.id === s.routineId) : undefined;
    return routine ? routineFamily(routine, routineFolders) : PURPLE;
  };

  const moveTo = async (s: WorkoutSession, date: string) => {
    if (date === s.date) return;
    const from = s.date;
    const message = await moveWorkoutSession(s.id, date);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    const outside = !inRange(date, range);
    showToast({
      message: outside ? `Moved to ${shortDate(date)} (outside ${period === "day" && custom ? shortDate(custom.from) : PERIOD_LABEL[period]}).` : `Moved to ${shortDate(date)}.`,
      undo: () => void moveWorkoutSession(s.id, from),
    });
  };

  const confirmDelete = () => {
    const s = deleting;
    setDeleting(null);
    if (!s) return;
    const handle = removeWorkoutSession(s.id);
    if (!handle) return;
    if (expandedId === s.id) setExpandedId(null);
    showToast({
      message: "Workout deleted.",
      icon: <Trash2 size={14} className="flex-none" style={{ color: "#A2C8C2" }} />,
      undo: handle.undo,
      commit: handle.commit,
    });
  };

  return (
    <div className="animate-fade-slide-up">
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Summary</p>
        <button
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          className="tap flex items-center bg-white"
          style={{ height: 32, borderRadius: 999, border: "1px solid #E0D5FC", padding: "0 13px 0 13px", gap: 7 }}
          aria-haspopup="menu"
        >
          <Calendar size={13} style={{ color: "#8F68F6" }} />
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "#241F1B", whiteSpace: "nowrap" }}>
            {(period === "custom" || period === "day") && custom
              ? custom.from === custom.to
                ? shortDate(custom.from)
                : `${shortDate(custom.from)} – ${shortDate(custom.to)}`
              : PERIOD_LABEL[period]}
          </span>
          <ChevronDown size={14} style={{ color: "#A9A29A" }} />
        </button>
      </div>

      <HeroCard
        topPadding="13px 18px 10px"
        bottomPadding="11px 17px 12px"
        top={
          <>
            <div className="flex items-start justify-between" style={{ gap: 12 }}>
              <div className="min-w-0">
                <p style={{ margin: 0, fontSize: 8.5, lineHeight: "12px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.72)" }}>
                  TOTAL VOLUME
                </p>
                <p className="flex items-baseline" style={{ margin: "3px 0 0", height: 28, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 24, lineHeight: "28px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{summary.volumeKg.toLocaleString()}</span>
                  <span style={{ fontSize: 11, lineHeight: "14px", fontWeight: 600, color: "rgba(255,255,255,0.86)", marginLeft: 4 }}>kg</span>
                </p>
              </div>
              <div className="text-right flex-none">
                <p style={{ margin: 0, fontSize: 8.5, lineHeight: "12px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.72)" }}>
                  TIME TAKEN
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 18, lineHeight: "24px", fontWeight: 800 }}>{formatCompactDuration(summary.seconds)}</p>
              </div>
            </div>
            {phrase && (
              <p style={{ margin: "4px 0 0", fontSize: 10.5, lineHeight: "15px", color: "rgba(255,255,255,0.86)" }}>{phrase}</p>
            )}
          </>
        }
        bottom={
          <div className="flex items-center justify-between" style={{ fontSize: 12.5, lineHeight: "16px" }}>
            <span className="flex items-center" style={{ gap: 6, color: "#463A80", fontWeight: 500 }}>
              <CalendarDays size={12} />
              <span>
                <b style={{ color: "#2E2560", fontWeight: 800 }}>{summary.workouts}</b> {summary.workouts === 1 ? "workout" : "workouts"}
              </span>
            </span>
            <span className="flex items-center" style={{ gap: 6, color: "#463A80", fontWeight: 500 }}>
              <Dumbbell size={12} />
              <span>
                <b style={{ color: "#2E2560", fontWeight: 800 }}>{summary.sets.toLocaleString()}</b> {summary.sets === 1 ? "set" : "sets"}
              </span>
            </span>
          </div>
        }
      />

      {error && <p className="text-[11.5px] font-semibold text-status-high" style={{ marginTop: 10 }}>{error}</p>}

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide" style={{ margin: "20px 0 10px" }}>
        Logged sessions
      </p>

      {listed.length === 0 ? (
        <p className="text-center text-sm text-charcoal-faint py-8">No logged workouts yet — finish a routine to see it here.</p>
      ) : (
        <div className="flex flex-col" style={{ gap: 8 }}>
          {listed.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              family={familyOf(s)}
              expanded={expandedId === s.id}
              onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
              onChangeDate={() => setMoving(s)}
              onDelete={() => setDeleting(s)}
            />
          ))}
        </div>
      )}

      <PopupMenu<HistoryPeriod>
        open={!!menuAnchor}
        anchor={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
        selected={period}
        onSelect={(p) => {
          if (p === "custom") setRangeStep({ step: "from" });
          else if (p === "day") setPickingDay(true);
          else setPeriod(p);
        }}
      />

      {/* Decision 3: Pick a day. The shared picker titled "Choose a date"
          (WO9), session dots on logged days; one tap shows that day. */}
      <CalendarPickerSheet
        open={pickingDay}
        onClose={() => setPickingDay(false)}
        title="Choose a date"
        selectedDate={period === "day" && custom ? custom.from : today}
        today={today}
        maxDate={today}
        markers={sessionDays}
        onSelect={(date) => {
          setCustom({ from: date, to: date });
          setPeriod("day");
        }}
      />

      {/* Custom range: the shared picker twice, start then end. */}
      <CalendarPickerSheet
        open={!!rangeStep}
        onClose={() => setRangeStep(null)}
        title={rangeStep?.step === "to" ? "End date" : "Start date"}
        selectedDate={rangeStep?.from ?? custom?.from ?? today}
        today={today}
        maxDate={today}
        markers={sessionDays}
        onSelect={(date) => {
          if (rangeStep?.step === "from") {
            // Opens again for the end date once this one has closed.
            window.setTimeout(() => setRangeStep({ step: "to", from: date }), 0);
            return;
          }
          const from = rangeStep?.from ?? date;
          setCustom(from <= date ? { from, to: date } : { from: date, to: from });
          setPeriod("custom");
        }}
      />

      {/* Change date: current date selected, future days disabled, dots on logged days. */}
      <CalendarPickerSheet
        open={!!moving}
        onClose={() => setMoving(null)}
        title="Change workout date"
        selectedDate={moving?.date ?? today}
        today={today}
        maxDate={today}
        markers={sessionDays}
        onSelect={(date) => moving && void moveTo(moving, date)}
      />

      <ConfirmCard
        open={!!deleting}
        title="Delete this workout?"
        subtitle={deleting ? `${deleting.routineName} · ${shortDate(deleting.date)} · ${deleting.totalVolumeKg.toLocaleString()} kg` : undefined}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />

      <Toast
        open={!!toast}
        message={toast?.message ?? ""}
        icon={toast?.icon}
        onUndo={
          toast?.undo
            ? () => {
                toast.undo!();
                if (pending.current === toast) pending.current = null;
                setToast(null);
              }
            : undefined
        }
        onExpire={() => {
          if (pending.current === toast) flush();
          setToast(null);
        }}
      />
    </div>
  );
}

const LIST_LIMIT = 5;

/**
 * One logged session (WO3.1): a date block in the routine's folder-header
 * colour (day, month, year) and a body in its routine-card tint with one line
 * of details. Tapping the body expands a compact list of each exercise's top
 * set in place; tapping the date block changes the date. Swipe left for
 * Change date and Delete.
 */
const SessionCard: React.FC<{
  session: WorkoutSession;
  family: FolderFamily;
  expanded: boolean;
  onToggle: () => void;
  onChangeDate: () => void;
  onDelete: () => void;
}> = ({ session, family, expanded, onToggle, onChangeDate, onDelete }) => {
  const [showAll, setShowAll] = useState(false);
  const d = new Date(`${session.date}T00:00:00`);
  const exercises = session.exercises;
  const shown = showAll ? exercises : exercises.slice(0, LIST_LIMIT);
  const more = exercises.length - shown.length;

  return (
    <SwipeActions
      radius={14}
      actions={[
        { key: "date", label: "Change date", icon: <Pencil size={16} />, onClick: onChangeDate },
        { key: "delete", label: "Delete", icon: <Trash2 size={16} />, onClick: onDelete, destructive: true },
      ]}
    >
      <div className="overflow-hidden" style={{ borderRadius: 14, background: family.row }}>
        <div className="flex" style={{ minHeight: 63 }}>
          <button
            onClick={onChangeDate}
            aria-label={`Change date of ${session.routineName}`}
            className="tap flex-none flex flex-col items-center justify-center text-white"
            style={{ width: 56, background: family.head }}
          >
            <span style={{ fontSize: 19, lineHeight: "20px", fontWeight: 800 }}>{d.getDate()}</span>
            <span style={{ fontSize: 11, lineHeight: "13px", fontWeight: 700, marginTop: 2 }}>
              {d.toLocaleDateString("en-US", { month: "short" })}
            </span>
            <span style={{ fontSize: 8.5, lineHeight: "10px", fontWeight: 600, color: "rgba(255,255,255,0.72)" }}>{d.getFullYear()}</span>
          </button>
          <button onClick={onToggle} aria-expanded={expanded} className="tap flex-1 min-w-0 flex items-center text-left" style={{ padding: "0 14px 0 15px", gap: 10 }}>
            <span className="flex-1 min-w-0">
              <span className="block truncate" style={{ fontSize: 14, lineHeight: "18px", fontWeight: 600, color: "#241F1B" }}>
                {session.routineName}
              </span>
              <span className="block truncate" style={{ marginTop: 3, fontSize: 11.5, lineHeight: "15px", color: "#8C8378" }}>
                {session.totalVolumeKg.toLocaleString()} kg · {formatCompactDuration(session.durationSec)} · {exercises.length} ex
              </span>
            </span>
            {expanded ? (
              <ChevronUp size={16} className="flex-none" style={{ color: "#8C8378" }} />
            ) : (
              <ChevronDown size={16} className="flex-none" style={{ color: "#8C8378" }} />
            )}
          </button>
        </div>

        {expanded && (
          <div style={{ borderTop: "1px solid rgba(36,31,27,0.07)", padding: "5px 24px 11px 14px" }}>
            {shown.map((ex) => {
              const top = topSet(ex);
              const done = ex.sets.filter((s) => s.completed).length;
              return (
                <div key={ex.exerciseId} className="flex items-center" style={{ padding: "7px 0", gap: 8 }}>
                  <span aria-hidden className="flex-none rounded-full" style={{ width: 6, height: 6, background: family.bar }} />
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, lineHeight: "19px", fontWeight: 500, color: "#241F1B" }}>
                    {ex.name}
                  </span>
                  <span className="flex-none" style={{ fontSize: 12, lineHeight: "19px", color: "#5B5349", whiteSpace: "nowrap" }}>
                    {top ? `${top.weightKg} kg × ${top.reps}` : done > 0 ? `${done} ${done === 1 ? "set" : "sets"}` : ""}
                  </span>
                </div>
              );
            })}
            {more > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="tap flex items-center"
                style={{ padding: "7px 0 0 2px", gap: 12, fontSize: 12, lineHeight: "16px", fontWeight: 600, color: family.tile }}
              >
                <Plus size={12} strokeWidth={2.4} /> {more} more {more === 1 ? "exercise" : "exercises"}
              </button>
            )}
          </div>
        )}
      </div>
    </SwipeActions>
  );
};
