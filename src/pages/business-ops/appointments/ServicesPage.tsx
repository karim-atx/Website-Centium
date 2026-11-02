import { useEffect, useState } from "react";
import { CalendarClock, ChevronDown, Clock, Pencil, Sparkles, Trash2 } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { addStaffHours, DURATIONS, fetchServices, fetchStaffHours, removeStaffHours, saveService, type Service, type StaffHours } from "../../../services/appointments";
import { fetchTeam } from "../../../services/business-team/team";
import type { Load } from "../../../services/store/backend";
import { money } from "../../../services/store/format";
import { parsePrice } from "../../../utils/price";
import { formatMinutes12 } from "../../../utils/time12";
import { DAY_LONG } from "../../../utils/week";
import { useOnline } from "../../../hooks/useOnline";
import { t } from "../../../i18n/core";
import { EmptyCard, ErrorCard, KitField, KitFieldButton, KitLabel, KitRow, ListCard, ListSkeleton, OpsHeader, OpsSheet, P_DARK, useOpsToast } from "../store/opsKit";
import { useLive, useStoreBusiness } from "../store/storeShared";

// V6-158: services and free slots are set up under More (Wellness Service
// with appointments). Not drawn: built from the OP1 kit (OURS).
// B12: appointment_services (name ≤ 60, description ≤ 500, 5-480 minutes,
// price) and the staff's hours, which are the B6 instructor_availability
// rows (weekday 1 = Monday) classes use too: a person is bookable for any
// service inside their hours. Only accepted team members can be booked.
// Both need the schedule permission.

const HALF_HOURS = Array.from({ length: 48 }, (_, i) => i * 30);
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
};

interface Person {
  id: string;
  name: string;
}

interface Setup {
  services: Service[];
  hours: StaffHours[];
  people: Person[];
  pending: boolean;
}

