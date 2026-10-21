import { BusinessClosedNote } from "../../components/marketplace/BusinessClosedNote";
import { useBusinessStatus } from "../../hooks/useBusinessStatus";
import { takesNewActivity } from "../../services/business-closure/logic";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { Banknote, CalendarClock, CalendarPlus, Sparkles, User, Wallet } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { useApp } from "../../context/AppContext";
import { fetchServices, fetchSlots, refreshesTimes, slotTimes, staffChoices, type Service, type Slot } from "../../services/appointments";
import { fetchStoreInfo } from "../../services/store/customer";
import { dayTitle, isoDate, money, shortDate } from "../../services/store/format";
import { clock12, rangeClock12 } from "../../utils/time12";
import { DAY_SHORT, mondayIndex } from "../../utils/week";
import { useOnline } from "../../hooks/useOnline";
import { useLive } from "../business-ops/store/storeShared";
import { ClassTermsSheet } from "../marketplace/ClassTermsSheet";
import { ClientCard, ClientEmpty, ClientRow, InfoNote, RadioRow, RetryLine, Section, SkeletonCards, SoonChip } from "../store/clientKit";
import { useAppointmentBooking, type ApptBookOutcome } from "./useAppointmentBooking";

// OURS-customer-appointment-booking (Designed by us): service → day and time
// (Monday-first strip, 12-hour slots) → who (when more than one person is
// free then) → confirm → My appointments. Cash at the visit; Whish "Soon".
// Entry: the store's page on Explore ("Book an appointment").
//
// B12: free times are appointment_slots(service, day): a start every 15
// minutes per staff member; the grid shows each time once. A person's first
// name shows only when they are listed publicly, otherwise "Any available".
// book_appointment(service, staff, start, 'cash'); ATXE4 = the business's
// terms first (ClassTermsSheet, the class flow), then book.

const DAYS = 14;

