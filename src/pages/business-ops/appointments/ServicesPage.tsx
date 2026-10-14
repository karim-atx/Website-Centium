import { useEffect, useState } from "react";
import { CalendarClock, ChevronDown, Clock, Pencil, Sparkles, Trash2 } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import {
  addAvailability,
  fetchAvailability,
  fetchServices,
  removeAvailability,
  saveService,
  type Availability,
  type Service,
} from "../../../services/appointments";
import type { Load } from "../../../services/store/backend";
import { money } from "../../../services/store/format";
import { parsePrice } from "../../../utils/price";
import { formatMinutes12 } from "../../../utils/time12";
import { DAY_LONG } from "../../../utils/week";
import { useOnline } from "../../../hooks/useOnline";
import { EmptyCard, ErrorCard, KitField, KitFieldButton, KitLabel, KitRow, ListCard, ListSkeleton, OpsHeader, OpsSheet, P_DARK, useOpsToast } from "../store/opsKit";
import { useLive, useStoreBusiness } from "../store/storeShared";

// V6-158: services and free slots are set up under More (Wellness Service
// with appointments). Not drawn: built from the OP1 kit (OURS). B12.

const DURATIONS = [15, 30, 45, 60, 75, 90, 120];
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => i * 30);
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

async function loadSetup(businessId: string): Promise<Load<{ services: Service[]; hours: Availability[]; pending: boolean }>> {
  const [s, h] = await Promise.all([fetchServices(businessId), fetchAvailability(businessId)]);
  if (s.status === "error") return s;
  if (h.status === "error") return h;
  return {
    status: "ok",
    value: { services: s.status === "ok" ? s.value : [], hours: h.status === "ok" ? h.value : [], pending: s.status === "pending" || h.status === "pending" },
  };
}

export default function ServicesPage() {
  const online = useOnline();
  const { businessId } = useStoreBusiness();
  const live = useLive(businessId ? () => loadSetup(businessId) : null, 0);
  const [toast, showToast] = useOpsToast();
  const [svc, setSvc] = useState<{ open: boolean; s: Service | null }>({ open: false, s: null });
  const [hoursOpen, setHoursOpen] = useState(false);
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;

  const removeHours = async (h: Availability) => {
    const r = await removeAvailability(h.id);
    if (!r.ok) showToast("Couldn't remove the hours. Try again.", false);
    else {
      showToast("Hours removed.", false);
      void live.refresh();
    }
  };

  return (
    <div>
      <OpsHeader back kicker="More" title="Services and free slots" sub="What clients can book, and when" />
      {s.status === "error" ? (
        <ErrorCard text="Couldn't load your services." onRetry={live.reload} />
      ) : s.status === "loading" || !d ? (
        <ListSkeleton />
      ) : d.pending ? (
        <EmptyCard icon={CalendarClock} title="Coming soon" body="Setting up services and free slots for bookings is on its way." />
      ) : (
        <>
          <KitLabel label="Services" action="Add" onAction={() => setSvc({ open: true, s: null })} />
          {d.services.length === 0 ? (
            <EmptyCard icon={Sparkles} title="No services yet" body="Add what clients can book, with how long it takes and its price." />
          ) : (
            <ListCard label="Services">
              {d.services.map((x) => (
                <KitRow
                  key={x.id}
                  icon={Sparkles}
                  title={x.name}
                  sub={`${x.durationMin} min${x.price !== null ? ` · ${money(x.price)}` : ""}`}
                  chip={x.active ? null : { label: "Hidden", tone: "soft" }}
                  onClick={() => setSvc({ open: true, s: x })}
                />
              ))}
            </ListCard>
          )}
          <KitLabel label="Free slots" action="Add" onAction={() => setHoursOpen(true)} />
          {d.hours.length === 0 ? (
            <EmptyCard icon={Clock} title="No free slots yet" body="Add the hours you take bookings. Weeks start on Monday." />
          ) : (
            <ListCard label="Free slots">
              {d.hours.map((h) => (
                <KitRow
                  key={h.id}
                  icon={Clock}
                  title={DAY_LONG[h.weekday] ?? ""}
                  sub={`${formatMinutes12(toMin(h.starts))} to ${formatMinutes12(toMin(h.ends))}`}
                  trailing={
                    <button
                      type="button"
                      aria-label={`Remove ${DAY_LONG[h.weekday]} hours`}
                      onClick={() => void removeHours(h)}
                      disabled={!online}
                      className={`tap shrink-0 flex items-center justify-center ${P_DARK} disabled:opacity-40`}
                      style={{ width: 44, height: 44 }}
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  }
                />
              ))}
            </ListCard>
          )}
        </>
      )}
      {businessId && (
        <ServiceSheet
          open={svc.open}
          service={svc.s}
          businessId={businessId}
          onClose={() => setSvc({ open: false, s: null })}
          onSaved={(m) => {
            setSvc({ open: false, s: null });
            showToast(m, false);
            void live.refresh();
          }}
        />
      )}
      {businessId && (
        <HoursSheet
          open={hoursOpen}
          businessId={businessId}
          onClose={() => setHoursOpen(false)}
          onSaved={() => {
            setHoursOpen(false);
            showToast("Hours added.", false);
            void live.refresh();
          }}
        />
      )}
      {toast}
    </div>
  );
}

