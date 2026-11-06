import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Banknote, CalendarCheck, CalendarPlus, CircleX, Clock, FileWarning, MessageCircle, Plus, Tag, User } from "lucide-react";
import { apptChip, cancelAppointment, fetchDiary, fetchDiaryDetail, fetchFreeStretches, fetchServices, hasAppointments, markAppointment, markAppointmentPaid, payWords, type DiaryAppt, type Service } from "../../../services/appointments";
import { offerPromotionUsed } from "../../../components/promotions/promotionUsed";
import type { Load } from "../../../services/store/backend";
import { dayClock, dayTitle, isoDate, money } from "../../../services/store/format";
import { rangeClock12 } from "../../../utils/time12";
import { fetchTeam } from "../../../services/business-team/team";
import { useOnline } from "../../../hooks/useOnline";
import { WebPageHeader } from "../../../components/web/WebPageHeader";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { ErrorCard, KitPop, useOpsToast } from "../store/opsKit";
import { APPT_KINDS, useLive, useMessagePerson, useStoreBusiness } from "../store/storeShared";
import { ExtrasHeader, ExtrasList, ExtrasRow, FOCUS, WebBoxes, WebEmpty, WebLabel, WebList, WebListSkeleton, WebRow } from "../store/webKit";
import { mondayIndex } from "../../../utils/week";
import { AddAppointmentSheet } from "./AddAppointmentSheet";
import { dayDate, serviceTitle, time, todaySub, weekdayShort } from "./apptShared";
import { t, tk, tn, tx } from "../../../i18n/core";

// Website viewport v1 · WB-ST-AP Appointments and WB-ST-AP.1 Appointment
// detail (WB-ST Appointments Web v2), list-detail: the Today and Free slots
// boxes and the whole day's bookings and free slots in 5 of 12 columns, the
// selected appointment (the first by default) in 7 with Client, Details and
// Status and its actions in the card's foot; Add appointment in the page
// header. At 1024 the list fills the page and a row opens the appointment on
// its own page. /app/business/appointments and /:appointmentId render this
// page on web. Loading, the rules and the actions are the mobile pages'; the
// Add appointment sheet is the mobile one (a 440 side sheet on web).

interface DayData {
  appts: DiaryAppt[];
  free: { startsAt: string; endsAt: string }[];
  services: Service[];
  team: { id: string; name: string }[];
  ever: boolean;
  pending: boolean;
}

// The mobile page's loader (AppointmentsPage.tsx loadTeam / loadDay), unchanged.
async function loadTeam(businessId: string): Promise<{ id: string; name: string }[]> {
  const team = await fetchTeam(businessId);
  return team.ok ? team.value.filter((p) => p.acceptedAt).map((p) => ({ id: p.professionalId, name: p.name })) : [];
}
async function loadDay(businessId: string, date: string): Promise<Load<DayData>> {
  const [a, s, c, team] = await Promise.all([fetchDiary(businessId, date, date), fetchServices(businessId), hasAppointments(businessId), loadTeam(businessId)]);
  for (const r of [a, s, c]) if (r.status === "error") return r as Load<DayData>;
  const services = s.status === "ok" ? s.value : [];
  const f = await fetchFreeStretches(services, date);
  if (f.status === "error") return f;
  return {
    status: "ok",
    value: {
      appts: a.status === "ok" ? a.value : [],
      free: f.status === "ok" ? f.value : [],
      services,
      team,
      ever: c.status === "ok" ? c.value : false,
      pending: a.status === "pending" || s.status === "pending" || f.status === "pending",
    },
  };
}

type Item = { kind: "appt"; at: string; a: DiaryAppt } | { kind: "free"; at: string; f: { startsAt: string; endsAt: string } };
function merge(d: DayData): Item[] {
  const items: Item[] = [
    ...d.appts.filter((a) => a.status !== "cancelled").map((a) => ({ kind: "appt" as const, at: a.startsAt, a })),
    ...d.free.map((f) => ({ kind: "free" as const, at: f.startsAt, f })),
  ];
  return items.sort((x, y) => x.at.localeCompare(y.at));
}
const chipOf = (c: ReturnType<typeof apptChip>) => ({ ...c, label: t(c.label) });

