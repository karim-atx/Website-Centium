import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { CalendarCheck, CalendarPlus, Clock } from "lucide-react";
import { apptChip, fetchDiary, fetchFreeStretches, fetchServices, hasAppointments, type DiaryAppt, type Service } from "../../../services/appointments";
import type { Load } from "../../../services/store/backend";
import { isoDate } from "../../../services/store/format";
import { mondayIndex } from "../../../utils/week";
import { t, tx } from "../../../i18n/core";
import { fetchTeam } from "../../../services/business-team/team";
import { useOnline } from "../../../hooks/useOnline";
import { CtaSpacer, EmptyCard, ErrorCard, FixedCta, KitLabel, KitRow, ListCard, ListSkeleton, NumberBoxes, OpsHeader, PALE, P_DARK, useOpsToast } from "../store/opsKit";
import { APPT_KINDS, useLive, useStoreBusiness } from "../store/storeShared";
import { AddAppointmentSheet } from "./AddAppointmentSheet";
import { dayDate, serviceTitle, time, todaySub, weekdayShort } from "./apptShared";

// OP1-020 · Wellness Service › Appointments (O11 / V6-54: the Orders navbar
// slot for appointments-only; a fourth Orders tab when it also sells), with
// OURS-OP1-appointments-empty (states A and B). The board's tip and its
// "turned on in Settings" sub are designer notes and do not ship (OP1-020
// rows 4 and 10).
//
// B12: the diary is business_appointments(business, day, day) (schedule;
// the client is the server's MASKED label). Free slots are appointment_slots
// across the active services, merged into free stretches (a start every 15
// minutes per person would be a row every 15 minutes). "Add appointment"
// and a tapped free slot (prefilled with its day and start) open the Add
// appointment sheet: book_appointment_for (B12 follow-up).

const CAP = 3;

interface DayData {
  appts: DiaryAppt[];
  free: { startsAt: string; endsAt: string }[];
  services: Service[];
  team: { id: string; name: string }[];
  ever: boolean;
  pending: boolean;
}

/** Accepted team members, for "With" (a team that can't be read leaves only Any available). */
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

function DayRows({ items, onAppt, onFree }: { items: Item[]; onAppt: (a: DiaryAppt) => void; onFree: (startsAt: string) => void }) {
  return (
    <>
      {items.map((it) =>
        it.kind === "appt" ? (
          <KitRow key={it.a.id} icon={Clock} title={serviceTitle(it.a)} sub={`${time(it.a.startsAt)} · ${it.a.clientLabel}`} chip={chipOf(apptChip(it.a.status))} onClick={() => onAppt(it.a)} />
        ) : (
          <KitRow key={`free-${it.f.startsAt}`} icon={Clock} title={t("Free slot")} sub={t("{from} to {to}", { from: time(it.f.startsAt), to: time(it.f.endsAt) })} chip={{ label: tx("Open", "free slot"), tone: "soft" }} onClick={() => onFree(it.f.startsAt)} />
        )
      )}
    </>
  );
}

/** services/appointments' chip, its label in the app's language (Booked, Done, Cancelled, No-show). */
const chipOf = (c: ReturnType<typeof apptChip>) => ({ ...c, label: t(c.label) });

type Prefill = { date: string; startsAt: string } | null;

/** The Add appointment sheet, its open state and the toast it leaves (both pages). */
function useAddSheet(businessId: string | null, d: DayData | null, refresh: () => Promise<void>, overCta: boolean) {
  const [toast, showToast] = useOpsToast();
  const [sheet, setSheet] = useState<{ open: boolean; prefill: Prefill }>({ open: false, prefill: null });
  const node =
    businessId && d ? (
      <AddAppointmentSheet
        open={sheet.open}
        onClose={() => setSheet({ open: false, prefill: null })}
        businessId={businessId}
        services={d.services}
        team={d.team}
        prefill={sheet.prefill}
        onAdded={(a) => {
          setSheet({ open: false, prefill: null });
          showToast(a.waiverPending ? t("Appointment added. {client} still has your terms to accept.", { client: a.clientLabel }) : t("Appointment added. It's in {client}'s calendar.", { client: a.clientLabel }), overCta);
          void refresh();
        }}
      />
    ) : null;
  return { open: (prefill: Prefill) => setSheet({ open: true, prefill }), node: <>{node}{toast}</> };
}

