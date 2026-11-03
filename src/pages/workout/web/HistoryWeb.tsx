import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, CalendarDays, ChevronDown, Dumbbell, ChevronUp, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { HistoryWindowLine } from "../../../components/premium/HistoryWindowLine";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Toast } from "../../../components/ui/Toast";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { routineFamily, unfiledFamily, type FolderFamily } from "../../../data/folderColors";
import { useWorkoutReplies } from "../useWorkoutReplies";
import { replyHeading, type WorkoutLogReply } from "../../../services/workout/logReplyLogic";
import { notifWhen } from "../../../services/notifications/notificationsModel";
import { formatCompactDuration } from "../../../services/workout";
import { byNewest, comparisonPhrase, historySummary, inRange, PERIOD_LABEL, periodRange, topSet, type HistoryPeriod } from "../../../services/workout/history";
import { fetchSentSessions } from "../../../services/workout/coach";
import { sentLine } from "../../../services/workout/coachLogic";
import { fetchConnectedProfessional } from "../../../services/connected-professional";
import type { WorkoutSession } from "../../../types";
import { useClientShare } from "../../../components/share/client/useClientShare";
import { ShareGlyph } from "../../../components/share/client/ShareEntryButton";
import { workoutCard } from "../../../components/share/client/clientCardModel";
import { weightOn, workoutFacts } from "../../../components/share/client/clientShareData";
import { appLocale } from "../../../i18n/format";
import { EmptyCard } from "./parts";
import { capsLabel } from "./styles";
import { t, tn } from "../../../i18n/core";

// Website viewport v1 · WC-WO.3 History (WC-WO Workout Web v13) and its
// popups (WC-WO.3.1). The Summary row with the period chip (40, anchored
// menu), the hero (TOTAL VOLUME 32/40, the comparison phrase 22/30 between
// it and TIME TAKEN, the #E4DDFD band), then Logged sessions in two columns
// (one beside the rail): 72 cards with the 64 date block, hover actions
// (Change date, Share, Delete) in place of the mobile swipe, and the
// professional's replies (the repo change since the design) under the card,
// as on mobile. Reads, the Undo toast and the pickers are the mobile tab's.

const PERIODS: HistoryPeriod[] = ["week", "month", "year", "all", "day", "custom"];
const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });
type ToastState = { message: string; undo?: () => void; icon?: React.ReactNode; commit?: () => Promise<string | undefined> };

const heroCaps: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.14em", whiteSpace: "nowrap", color: "rgba(255,255,255,0.72)" };

/** "3 workouts" with the count in bold, the words in the app's language. */
const CountWords: React.FC<{ n: number; shown: string; words: string }> = ({ n, shown, words }) => {
  const at = words.indexOf(String(n));
  const bold = <b style={{ color: "#2E2560", fontWeight: 800 }}>{shown}</b>;
  if (at < 0) return <>{words}</>;
  return (
    <>
      {words.slice(0, at)}
      {bold}
      {words.slice(at + String(n).length)}
    </>
  );
};

