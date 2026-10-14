import { useState } from "react";
import { useParams } from "react-router-dom";
import { Banknote, CalendarCheck, CircleX, Clock, Tag, User } from "lucide-react";
import { apptChip, cancelAppointment, fetchAppointment, setAppointmentStatus } from "../../../services/appointments";
import { dayClock, dayTitle, money } from "../../../services/store/format";
import { rangeClock12 } from "../../../utils/time12";
import { useOnline } from "../../../hooks/useOnline";
import { CtaSpacer, EmptyCard, ErrorCard, FixedCta, KitLabel, KitPop, KitRow, ListCard, ListSkeleton, OpsHeader, TextButton, useOpsToast } from "../store/opsKit";
import { useLive } from "../store/storeShared";
import { clientLabel } from "./apptShared";

// OURS-OP1-appointments-detail rows 1-14 (OP1-005 pattern). The Message row
// (row 6) waits on business-to-client messaging (BU2-19) and is not shown.

export default function AppointmentDetailPage() {
  const { appointmentId = "" } = useParams();
  const online = useOnline();
  const live = useLive(() => fetchAppointment(appointmentId), 120000, appointmentId);
  const [toast, showToast] = useOpsToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const s = live.state;
  const a = s.status === "ok" ? s.value : null;

  if (s.status === "loading") {
    return (
      <div>
        <OpsHeader back kicker="Appointments" title="Appointment" />
        <KitLabel label="Client" />
        <ListSkeleton rows={1} />
        <KitLabel label="Details" />
        <ListSkeleton rows={3} />
      </div>
    );
  }
  if (s.status === "error") {
    return (
      <div>
        <OpsHeader back kicker="Appointments" title="Appointment" />
        <ErrorCard text="Couldn't load this appointment." onRetry={live.reload} />
      </div>
    );
  }
  if (!a) {
    return (
      <div>
        <OpsHeader back kicker="Appointments" title="Appointment" />
        <EmptyCard icon={CalendarCheck} title="Appointment not found" body="It may have been removed." />
      </div>
    );
  }

  const client = clientLabel(a);
  const booked = a.status === "booked";
  const started = new Date(a.startsAt).getTime() <= Date.now();
  const chip = apptChip(a.status);

  const mark = async (status: "completed" | "no_show") => {
    setBusy(true);
    setError(null);
    const r = await setAppointmentStatus(a.id, status);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? "Appointment updates are coming soon." : "Couldn't update the appointment. Try again.");
      return;
    }
    showToast(status === "completed" ? "Marked as done." : "Marked as no-show.", false);
    await live.refresh();
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    const r = await cancelAppointment(a.id);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? "Cancelling appointments is coming soon." : "Couldn't cancel the appointment. Try again.");
      return;
    }
    setCancelOpen(false);
    showToast(r.value.notified ? `Appointment cancelled. ${client} has been told.` : `Appointment cancelled. We couldn't message ${client}.`, false);
    await live.refresh();
  };

  return (
    <div>
      <OpsHeader back kicker="Appointments" title={a.serviceName} sub={`${dayTitle(new Date(a.startsAt))}, ${rangeClock12(a.startsAt, a.endsAt)}`} />

      <KitLabel label="Client" />
      <ListCard label="Client">
        <KitRow icon={User} title={client} sub={a.bookedAt ? `Booked ${dayClock(a.bookedAt)}` : undefined} />
      </ListCard>

      <KitLabel label="Details" />
      <ListCard label="Details">
        <KitRow icon={Clock} title="Duration" value={`${a.durationMin} min`} />
        <KitRow icon={Tag} title="Price" value={a.price !== null ? money(a.price) : "–"} />
        <KitRow icon={Banknote} title="Payment" sub={a.paymentMethod === "whish" ? "Coming soon" : undefined} value={a.paymentMethod === "whish" ? "Whish" : "Cash at the visit"} />
      </ListCard>

      <KitLabel label="Status" />
      <ListCard label="Status">
        <KitRow icon={a.status === "cancelled" ? CircleX : CalendarCheck} title={chip.label} sub={a.bookedAt ? dayClock(a.bookedAt) : undefined} chip={chip} />
      </ListCard>

      {booked && (
        <>
          {error && !cancelOpen && (
            <p role="alert" className="text-[11.5px] font-bold text-status-high text-center" style={{ marginBottom: 6 }}>
              {error}
            </p>
          )}
          <TextButton label="Mark as no-show" onClick={() => void mark("no_show")} disabled={!online || busy || !started} />
          <TextButton tone="high" label="Cancel appointment" onClick={() => setCancelOpen(true)} disabled={!online || busy} />
        </>
      )}

      {booked && started && (
        <>
          <CtaSpacer />
          <FixedCta label="Mark as done" onClick={() => void mark("completed")} busy={busy && !cancelOpen} disabled={!online} />
        </>
      )}

      <KitPop
        open={cancelOpen}
        icon={CircleX}
        title="Cancel this appointment?"
        body={`${client} is told by message. This can't be undone.`}
        action="Cancel appointment"
        keep="Keep it"
        busy={busy}
        error={cancelOpen ? error : null}
        onAction={cancel}
        onKeep={() => {
          setCancelOpen(false);
          setError(null);
        }}
      />
      {toast}
    </div>
  );
}