/** The Appointments content; `embedded` = inside Orders as its fourth tab (no header). */
export function AppointmentsPanel({ embedded }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const online = useOnline();
  const { businessId, ready, loadError, reload: reloadBiz } = useStoreBusiness();
  const today = isoDate(new Date());
  const live = useLive(businessId ? () => loadDay(businessId, today) : null, 120000, "", { businessId, kinds: APPT_KINDS });
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;
  const items = useMemo(() => (d ? merge(d) : []), [d]);
  const add = useAddSheet(businessId, d, live.refresh, true);

  let body: React.ReactNode;
  if (loadError || s.status === "error") {
    body = <ErrorCard text={t("Couldn't load your appointments.")} onRetry={() => (loadError ? reloadBiz() : live.reload())} />;
  } else if (!ready || (businessId && s.status === "loading")) {
    body = (
      <>
        <NumberBoxes loading items={[{ v: "", l: t("Today") }, { v: "", l: t("Free slots") }]} />
        <ListSkeleton label={t("Loading your appointments")} />
      </>
    );
  } else if (!d || d.pending || (d.services.length === 0 && !d.ever)) {
    // State B: nothing set up yet.
    body = <EmptyCard icon={CalendarPlus} title={t("No appointments yet")} body={t("Add your services and free slots, and clients can book them.")} />;
  } else {
    const todayCount = d.appts.filter((a) => a.status === "booked" || a.status === "completed").length;
    const free = d.free.length;
    const booked = d.appts.filter((a) => a.status !== "cancelled");
    body = (
      <>
        <NumberBoxes
          items={[
            { v: String(todayCount), l: t("Today") },
            { v: String(free), l: t("Free slots") },
          ]}
        />
        {booked.length === 0 ? (
          <>
            <KitLabel label={t("Today")} />
            <EmptyCard
              icon={CalendarCheck}
              title={t("No appointments today")}
              body={free === 0 ? t("Nothing booked and no free slots today.") : t("Bookings show here. Your free slots stay open for clients.")}
            />
          </>
        ) : (
          <>
            <KitLabel label={t("Today")} action={t("See all")} onAction={() => navigate("/app/business/appointments/day")} />
            <ListCard label={t("Today")}>
              <DayRows items={items.slice(0, CAP)} onAppt={(a) => navigate(`/app/business/appointments/${a.id}`)} onFree={(startsAt) => add.open({ date: today, startsAt })} />
            </ListCard>
          </>
        )}
      </>
    );
  }

  return (
    <div>
      {!embedded && <OpsHeader kicker={t("Appointments")} title={t("Appointments")} sub={todaySub()} />}
      {body}
      {businessId && (
        <>
          <CtaSpacer />
          <FixedCta label={t("Add appointment")} plus onClick={() => add.open(null)} disabled={!online || !d || d.pending} />
        </>
      )}
      {add.node}
    </div>
  );
}

export default function AppointmentsPage() {
  return <AppointmentsPanel />;
}

/** OP1-020 S2 · "See all": the full day with a Monday-first day strip (two weeks from this Monday). */
export function AppointmentsDayPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { businessId } = useStoreBusiness();
  const now = new Date();
  const date = params.get("date") ?? isoDate(now);
  const live = useLive(businessId ? () => loadDay(businessId, date) : null, 120000, date, { businessId, kinds: APPT_KINDS });
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;
  const items = useMemo(() => (d ? merge(d) : []), [d]);
  const add = useAddSheet(businessId, d, live.refresh, false);

  const strip = useMemo(() => {
    const d0 = new Date();
    const monday = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - mondayIndex(d0.getDay()));
    return Array.from({ length: 14 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  }, []);
  const [y, m, dd] = date.split("-").map(Number);
  const day = new Date(y, m - 1, dd);

  return (
    <div>
      <OpsHeader back kicker={t("Appointments")} title={dayDate(day)} />
      <div role="tablist" aria-label={t("Day")} className="flex overflow-x-auto [scrollbar-width:none]" style={{ gap: 8, marginBottom: 16 }}>
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
              onClick={() => setParams({ date: v }, { replace: true })}
              className={clsx("tap shrink-0 flex flex-col items-center justify-center", on ? "bg-primary-fill text-on-primary-fill" : clsx(PALE, P_DARK))}
              style={{ width: 44, height: 56, borderRadius: 14 }}
            >
              <span className="text-[10px] font-bold uppercase">{weekdayShort(x)}</span>
              <span className="text-[15px] font-extrabold">{x.getDate()}</span>
            </button>
          );
        })}
      </div>
      {s.status === "error" ? (
        <ErrorCard text={t("Couldn't load your appointments.")} onRetry={live.reload} />
      ) : s.status === "loading" ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyCard icon={CalendarCheck} title={t("Nothing this day")} body={t("Bookings and free slots for this day show here.")} />
      ) : (
        <ListCard label={dayDate(day)}>
          <DayRows items={items} onAppt={(a) => navigate(`/app/business/appointments/${a.id}`)} onFree={(startsAt) => add.open({ date, startsAt })} />
        </ListCard>
      )}
      {add.node}
    </div>
  );
}
