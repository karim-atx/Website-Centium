import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, Clock, Search } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { bookAppointment, fetchFreeSlots, fetchKnownClients, type Service, type Slot } from "../../../services/appointments";
import { dayTitle, isoDate } from "../../../services/store/format";
import { clock12 } from "../../../utils/time12";
import { useOnline } from "../../../hooks/useOnline";
import { KitField, KitFieldButton, OpsSheet } from "../store/opsKit";

// OURS-OP1-appointments-detail rows 15-22 · Add appointment (OP1-010 sheet).
// Day: the next 14 days, Monday-first names; Time: that service's free
// slots that day (12-hour). Client: the business's own clients (people who
// booked before). Walk-ins without an account are not supported (V6-158).

const DAYS = 14;

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
  const [menu, setMenu] = useState<null | { kind: "service" | "day" | "time"; el: HTMLElement }>(null);
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

  const days = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      out.push({ value: isoDate(d), label: dayTitle(d) });
    }
    return out;
  }, []);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const dayLabel = days.find((d) => d.value === date)?.label ?? date;
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
        <KitFieldButton id="appt-day" label="Day" value={dayLabel} placeholder="Choose a day" icon={Calendar} expanded={menu?.kind === "day"} onClick={(el) => setMenu({ kind: "day", el })} />
        <KitFieldButton
          id="appt-time"
          label="Time"
          value={startsAt ? clock12(startsAt) : null}
          placeholder={!serviceId ? "Choose a service first" : slots && slots.length === 0 ? "No free slots this day" : "Choose a time"}
          icon={Clock}
          expanded={menu?.kind === "time"}
          onClick={serviceId && slots && slots.length > 0 ? (el) => setMenu({ kind: "time", el }) : undefined}
          error={timeError}
        />
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
      <PopupMenu
        open={menu?.kind === "day"}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        matchWidth={menu?.el ?? null}
        variant="field"
        options={days}
        selected={date}
        onSelect={(v) => {
          setDate(v);
          setStartsAt(null);
        }}
      />
      <PopupMenu
        open={menu?.kind === "time"}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        matchWidth={menu?.el ?? null}
        variant="field"
        options={(slots ?? []).map((s) => ({ value: s.startsAt, label: clock12(s.startsAt) }))}
        selected={startsAt}
        onSelect={(v) => {
          setStartsAt(v);
          setTimeError(null);
        }}
      />
    </>
  );
}
