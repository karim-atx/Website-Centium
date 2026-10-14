import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { CalendarCheck, CalendarPlus, Clock } from "lucide-react";
import {
  apptChip,
  countAppointments,
  fetchDayAppointments,
  fetchFreeSlots,
  fetchServices,
  type Appointment,
  type Service,
  type Slot,
} from "../../../services/appointments";
import type { Load } from "../../../services/store/backend";
import { isoDate, shortDate } from "../../../services/store/format";
import { DAY_SHORT, mondayIndex } from "../../../utils/week";
import { useOnline } from "../../../hooks/useOnline";
import { CtaSpacer, EmptyCard, ErrorCard, FixedCta, KitLabel, KitRow, ListCard, ListSkeleton, NumberBoxes, OpsHeader, PALE, P_DARK, useOpsToast } from "../store/opsKit";
import { useLive, useStoreBusiness } from "../store/storeShared";
import { AddAppointmentSheet } from "./AddAppointmentSheet";
import { clientLabel, serviceTitle, time, todaySub } from "./apptShared";

// OP1-020 · Wellness Service › Appointments (O11 / V6-54: the Orders navbar
// slot for appointments-only; a fourth Orders tab when it also sells), with
// OURS-OP1-appointments-empty (states A and B). The board's tip and its
// "turned on in Settings" sub are designer notes and do not ship (OP1-020
// rows 4 and 10). Pending B12: state B ("No appointments yet").

const CAP = 3;

interface DayData {
  appts: Appointment[];
  slots: Slot[];
  services: Service[];
  ever: number;
  pending: boolean;
}

async function loadDay(businessId: string, date: string): Promise<Load<DayData>> {
  const [a, f, s, c] = await Promise.all([
    fetchDayAppointments(businessId, date),
    fetchFreeSlots(businessId, null, date, date),
    fetchServices(businessId, true),
    countAppointments(businessId),
  ]);
  for (const r of [a, f, s, c]) if (r.status === "error") return r as Load<DayData>;
  const pending = a.status === "pending" || s.status === "pending";
  return {
    status: "ok",
    value: {
      appts: a.status === "ok" ? a.value : [],
      slots: f.status === "ok" ? f.value : [],
      services: s.status === "ok" ? s.value : [],
      ever: c.status === "ok" ? c.value : 0,
      pending,
    },
  };
}

type Item = { kind: "appt"; at: string; a: Appointment } | { kind: "slot"; at: string; s: Slot };

function merge(d: DayData, futureSlotsOnly: boolean): Item[] {
  const now = Date.now();
  const items: Item[] = [
    ...d.appts.filter((a) => a.status !== "cancelled").map((a) => ({ kind: "appt" as const, at: a.startsAt, a })),
    ...d.slots.filter((s) => !futureSlotsOnly || new Date(s.startsAt).getTime() > now).map((s) => ({ kind: "slot" as const, at: s.startsAt, s })),
  ];
  return items.sort((x, y) => x.at.localeCompare(y.at));
}

function DayRows({ items, onAppt, onSlot }: { items: Item[]; onAppt: (a: Appointment) => void; onSlot: (s: Slot) => void }) {
  return (
    <>
      {items.map((it) =>
        it.kind === "appt" ? (
          <KitRow key={it.a.id} icon={Clock} title={serviceTitle(it.a)} sub={`${time(it.a.startsAt)} · ${clientLabel(it.a)}`} chip={apptChip(it.a.status)} onClick={() => onAppt(it.a)} />
        ) : (
          <KitRow key={`slot-${it.s.startsAt}`} icon={Clock} title="Free slot" sub={time(it.s.startsAt)} chip={{ label: "Open", tone: "soft" }} onClick={() => onSlot(it.s)} />
        )
      )}
    </>
  );
}

