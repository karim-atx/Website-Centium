import { useCallback, useEffect, useState } from "react";
import { Calendar, ChevronDown, Clock, Search } from "lucide-react";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { WheelPicker } from "../../../components/ui/WheelPicker";
import { ANY_AVAILABLE, bookAppointmentFor, bookForErrorMessage, fetchSlots, searchClients, slotTimes, type Service, type Slot } from "../../../services/appointments";
import { dayTitle, isoDate } from "../../../services/store/format";
import { clock12 } from "../../../utils/time12";
import { useOnline } from "../../../hooks/useOnline";
import { KitField, KitFieldButton, OpsSheet } from "../store/opsKit";

// OURS-OP1-appointments-detail rows 15-22 · Add appointment (OP1-010 sheet).
// Day (row 18): the shared calendar card (CalendarPickerSheet, Monday first,
// no day before today). Time (row 19): a time wheel in a floating card under
// the field (WheelPicker, business band), 12-hour.
//
// B12 follow-up: book_appointment_for(business, person, service, staff|null,
// start, 'cash') (schedule or front_desk). Client = the business's own people
// from business_people (search by a shared first name or the member number;
// the server's label is shown). With = a team member or "Any available"
// (staff null: the server takes the first free person). Times =
// appointment_slots(service, day, staff) starts, one per time. ATX96 / ATXF2 /
// ATXF3 / ATXF4 in words. The waiver doesn't block a desk booking: a pending
// one comes back as waiverPending. Walk-ins without an account are not
// supported (V6-158).

export interface AddedAppointment {
  id: string;
  waiverPending: boolean;
  clientLabel: string;
}