export default function AppointmentsPageWeb() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const { rail } = useWebLayout();
  const rowH = rail ? 48 : 56;
  const { businessId, ready, loadError, reload: reloadBiz } = useStoreBusiness();
  const today = isoDate(new Date());
  const live = useLive(businessId ? () => loadDay(businessId, today) : null, 120000, "", { businessId, kinds: APPT_KINDS });
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;
  const items = useMemo(() => (d ? merge(d) : []), [d]);
  const [toast, showToast] = useOpsToast();
  const [sheet, setSheet] = useState<{ open: boolean; prefill: { date: string; startsAt: string } | null }>({ open: false, prefill: null });
  const openAdd = (prefill: { date: string; startsAt: string } | null) => setSheet({ open: true, prefill });

  const firstAppt = items.find((it) => it.kind === "appt");
  const sel = appointmentId ?? (rail ? null : firstAppt && firstAppt.kind === "appt" ? firstAppt.a.id : null);
  const openAppt = (a: DiaryAppt) => navigate(`/app/business/appointments/${a.id}`, { replace: !rail });

  const addButton = (
    <button
      type="button"
      onClick={() => openAdd(null)}
      disabled={!businessId || !online || !d || d.pending}
      className={`flex items-center whitespace-nowrap enabled:hover:brightness-[0.96] disabled:opacity-40 ${FOCUS}`}
      style={{ height: 40, padding: "0 16px", boxSizing: "border-box", gap: 8, borderRadius: 14, background: "#AEA1DC", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600, boxShadow: "0 6px 16px rgba(95,80,147,0.22)" }}
    >
      <Plus size={18} strokeWidth={2.4} aria-hidden />
      {t("Add appointment")}
    </button>
  );

  const sheets = (
    <>
      {businessId && d && (
        <AddAppointmentSheet
          open={sheet.open}
          onClose={() => setSheet({ open: false, prefill: null })}
          businessId={businessId}
          services={d.services}
          team={d.team}
          prefill={sheet.prefill}
          onAdded={(a) => {
            setSheet({ open: false, prefill: null });
            showToast(a.waiverPending ? t("Appointment added. {client} still has your terms to accept.", { client: a.clientLabel }) : t("Appointment added. It's in {client}'s calendar.", { client: a.clientLabel }), false);
            void live.refresh();
          }}
        />
      )}
      {toast}
    </>
  );

  // At 1024 an appointment is its own page (the detail card filling the content).
  if (rail && sel) {
    return (
      <div style={{ color: "#241F1B" }}>
        <div className="sticky top-0 z-30">
          <WebPageHeader
            title={t("Appointments")}
            back={{ to: "/app/business/appointments", label: tk("Back"), square: true, onClick: () => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/appointments")) }}
          />
        </div>
        <div style={{ padding: 32 }}>
          <div className="max-w-[1600px]">
            <ApptPane key={sel} id={sel} rail onChanged={() => void live.refresh()} />
          </div>
        </div>
      </div>
    );
  }

  let list: React.ReactNode = null;
  let empty: React.ReactNode = null;
  if (loadError || s.status === "error") {
    list = <ErrorCard text={t("Couldn't load your appointments.")} onRetry={() => (loadError ? reloadBiz() : live.reload())} />;
  } else if (!ready || (businessId && s.status === "loading")) {
    list = (
      <>
        <WebBoxes rail={rail} loading items={[{ v: "", l: t("Today") }, { v: "", l: t("Free slots") }]} />
        <WebListSkeleton rowH={rowH} label={t("Loading your appointments")} />
      </>
    );
  } else if (!d || d.pending || (d.services.length === 0 && !d.ever)) {
    empty = <WebEmpty icon={CalendarPlus} title={t("No appointments yet")} body={t("Add your services and free slots, and clients can book them.")} minHeight="calc(100dvh - 128px)" />;
  } else {
    const todayCount = d.appts.filter((a) => a.status === "booked" || a.status === "completed").length;
    const free = d.free.length;
    const booked = d.appts.filter((a) => a.status !== "cancelled");
    list = (
      <>
        <WebBoxes
          rail={rail}
          items={[
            { v: String(todayCount), l: t("Today") },
            { v: String(free), l: t("Free slots") },
          ]}
        />
        <WebLabel label={t("Today")} />
        {booked.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: "calc(100dvh - 330px)", border: "1.5px dashed #AEA1DC", borderRadius: 20, padding: 24 }}>
            <span className="inline-flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 14, background: "#F0EDF9" }}>
              <CalendarCheck size={22} strokeWidth={1.75} style={{ color: "#7D6BB5" }} aria-hidden />
            </span>
            <p className="self-stretch" style={{ margin: "12px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 800 }}>{t("No appointments today")}</p>
            <p className="self-stretch" style={{ margin: "4px auto 0", maxWidth: "40ch", fontSize: 15, lineHeight: "24px", color: "#5B5349", textWrap: "pretty" } as React.CSSProperties}>
              {free === 0 ? t("Nothing booked and no free slots today.") : t("Bookings show here. Your free slots stay open for clients.")}
            </p>
          </div>
        ) : (
          <WebList label={t("Today")}>
            {items.map((it, i) => {
              const on = !rail && it.kind === "appt" && it.a.id === sel;
              const prev = items[i - 1];
              const prevOn = !!prev && !rail && prev.kind === "appt" && prev.a.id === sel;
              return it.kind === "appt" ? (
                <WebRow
                  key={it.a.id}
                  icon={Clock}
                  title={serviceTitle(it.a)}
                  sub={`${time(it.a.startsAt)} · ${it.a.clientLabel}`}
                  chip={chipOf(apptChip(it.a.status))}
                  onClick={() => openAppt(it.a)}
                  rule={i > 0 && !on && !prevOn}
                  selected={on}
                  rowH={rowH}
                />
              ) : (
                <WebRow
                  key={`free-${it.f.startsAt}`}
                  icon={Clock}
                  title={t("Free slot")}
                  sub={t("{from} to {to}", { from: time(it.f.startsAt), to: time(it.f.endsAt) })}
                  chip={{ label: tx("Open", "free slot"), tone: "soft" }}
                  onClick={() => openAdd({ date: today, startsAt: it.f.startsAt })}
                  rule={i > 0 && !prevOn}
                  rowH={rowH}
                />
              );
            })}
          </WebList>
        )}
      </>
    );
  }

  const hasBooked = !!d && d.appts.some((a) => a.status !== "cancelled");
  const showPane = !rail && !empty && hasBooked && !!sel && s.status === "ok";

  return (
    <div style={{ color: "#241F1B" }}>
      <div className="sticky top-0 z-30">
        <WebPageHeader title={t("Appointments")} sub={todaySub()} actions={businessId ? addButton : undefined} />
      </div>
      <div style={{ padding: 32 }}>
        <div className="max-w-[1600px]">
          {empty ?? (
            <div className="grid" style={{ gridTemplateColumns: rail ? "minmax(0,1fr)" : "repeat(12,minmax(0,1fr))", gap: 24, alignItems: "start" }}>
              <div className="min-w-0 flex flex-col" style={{ gridColumn: rail || !hasBooked ? "1 / -1" : "span 5", gap: 12 }}>
                {list}
              </div>
              {showPane && sel && (
                <div className="min-w-0" style={{ gridColumn: "span 7", position: "sticky", top: 96 }}>
                  <ApptPane key={sel} id={sel} rail={false} onChanged={() => void live.refresh()} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {sheets}
    </div>
  );
}

/** The appointment (WB-ST-AP.1): the mobile AppointmentDetailPage's data and actions in the web detail card (one column). */
function ApptPane({ id, rail, onChanged }: { id: string; rail: boolean; onChanged: () => void }) {
  const online = useOnline();
  const live = useLive(() => fetchDiaryDetail(id), 120000, id);
  const [toast, showToast] = useOpsToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const msg = useMessagePerson();
  const s = live.state;
  const a = s.status === "ok" ? s.value : null;
  const rowH = rail ? 48 : 56;
  const pad = rail ? 16 : 20;
  // The clock "started" reads (ticks each minute, so Mark as no-show / done turn on at the start time).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (s.status === "loading")
    return (
      <section aria-busy="true" aria-label={t("Appointment")} className="flex flex-col" style={{ border: "1px solid rgba(36,31,27,0.11)", borderRadius: 20, padding: pad, gap: 16 }}>
        <span aria-hidden className="animate-skeleton-pulse" style={{ height: 30, width: 220, borderRadius: 8, background: "#F5F5F6" }} />
        <WebListSkeleton rows={3} rowH={rowH} label={t("Appointment")} />
      </section>
    );
  if (s.status === "error") return <ErrorCard text={t("Couldn't load this appointment.")} onRetry={live.reload} />;
  if (!a) return <WebEmpty icon={CalendarCheck} title={t("Appointment not found")} body={t("It may have been removed.")} />;

  const client = a.clientLabel;
  const booked = a.status === "booked";
  const started = new Date(a.startsAt).getTime() <= nowMs;
  const chip = chipOf(apptChip(a.status));
  const unpaid = a.paymentStatus === "pending" && a.price > 0 && a.status !== "cancelled";
  const paidWord = payWords(a.paymentStatus);
  const paid = paidWord ? t(paidWord) : null;

  const mark = async (status: "completed" | "no_show") => {
    setBusy(true);
    setError(null);
    const r = await markAppointment(a.id, status);
    if (!r.ok) {
      setBusy(false);
      setError(r.pending ? t("Appointment updates are coming soon.") : t("Couldn't update the appointment. Try again."));
      if (r.code === "ATX10") void live.refresh();
      return;
    }
    const p = status === "completed" && unpaid ? await markAppointmentPaid(a.id) : null;
    setBusy(false);
    if (status === "no_show") showToast(t("Marked as no-show."), false);
    else showToast(p && !p.ok ? t("Marked as done. Couldn't record the payment.") : t("Marked as done."), false);
    if (p?.ok) offerPromotionUsed({ kind: "appointment", sourceId: a.id });
    await live.refresh();
    onChanged();
  };
  const markPaid = async () => {
    setBusy(true);
    setError(null);
    const r = await markAppointmentPaid(a.id);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? t("Recording payments is coming soon.") : t("Couldn't record the payment. Try again."));
      if (r.code === "ATX10") void live.refresh();
      return;
    }
    showToast(t("Payment recorded."), false);
    offerPromotionUsed({ kind: "appointment", sourceId: a.id });
    await live.refresh();
    onChanged();
  };
  const cancel = async () => {
    setBusy(true);
    setError(null);
    const r = await cancelAppointment(a.id);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? t("Cancelling appointments is coming soon.") : t("Couldn't cancel the appointment. Try again."));
      return;
    }
    setCancelOpen(false);
    showToast(r.value.paidToRefund ? t("Appointment cancelled. {client} has been told. They paid: give the money back.", { client }) : t("Appointment cancelled. {client} has been told.", { client }), false);
    await live.refresh();
    onChanged();
  };

  const footBtns: { label: string; high?: boolean; disabled: boolean; onClick: () => void }[] = [
    ...(unpaid && a.paymentMethod === "cash" ? [{ label: t("Mark as paid"), disabled: !online || busy, onClick: () => void markPaid() }] : []),
    ...(booked
      ? [
          { label: t("Mark as no-show"), disabled: !online || busy || !started, onClick: () => void mark("no_show") },
          { label: t("Cancel appointment"), high: true, disabled: !online || busy || started, onClick: () => setCancelOpen(true) },
        ]
      : []),
  ];
  const cta = booked && started;
  const clientRows: React.ReactNode[] = [
    <WebRow key="c" icon={User} title={client} sub={a.bookedAt ? t("Booked {when}", { when: dayClock(a.bookedAt) }) : undefined} rule={false} rowH={rowH} />,
    ...(a.waiverPending
      ? [<WebRow key="w" icon={FileWarning} title={t("Terms not accepted yet")} sub={t("{client} accepts them in the app before the visit.", { client })} subWrap chip={{ label: t("Waiver"), tone: "warn" }} rule rowH={rowH} />]
      : []),
    ...(msg.can && a.clientId ? [<WebRow key="m" icon={MessageCircle} title={t("Message {client}", { client })} link onClick={() => void msg.open(a.clientId!)} disabled={!online || msg.busy} rule rowH={rowH} />] : []),
  ];

  return (
    <>
      <section
        aria-label={a.serviceName}
        className="flex flex-col"
        style={{ border: "1px solid rgba(36,31,27,0.11)", borderRadius: 20, padding: pad, boxSizing: "border-box", maxHeight: rail ? undefined : "calc(100dvh - 128px)" }}
      >
        <div className="shrink-0" style={{ marginBottom: rail ? 12 : 16 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#8C8378" }}>{t("Appointments")}</p>
          <h2 style={{ margin: 0, fontSize: 22, lineHeight: "30px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B" }}>{a.serviceName}</h2>
          <p className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{`${dayTitle(new Date(a.startsAt))}, ${rangeClock12(a.startsAt, a.endsAt)}`}</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col" style={{ gap: 12, scrollbarWidth: "thin" }}>
          <WebLabel as="h3" label={t("Client")} first />
          <WebList inner label={t("Client")}>{clientRows}</WebList>
          {msg.error && (
            <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#C0392B" }}>
              {msg.error}
            </p>
          )}
          <WebLabel as="h3" label={t("Details")} />
          <WebList inner label={t("Details")}>
            <WebRow icon={Clock} title={t("Duration")} value={tn(a.durationMin, "{n} min", "{n} min")} rule={false} rowH={rowH} />
            <WebRow icon={Tag} title={t("Price")} value={money(a.price)} rule rowH={rowH} />
            <WebRow icon={Banknote} title={tx("Payment", "how it is paid")} sub={a.paymentMethod === "whish" ? t("Coming soon") : paid ?? undefined} value={a.paymentMethod === "whish" ? "Whish" : t("Cash at the visit")} rule rowH={rowH} />
          </WebList>
          <WebLabel as="h3" label={t("Status")} />
          <WebList inner label={t("Status")}>
            <WebRow icon={a.status === "cancelled" ? CircleX : CalendarCheck} title={chip.label} sub={a.bookedAt ? dayClock(a.bookedAt) : undefined} chip={chip} rule={false} rowH={rowH} />
          </WebList>
        </div>
        {(footBtns.length > 0 || cta || (error && !cancelOpen)) && (
          <div className="shrink-0 flex flex-col" style={{ gap: 8, marginTop: rail ? 12 : 16, paddingTop: rail ? 12 : 16, borderTop: "1px solid #EBEAF6" }}>
            {error && !cancelOpen && (
              <p role="alert" className="text-center" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#C0392B" }}>
                {error}
              </p>
            )}
            {footBtns.length > 0 && (
              <div className="grid" style={{ gridTemplateColumns: `repeat(${footBtns.length},minmax(0,1fr))`, gap: 8 }}>
                {footBtns.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={b.onClick}
                    disabled={b.disabled}
                    className={`flex items-center justify-center whitespace-nowrap enabled:hover:bg-[#F5F5F6] disabled:opacity-40 ${FOCUS}`}
                    style={{ height: 40, borderRadius: 14, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: b.high ? "#C0392B" : "#5B5349" }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
            {cta && (
              <button
                type="button"
                onClick={() => void mark("completed")}
                disabled={!online || (busy && !cancelOpen)}
                aria-busy={(busy && !cancelOpen) || undefined}
                className={`flex items-center justify-center whitespace-nowrap enabled:hover:brightness-[0.96] disabled:opacity-50 ${FOCUS}`}
                style={{ height: 44, boxSizing: "border-box", borderRadius: 14, background: "#AEA1DC", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600, boxShadow: "0 6px 16px rgba(95,80,147,0.22)" }}
              >
                {t("Mark as done")}
              </button>
            )}
          </div>
        )}
      </section>
      <KitPop
        open={cancelOpen}
        icon={CircleX}
        title={t("Cancel this appointment?")}
        body={t("{client} is told by message. This can't be undone.", { client })}
        action={t("Cancel appointment")}
        keep={tx("Keep it", "appointment")}
        busy={busy}
        error={cancelOpen ? error : null}
        onAction={cancel}
        onKeep={() => {
          setCancelOpen(false);
          setError(null);
        }}
      />
      {toast}
    </>
  );
}

/**
 * WB-ST-AP.4 · Day list (WB-ST Store Extras Web, "day-*"): the 72 header (Back, the Appointments kicker over the day),
 * the 14-day strip as equal chips across the row (60 tall, r14, gap 8, 24 under it; the selected day #AEA1DC with
 * white text, the others #F0EDF9 / #7D6BB5; the weekday 13/20 700 caps over the date 17/24 800), then the whole
 * day's bookings and free slots in one card (rows 64), or the dashed "Nothing this day" card. The day (?date=),
 * loading, the rows' destinations and Add appointment from a free slot are the mobile AppointmentsDayPage's.
 */
export function AppointmentsDayPageWeb() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { businessId } = useStoreBusiness();
  const date = params.get("date") ?? isoDate(new Date());
  const live = useLive(businessId ? () => loadDay(businessId, date) : null, 120000, date, { businessId, kinds: APPT_KINDS });
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;
  const items = useMemo(() => (d ? merge(d) : []), [d]);
  const [toast, showToast] = useOpsToast();
  const [sheet, setSheet] = useState<{ open: boolean; prefill: { date: string; startsAt: string } | null }>({ open: false, prefill: null });

  const strip = useMemo(() => {
    const d0 = new Date();
    const monday = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - mondayIndex(d0.getDay()));
    return Array.from({ length: 14 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  }, []);
  const [y, m, dd] = date.split("-").map(Number);
  const day = new Date(y, m - 1, dd);
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/appointments"));

  return (
    <div style={{ color: "#241F1B" }}>
      <div className="sticky top-0 z-30">
        <ExtrasHeader kicker={t("Appointments")} title={dayDate(day)} backLabel={t("Back")} onBack={back} />
      </div>
      <div style={{ padding: 32 }}>
        <div className="max-w-[1600px] flex flex-col">
          <div role="tablist" aria-label={t("Day")} className="grid" style={{ gridTemplateColumns: "repeat(14,minmax(0,1fr))", gap: 8, marginBottom: 24 }}>
            {strip.map((x) => {
              const v = isoDate(x);
              const on = v === date;
              return (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-label={dayDate(x)}
                  data-day-chip
                  onClick={() => setParams({ date: v }, { replace: true })}
                  className={`min-w-0 flex flex-col items-center justify-center ${on ? "" : "hover:bg-[#E6E1F6]"} ${FOCUS}`}
                  style={{ height: 60, borderRadius: 14, background: on ? "#AEA1DC" : "#F0EDF9", color: on ? "#FFFFFF" : "#7D6BB5" }}
                >
                  <span className="uppercase" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700 }}>
                    {weekdayShort(x)}
                  </span>
                  <span style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800 }}>{x.getDate()}</span>
                </button>
              );
            })}
          </div>
          {s.status === "error" ? (
            <ErrorCard text={t("Couldn't load your appointments.")} onRetry={live.reload} />
          ) : s.status === "loading" ? (
            <WebListSkeleton rows={4} rowH={64} label={t("Loading your appointments")} />
          ) : items.length === 0 ? (
            <WebEmpty icon={CalendarCheck} title={t("Nothing this day")} body={t("Bookings and free slots for this day show here.")} padding="40px 32px" />
          ) : (
            <ExtrasList label={dayDate(day)}>
              {items.map((it, i) =>
                it.kind === "appt" ? (
                  <ExtrasRow
                    key={it.a.id}
                    icon={Clock}
                    title={serviceTitle(it.a)}
                    sub={`${time(it.a.startsAt)} · ${it.a.clientLabel}`}
                    chip={chipOf(apptChip(it.a.status))}
                    rule={i > 0}
                    onClick={() => navigate(`/app/business/appointments/${it.a.id}`)}
                  />
                ) : (
                  <ExtrasRow
                    key={`free-${it.f.startsAt}`}
                    icon={Clock}
                    title={t("Free slot")}
                    sub={t("{from} to {to}", { from: time(it.f.startsAt), to: time(it.f.endsAt) })}
                    chip={{ label: tx("Open", "free slot"), tone: "soft" }}
                    rule={i > 0}
                    onClick={() => setSheet({ open: true, prefill: { date, startsAt: it.f.startsAt } })}
                  />
                )
              )}
            </ExtrasList>
          )}
        </div>
      </div>
      {businessId && d && (
        <AddAppointmentSheet
          open={sheet.open}
          onClose={() => setSheet({ open: false, prefill: null })}
          businessId={businessId}
          services={d.services}
          team={d.team}
          prefill={sheet.prefill}
          onAdded={(a) => {
            setSheet({ open: false, prefill: null });
            showToast(a.waiverPending ? t("Appointment added. {client} still has your terms to accept.", { client: a.clientLabel }) : t("Appointment added. It's in {client}'s calendar.", { client: a.clientLabel }), false);
            void live.refresh();
          }}
        />
      )}
      {toast}
    </div>
  );
}
