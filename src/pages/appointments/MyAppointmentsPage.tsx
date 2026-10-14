import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Banknote, CalendarCheck, Clock, Sparkles, Store } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { Toast } from "../../components/ui/Toast";
import { useApp } from "../../context/AppContext";
import { cancelAppointment, fetchAppointment, fetchMyAppointments, type Appointment } from "../../services/appointments";
import { dayTitle, money, shortDate } from "../../services/store/format";
import { clock12, rangeClock12 } from "../../utils/time12";
import { useOnline } from "../../hooks/useOnline";
import { useLive } from "../business-ops/store/storeShared";
import { ClientCard, ClientConfirm, ClientEmpty, ClientRow, InfoNote, RetryLine, Section, SkeletonCards, type ClientTone } from "../store/clientKit";

// OURS-customer-appointments (Designed by us): My appointments (Upcoming ·
// Past) and one appointment with Cancel. Entry: Profile › My appointments;
// after booking.

export function apptWords(a: Pick<Appointment, "status" | "startsAt">): { label: string; tone: ClientTone } {
  if (a.status === "cancelled") return { label: "Cancelled", tone: "bad" };
  if (a.status === "no_show") return { label: "Missed", tone: "warn" };
  if (a.status === "completed") return { label: "Done", tone: "soft" };
  return new Date(a.startsAt).getTime() > Date.now() ? { label: "Booked", tone: "good" } : { label: "Booked", tone: "soft" };
}

const upcoming = (a: Appointment) => a.status === "booked" && new Date(a.endsAt).getTime() > Date.now();

export default function MyAppointmentsPage() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const live = useLive(authUserId ? () => fetchMyAppointments(authUserId) : null, 120000, authUserId ?? "");
  const s = live.state;
  const list =
    s.status === "ok"
      ? s.value.filter((a) => (tab === "upcoming" ? upcoming(a) : !upcoming(a))).sort((x, y) => (tab === "upcoming" ? x.startsAt.localeCompare(y.startsAt) : y.startsAt.localeCompare(x.startsAt)))
      : [];

  return (
    <div>
      <PageHeader title="My appointments" showBack sub />
      <SegmentedTabs
        items={[
          { key: "upcoming", label: "Upcoming" },
          { key: "past", label: "Past" },
        ]}
        activeKey={tab}
        onChange={(v) => setTab(v as "upcoming" | "past")}
        darkTone="partB"
      />
      <div style={{ marginTop: 16 }}>
        {s.status === "loading" ? (
          <SkeletonCards label="Loading your appointments" />
        ) : s.status === "error" ? (
          <RetryLine text="Couldn't load your appointments." onRetry={live.reload} />
        ) : list.length === 0 ? (
          <>
            <ClientEmpty
              icon={CalendarCheck}
              title={tab === "upcoming" ? "No appointments coming up" : "No past appointments"}
              line={tab === "upcoming" ? "Book with wellness services on Explore and they show here." : "Appointments you've had or cancelled show here."}
            />
            {s.status === "pending" && <InfoNote>Booking appointments is coming soon.</InfoNote>}
          </>
        ) : (
          <ClientCard label={tab === "upcoming" ? "Upcoming" : "Past"}>
            {list.map((a) => (
              <ClientRow
                key={a.id}
                icon={Clock}
                title={a.serviceName}
                sub={`${a.businessName ? `${a.businessName} · ` : ""}${dayTitle(new Date(a.startsAt))}, ${clock12(a.startsAt)}`}
                pill={apptWords(a)}
                onClick={() => navigate(`/app/appointments/${a.id}`)}
              />
            ))}
          </ClientCard>
        )}
      </div>
    </div>
  );
}

export function MyAppointmentPage() {
  const { appointmentId = "" } = useParams();
  const [params] = useSearchParams();
  const online = useOnline();
  const live = useLive(() => fetchAppointment(appointmentId), 0, appointmentId);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(params.get("booked") ? "Booked. It's in your calendar." : null);
  const s = live.state;
  const a = s.status === "ok" ? s.value : null;

  if (s.status === "loading") {
    return (
      <div>
        <PageHeader title="Appointment" showBack sub />
        <SkeletonCards heights={[112, 112]} label="Loading your appointment" />
      </div>
    );
  }
  if (s.status !== "ok" || !a) {
    return (
      <div>
        <PageHeader title="Appointment" showBack sub />
        {s.status === "error" ? <RetryLine text="Couldn't load this appointment." onRetry={live.reload} /> : <ClientEmpty icon={CalendarCheck} title="Appointment not found" line="It may have been removed." />}
      </div>
    );
  }

  const words = apptWords(a);
  const canCancel = upcoming(a);
  const cancel = async () => {
    setBusy(true);
    setError(null);
    const r = await cancelAppointment(a.id);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? "Cancelling is coming soon." : "Couldn't cancel. Try again.");
      return;
    }
    setCancelOpen(false);
    setToast("Appointment cancelled.");
    await live.refresh();
  };

  return (
    <div>
      <PageHeader title={a.serviceName} subtitle={`${shortDate(new Date(a.startsAt))}, ${rangeClock12(a.startsAt, a.endsAt)}`} showBack sub />
      <ClientCard label="Appointment">
        <ClientRow icon={Store} title={a.businessName ?? "The place"} sub="Where" />
        <ClientRow icon={Sparkles} title={`${a.durationMin} min`} sub="How long" pill={words} />
        <ClientRow icon={Banknote} title={a.price !== null ? money(a.price) : "Price at the visit"} sub={a.paymentMethod === "whish" ? "Whish" : "Cash at the visit"} />
      </ClientCard>
      {canCancel && (
        <Section label="Change of plans">
          <button type="button" onClick={() => setCancelOpen(true)} disabled={!online} className="tap w-full text-[14px] font-bold text-status-high disabled:opacity-40" style={{ minHeight: 44 }}>
            Cancel appointment
          </button>
        </Section>
      )}
      <ClientConfirm
        open={cancelOpen}
        title="Cancel this appointment?"
        body={`${a.businessName ?? "The place"} is told. This can't be undone.`}
        keep="Keep it"
        confirm="Cancel appointment"
        destructive
        busy={busy}
        error={error}
        onKeep={() => {
          setCancelOpen(false);
          setError(null);
        }}
        onConfirm={() => void cancel()}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
