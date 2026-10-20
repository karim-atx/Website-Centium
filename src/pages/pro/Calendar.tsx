import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CircleCheck, Paperclip, Plus, Settings2 } from "lucide-react";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { Toast } from "../../components/ui/Toast";
import { calendarJump } from "../../components/ui/calendarJump";
import { EventComposeSheet, type EventDraft } from "../../components/calendar/EventComposeSheet";
import { EventDetailSheet } from "../../components/calendar/EventDetailSheet";
import { RepeatScopePopup, type RepeatScope } from "../../components/calendar/RepeatScopePopup";
import { YearScroll } from "../../components/calendar/YearScroll";
import { dayBefore } from "../../components/calendar/occurrences";
import { saveRepeating } from "../../components/calendar/saveRepeating";
import { normaliseLink } from "../../components/calendar/calendarTime";
import { EVENT_SWATCHES } from "../../components/calendar/eventColour";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useProSubtype } from "../../hooks/useProSubtype";
import { textPx } from "../../theme/textSize";
import { monthLeadingBlanks, startOfWeekISO } from "../../utils/week";
import { time12 } from "../../utils/time12";
import { INK } from "../../components/pro/proInk";
import { OfflineLine, ProError } from "../../components/pro/states";
import { proClientPath, PRO_ROUTES } from "../../components/pro/subtypeLanes";
import { useProCalendar } from "../../components/pro/calendar/useProCalendar";
import { buildItems, type CalItem } from "../../components/pro/calendar/calendarItems";
import { AgendaRow, DayOffRow, DayTimeline, Eyebrow, HeaderCard, MonthGrid, RequestCard, WeekDayRow } from "../../components/pro/calendar/CalendarViews";
import { AddSessionSheet, type SessionClient } from "../../components/pro/calendar/AddSessionSheet";
import { SessionSheet } from "../../components/pro/calendar/SessionSheet";
import { TimeOffSheet } from "../../components/pro/calendar/TimeOffSheet";
import {
  addDays,
  dateRange,
  dayBounds,
  hoursLabel,
  isoOf,
  longDay,
  minutes,
  slotWindows,
  workingWindows,
  type AlertValue,
  type TimeOffEntry,
} from "../../components/pro/calendar/calendarModel";
import {
  acceptBooking,
  cancelBooking,
  declineBooking,
  fetchOpenSlots,
  fetchReminderDefaults,
} from "../../services/pro/calendar";
import { fetchActiveCarePlans, fetchActiveMealPlans, fetchActiveProgrammes, fetchClientStages, STAGE_LABEL, type ClientPlan, type StageRow } from "../../services/pro/clients";
import {
  attachmentUrl,
  createEvent,
  deleteEvent,
  endSeries,
  fetchInviteCandidates,
  respondToInvite,
  setEventInvitees,
  setOccurrence,
  updateEvent,
  uploadEventAttachment,
  type InviteeRow,
} from "../../services/calendar";
import { acceptFor } from "../../services/storage";
import { startThread } from "../../services/messaging";

/**
 * Release 3 · W4 Calendar (/app/pro/calendar; HANDOVER f "CA · Calendar",
 * FINAL_PLAN W4, IMPLEMENTATION_FRONTEND Batch 4). Replaces the old
 * the old professional calendar tab. Built on the client calendar's patterns
 * (pages/profile/ClientCalendarTab.tsx, not edited): Year, Month, Week, Day
 * (the CA frames draw all four), Monday first, 12-hour times.
 *
 * - CA1 v2 Month: the grid (busy dot, greyed day off) and the day's agenda
 *   under "{day} · Working {hours}".
 * - CA3 v2 Week: a day box per day with its working hours (or Day off) and
 *   the cards beside it.
 * - CA4 v2 Day: Requests (DB-4 booking requests, Accept / Decline), then the
 *   timeline: hatched outside working hours, time off as Break, sessions,
 *   business classes (gold, Store), requested slots (dashed gold), open slots
 *   from the one slot engine (dashed, + adds a session), the red now line.
 *   Clinical overview adds follow-ups (plum).
 * - + opens Add session (CA10 to CA13); the sliders open Availability (CA8,
 *   /app/pro/calendar/availability).
 * - Kept from the old CalendarTab (FINAL_PLAN 2.4): business classes
 *   assigned to me, invitations with Accept / Decline (EventDetailSheet), own
 *   events with several invitees, attachments opened through a signed URL,
 *   location and meeting link.
 * Deep links: ?day=YYYY-MM-DD opens that day (the hub's booking request),
 * ?new=1&client=<id> opens Add session for that client (the client page).
 */