export function AddAppointmentSheet({
  open,
  onClose,
  businessId,
  services,
  team,
  prefill,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  services: Service[];
  /** Accepted team members (who can be booked). */
  team: { id: string; name: string }[];
  prefill?: { date: string; startsAt: string } | null;
  onAdded: (a: AddedAppointment) => void;
}) {
  const online = useOnline();
  const active = services.filter((s) => s.active);
  const [serviceId, setServiceId] = useState<string | null>(null);
  /** null = Any available. */
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(isoDate(new Date()));
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<{ id: string; label: string }[]>([]);
  const [client, setClient] = useState<{ id: string; label: string } | null>(null);
  const [menu, setMenu] = useState<null | { kind: "service" | "staff"; el: HTMLElement }>(null);
  const [dayOpen, setDayOpen] = useState(false);
  /** The open time wheel: the field it hangs under. */
  const [wheel, setWheel] = useState<HTMLButtonElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const act = services.filter((s) => s.active);
    setServiceId(act.length === 1 ? act[0].id : null);
    setStaffId(null);
    setDate(prefill?.date ?? isoDate(new Date()));
    setStartsAt(prefill?.startsAt ?? null);
    setClient(null);
    setQuery("");
    setMatches([]);
    setError(null);
    setTimeError(null);
    setClientError(null);
    setDayOpen(false);
    setWheel(null);
  }, [open, prefill, services]);

  // The business's own people, as the owner types (shared first name or member number).
  useEffect(() => {
    const q = query.trim();
    if (!open || client || !q) {
      setMatches([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      void searchClients(businessId, q).then((r) => {
        if (alive) setMatches(r.status === "ok" ? r.value : []);
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [open, businessId, query, client]);

  useEffect(() => {
    if (!open || !serviceId) {
      setSlots(null);
      return;
    }
    let alive = true;
    void fetchSlots(serviceId, date, staffId).then((r) => {
      if (!alive) return;
      const now = Date.now();
      setSlots(r.status === "ok" ? slotTimes(r.value.filter((s) => new Date(s.startsAt).getTime() > now)) : []);
    });
    return () => {
      alive = false;
    };
  }, [open, serviceId, date, staffId]);

  // The card hangs below the field inside the sheet body: bring it into view as it opens.
  const revealCard = useCallback((el: HTMLDivElement | null) => el?.scrollIntoView({ block: "nearest" }), []);
  const today = isoDate(new Date());
  const service = active.find((s) => s.id === serviceId) ?? null;
  const dayLabel = dayTitle(new Date(`${date}T00:00:00`));
  const canPickTime = !!serviceId && !!slots && slots.length > 0;
  const staffName = staffId ? (team.find((p) => p.id === staffId)?.name ?? null) : ANY_AVAILABLE;
  const openWheel = (el: HTMLButtonElement) => {
    if (wheel) return setWheel(null);
    // A wheel always shows a value: the first free time until one is turned to.
    if (!startsAt || !slots?.some((x) => x.startsAt === startsAt)) setStartsAt(slots?.[0]?.startsAt ?? null);
    setTimeError(null);
    setWheel(el);
  };

  const save = async () => {
    if (!serviceId || !startsAt || !client) return;
    setBusy(true);
    setError(null);
    setTimeError(null);
    setClientError(null);
    const r = await bookAppointmentFor(businessId, client.id, serviceId, staffId, startsAt);
    setBusy(false);
    if (!r.ok) {
      const msg = r.pending ? "Adding appointments is coming soon." : bookForErrorMessage(r.code, r.message ?? "", "Couldn't add the appointment. Try again.");
      if (r.code === "ATXF2" || r.code === "ATXF3") setTimeError(msg);
      else if (r.code === "ATX96") setClientError(msg);
      else setError(msg);
      return;
    }
    onAdded({ id: r.value.id, waiverPending: r.value.waiverPending, clientLabel: client.label });
  };

  return (
    <>
      <OpsSheet open={open} onClose={onClose} title="Add appointment" button="Save" onButton={save} disabled={!serviceId || !startsAt || !client || !online} busy={busy} error={error}>
        <KitFieldButton
          id="appt-service"
          label="Service"
          value={service ? `${service.name}, ${service.durationMin} min` : null}
          placeholder="Choose a service"
          icon={ChevronDown}
          expanded={menu?.kind === "service"}
          onClick={(el) => setMenu({ kind: "service", el })}
          note={active.length === 0 ? "Add a service first, under More." : undefined}
          disabled={active.length === 0}
        />
        <KitFieldButton id="appt-staff" label="With" value={staffName} placeholder={ANY_AVAILABLE} icon={ChevronDown} expanded={menu?.kind === "staff"} onClick={(el) => setMenu({ kind: "staff", el })} />
        <KitFieldButton id="appt-day" label="Day" value={dayLabel} placeholder="Choose a day" icon={Calendar} popup="dialog" expanded={dayOpen} onClick={() => setDayOpen(true)} />
        <div className="relative">
          <KitFieldButton
            id="appt-time"
            label="Time"
            value={startsAt ? clock12(startsAt) : null}
            placeholder={!serviceId ? "Choose a service first" : slots && slots.length === 0 ? "No free slots this day" : "Choose a time"}
            icon={Clock}
            popup="dialog"
            expanded={!!wheel}
            onClick={canPickTime ? openWheel : undefined}
            error={timeError}
          />
          {wheel && canPickTime && startsAt && (
            <>
              <div className="fixed inset-0 z-[5]" onClick={() => setWheel(null)} aria-hidden />
              <div
                ref={revealCard}
                role="dialog"
                aria-label="Time"
                onKeyDown={(e) => {
                  if (e.key === "Escape" || e.key === "Enter") {
                    e.stopPropagation();
                    setWheel(null);
                    wheel.focus();
                  }
                }}
                className="absolute start-0 end-0 z-[6] bg-cream-card border border-solid border-th-aea1dc/50 dark:border-th-a991fe/50"
                style={{ top: wheel.offsetTop + wheel.offsetHeight + 6, borderRadius: 16, boxShadow: "0 12px 32px rgba(95,80,147,0.18)", padding: 6 }}
              >
                <WheelPicker
                  band="business"
                  columns={[
                    {
                      label: "Time",
                      value: startsAt,
                      options: (slots ?? []).map((x) => ({ value: x.startsAt, label: clock12(x.startsAt) })),
                      onChange: (v) => {
                        setStartsAt(String(v));
                        setTimeError(null);
                      },
                    },
                  ]}
                />
              </div>
            </>
          )}
        </div>
        <KitField
          id="appt-client"
          label="Client"
          value={client ? client.label : query}
          onChange={(v) => {
            setClient(null);
            setClientError(null);
            setQuery(v);
          }}
          placeholder="Search name or client code"
          icon={Search}
          error={clientError}
          note={client ? undefined : "Your own clients: members and people who booked with you."}
        />
        {!client && matches.length > 0 && (
          <div role="listbox" aria-label="Clients" className="bg-cream-card border border-th-aea1dc/50 dark:border-th-a991fe/50" style={{ borderRadius: 14, padding: 6, marginTop: -6, marginBottom: 12 }}>
            {matches.slice(0, 6).map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setClient(c);
                  setQuery("");
                }}
                className="tap w-full text-start text-[13px] font-bold text-charcoal"
                style={{ minHeight: 44, padding: "0 10px", borderRadius: 8 }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </OpsSheet>
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        matchWidth={menu?.el ?? null}
        variant="field"
        options={
          menu?.kind === "staff"
            ? [{ value: "any", label: ANY_AVAILABLE }, ...team.map((p) => ({ value: p.id, label: p.name }))]
            : active.map((s) => ({ value: s.id, label: `${s.name}, ${s.durationMin} min` }))
        }
        selected={menu?.kind === "staff" ? (staffId ?? "any") : serviceId}
        onSelect={(v) => {
          // A free slot's prefilled time stays; the server re-checks it on Save.
          if (menu?.kind === "staff") setStaffId(v === "any" ? null : v);
          else setServiceId(v);
          setTimeError(null);
        }}
      />
      <CalendarPickerSheet
        open={dayOpen}
        onClose={() => setDayOpen(false)}
        selectedDate={date}
        today={today}
        minDate={today}
        title="Day"
        dayInk="ink"
        onSelect={(d) => {
          setDayOpen(false);
          if (d === date) return;
          setDate(d);
          setStartsAt(null);
          setWheel(null);
        }}
      />
    </>
  );
}
