import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, ChevronDown, Gauge, ShieldAlert } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { Toast } from "../../../components/ui/Toast";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useContentLines, useG3 } from "../../../components/premium/g3/useG3";
import { G3Body, G3Caps, G3Route, LockedRow } from "../../../components/premium/g3/parts";
import {
  endCentiumProgramme,
  fetchCentiumProgrammes,
  fetchMyCentiumProgrammes,
  fetchProgrammeSessions,
  markCentiumSessionDone,
  startCentiumProgramme,
} from "../../../services/premium/g3Calls";
import {
  groupByWeek,
  programmeProgressText,
  sessionAccess,
  sessionDate,
  sessionDone,
  startWindow,
  weekLabel,
  type CentiumProgramme,
  type MyCentiumProgramme,
  type ProgrammeSession,
} from "../../../services/premium/g3";
import { formatShortDate } from "../../../utils/date";
import { textPx } from "../../../theme/textSize";
import { coachColor } from "../coachColors";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · /app/workout/programmes/:slug, one Centium programme. These are
// the Database's own programmes (centium_programmes), not a coach's, so
// nothing here goes through the coach-programme services; the look follows
// the programme card on Routines (ProgrammeSection: cream card, soft rows).
//
// - It always opens with programme_safety (premium_content_lines), and the
//   effort guide is one tap away.
// - Who it's for, length, equipment, the description, how it runs, the
//   warm-up, the progression table and the free preview.
// - Start: a day from today to 30 days ahead (start_centium_programme).
// - Following it: done of all, the weeks with each day's session and its
//   exercises (name, amount, rest, notes), Mark done / Undo
//   (mark_centium_session_done). Past the free preview (week 1; Daily
//   Mobility's first 7 days) a free member sees the session locked; an
//   ATXQ1 from a write opens the prompt. End, behind a confirmation.
//
// Every content field is English data until the Database loads Karim's
// approved Arabic; only the labels go through t().

const day = (ymd: string) => formatShortDate(new Date(`${ymd}T12:00:00`), { weekday: "short", day: "numeric", month: "short" });

export default function CentiumProgrammePage() {
  return (
    <G3Route fallback="/app/workout">
      <ProgrammeScreen />
    </G3Route>
  );
}

function ProgrammeScreen() {
  const { slug = "" } = useParams();
  const programmes = useG3(fetchCentiumProgrammes, "programmes");
  return (
    <div className="animate-fade-slide-up pb-10">
      <G3Body state={programmes.state} onRetry={programmes.reload}>
        {(list) => {
          const p = list.find((x) => x.slug === slug);
          return p ? <ProgrammeView programme={p} /> : <NotFoundLine />;
        }}
      </G3Body>
    </div>
  );
}

function NotFoundLine() {
  return (
    <>
      <PageHeader title={t("Centium programmes")} showBack />
      <p className="text-[13px] text-charcoal-faint">{t("This programme isn't available.")}</p>
    </>
  );
}