type View = "year" | "month" | "week" | "day";
const VIEWS: View[] = ["year", "month", "week", "day"];

const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" }));

/** Signed at the click: the URL's lifetime is minutes. */
async function openAttachment(path: string) {
  const r = await attachmentUrl(path);
  if (r.ok && r.url) window.open(r.url, "_blank", "noopener");
}

const blankDraft = (date: string): EventDraft => ({
  title: "",
  date,
  allDay: false,
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  repeat: "none",
  notes: "",
  color: EVENT_SWATCHES[0],
  url: "",
  alert: "none",
  repeatUntil: null,
});

export default function Calendar() {
  const { authUserId, professionalClients } = useApp();
  const { lane } = useProSubtype();
  const navigate = useNavigate();
  const dark = useIsDark();
  const [params, setParams] = useSearchParams();
  const clinical = lane === "clinical_overview";
  const data = useProCalendar(clinical);
  const me = authUserId ?? "";

  const now = new Date();
  const todayIso = isoOf(now);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(todayIso);
  const [yearJump, setYearJump] = useState(0);
  const [toast, setToast] = useState<{ text: string; ok: boolean; action?: { label: string; onClick: () => void } } | null>(null);

  // ---- deep links ----
  useEffect(() => {
    const day = params.get("day");
    const add = params.get("new");
    if (!day && !add) return;
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
      setSelected(day);
      setCursor({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1 });
      setView("day");
    }
    if (add) setAddOpen({ date: day ?? todayIso, clientId: params.get("client") ?? undefined });
    const next = new URLSearchParams(params);
    next.delete("day");
    next.delete("new");
    next.delete("client");
    setParams(next, { replace: true });
  }, [params, setParams, todayIso]);

  // ---- items ----
  const selectedYear = Number(selected.slice(0, 4));
  const rangeFrom = `${Math.min(cursor.year, selectedYear) - 1}-01-01`;
  const rangeTo = `${Math.max(cursor.year, selectedYear) + (view === "year" ? 5 : 1)}-12-31`;
  const items = useMemo(() => buildItems(data, rangeFrom, rangeTo), [data, rangeFrom, rangeTo]);
  const ownHours = useMemo(() => data.availability.filter((a) => a.businessId === null), [data.availability]);
  const hasHours = ownHours.length > 0;
  const proEntries = useMemo(() => data.timeOffEntries.filter((e) => e.businessId === null), [data.timeOffEntries]);
  const wholeDayOff = (iso: string) => proEntries.find((e) => e.start === null && e.dates.includes(iso)) ?? null;
  const windowsOf = (iso: string) => (wholeDayOff(iso) ? [] : workingWindows(ownHours, iso));
  const dayOff = (iso: string) => !!wholeDayOff(iso) || (hasHours && workingWindows(ownHours, iso).length === 0);
  const hoursLine = (iso: string): string | null => {
    const w = windowsOf(iso);
    return w.length ? hoursLabel(w) : null;
  };

  // ---- the roster for Add session (CA10 lines) ----
  const [stages, setStages] = useState<StageRow[]>([]);
  const [plans, setPlans] = useState<ClientPlan[]>([]);
  useEffect(() => {
    if (!me || !lane) return;
    let live = true;
    void Promise.all([
      fetchClientStages(),
      lane === "full_coaching" ? fetchActiveProgrammes(me) : lane === "nutrition" ? fetchActiveMealPlans(me) : fetchActiveCarePlans(me),
    ]).then(([s, p]) => {
      if (!live) return;
      if (s.ok) setStages(s.data);
      if (p.ok) setPlans(p.data);
    });
    return () => {
      live = false;
    };
  }, [me, lane]);

  const nextSessionOf = useMemo(() => {
    const out: Record<string, string> = {};
    const nowKey = `${todayIso} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const days = Object.keys(items).filter((d) => d >= todayIso).sort();
    for (const d of days) {
      for (const i of items[d]) {
        if (i.kind !== "session" || !i.clientId || out[i.clientId] || `${d} ${i.start ?? ""}` < nowKey) continue;
        out[i.clientId] = d === todayIso ? `Next today ${time12(i.start)}`.trim() : `Next ${new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, todayIso]);

  const planLineOf = (clientId: string) => {
    const p = plans.find((x) => x.clientId === clientId);
    if (!p) return null;
    return p.week ? `${p.name} · Week ${p.week.n}${p.week.of ? ` of ${p.week.of}` : ""}` : p.name;
  };

  const sessionClients: SessionClient[] = useMemo(
    () =>
      professionalClients
        .filter((c) => !!c.clientId)
        .map((c) => {
          const id = c.clientId!;
          const plan = plans.find((x) => x.clientId === id)?.name;
          const stage = stages.find((s) => s.clientId === id)?.stage;
          const next = nextSessionOf[id];
          const line = plan ? `${plan} · ${next ?? "Not booked"}` : next ?? (stage && stage !== "active" ? STAGE_LABEL[stage] : "Not booked");
          return { id, name: c.name, avatarUrl: c.avatarUrl ?? null, line };
        }),
    [professionalClients, plans, stages, nextSessionOf]
  );

  // ---- reminders for new sessions (CA22 practice defaults, else 1 hour before) ----
  const [reminders, setReminders] = useState<{ alert: AlertValue; alert2: AlertValue }>({ alert: "hour_1", alert2: "none" });
  useEffect(() => {
    if (!me) return;
    void fetchReminderDefaults(me).then((r) => r.ok && setReminders({ alert: r.data.alert as AlertValue, alert2: r.data.alert2 as AlertValue }));
  }, [me]);

  // ---- open slots for the Day view (one slot engine, the first session type) ----
  const [open, setOpen] = useState<{ start: string; end: string }[]>([]);
  const firstType = data.types[0]?.id ?? null;
  useEffect(() => {
    setOpen([]);
    if (view !== "day" || !me || !firstType || selected < todayIso) return;
    let live = true;
    void fetchOpenSlots(me, selected, selected, firstType).then((r) => live && r.ok && setOpen(slotWindows(r.data)[selected] ?? []));
    return () => {
      live = false;
    };
  }, [view, me, firstType, selected, todayIso, data.requests, data.events, data.timeOff]);

  // ---- sheets ----
  const [addOpen, setAddOpen] = useState<{ date: string; start?: string; clientId?: string } | null>(null);
  const [session, setSession] = useState<CalItem | null>(null);
  const [detail, setDetail] = useState<CalItem | null>(null);
  const [offSheet, setOffSheet] = useState<{ entry: TimeOffEntry | null; day: string } | null>(null);
  const [requestBusy, setRequestBusy] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);

  // Personal events (EventComposeSheet), with the old tab's invitees and attachment.
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOcc, setEditingOcc] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventDraft>(() => blankDraft(todayIso));
  const [guests, setGuests] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<InviteeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scopeAsk, setScopeAsk] = useState<"save" | "delete" | null>(null);
  useEffect(() => {
    if (!composeOpen || !me) return;
    void fetchInviteCandidates(me).then(setCandidates);
  }, [composeOpen, me]);

  const series = editingId ? data.events.find((e) => e.id === editingId) ?? null : null;
  const repeats = !!series && series.repeat !== "none";

  const openPersonal = (date: string) => {
    setEditingId(null);
    setEditingOcc(null);
    setDraft(blankDraft(date));
    setGuests([]);
    setSaveError(null);
    setLinkError(false);
    setConfirmDelete(false);
    setComposeOpen(true);
  };
  const openEdit = (i: CalItem) => {
    const e = i.event;
    if (!e) return;
    setEditingId(e.id);
    setEditingOcc(i.date);
    setDraft({
      title: e.title,
      date: e.date,
      allDay: e.allDay,
      startTime: e.startTime ?? "09:00",
      endTime: e.endTime ?? "10:00",
      location: e.location ?? "",
      repeat: e.repeat,
      notes: e.notes ?? "",
      color: e.color ?? EVENT_SWATCHES[0],
      url: e.url ?? "",
      alert: e.alert,
      repeatUntil: e.repeatUntil ?? null,
    });
    setGuests((data.invitees[e.id] ?? []).map((g) => g.userId));
    setSaveError(null);
    setLinkError(false);
    setConfirmDelete(false);
    setComposeOpen(true);
  };

  const saveEvent = async (scope?: RepeatScope) => {
    if (!draft.title.trim() || !me || saving) return;
    const url = normaliseLink(draft.url);
    if (draft.url.trim() && !url) return setLinkError(true);
    setLinkError(false);
    const payload = { ...draft, title: draft.title.trim(), url: url ?? undefined };
    if (series && repeats && !scope) return setScopeAsk("save");
    setScopeAsk(null);
    setSaving(true);
    setSaveError(null);
    if (series && repeats && scope) {
      const r = await saveRepeating(me, series, editingOcc ?? series.date, scope, payload);
      setSaving(false);
      if (!r.ok) return setSaveError(r.message ?? "Couldn't save your changes. Try again.");
      await data.reload();
      return setComposeOpen(false);
    }
    const r = editingId ? await updateEvent(me, editingId, payload) : await createEvent(me, payload);
    if (!r.ok) {
      setSaving(false);
      return setSaveError(r.message);
    }
    const g = await setEventInvitees(r.event.id, guests);
    setSaving(false);
    await data.reload();
    if (r.alertMessage) {
      setEditingId(r.event.id);
      return setSaveError(r.alertMessage);
    }
    if (!g.ok) {
      setEditingId(r.event.id);
      return setSaveError(g.message ?? "Couldn't update the invitations. Try again.");
    }
    setComposeOpen(false);
  };

  const removeEvent = async (scope?: RepeatScope) => {
    if (!editingId || !me || saving) return;
    if (series && repeats) {
      if (!scope) return setScopeAsk("delete");
      setScopeAsk(null);
      const occ = editingOcc ?? series.date;
      setSaving(true);
      const whole = scope === "all" || (scope === "following" && occ <= series.date);
      const r = whole ? await deleteEvent(me, editingId) : scope === "following" ? await endSeries(me, editingId, dayBefore(occ)) : await setOccurrence(editingId, occ, { cancelled: true });
      setSaving(false);
      if (!r.ok) return setSaveError(r.message ?? "Couldn't delete that event. Try again.");
      await data.reload();
      return setComposeOpen(false);
    }
    setSaving(true);
    const r = await deleteEvent(me, editingId);
    setSaving(false);
    if (!r.ok) return setSaveError(r.message ?? "Couldn't delete that event.");
    await data.reload();
    setComposeOpen(false);
  };

  const attach = async (file: File) => {
    if (!editingId || !me) return;
    setSaving(true);
    const r = await uploadEventAttachment(editingId, me, file);
    setSaving(false);
    if (!r.ok) return setSaveError(r.message ?? "That file couldn't be attached.");
    await data.reload();
  };

  // ---- taps ----
  const openItem = (i: CalItem) => {
    if (i.kind === "request") {
      setSelected(i.date);
      setView("day");
      return;
    }
    if (i.kind === "followup" && !i.event) {
      if (i.clientId) navigate(proClientPath(i.clientId, "care-plan"));
      return;
    }
    if ((i.kind === "session" || i.kind === "followup") && i.event?.mine) return setSession(i);
    if (i.kind === "event" && i.event?.mine && !i.event.sourceKind) return openEdit(i);
    setDetail(i);
  };

  const answerRequest = async (i: CalItem, accept: boolean) => {
    if (!i.request || requestBusy) return;
    setRequestBusy(i.request.id);
    const r = accept ? await acceptBooking(i.request.id) : await declineBooking(i.request.id);
    setRequestBusy(null);
    const who = i.name ?? "The client";
    setToast(r.ok ? { ok: true, text: accept ? `Booking accepted. ${who} has been told.` : `Booking declined. ${who} has been told.` } : { ok: false, text: r.message });
    await data.reload();
  };

  const respond = async (accepted: boolean) => {
    const inv = detail?.event?.invite;
    if (!inv || responding) return;
    setResponding(true);
    const r = await respondToInvite(inv.id, accepted);
    setResponding(false);
    if (!r.ok) return setToast({ ok: false, text: "Couldn't save your response. Try again." });
    setDetail(null);
    await data.reload();
  };

  const message = async (clientId: string) => {
    const r = await startThread(clientId);
    if (r.ok) navigate("/app/messages", { state: { threadId: r.threadId } });
    else setToast({ ok: false, text: r.message });
  };

  const cancelSession = async (): Promise<{ ok: boolean; message?: string }> => {
    const e = session?.event;
    if (!e || !me) return { ok: false };
    const r = e.sourceKind === "appointment" && e.sourceId ? await cancelBooking(e.sourceId) : await deleteEvent(me, e.id);
    if (r.ok) {
      setToast({ ok: true, text: "Session cancelled." });
      await data.reload();
      return { ok: true };
    }
    return { ok: false, message: "message" in r ? r.message : undefined };
  };

  // ---- header ----
  const jump = calendarJump({ view, cursor, selectedDate: selected, setCursor, setSelectedDate: setSelected });
  const goMonth = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };
  const weekStart = startOfWeekISO(selected);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayItems = items[selected] ?? [];

  // ---- Day view parts ----
  const dayRequests = dayItems.filter((i) => i.kind === "request");
  const dayAllDay = dayItems.filter((i) => i.allDay);
  const dayTimed = dayItems.filter((i) => !i.allDay && i.start);
  const breaks = proEntries.filter((e) => e.start && e.dates.includes(selected)).map((e) => ({ entry: e, start: e.start!, end: e.end! }));
  const offToday = wholeDayOff(selected);
  const windows = windowsOf(selected);
  const bounds = dayBounds([...dayTimed.map((i) => ({ start: i.start!, end: i.end ?? i.start! })), ...windows, ...breaks]);
  const nowMinutes = selected === todayIso ? now.getHours() * 60 + now.getMinutes() : null;
  // An open slot never shows in the past.
  const openNow = open.filter((o) => selected > todayIso || nowMinutes === null || minutes(o.end) > nowMinutes);

  const sessionType = session?.extras?.serviceId ? data.types.find((t) => t.id === session.extras!.serviceId) ?? null : null;
  const sessionStarted = !!session && `${session.date} ${session.start ?? "00:00"}` <= `${todayIso} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const statusLine =
    data.loaded && (!data.online ? (
      <div style={{ marginBottom: 12 }}>
        <OfflineLine />
      </div>
    ) : data.error ? (
      <div style={{ marginBottom: 12 }}>
        <ProError onRetry={() => void data.reload()} message="Couldn't load your calendar. Check your connection and try again." />
      </div>
    ) : null);

  const skeletonRows = (
    <div className="flex flex-col" style={{ gap: 7 }} aria-hidden>
      <div className="bg-cream-soft animate-skeleton-pulse" style={{ height: 57.7, borderRadius: 15 }} />
      <div className="bg-cream-soft animate-skeleton-pulse" style={{ height: 57.7, borderRadius: 15 }} />
    </div>
  );

  if (!lane) return null;

  return (
    <div>
      <FixedHeader paddingBottom={view === "week" || view === "day" ? 16 : 13}>
        {/* cal.js calHead: the title 19 / 700 -0.03em, two 34 round buttons 8 apart. */}
        <div className="flex items-start justify-between" style={{ gap: 12 }}>
          <h1 style={{ fontSize: textPx(19), fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch, marginTop: 3, lineHeight: 1.5 }}>Calendar</h1>
          <div className="flex" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate(`${PRO_ROUTES.calendar}/availability`)}
              aria-label="Availability and session types"
              className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-[5px] before:content-['']"
              style={{ width: 34, height: 34, borderRadius: 9999, background: INK.card, border: "1px solid rgb(var(--c-charcoal) / 0.11)" }}
            >
              <Settings2 size={15} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
            </button>
            <button
              type="button"
              onClick={() => setAddOpen({ date: selected < todayIso ? todayIso : selected })}
              aria-label={clinical ? "New appointment" : "New session"}
              className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-[5px] before:content-['']"
              style={{ width: 34, height: 34, borderRadius: 9999, background: dark ? "linear-gradient(150deg,#54468a,#3b3168)" : "linear-gradient(150deg,#aea1dc,#6f5fa6)" }}
            >
              <Plus size={16} strokeWidth={2} aria-hidden style={{ color: "#FFFFFF" }} />
            </button>
          </div>
        </div>
        <SegmentedTabs
          className="mt-[13px]"
          items={VIEWS.map((v) => ({ key: v, label: v[0].toUpperCase() + v.slice(1) }))}
          activeKey={view}
          onChange={(k) => {
            if (k === "year" && view === "year") {
              setCursor((c) => ({ ...c, year: now.getFullYear() }));
              setYearJump((n) => n + 1);
              return;
            }
            if (k === "month") setCursor({ year: Number(selected.slice(0, 4)), month: Number(selected.slice(5, 7)) - 1 });
            setView(k as View);
          }}
          idleInk="rgb(var(--c-charcoal-soft))"
          darkTone="partB"
        />
        {view === "week" && (
          <div className="mt-[13px]">
            <HeaderCard
              label={dateRange(weekDays[0], weekDays[6])}
              onPrev={() => setSelected(addDays(selected, -7))}
              onNext={() => setSelected(addDays(selected, 7))}
              prevLabel="Previous week"
              nextLabel="Next week"
              jump={jump.show ? jump.jump : null}
            />
          </div>
        )}
        {view === "day" && (
          <div className="mt-[13px]">
            <HeaderCard label={longDay(selected)} onPrev={() => setSelected(addDays(selected, -1))} onNext={() => setSelected(addDays(selected, 1))} prevLabel="Previous day" nextLabel="Next day" jump={jump.show ? jump.jump : null} />
          </div>
        )}
      </FixedHeader>

      {statusLine}

      {view === "month" && (
        <>
          <MonthGrid
            year={cursor.year}
            month={cursor.month}
            monthLabel={`${monthNames[cursor.month]} ${cursor.year}`}
            todayIso={todayIso}
            selected={selected}
            busy={(iso) => (items[iso] ?? []).some((i) => i.kind !== "request" && i.badge !== "declined")}
            dayOff={dayOff}
            leading={monthLeadingBlanks(cursor.year, cursor.month)}
            onSelect={setSelected}
            onPrev={() => goMonth(-1)}
            onNext={() => goMonth(1)}
            jump={jump.show ? jump.jump : null}
          />
          <Eyebrow>{[longDay(selected), hoursLine(selected) ? `Working ${hoursLine(selected)}` : hasHours || offToday ? "Day off" : null].filter(Boolean).join(" · ")}</Eyebrow>
          {!data.loaded ? (
            skeletonRows
          ) : dayItems.length === 0 ? (
            <p style={{ fontSize: textPx(11.5), color: INK.chF }}>No sessions</p>
          ) : (
            <div className="flex flex-col" style={{ gap: 7 }}>
              {dayItems.map((i) => (
                <AgendaRow key={i.key} item={i} onOpen={openItem} />
              ))}
            </div>
          )}
        </>
      )}

      {view === "week" && (
        <div className="flex flex-col" style={{ gap: 10 }}>
          {weekDays.map((iso) => (
            <WeekDayRow
              key={iso}
              iso={iso}
              today={iso === todayIso}
              hours={hasHours || wholeDayOff(iso) ? hoursLine(iso) : undefined}
              items={items[iso] ?? []}
              loaded={data.loaded}
              onDay={() => {
                setSelected(iso);
                setView("day");
              }}
              onOpen={openItem}
            />
          ))}
        </div>
      )}

      {view === "year" && (
        <YearScroll
          year={cursor.year}
          todayIso={todayIso}
          eventDays={Object.keys(items).filter((d) => (items[d] ?? []).length > 0)}
          jumpSignal={yearJump}
          onOpenMonth={(y, m) => {
            setCursor({ year: y, month: m });
            setView("month");
          }}
        />
      )}

      {view === "day" && (
        <>
          {dayRequests.length > 0 && (
            <>
              <Eyebrow>Requests</Eyebrow>
              {dayRequests.map((i) => (
                <RequestCard key={i.key} item={i} busy={requestBusy === i.request?.id} onAccept={() => void answerRequest(i, true)} onDecline={() => void answerRequest(i, false)} />
              ))}
              <div style={{ height: 6 }} />
            </>
          )}
          {offToday && <DayOffRow entry={offToday} onOpen={() => setOffSheet({ entry: offToday, day: selected })} />}
          {dayAllDay.length > 0 && (
            <div className="flex flex-col" style={{ gap: 7, marginBottom: 14 }}>
              <Eyebrow mb={2}>All day</Eyebrow>
              {dayAllDay.map((i) => (
                <AgendaRow key={i.key} item={i} onOpen={openItem} />
              ))}
            </div>
          )}
          {!data.loaded ? (
            skeletonRows
          ) : (
            <DayTimeline
              from={bounds.from}
              to={bounds.to}
              windows={hasHours ? windows : [{ start: `${String(bounds.from).padStart(2, "0")}:00`, end: `${String(bounds.to).padStart(2, "0")}:00` }]}
              items={dayTimed}
              breaks={breaks}
              open={openNow}
              nowMinutes={nowMinutes}
              clinical={clinical}
              onOpen={openItem}
              onBreak={(e) => setOffSheet({ entry: e, day: selected })}
              onOpenSlot={(start) => setAddOpen({ date: selected, start })}
            />
          )}
        </>
      )}

      <AddSessionSheet
        open={!!addOpen}
        me={me}
        todayIso={todayIso}
        initial={addOpen ?? { date: todayIso }}
        clients={sessionClients}
        types={data.types}
        reminders={reminders}
        onClose={() => setAddOpen(null)}
        onAddType={() => {
          setAddOpen(null);
          navigate(`${PRO_ROUTES.calendar}/availability`);
        }}
        onPersonal={(date) => {
          setAddOpen(null);
          openPersonal(date);
        }}
        onSaved={({ clientName, date }) => {
          setAddOpen(null);
          void data.reload();
          setToast({
            ok: true,
            text: `Session saved. ${clientName} has been invited.`,
            action: {
              label: "View",
              onClick: () => {
                setSelected(date);
                setView("day");
              },
            },
          });
        }}
      />

      <SessionSheet
        item={session}
        me={me}
        lane={lane}
        planLine={session?.clientId ? planLineOf(session.clientId) : null}
        avatarUrl={session?.clientId ? professionalClients.find((c) => c.clientId === session.clientId)?.avatarUrl ?? null : null}
        type={sessionType}
        started={sessionStarted}
        onClose={() => setSession(null)}
        onProfile={(id) => navigate(proClientPath(id))}
        onMessage={(id) => void message(id)}
        onEdit={
          session?.event && !session.event.sourceKind
            ? () => {
                const s = session;
                setSession(null);
                openEdit(s);
              }
            : null
        }
        onCancel={cancelSession}
        onOpenAttachment={(p) => void openAttachment(p)}
        onChanged={() => void data.reload()}
      />

      <EventDetailSheet
        event={detail?.event ?? null}
        onClose={() => setDetail(null)}
        dark={dark}
        responding={responding}
        online={data.online}
        onRespond={(accepted) => void respond(accepted)}
        onOpenAttachment={(p) => void openAttachment(p)}
        bookingMade={!!detail?.event?.sourceKind && detail.kind !== "business"}
      />

      <EventComposeSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        editing={!!editingId}
        draft={draft}
        setDraft={setDraft}
        todayIso={todayIso}
        saving={saving}
        error={saveError}
        linkError={linkError}
        onSave={() => void saveEvent()}
        onDelete={() => {
          if (repeats) return void removeEvent();
          if (!confirmDelete) {
            setConfirmDelete(true);
            window.setTimeout(() => setConfirmDelete(false), 3000);
            return;
          }
          void removeEvent();
        }}
        confirmDelete={confirmDelete}
        extra={
          <>
            {candidates.length > 0 ? (
              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Invitees</span>
                <select
                  multiple
                  value={guests}
                  onChange={(e) => setGuests(Array.from(e.target.selectedOptions, (o) => o.value))}
                  className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                  size={Math.min(4, candidates.length)}
                >
                  {candidates.map((c) => (
                    <option key={c.userId} value={c.userId}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="block text-[11px] text-charcoal-faint mt-1.5">Hold Ctrl or Cmd to choose more than one.</span>
                {editingId && (data.invitees[editingId]?.length ?? 0) > 0 && (
                  <span className="mt-2.5 flex flex-col gap-1">
                    {data.invitees[editingId].map((i) => (
                      <span key={i.userId} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-charcoal-soft truncate">{i.name}</span>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-cream-soft text-charcoal-faint">
                          {i.status === "accepted" ? "Accepted" : i.status === "declined" ? "Declined" : "No reply yet"}
                        </span>
                      </span>
                    ))}
                  </span>
                )}
              </label>
            ) : (
              <p className="text-[11px] text-charcoal-faint">You can invite clients and colleagues you work with. Once a connection is active, they'll appear here.</p>
            )}
            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Attachment</span>
              {editingId ? (
                <>
                  {series?.attachmentPath && (
                    <button type="button" onClick={() => void openAttachment(series.attachmentPath!)} className="tap mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary-deep-text">
                      <Paperclip size={12} aria-hidden /> Open current attachment
                    </button>
                  )}
                  <input
                    type="file"
                    accept={acceptFor("calendar-attachments")}
                    disabled={saving}
                    aria-label="Attach a file"
                    onChange={(e) => e.target.files?.[0] && void attach(e.target.files[0])}
                    className="w-full text-xs text-charcoal-faint file:mr-3 file:rounded-lg file:border-0 file:bg-cream-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-charcoal-soft"
                  />
                  <span className="block text-[11px] text-charcoal-faint mt-1.5">Invitees can open whatever you attach here.</span>
                </>
              ) : (
                <span className="block text-[11px] text-charcoal-faint">Save the event first, then reopen it to attach a file.</span>
              )}
            </div>
          </>
        }
      />

      <RepeatScopePopup mode={scopeAsk} busy={saving} onCancel={() => setScopeAsk(null)} onChoose={(scope) => void (scopeAsk === "delete" ? removeEvent(scope) : saveEvent(scope))} />

      <TimeOffSheet
        open={!!offSheet}
        me={me}
        todayIso={todayIso}
        entry={offSheet?.entry ?? null}
        date={offSheet?.day ?? selected}
        onDay={offSheet?.day ?? null}
        onClose={() => setOffSheet(null)}
        onSaved={() => void data.reload()}
      />

      <Toast
        open={!!toast}
        message={toast?.text ?? ""}
        action={toast?.action}
        icon={
          toast?.ok ? (
            <CircleCheck size={18} strokeWidth={2} aria-hidden className="flex-none" style={{ color: INK.good }} />
          ) : (
            <AlertCircle size={15} strokeWidth={2.4} aria-hidden className="flex-none text-status-high" />
          )
        }
        onExpire={() => setToast(null)}
      />
    </div>
  );
}