/** The Appointments content; `embedded` = inside Orders as its fourth tab (no header). */
export function AppointmentsPanel({ embedded }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const online = useOnline();
  const { businessId, ready, loadError, reload: reloadBiz } = useStoreBusiness();
  const today = isoDate(new Date());
  const live = useLive(businessId ? () => loadDay(businessId, today) : null);
  const [toast, showToast] = useOpsToast();
  const [sheet, setSheet] = useState<{ open: boolean; prefill: { date: string; startsAt: string } | null }>({ open: false, prefill: null });
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;
  const items = useMemo(() => (d ? merge(d, true) : []), [d]);

  let body: React.ReactNode;
  if (loadError || s.status === "error") {
    body = <ErrorCard text="Couldn't load your appointments." onRetry={() => (loadError ? reloadBiz() : live.reload())} />;
  } else if (!ready || (businessId && s.status === "loading")) {
    body = (
      <>
        <NumberBoxes loading items={[{ v: "", l: "Today" }, { v: "", l: "Free slots" }]} />
        <ListSkeleton label="Loading your appointments" />
      </>
    );
  } else if (!d || d.pending || (d.services.length === 0 && d.ever === 0)) {
    // State B: nothing set up yet.
    body = <EmptyCard icon={CalendarPlus} title="No appointments yet" body="Add your services and free slots, and clients can book them." />;
  } else {
    const todayCount = d.appts.filter((a) => a.status === "booked" || a.status === "completed").length;
    const free = d.slots.filter((x) => new Date(x.startsAt).getTime() > Date.now()).length;
    const booked = d.appts.filter((a) => a.status !== "cancelled");
    body = (
      <>
        <NumberBoxes
          items={[
            { v: String(todayCount), l: "Today" },
            { v: String(free), l: "Free slots" },
          ]}
        />
        {booked.length === 0 ? (
          <>
            <KitLabel label="Today" />
            <EmptyCard
              icon={CalendarCheck}
              title="No appointments today"
              body={free === 0 ? "Nothing booked and no free slots today." : "Bookings show here. Your free slots stay open for clients."}
            />
          </>
        ) : (
          <>
            <KitLabel label="Today" action="See all" onAction={() => navigate("/app/business/appointments/day")} />
            <ListCard label="Today">
              <DayRows
                items={items.slice(0, CAP)}
                onAppt={(a) => navigate(`/app/business/appointments/${a.id}`)}
                onSlot={(slot) => setSheet({ open: true, prefill: { date: today, startsAt: slot.startsAt } })}
              />
            </ListCard>
          </>
        )}
      </>
    );
  }

  return (
    <div>
      {!embedded && <OpsHeader kicker="Appointments" title="Appointments" sub={todaySub()} />}
      {body}
      {businessId && (
        <>
          <CtaSpacer />
          <FixedCta label="Add appointment" plus onClick={() => setSheet({ open: true, prefill: null })} disabled={!online || !d || d.pending} />
        </>
      )}
      {businessId && d && (
        <AddAppointmentSheet
          open={sheet.open}
          onClose={() => setSheet({ open: false, prefill: null })}
          businessId={businessId}
          services={d.services}
          prefill={sheet.prefill}
          onAdded={(m) => {
            setSheet({ open: false, prefill: null });
            showToast(m, true);
            void live.refresh();
          }}
        />
      )}
      {toast}
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
  const live = useLive(businessId ? () => loadDay(businessId, date) : null, 120000, date);
  const [sheet, setSheet] = useState<{ open: boolean; prefill: { date: string; startsAt: string } | null }>({ open: false, prefill: null });
  const [toast, showToast] = useOpsToast();
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;

  const [strip] = useState(() => {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayIndex(now.getDay()));
    return Array.from({ length: 14 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  });
  const [y, m, dd] = date.split("-").map(Number);
  const day = new Date(y, m - 1, dd);

  return (
    <div>
      <OpsHeader back kicker="Appointments" title={shortDate(day)} />
      <div role="tablist" aria-label="Day" className="flex overflow-x-auto [scrollbar-width:none]" style={{ gap: 8, marginBottom: 16 }}>
        {strip.map((x) => {
          const v = isoDate(x);
          const on = v === date;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={shortDate(x)}
              onClick={() => setParams({ date: v }, { replace: true })}
              className={clsx("tap shrink-0 flex flex-col items-center justify-center", on ? "bg-primary-fill text-on-primary-fill" : clsx(PALE, P_DARK))}
              style={{ width: 44, height: 56, borderRadius: 14 }}
            >
              <span className="text-[10px] font-bold uppercase">{DAY_SHORT[mondayIndex(x.getDay())]}</span>
              <span className="text-[15px] font-extrabold">{x.getDate()}</span>
            </button>
          );
        })}
      </div>
      {s.status === "error" ? (
        <ErrorCard text="Couldn't load your appointments." onRetry={live.reload} />
      ) : s.status === "loading" ? (
        <ListSkeleton rows={4} />
      ) : !d || merge(d, date === isoDate(now)).length === 0 ? (
        <EmptyCard icon={CalendarCheck} title="Nothing this day" body="Bookings and free slots for this day show here." />
      ) : (
        <ListCard label={shortDate(day)}>
          <DayRows
            items={merge(d, date === isoDate(now))}
            onAppt={(a) => navigate(`/app/business/appointments/${a.id}`)}
            onSlot={(slot) => setSheet({ open: true, prefill: { date, startsAt: slot.startsAt } })}
          />
        </ListCard>
      )}
      {businessId && d && (
        <AddAppointmentSheet
          open={sheet.open}
          onClose={() => setSheet({ open: false, prefill: null })}
          businessId={businessId}
          services={d.services}
          prefill={sheet.prefill}
          onAdded={(msg) => {
            setSheet({ open: false, prefill: null });
            showToast(msg, false);
            void live.refresh();
          }}
        />
      )}
      {toast}
    </div>
  );
}