export default function BookAppointmentPage() {
  const { businessId = "" } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const { user, authUserId } = useApp();
  const live = useLive(
    async () => {
      const [st, sv] = await Promise.all([fetchStoreInfo(businessId), fetchServices(businessId, true)]);
      if (st.status !== "ok") return st;
      if (sv.status === "error") return sv;
      return { status: "ok" as const, value: { store: st.value, services: sv.status === "ok" ? sv.value : [], pending: sv.status === "pending" } };
    },
    0,
    businessId
  );
  const booking = useAppointmentBooking(businessId, authUserId ?? null);
  // CP: a closed or paused business takes no new bookings.
  const bizStatus = useBusinessStatus(businessId);
  const takesNew = takesNewActivity(bizStatus);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState(isoDate(new Date()));
  const [slots, setSlots] = useState<Slot[] | null | "error">(null);
  const [time, setTime] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;

  const [days] = useState(() => {
    const now = new Date();
    return Array.from({ length: DAYS }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
  });

  useEffect(() => {
    if (!service) return;
    let alive = true;
    setSlots(null);
    setTime(null);
    setStaffId(null);
    void fetchSlots(service.id, date).then((r) => {
      if (!alive) return;
      setSlots(r.status === "ok" ? r.value.filter((x) => new Date(x.startsAt).getTime() > Date.now()) : r.status === "pending" ? [] : "error");
    });
    return () => {
      alive = false;
    };
  }, [service, date, tick]);

  const times = useMemo(() => (Array.isArray(slots) ? slotTimes(slots) : []), [slots]);
  const am = useMemo(() => times.filter((x) => new Date(x.startsAt).getHours() < 12), [times]);
  const pm = useMemo(() => times.filter((x) => new Date(x.startsAt).getHours() >= 12), [times]);
  const choices = useMemo(() => (Array.isArray(slots) && time ? staffChoices(slots, time) : []), [slots, time]);
  const picked = Array.isArray(slots) && time ? slots.find((x) => x.startsAt === time && x.staffId === staffId) ?? null : null;

  if (s.status === "loading") {
    return (
      <div>
        <PageHeader title="Book an appointment" showBack sub />
        <SkeletonCards label="Loading services" />
      </div>
    );
  }
  if (s.status !== "ok" || !d?.store) {
    return (
      <div>
        <PageHeader title="Book an appointment" showBack sub />
        {s.status === "error" ? (
          <RetryLine text="Couldn't load this place's services." onRetry={live.reload} />
        ) : !takesNew ? (
          <BusinessClosedNote status={bizStatus} />
        ) : (
          <ClientEmpty icon={CalendarPlus} title="Not found" line="This place may not be on Explore right now." />
        )}
      </div>
    );
  }

  const after = (r: ApptBookOutcome) => {
    if (r.kind === "booked") navigate(`/app/appointments/${r.id}?booked=1`, { replace: true });
    else if (r.kind === "error" && r.message) {
      setError(r.message);
      if (refreshesTimes(r.code)) setTick((t) => t + 1);
    }
  };
  const book = async () => {
    if (!service || !picked) return;
    setError(null);
    after(await booking.start(service.id, picked.staffId, picked.startsAt));
  };
  const agree = async () => {
    if (!service || !picked) return;
    setError(null);
    after(await booking.agree(service.id, picked.staffId, picked.startsAt));
  };

  const pickTime = (startsAt: string) => {
    setTime(startsAt);
    setError(null);
    const c = Array.isArray(slots) ? staffChoices(slots, startsAt) : [];
    // One person free then: theirs. Several: the client chooses.
    setStaffId(c.length === 1 ? c[0].staffId : null);
  };

  const slotChip = (x: Slot) => {
    const on = time === x.startsAt;
    return (
      <button
        key={x.startsAt}
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => pickTime(x.startsAt)}
        className={clsx("tap rounded-[12px] text-[14px] font-semibold tabular-nums", on ? "bg-primary-fill text-on-primary-fill" : "bg-cream-card border border-charcoal/[0.08] text-charcoal")}
        style={{ height: 44, padding: "0 10px" }}
      >
        {clock12(x.startsAt)}
      </button>
    );
  };

  const who = choices.find((c) => c.staffId === staffId)?.label ?? null;

  return (
    <div>
      <PageHeader title="Book an appointment" subtitle={d.store.name} showBack sub />
      <BusinessClosedNote status={bizStatus} className="mb-3" />

      {d.pending || d.services.length === 0 ? (
        <>
          <ClientEmpty icon={CalendarClock} title="No services to book yet" line="When this place adds its services and free times, you can book them here." />
          {d.pending && <InfoNote>Booking appointments is coming soon.</InfoNote>}
        </>
      ) : (
        <>
          <Section label="Service" first>
            <ClientCard>
              <div role="radiogroup" aria-label="Service">
                {d.services.map((x) => (
                  <RadioRow
                    key={x.id}
                    icon={Sparkles}
                    selected={service?.id === x.id}
                    onSelect={() => setService(x)}
                    title={x.name}
                    sub={`${x.durationMin} min · ${money(x.price)}`}
                  />
                ))}
              </div>
            </ClientCard>
          </Section>

          {service && (
            <Section label="Day">
              <div role="radiogroup" aria-label="Day" className="flex overflow-x-auto [scrollbar-width:none]" style={{ gap: 8 }}>
                {days.map((x) => {
                  const v = isoDate(x);
                  const on = v === date;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={dayTitle(x)}
                      onClick={() => setDate(v)}
                      className={clsx("tap shrink-0 flex flex-col items-center justify-center rounded-[14px]", on ? "bg-primary-fill text-on-primary-fill" : "bg-primary-pale text-primary-dark")}
                      style={{ width: 48, height: 60 }}
                    >
                      <span className="text-[10.5px] font-bold uppercase">{DAY_SHORT[mondayIndex(x.getDay())]}</span>
                      <span className="text-[16px] font-extrabold">{x.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {service && (
            <Section label={`Free times · ${dayTitle(new Date(date + "T00:00:00"))}`}>
              {slots === null ? (
                <SkeletonCards heights={[44, 44]} label="Loading free times" />
              ) : slots === "error" ? (
                <RetryLine text="Couldn't load the free times." onRetry={() => setTick((t) => t + 1)} />
              ) : times.length === 0 ? (
                <p className="text-[13px] font-medium text-charcoal-faint">No free times this day. Try another day.</p>
              ) : (
                <div role="radiogroup" aria-label="Time">
                  {[{ k: "Morning", l: am }, { k: "Afternoon and evening", l: pm }]
                    .filter((g) => g.l.length > 0)
                    .map((g) => (
                      <div key={g.k} style={{ marginBottom: 10 }}>
                        <p className="text-[12px] font-semibold text-charcoal-faint" style={{ marginBottom: 6 }}>
                          {g.k}
                        </p>
                        <div className="grid grid-cols-3" style={{ gap: 8 }}>
                          {g.l.map(slotChip)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Section>
          )}

          {service && time && choices.length > 1 && (
            <Section label="With">
              <ClientCard>
                <div role="radiogroup" aria-label="With">
                  {choices.map((c) => (
                    <RadioRow key={c.staffId} icon={User} selected={staffId === c.staffId} onSelect={() => setStaffId(c.staffId)} title={c.label} />
                  ))}
                </div>
              </ClientCard>
            </Section>
          )}

          {service && picked && (
            <Section label="Confirm">
              <ClientCard label="Your booking">
                <ClientRow icon={Sparkles} title={service.name} sub={`${shortDate(new Date(picked.startsAt))}, ${rangeClock12(picked.startsAt, picked.endsAt)}`} value={money(service.price)} />
                {who && <ClientRow icon={User} title={who} sub="With" />}
                <ClientRow icon={Banknote} title="Cash" sub="Pay at the visit" />
                <ClientRow icon={Wallet} title="Whish" sub="Pay in the app" trailing={<SoonChip />} />
              </ClientCard>
              <p className="text-[12px] font-medium text-charcoal-faint" style={{ marginTop: 8, padding: "0 4px" }}>
                It goes in your calendar. You can cancel from My appointments.
              </p>
            </Section>
          )}

          {error && (
            <p role="alert" className="text-[12px] font-semibold text-status-high" style={{ marginTop: 10 }}>
              {error}
            </p>
          )}
          {user.accountType === "customer" && takesNew && (
            <>
              <div aria-hidden style={{ height: 60 }} />
              <PinnedCta primary={{ label: picked ? `Book ${clock12(picked.startsAt)}` : "Book", onClick: () => void book(), disabled: !service || !picked || !online, loading: booking.busy && !booking.terms }} />
            </>
          )}
          <ClassTermsSheet docs={booking.terms} businessName={d.store.name} busy={booking.busy} online={online} error={booking.termsError} onAgree={() => void agree()} onClose={booking.closeTerms} />
        </>
      )}
    </div>
  );
}