export default function HistoryWeb() {
  const { workoutSessions, routines, routineFolders, today, moveWorkoutSession, removeWorkoutSession, authUserId, weightByDate } = useApp();
  const { rail } = useWebLayout();
  const share = useClientShare();
  const [sent, setSent] = useState<Record<string, { swaps: number }>>({});
  const [coachNames, setCoachNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchSentSessions(authUserId).then((m) => !cancelled && setSent(m));
    return () => {
      cancelled = true;
    };
  }, [authUserId, workoutSessions.length]);
  const sentCoachIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of workoutSessions) {
      if (!sent[s.id] || !s.routineId) continue;
      const pro = routines.find((r) => r.id === s.routineId)?.assignedByProfessionalId;
      if (pro) ids.add(pro);
    }
    return [...ids].sort().join(",");
  }, [sent, workoutSessions, routines]);
  useEffect(() => {
    const ids = sentCoachIds ? sentCoachIds.split(",") : [];
    if (ids.length === 0) return;
    let cancelled = false;
    void Promise.all(ids.map(async (id) => [id, await fetchConnectedProfessional(id)] as const)).then((rows) => {
      if (cancelled) return;
      const names: Record<string, string> = {};
      for (const [id, r] of rows) if (r.ok && r.professional?.firstName?.trim()) names[id] = r.professional.firstName.trim();
      setCoachNames(names);
    });
    return () => {
      cancelled = true;
    };
  }, [sentCoachIds]);
  const sentLineOf = (s: WorkoutSession): string | null => {
    const info = sent[s.id];
    if (!info) return null;
    const pro = s.routineId ? routines.find((r) => r.id === s.routineId)?.assignedByProfessionalId : undefined;
    return sentLine((pro && coachNames[pro]) || t("your coach"), info.swaps);
  };

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
  const replies = useWorkoutReplies(
    listed.map((s) => s.id),
    coachNames
  );
  const [params] = useSearchParams();
  const focusId = params.get("session");
  const focused = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId || focused.current === focusId || !workoutSessions.some((s) => s.id === focusId)) return;
    focused.current = focusId;
    setPeriod("all");
    setExpandedId(focusId);
    const timer = window.setTimeout(() => document.getElementById(`session-${focusId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, workoutSessions.length]);
  const summary = historySummary(listed);
  const phrase = comparisonPhrase(summary.volumeKg);
  const sessionDays = useMemo(() => new Set(workoutSessions.map((s) => s.date)), [workoutSessions]);

  const pending = useRef<ToastState | null>(null);
  const flush = () => {
    const p = pending.current;
    pending.current = null;
    if (p?.commit) void p.commit().then((m) => m && setError(t(m)));
  };
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const showToast = (next: ToastState) => {
    flush();
    pending.current = next.commit ? next : null;
    setToast(next);
  };
  const familyOf = (s: WorkoutSession): FolderFamily => {
    const routine = s.routineId ? routines.find((r) => r.id === s.routineId) : undefined;
    return routine ? routineFamily(routine, routineFolders) : unfiledFamily();
  };
  const moveTo = async (s: WorkoutSession, date: string) => {
    if (date === s.date) return;
    const from = s.date;
    const message = await moveWorkoutSession(s.id, date);
    if (message) {
      setError(t(message));
      return;
    }
    setError(null);
    const outside = !inRange(date, range);
    showToast({
      message: outside
        ? t("Moved to {date} (outside {period}).", { date: shortDate(date), period: period === "day" && custom ? shortDate(custom.from) : t(PERIOD_LABEL[period]) })
        : t("Moved to {date}.", { date: shortDate(date) }),
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
    showToast({ message: t("Workout deleted."), icon: <Trash2 size={14} className="flex-none" style={{ color: "#A2C8C2" }} />, undo: handle.undo, commit: handle.commit });
  };

  const periodLabel =
    (period === "custom" || period === "day") && custom
      ? custom.from === custom.to
        ? shortDate(custom.from)
        : `${shortDate(custom.from)} – ${shortDate(custom.to)}`
      : t(PERIOD_LABEL[period]);

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <HistoryWindowLine />
      <div className="flex items-center justify-between">
        <p style={capsLabel("#8C8378")}>{t("Summary")}</p>
        <button
          type="button"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={!!menuAnchor}
          className="flex items-center hover:!bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ height: 40, minWidth: 220, justifyContent: "space-between", boxSizing: "border-box", borderRadius: 999, border: "1px solid #E0D5FC", background: "#FFFFFF", padding: "0 16px", gap: 8 }}
        >
          <span className="flex items-center" style={{ gap: 8 }}>
            <Calendar size={16} color="#8F68F6" />
            <span style={{ fontSize: 15, lineHeight: "24px", fontWeight: 500, color: "#241F1B", whiteSpace: "nowrap" }}>{periodLabel}</span>
          </span>
          <ChevronDown size={16} color="#A9A29A" />
        </button>
      </div>

      <div style={{ borderRadius: 20, overflow: "hidden", flex: "none" }}>
        <div className="flex items-center justify-between" style={{ background: "linear-gradient(180deg,#A79AD5,#A194D1)", color: "#FFFFFF", padding: "20px 24px 16px", gap: 24 }}>
          <div>
            <p style={heroCaps}>{t("TOTAL VOLUME")}</p>
            <p className="flex items-baseline" style={{ margin: "4px 0 0", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 32, lineHeight: "40px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{summary.volumeKg.toLocaleString(appLocale())}</span>
              <span style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.86)", marginInlineStart: 6 }}>kg</span>
            </p>
          </div>
          <div className="flex-1 min-w-0 flex justify-center text-center" style={{ alignSelf: "center" }}>
            {phrase && <p style={{ margin: 0, maxWidth: 520, fontSize: 22, lineHeight: "30px", fontWeight: 700, color: "#FFFFFF", textWrap: "balance" } as React.CSSProperties}>{phrase}</p>}
          </div>
          <div className="text-end">
            <p style={heroCaps}>{t("TIME TAKEN")}</p>
            <p style={{ margin: "4px 0 0", fontSize: 28, lineHeight: "40px", fontWeight: 800 }}>{formatCompactDuration(summary.seconds)}</p>
          </div>
        </div>
        <div className="flex items-center" style={{ background: "#E4DDFD", padding: "14px 24px", gap: 32, fontSize: 15, lineHeight: "24px" }}>
          <span className="flex items-center" style={{ gap: 8, color: "#463A80", fontWeight: 500 }}>
            <CalendarDays size={16} />
            <span>
              <CountWords n={summary.workouts} shown={String(summary.workouts)} words={tn(summary.workouts, "{n} workout", "{n} workouts")} />
            </span>
          </span>
          <span className="flex items-center" style={{ gap: 8, color: "#463A80", fontWeight: 500 }}>
            <Dumbbell size={16} />
            <span>
              <CountWords n={summary.sets} shown={summary.sets.toLocaleString(appLocale())} words={tn(summary.sets, "{n} set", "{n} sets")} />
            </span>
          </span>
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#C0392B" }}>{t(error)}</p>}

      <p style={{ ...capsLabel("#8C8378"), margin: "8px 0 -4px" }}>{t("Logged sessions")}</p>

      {listed.length === 0 ? (
        <EmptyCard>
          <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("No logged workouts yet. Finish a routine to see it here.")}</p>
        </EmptyCard>
      ) : (
        <div style={{ columns: rail ? 1 : 2, columnGap: 16 }}>
          {listed.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              family={familyOf(s)}
              sentLine={sentLineOf(s)}
              replies={replies[s.id]}
              expanded={expandedId === s.id}
              onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
              onChangeDate={() => setMoving(s)}
              onDelete={() => setDeleting(s)}
              onShare={() => share.open(workoutCard(workoutFacts(s, weightOn(weightByDate, s.date))))}
            />
          ))}
        </div>
      )}

      {/* WC-WO.3.1 Period menu: anchored under the chip, at its width. */}
      <PopupMenu<HistoryPeriod>
        open={!!menuAnchor}
        anchor={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        width={menuAnchor ? Math.max(204, menuAnchor.offsetWidth - 16) : 204}
        align="right"
        options={PERIODS.map((p) => ({ value: p, label: t(PERIOD_LABEL[p]) }))}
        selected={period}
        onSelect={(p) => {
          if (p === "custom") setRangeStep({ step: "from" });
          else if (p === "day") setPickingDay(true);
          else setPeriod(p);
        }}
      />
      <CalendarPickerSheet
        open={pickingDay}
        onClose={() => setPickingDay(false)}
        title={t("Choose a date")}
        selectedDate={period === "day" && custom ? custom.from : today}
        today={today}
        maxDate={today}
        markers={sessionDays}
        onSelect={(date) => {
          setCustom({ from: date, to: date });
          setPeriod("day");
        }}
      />
      <CalendarPickerSheet
        open={!!rangeStep}
        onClose={() => setRangeStep(null)}
        title={rangeStep?.step === "to" ? t("End date") : t("Start date")}
        selectedDate={rangeStep?.from ?? custom?.from ?? today}
        today={today}
        maxDate={today}
        markers={sessionDays}
        onSelect={(date) => {
          if (rangeStep?.step === "from") {
            window.setTimeout(() => setRangeStep({ step: "to", from: date }), 0);
            return;
          }
          const from = rangeStep?.from ?? date;
          setCustom(from <= date ? { from, to: date } : { from: date, to: from });
          setPeriod("custom");
        }}
      />
      <CalendarPickerSheet
        open={!!moving}
        onClose={() => setMoving(null)}
        title={t("Change workout date")}
        selectedDate={moving?.date ?? today}
        today={today}
        maxDate={today}
        markers={sessionDays}
        onSelect={(date) => moving && void moveTo(moving, date)}
      />
      {/* WC-WO.3.1 Delete this workout? (centred popup). */}
      <ConfirmCard
        open={!!deleting}
        title={t("Delete this workout?")}
        subtitle={deleting ? `${deleting.routineName} · ${shortDate(deleting.date)} · ${deleting.totalVolumeKg.toLocaleString(appLocale())} kg` : undefined}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
      {share.sheet}
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
 * One logged session (reference): 72 min, r14, the routine's row tint; the
 * 64 date block in its folder colour (22/22 800, 13/16 700, 13/16 600 at
 * 80%, white); the name 17/24 600 and the meta 13/20; on hover Change date
 * (36, white) and Delete (36, #FCEDEC), with Share between them as on the
 * mobile swipe; the chevron 16. Open: each exercise's top set (rows 8 0,
 * the 6 dot, 15/22 500 and 13/20 #5B5349) and "+ N more exercises".
 */
const SessionCard: React.FC<{
  session: WorkoutSession;
  family: FolderFamily;
  expanded: boolean;
  onToggle: () => void;
  onChangeDate: () => void;
  onDelete: () => void;
  onShare?: () => void;
  sentLine?: string | null;
  replies?: WorkoutLogReply[];
}> = ({ session, family, expanded, onToggle, onChangeDate, onDelete, onShare, sentLine: sentText, replies }) => {
  const [showAll, setShowAll] = useState(false);
  const d = new Date(`${session.date}T00:00:00`);
  const exercises = session.exercises;
  const shown = showAll ? exercises : exercises.slice(0, LIST_LIMIT);
  const more = exercises.length - shown.length;
  const action = (label: string, icon: React.ReactNode, onClick: () => void, bg: string, ink: string) => (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ width: 36, height: 36, borderRadius: 10, background: bg, color: ink, flex: "none" }}>
      {icon}
    </button>
  );
  return (
    <div id={`session-${session.id}`} className="group" style={{ breakInside: "avoid", marginBottom: 12, borderRadius: 14, overflow: "hidden", background: family.row }}>
      <div className="flex" style={{ minHeight: 72 }}>
        <button
          type="button"
          onClick={onChangeDate}
          aria-label={t("Change date of {name}", { name: session.routineName })}
          className="flex flex-col items-center justify-center"
          style={{ width: 64, flex: "none", background: family.head, color: "#FFFFFF" }}
        >
          <span style={{ fontSize: 22, lineHeight: "22px", fontWeight: 800 }}>{d.getDate()}</span>
          <span style={{ fontSize: 13, lineHeight: "16px", fontWeight: 700, marginTop: 2 }}>{d.toLocaleDateString(appLocale("en-US"), { month: "short" })}</span>
          <span style={{ fontSize: 13, lineHeight: "16px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{d.getFullYear()}</span>
        </button>
        <div className="flex-1 min-w-0 flex items-center" style={{ padding: "0 16px", gap: 10 }}>
          <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex-1 min-w-0 text-start self-stretch flex flex-col justify-center" style={{ padding: "10px 0" }}>
            <span className="block truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
              {session.routineName}
            </span>
            <span className="block truncate" style={{ marginTop: 2, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
              {`${session.totalVolumeKg.toLocaleString(appLocale())} kg · ${formatCompactDuration(session.durationSec)} · ${tn(exercises.length, "{n} ex", "{n} ex")}`}
            </span>
            {sentText && (
              <span className="flex items-center" style={{ marginTop: 6, gap: 6, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: family.tile }}>
                <Send size={14} className="flex-none" aria-hidden />
                {sentText}
              </span>
            )}
          </button>
          <span className="hidden group-hover:flex group-focus-within:flex items-center" style={{ gap: 8 }}>
            {action(t("Change date"), <Pencil size={16} />, onChangeDate, "#FFFFFF", "#5B5349")}
            {onShare && action(t("Share {name}", { name: session.routineName }), <ShareGlyph size={16} color="currentColor" />, onShare, "#F0EDF9", "#7D6BB5")}
            {action(t("Delete"), <Trash2 size={16} />, onDelete, "#FCEDEC", "#B4372C")}
          </span>
          <button type="button" onClick={onToggle} aria-hidden tabIndex={-1} className="flex" style={{ color: "#8C8378" }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {replies && replies.length > 0 && (
        <div className="flex flex-col" style={{ gap: 8, paddingBlock: "0 12px", paddingInline: "80px 16px" }}>
          {replies.map((r) => (
            <div key={r.id} className="self-start max-w-full" style={{ borderRadius: "20px 20px 20px 4px", background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", padding: "8px 12px", color: "#241F1B" }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5F5093" }}>{`${replyHeading(r.firstName)} · ${notifWhen(r.createdAt)}`}</p>
              <p className={expanded ? "whitespace-pre-wrap break-words" : "line-clamp-2 break-words"} style={{ margin: "2px 0 0", fontSize: 15, lineHeight: "22px" }}>
                {r.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(36,31,27,0.07)", paddingBlock: "6px 14px", paddingInline: "16px 24px" }}>
          {shown.map((ex) => {
            const top = topSet(ex);
            const done = ex.sets.filter((s) => s.completed).length;
            return (
              <div key={ex.exerciseId} className="flex items-center" style={{ padding: "8px 0", gap: 10 }}>
                <span aria-hidden className="flex-none rounded-full" style={{ width: 6, height: 6, background: family.bar }} />
                <span className="flex-1 min-w-0 truncate" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 500, color: "#241F1B" }}>
                  {ex.name}
                </span>
                <span className="flex-none" style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349", whiteSpace: "nowrap" }}>
                  {top ? `${top.weightKg} kg × ${top.reps}` : done > 0 ? tn(done, "{n} set", "{n} sets") : ""}
                </span>
              </div>
            );
          })}
          {more > 0 && (
            <button type="button" onClick={() => setShowAll(true)} className="flex items-center" style={{ paddingTop: 6, gap: 10, whiteSpace: "nowrap", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: family.tile }}>
              <Plus size={13} strokeWidth={2.4} /> {tn(more, "{n} more exercise", "{n} more exercises")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