function ServiceSheet({ open, service, businessId, onClose, onSaved }: { open: boolean; service: Service | null; businessId: string; onClose: () => void; onSaved: (m: string) => void }) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? "");
    setDuration(service?.durationMin ?? 60);
    setPrice(service?.price != null ? String(service.price) : "");
    setActive(service?.active ?? true);
    setError(null);
  }, [open, service]);
  const p = parsePrice(price);
  const valid = name.trim().length > 0 && p.ok;
  const save = async (nextActive = active) => {
    if (!valid || !p.ok) return;
    setBusy(true);
    const r = await saveService(businessId, { id: service?.id, name, durationMin: duration, price: p.value, active: nextActive });
    setBusy(false);
    if (!r.ok) setError("Couldn't save the service. Try again.");
    else onSaved(service ? "Changes saved." : `${name.trim()} added.`);
  };
  return (
    <>
      <OpsSheet open={open} onClose={onClose} title={service ? "Edit service" : "New service"} button="Save" onButton={() => void save()} disabled={!valid} busy={busy} error={error}>
        <KitField id="svc-name" label="Name" value={name} onChange={setName} placeholder="e.g. Sports massage" icon={Pencil} maxLength={60} />
        <KitFieldButton id="svc-duration" label="Duration" value={`${duration} min`} placeholder="" icon={ChevronDown} onClick={(el) => setMenu(el)} expanded={!!menu} />
        <KitField
          id="svc-price"
          label="Price"
          value={price}
          onChange={setPrice}
          placeholder="$0.00"
          icon={Pencil}
          inputMode="decimal"
          error={price.trim() && !p.ok ? "Enter the price as a number, for example 25 or $25." : null}
        />
        {service && (
          <button type="button" onClick={() => void save(!active)} className="tap w-full text-[14px] font-bold text-charcoal-soft" style={{ minHeight: 44 }}>
            {active ? "Hide from booking" : "Show for booking"}
          </button>
        )}
      </OpsSheet>
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu}
        matchWidth={menu}
        variant="field"
        options={DURATIONS.map((m) => ({ value: String(m), label: `${m} min` }))}
        selected={String(duration)}
        onSelect={(v) => setDuration(Number(v))}
      />
    </>
  );
}

function HoursSheet({ open, businessId, onClose, onSaved }: { open: boolean; businessId: string; onClose: () => void; onSaved: () => void }) {
  const [weekday, setWeekday] = useState(0);
  const [start, setStart] = useState(9 * 60);
  const [end, setEnd] = useState(17 * 60);
  const [menu, setMenu] = useState<null | { k: "day" | "start" | "end"; el: HTMLElement }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);
  const valid = end > start;
  const save = async () => {
    setBusy(true);
    const r = await addAvailability(businessId, weekday, hhmm(start), hhmm(end));
    setBusy(false);
    if (!r.ok) setError("Couldn't save the hours. Try again.");
    else onSaved();
  };
  const timeOpts = HALF_HOURS.map((m) => ({ value: String(m), label: formatMinutes12(m) }));
  return (
    <>
      <OpsSheet open={open} onClose={onClose} title="Add free slots" button="Save" onButton={() => void save()} disabled={!valid} busy={busy} error={error}>
        <KitFieldButton id="hours-day" label="Day" value={DAY_LONG[weekday]} placeholder="" icon={ChevronDown} onClick={(el) => setMenu({ k: "day", el })} />
        <KitFieldButton id="hours-start" label="From" value={formatMinutes12(start)} placeholder="" icon={Clock} onClick={(el) => setMenu({ k: "start", el })} />
        <KitFieldButton
          id="hours-end"
          label="To"
          value={formatMinutes12(end)}
          placeholder=""
          icon={Clock}
          onClick={(el) => setMenu({ k: "end", el })}
          error={valid ? null : "End after the start time."}
        />
      </OpsSheet>
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        matchWidth={menu?.el ?? null}
        variant="field"
        options={menu?.k === "day" ? DAY_LONG.map((d, i) => ({ value: String(i), label: d })) : timeOpts}
        selected={menu?.k === "day" ? String(weekday) : menu?.k === "start" ? String(start) : String(end)}
        onSelect={(v) => {
          if (menu?.k === "day") setWeekday(Number(v));
          else if (menu?.k === "start") setStart(Number(v));
          else setEnd(Number(v));
        }}
      />
    </>
  );
}