async function loadSetup(businessId: string): Promise<Load<Setup>> {
  const [s, h, team] = await Promise.all([fetchServices(businessId), fetchStaffHours(businessId), fetchTeam(businessId)]);
  if (s.status === "error") return s;
  if (h.status === "error") return h;
  return {
    status: "ok",
    value: {
      services: s.status === "ok" ? s.value : [],
      hours: h.status === "ok" ? h.value : [],
      // A team that can't be read leaves the names unknown, not the page broken.
      people: team.ok ? team.value.filter((p) => p.acceptedAt).map((p) => ({ id: p.professionalId, name: p.name })) : [],
      pending: s.status === "pending" || h.status === "pending",
    },
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
  const nameOf = (id: string) => d?.people.find((p) => p.id === id)?.name ?? t("Team member");

  const removeHours = async (h: StaffHours) => {
    const r = await removeStaffHours(h.id);
    if (!r.ok) showToast(t("Couldn't remove the hours. Try again."), false);
    else {
      showToast(t("Hours removed."), false);
      void live.refresh();
    }
  };

  return (
    <div>
      <OpsHeader back kicker={t("More")} title={t("Services and free slots")} sub={t("What clients can book, and when")} />
      {s.status === "error" ? (
        <ErrorCard text={t("Couldn't load your services.")} onRetry={live.reload} />
      ) : s.status === "loading" || !d ? (
        <ListSkeleton />
      ) : d.pending ? (
        <EmptyCard icon={CalendarClock} title={t("Coming soon")} body={t("Setting up services and free slots for bookings is on its way.")} />
      ) : (
        <>
          <KitLabel label={t("Services")} action={t("Add")} onAction={() => setSvc({ open: true, s: null })} />
          {d.services.length === 0 ? (
            <EmptyCard icon={Sparkles} title={t("No services yet")} body={t("Add what clients can book, with how long it takes and its price.")} />
          ) : (
            <ListCard label={t("Services")}>
              {d.services.map((x) => (
                <KitRow
                  key={x.id}
                  icon={Sparkles}
                  title={x.name}
                  sub={`${t("{n} min", { n: x.durationMin })} · ${money(x.price)}`}
                  chip={x.active ? null : { label: t("Hidden"), tone: "soft" }}
                  onClick={() => setSvc({ open: true, s: x })}
                />
              ))}
            </ListCard>
          )}
          <KitLabel label={t("Free slots")} action={t("Add")} onAction={() => setHoursOpen(true)} />
          {d.hours.length === 0 ? (
            <EmptyCard icon={Clock} title={t("No free slots yet")} body={t("Add the hours each person takes bookings. Weeks start on Monday.")} />
          ) : (
            <ListCard label={t("Free slots")}>
              {d.hours.map((h) => (
                <KitRow
                  key={h.id}
                  icon={Clock}
                  title={DAY_LONG[h.weekday - 1] ? t(DAY_LONG[h.weekday - 1]) : ""}
                  sub={`${nameOf(h.staffId)} · ${t("{from} to {to}", { from: formatMinutes12(toMin(h.starts)), to: formatMinutes12(toMin(h.ends)) })}`}
                  trailing={
                    <button
                      type="button"
                      aria-label={t("Remove {name}'s {day} hours", { name: nameOf(h.staffId), day: t(DAY_LONG[h.weekday - 1] ?? "") })}
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
          people={d?.people ?? []}
          onClose={() => setHoursOpen(false)}
          onSaved={() => {
            setHoursOpen(false);
            showToast(t("Hours added."), false);
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
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setDuration(service?.durationMin ?? 60);
    setPrice(service ? String(service.price) : "");
    setActive(service?.active ?? true);
    setError(null);
  }, [open, service]);
  const p = parsePrice(price);
  const valid = name.trim().length > 0 && p.ok && p.value !== null;
  // A saved duration outside the list (the table takes any 5-minute step) stays choosable.
  const durations = DURATIONS.includes(duration as (typeof DURATIONS)[number]) ? [...DURATIONS] : [...DURATIONS, duration].sort((a, b) => a - b);
  const save = async (nextActive = active) => {
    if (!valid || !p.ok || p.value === null) return;
    setBusy(true);
    setError(null);
    const r = await saveService(businessId, { id: service?.id, name, description, durationMin: duration, price: p.value, active: nextActive });
    setBusy(false);
    if (!r.ok) setError(r.pending ? t("Setting up services is coming soon.") : t("Couldn't save the service. Try again."));
    else onSaved(service ? t("Changes saved.") : t("{name} added.", { name: name.trim() }));
  };
  return (
    <>
      <OpsSheet open={open} onClose={onClose} title={service ? t("Edit service") : t("New service")} button={t("Save")} onButton={() => void save()} disabled={!valid} busy={busy} error={error}>
        <KitField id="svc-name" label={t("Name")} value={name} onChange={setName} placeholder={t("e.g. Sports massage")} icon={Pencil} maxLength={60} />
        <KitField id="svc-desc" label={t("Description")} value={description} onChange={setDescription} placeholder={t("Optional")} icon={Pencil} maxLength={500} multiline />
        <KitFieldButton id="svc-duration" label={t("Duration")} value={t("{n} min", { n: duration })} placeholder="" icon={ChevronDown} onClick={(el) => setMenu(el)} expanded={!!menu} />
        <KitField
          id="svc-price"
          label={t("Price")}
          value={price}
          onChange={setPrice}
          placeholder="$0.00"
          icon={Pencil}
          inputMode="decimal"
          error={price.trim() && !p.ok ? t("Enter the price as a number, for example 25 or $25.") : null}
          note={t("Paid in cash at the visit.")}
        />
        {service && (
          <button type="button" onClick={() => void save(!active)} disabled={!valid || busy} className="tap w-full text-[14px] font-bold text-charcoal-soft disabled:opacity-40" style={{ minHeight: 44 }}>
            {active ? t("Hide from booking") : t("Show for booking")}
          </button>
        )}
      </OpsSheet>
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu}
        matchWidth={menu}
        variant="field"
        options={durations.map((m) => ({ value: String(m), label: t("{n} min", { n: m }) }))}
        selected={String(duration)}
        onSelect={(v) => setDuration(Number(v))}
      />
    </>
  );
}

function HoursSheet({ open, businessId, people, onClose, onSaved }: { open: boolean; businessId: string; people: Person[]; onClose: () => void; onSaved: () => void }) {
  const [staffId, setStaffId] = useState<string | null>(null);
  /** 1 = Monday … 7 = Sunday (instructor_availability). */
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState(9 * 60);
  const [end, setEnd] = useState(17 * 60);
  const [menu, setMenu] = useState<null | { k: "person" | "day" | "start" | "end"; el: HTMLElement }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setStaffId((cur) => (cur && people.some((p) => p.id === cur) ? cur : people.length === 1 ? people[0].id : null));
  }, [open, people]);
  const valid = end > start && !!staffId;
  const save = async () => {
    if (!staffId) return;
    setBusy(true);
    setError(null);
    const r = await addStaffHours(businessId, staffId, weekday, hhmm(start), hhmm(end));
    setBusy(false);
    if (!r.ok) setError(r.pending ? t("Setting up hours is coming soon.") : t("Couldn't save the hours. Try again."));
    else onSaved();
  };
  const timeOpts = HALF_HOURS.map((m) => ({ value: String(m), label: formatMinutes12(m) }));
  const options =
    menu?.k === "person"
      ? people.map((p) => ({ value: p.id, label: p.name }))
      : menu?.k === "day"
        ? DAY_LONG.map((d, i) => ({ value: String(i + 1), label: t(d) }))
        : timeOpts;
  const selected = menu?.k === "person" ? staffId : menu?.k === "day" ? String(weekday) : menu?.k === "start" ? String(start) : String(end);
  return (
    <>
      <OpsSheet open={open} onClose={onClose} title={t("Add free slots")} button={t("Save")} onButton={() => void save()} disabled={!valid} busy={busy} error={error}>
        <KitFieldButton
          id="hours-person"
          label={t("Person")}
          value={people.find((p) => p.id === staffId)?.name ?? null}
          placeholder={t("Choose a person")}
          icon={ChevronDown}
          onClick={people.length > 0 ? (el) => setMenu({ k: "person", el }) : undefined}
          note={people.length === 0 ? t("Add people to your team first. Clients book them by their hours.") : undefined}
        />
        <KitFieldButton id="hours-day" label={t("Day")} value={t(DAY_LONG[weekday - 1])} placeholder="" icon={ChevronDown} onClick={(el) => setMenu({ k: "day", el })} />
        <KitFieldButton id="hours-start" label={t("From")} value={formatMinutes12(start)} placeholder="" icon={Clock} onClick={(el) => setMenu({ k: "start", el })} />
        <KitFieldButton
          id="hours-end"
          label={t("To")}
          value={formatMinutes12(end)}
          placeholder=""
          icon={Clock}
          onClick={(el) => setMenu({ k: "end", el })}
          error={end > start ? null : t("End after the start time.")}
        />
      </OpsSheet>
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        matchWidth={menu?.el ?? null}
        variant="field"
        options={options}
        selected={selected}
        onSelect={(v) => {
          if (menu?.k === "person") setStaffId(v);
          else if (menu?.k === "day") setWeekday(Number(v));
          else if (menu?.k === "start") setStart(Number(v));
          else setEnd(Number(v));
        }}
      />
    </>
  );
}