function ProgrammeView({ programme: p }: { programme: CentiumProgramme }) {
  const { today } = useApp();
  const dark = useIsDark();
  const lines = useContentLines();
  const sessions = useG3(() => fetchProgrammeSessions(p.id), `sessions:${p.id}`);
  const mine = useG3(fetchMyCentiumProgrammes, "mine");
  const following: MyCentiumProgramme | null = mine.state.kind === "ready" ? mine.state.value.find((m) => m.programmeId === p.id) ?? null : null;
  const [effortOpen, setEffortOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [ending, setEnding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone?: "error" } | null>(null);
  // What the member marked on this screen, by session (the reader gives only the count).
  const [marked, setMarked] = useState<Map<number, boolean>>(new Map());
  const win = startWindow(today);

  const start = async (date: string) => {
    setPicking(false);
    setBusy(true);
    const r = await startCentiumProgramme(p.id, date);
    setBusy(false);
    if (!r.ok) return setToast({ message: r.message, tone: "error" });
    setMarked(new Map());
    mine.reload();
    setToast({ message: date === today ? t("Programme started.") : t("Programme starts {day}.", { day: day(date) }) });
  };

  const end = async () => {
    if (!following) return;
    setBusy(true);
    const r = await endCentiumProgramme(following.startId);
    setBusy(false);
    setEnding(false);
    if (!r.ok) return setToast({ message: r.message, tone: "error" });
    setMarked(new Map());
    mine.reload();
    setToast({ message: t("Programme ended.") });
  };

  const mark = async (s: ProgrammeSession, done: boolean) => {
    if (!following) return;
    setBusy(true);
    const r = await markCentiumSessionDone(following.startId, s.number, done);
    setBusy(false);
    // ATXQ1 has already asked for the prompt; the sentence says why.
    if (!r.ok) return setToast({ message: r.message, tone: "error" });
    setMarked((m) => new Map(m).set(s.number, done));
    mine.reload();
  };

  const caps = (label: string) => <G3Caps className="mt-5">{label}</G3Caps>;
  const para = (text: string) => <p style={{ fontSize: textPx(13), lineHeight: 1.5, color: "rgb(var(--c-charcoal))", whiteSpace: "pre-wrap" }}>{text}</p>;

  return (
    <>
      <PageHeader title={p.title} showBack />

      {/* Every programme opens with the safety line (content, English data). */}
      {lines?.programmeSafety && (
        <div role="note" className="flex items-start rounded-2xl bg-status-high-bg" style={{ gap: 10, padding: "12px 14px" }}>
          <ShieldAlert size={16} aria-hidden className="shrink-0 text-status-high" style={{ marginTop: 2 }} />
          <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: "rgb(var(--c-charcoal))" }}>{lines.programmeSafety}</p>
        </div>
      )}

      <div className="bg-cream-card border border-charcoal/[0.08]" style={{ borderRadius: 16, padding: 14, marginTop: 12 }}>
        {para(p.description)}
        <dl className="grid" style={{ marginTop: 10, gap: 6, gridTemplateColumns: "auto 1fr", columnGap: 12 }}>
          <Fact label={t("For")} value={p.forWhom} dark={dark} />
          <Fact label={t("Length")} value={p.lengthText} dark={dark} />
          <Fact label={t("Equipment")} value={p.equipment} dark={dark} />
        </dl>
      </div>

      {following ? (
        <div className="bg-cream-card border border-charcoal/[0.08]" style={{ borderRadius: 16, padding: 14, marginTop: 12 }}>
          <p style={{ fontSize: textPx(13.5), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
            {following.startsOn > today ? t("Starts {day}", { day: day(following.startsOn) }) : t("You're following this programme")}
          </p>
          <p style={{ marginTop: 2, fontSize: textPx(12), color: coachColor("faint", dark) }}>{programmeProgressText(following.done, following.sessions)}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEnding(true)}
            className="tap"
            style={{ marginTop: 10, minHeight: 36, fontSize: textPx(12.5), fontWeight: 700, color: "rgb(var(--c-status-high))" }}
          >
            {t("End programme")}
          </button>
        </div>
      ) : (
        mine.state.kind === "ready" && (
          <Button variant="primary" size="lg" fullWidth className="mt-3" disabled={busy} onClick={() => setPicking(true)}>
            {t("Start this programme")}
          </Button>
        )
      )}

      {p.howItRuns && (
        <>
          {caps(t("How it runs"))}
          {para(p.howItRuns)}
        </>
      )}
      {p.warmUp && (
        <>
          {caps(t("Warm-up"))}
          {para(p.warmUp)}
        </>
      )}

      {p.progression.length > 0 && (
        <>
          {caps(t("How it progresses"))}
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: textPx(12.5), borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: coachColor("faint", dark), textAlign: "start" }}>
                  <th className="text-start font-bold" style={{ padding: "4px 8px 6px 0" }}>{t("Weeks")}</th>
                  <th className="text-start font-bold" style={{ padding: "4px 8px 6px 0" }}>{t("Effort")}</th>
                  <th className="text-start font-bold" style={{ padding: "4px 0 6px" }}>{t("What to do")}</th>
                </tr>
              </thead>
              <tbody>
                {p.progression.map((r, i) => (
                  <tr key={i} style={{ borderTop: "0.5px solid rgb(var(--c-charcoal) / 0.1)", color: "rgb(var(--c-charcoal))", verticalAlign: "top" }}>
                    <td style={{ padding: "6px 8px 6px 0", whiteSpace: "nowrap" }}>{r.weeks}</td>
                    <td style={{ padding: "6px 8px 6px 0", whiteSpace: "nowrap" }}>{r.effort ?? "–"}</td>
                    <td style={{ padding: "6px 0" }}>{r.whatToDo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {lines?.effortGuide && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            aria-expanded={effortOpen}
            onClick={() => setEffortOpen((v) => !v)}
            className="tap flex items-center"
            style={{ gap: 6, minHeight: 40, fontSize: textPx(12.5), fontWeight: 700, color: dark ? "#C3B3FB" : "rgb(var(--thi-7d6bb5))" }}
          >
            <Gauge size={15} aria-hidden />
            {t("Effort guide")}
            <ChevronDown size={14} aria-hidden style={{ transform: effortOpen ? "rotate(180deg)" : undefined }} />
          </button>
          {effortOpen && <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: "rgb(var(--c-charcoal))", background: coachColor("soft", dark), borderRadius: 12, padding: "8px 10px" }}>{lines.effortGuide}</p>}
        </div>
      )}

      {caps(t("Free preview"))}
      {para(p.freePreview)}
      {p.suggestedNext && (
        <>
          {caps(t("Afterwards"))}
          {para(p.suggestedNext)}
        </>
      )}

      {caps(t("Week by week"))}
      <G3Body state={sessions.state} onRetry={sessions.reload}>
        {(list) => <Weeks sessions={list} following={following} marked={marked} busy={busy} today={today} onMark={(s, d) => void mark(s, d)} />}
      </G3Body>

      <CalendarPickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        selectedDate={today}
        today={today}
        minDate={win.min}
        maxDate={win.max}
        confirm
        confirmLabel={t("Start on this day")}
        title={t("When do you want to start?")}
        onSelect={(d) => void start(d)}
      />
      <BottomSheet open={ending} onClose={() => setEnding(false)} title={t("End this programme?")}>
        <p className="text-[13.5px] leading-[20px] text-charcoal">{t("You'll stop following it. You can start it again later, from week 1.")}</p>
        <div className="flex gap-2 mt-4 pb-2">
          <Button variant="secondary" size="lg" fullWidth onClick={() => setEnding(false)}>
            {t("Keep going")}
          </Button>
          <Button variant="primary" size="lg" fullWidth disabled={busy} onClick={() => void end()}>
            {t("End programme")}
          </Button>
        </div>
      </BottomSheet>
      <Toast open={!!toast} message={toast?.message ?? ""} tone={toast?.tone} onExpire={() => setToast(null)} />
    </>
  );
}

function Fact({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  if (!value) return null;
  return (
    <>
      <dt style={{ fontSize: textPx(12), fontWeight: 700, color: coachColor("faint", dark) }}>{label}</dt>
      <dd style={{ fontSize: textPx(12.5), color: "rgb(var(--c-charcoal))" }}>{value}</dd>
    </>
  );
}

function Weeks({
  sessions,
  following,
  marked,
  busy,
  today,
  onMark,
}: {
  sessions: ProgrammeSession[];
  following: MyCentiumProgramme | null;
  marked: ReadonlyMap<number, boolean>;
  busy: boolean;
  today: string;
  onMark: (s: ProgrammeSession, done: boolean) => void;
}) {
  const weeks = useMemo(() => groupByWeek(sessions), [sessions]);
  const [open, setOpen] = useState<number | null>(() => following?.nextSessionNumber ?? null);
  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {weeks.map((w) => (
        <div key={w.week}>
          <p style={{ fontSize: textPx(12.5), fontWeight: 700, color: "rgb(var(--c-charcoal))", marginBottom: 6 }}>{weekLabel(w.week)}</p>
          <div className="flex flex-col" style={{ gap: 6 }}>
            {w.sessions.map((s) =>
              sessionAccess(s) === "locked" ? (
                <LockedRow key={s.number} feature="programme_preview_week" title={s.title} meta={following ? day(sessionDate(following.startsOn, s)) : null} />
              ) : (
                <SessionCard
                  key={s.number}
                  s={s}
                  date={following ? sessionDate(following.startsOn, s) : null}
                  today={today}
                  done={following ? sessionDone(s.number, following, marked) : null}
                  open={open === s.number}
                  busy={busy}
                  onToggle={() => setOpen((o) => (o === s.number ? null : s.number))}
                  onMark={(d) => onMark(s, d)}
                />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionCard({
  s,
  date,
  today,
  done,
  open,
  busy,
  onToggle,
  onMark,
}: {
  s: ProgrammeSession;
  date: string | null;
  today: string;
  done: boolean | null;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onMark: (done: boolean) => void;
}) {
  const dark = useIsDark();
  const faint = coachColor("faint", dark);
  return (
    <div style={{ borderRadius: 12, background: coachColor("soft", dark), padding: "8px 10px" }}>
      <div className="flex items-center" style={{ gap: 10, minHeight: 40 }}>
        <button type="button" onClick={onToggle} aria-expanded={open} className="tap flex-1 min-w-0 text-start">
          <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>
            {s.title}
          </span>
          <span className="block" style={{ fontSize: textPx(11.5), color: faint }}>
            {[date ? (date === today ? t("Today") : day(date)) : null, s.effort].filter(Boolean).join(" · ")}
          </span>
        </button>
        {done === true ? (
          <span className="flex items-center shrink-0" style={{ gap: 8 }}>
            <span className="flex items-center" style={{ gap: 4, fontSize: textPx(12), fontWeight: 700, color: "rgb(var(--c-status-good))" }}>
              <Check size={14} strokeWidth={2.6} aria-hidden /> {t("Done")}
            </span>
            <button type="button" disabled={busy} onClick={() => onMark(false)} className="tap" style={{ fontSize: textPx(12), fontWeight: 700, color: dark ? "#C3B3FB" : "rgb(var(--thi-7d6bb5))" }}>
              {t("Undo")}
            </button>
          </span>
        ) : done === false ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMark(true)}
            className="tap shrink-0 bg-primary-fill text-on-primary-fill"
            style={{ height: 32, borderRadius: 10, padding: "0 11px", fontSize: textPx(12), fontWeight: 700 }}
          >
            {t("Mark done")}
          </button>
        ) : null}
      </div>
      {open && <SessionDetail s={s} />}
    </div>
  );
}

function SessionDetail({ s }: { s: ProgrammeSession }) {
  const dark = useIsDark();
  const faint = coachColor("faint", dark);
  const small: React.CSSProperties = { fontSize: textPx(11.5), color: faint };
  return (
    <div style={{ marginTop: 6 }}>
      {s.note && <p style={{ fontSize: textPx(12.5), lineHeight: 1.45, color: "rgb(var(--c-charcoal))" }}>{s.note}</p>}
      {s.warmUp && (
        <p style={{ ...small, marginTop: 6, lineHeight: 1.45 }}>
          <span style={{ fontWeight: 700 }}>{t("Warm-up")}: </span>
          {s.warmUp}
        </p>
      )}
      <ul className="flex flex-col" style={{ marginTop: 8, gap: 6 }}>
        {(s.items ?? []).map((it, i) => (
          <li key={i} className="bg-cream-card" style={{ borderRadius: 10, padding: "8px 10px" }}>
            <p style={{ fontSize: textPx(13), fontWeight: 600, color: "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>{it.name}</p>
            <p style={small}>{[it.amount, it.rest ? t("rest {rest}", { rest: it.rest }) : null].filter(Boolean).join(" · ")}</p>
            {it.notes && <p style={{ ...small, marginTop: 2, lineHeight: 1.4 }}>{it.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
