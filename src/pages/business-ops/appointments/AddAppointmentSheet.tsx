import { useCallback, useEffect, useState } from "react";
import { Calendar, ChevronDown, Clock, Search } from "lucide-react";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { WheelPicker } from "../../../components/ui/WheelPicker";
import { bookAppointment, fetchFreeSlots, fetchKnownClients, type Service, type Slot } from "../../../services/appointments";
import { dayTitle, isoDate } from "../../../services/store/format";
import { clock12 } from "../../../utils/time12";
import { useOnline } from "../../../hooks/useOnline";
import { KitField, KitFieldButton, OpsSheet } from "../store/opsKit";

// OURS-OP1-appointments-detail rows 15-22 · Add appointment (OP1-010 sheet).
// Day (row 18): the shared calendar card (CalendarPickerSheet, Monday first,
// no day before today). Time (row 19): a time wheel in a floating card under
// the field (WheelPicker, business band), one row per free slot of that
// service that day, 12-hour; a booking can only start at a free slot
// (appointment_free_slots). Client: the business's own clients (people who
// booked before). Walk-ins without an account are not supported (V6-158).

export function AddAppointmentSheet({
  open,
  onClose,
  businessId,
  services,
  prefill,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  services: Service[];
  prefill?: { date: string; startsAt: string } | null;
  onAdded: (message: string) => void;
}) {
  const online = useOnline();
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(isoDate(new Date()));
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [query, setQuery] = useState("");
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [menu, setMenu] = useState<null | { kind: "service"; el: HTMLElement }>(null);
  const [dayOpen, setDayOpen] = useState(false);
  /** The open time wheel: the field it hangs under. */
  const [wheel, setWheel] = useState<HTMLButtonElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setServiceId(services.length === 1 ? services[0].id : null);
    setDate(prefill?.date ?? isoDate(new Date()));
    setStartsAt(prefill?.startsAt ?? null);
    setClient(null);
    setQuery("");
    setError(null);
    setTimeError(null);
    setDayOpen(false);
    setWheel(null);
    void fetchKnownClients(businessId).then((r) => setClients(r.status === "ok" ? r.value : []));
  }, [open, prefill, services, businessId]);

  useEffect(() => {
    if (!open || !serviceId) {
      setSlots(null);
      return;
    }
    let alive = true;
    void fetchFreeSlots(businessId, serviceId, date, date).then((r) => {
      if (!alive) return;
      const now = Date.now();
      setSlots(r.status === "ok" ? r.value.filter((s) => new Date(s.startsAt).getTime() > now) : []);
    });
    return () => {
      alive = false;
    };
  }, [open, businessId, serviceId, date]);

  // The card hangs below the field inside the sheet body: bring it into view as it opens.
  const revealCard = useCallback((el: HTMLDivElement | null) => el?.scrollIntoView({ block: "nearest" }), []);
  const today = isoDate(new Date());
  const service = services.find((s) => s.id === serviceId) ?? null;
  const dayLabel = dayTitle(new Date(`${date}T00:00:00`));
  const canPickTime = !!serviceId && !!slots && slots.length > 0;
  const openWheel = (el: HTMLButtonElement) => {
    if (wheel) return setWheel(null);
    // A wheel always shows a value: the first free slot until one is turned to.
    if (!startsAt || !slots?.some((x) => x.startsAt === startsAt)) setStartsAt(slots?.[0]?.startsAt ?? null);
    setTimeError(null);
    setWheel(el);
  };
  const matches = query.trim() ? clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()) || c.id.replace(/-/g, "").toLowerCase().startsWith(query.trim().toLowerCase().replace(/^#/, ""))) : [];

  const save = async () => {
    if (!serviceId || !startsAt || !client) return;
    setBusy(true);
    setError(null);
    setTimeError(null);
    const r = await bookAppointment(serviceId, startsAt, client.id);
    setBusy(false);
    if (!r.ok) {
      if (r.taken) setTimeError("That time is no longer free. Pick another.");
      else setError(r.pending ? "Adding appointments is coming soon." : "Couldn't add the appointment. Try again.");
      return;
    }
    onAdded(`Appointment added. ${client.name || "Your client"} has been told.`);
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
          note={services.length === 0 ? "Add a service first, under More." : undefined}
          disabled={services.length === 0}
        />
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
                className="absolute left-0 right-0 z-[6] bg-cream-card border border-solid border-th-aea1dc/50 dark:border-th-a991fe/50"
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
          value={client ? client.name : query}
          onChange={(v) => {
            setClient(null);
            setQuery(v);
          }}
          placeholder="Search name or client code"
          icon={Search}
          note={client ? undefined : clients.length === 0 ? "Clients who have booked with you show here." : undefined}
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
                {c.name || "Client"}
              </button>
            ))}
          </div>
        )}
      </OpsSheet>
      <PopupMenu
        open={menu?.kind === "service"}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        matchWidth={menu?.el ?? null}
        variant="field"
        options={services.map((s) => ({ value: s.id, label: `${s.name}, ${s.durationMin} min` }))}
        selected={serviceId}
        onSelect={(v) => {
          // A free slot's prefilled time stays; the server re-checks it on Save.
          setServiceId(v);
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
