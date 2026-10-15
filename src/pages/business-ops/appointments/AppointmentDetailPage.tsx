import { useState } from "react";
import { useParams } from "react-router-dom";
import { Banknote, CalendarCheck, CircleX, Clock, FileWarning, MessageCircle, Tag, User } from "lucide-react";
import { apptChip, cancelAppointment, fetchDiaryDetail, markAppointment, markAppointmentPaid, payWords } from "../../../services/appointments";
import { offerPromotionUsed } from "../../../components/promotions/promotionUsed";

import { dayClock, dayTitle, money } from "../../../services/store/format";
import { rangeClock12 } from "../../../utils/time12";
import { useOnline } from "../../../hooks/useOnline";
import { CtaSpacer, EmptyCard, ErrorCard, FixedCta, KitLabel, KitPop, KitRow, ListCard, ListSkeleton, OpsHeader, TextButton, useOpsToast } from "../store/opsKit";
import { useLive, useMessagePerson } from "../store/storeShared";

// OURS-OP1-appointments-detail rows 1-14 (OP1-005 pattern). Row 6: "Message
// {client}" opens the business's thread with them (B7 start_member_thread,
// gate messages; own clients only, which an appointment makes them).
//
// B12: the appointment is the business_appointments row of its day (masked
// label); mark_appointment(completed | no_show) after the start (schedule);
// mark_appointment_paid (front_desk or schedule) records cash the business
// took — row 10's "Cash recorded as paid" is Mark as done on a priced,
// unpaid booking; "Mark as paid" records it on its own. cancel_appointment
// tells the client at once and returns paid_to_refund (the business hands
// the cash back; Centium holds no money).

/** Keyed by the id: another appointment starts with no error, toast or open pop. */
export default function AppointmentDetailPage() {
  const { appointmentId = "" } = useParams();
  return <AppointmentDetail key={appointmentId} appointmentId={appointmentId} />;
}

function AppointmentDetail({ appointmentId }: { appointmentId: string }) {
  const online = useOnline();
  const live = useLive(() => fetchDiaryDetail(appointmentId), 120000, appointmentId);
  const [toast, showToast] = useOpsToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const msg = useMessagePerson();
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

  const client = a.clientLabel;
  const booked = a.status === "booked";
  const started = new Date(a.startsAt).getTime() <= Date.now();
  const chip = apptChip(a.status);
  const unpaid = a.paymentStatus === "pending" && a.price > 0 && a.status !== "cancelled";
  const paid = payWords(a.paymentStatus);

  const mark = async (status: "completed" | "no_show") => {
    setBusy(true);
    setError(null);
    const r = await markAppointment(a.id, status);
    if (!r.ok) {
      setBusy(false);
      setError(r.pending ? "Appointment updates are coming soon." : "Couldn't update the appointment. Try again.");
      if (r.code === "ATX10") void live.refresh();
      return;
    }
    // Row 10: done with cash = recorded as paid.
    const p = status === "completed" && unpaid ? await markAppointmentPaid(a.id) : null;
    setBusy(false);
    if (status === "no_show") showToast("Marked as no-show.", false);
    else showToast(p && !p.ok ? "Marked as done. Couldn't record the payment." : "Marked as done.", false);
    if (p?.ok) offerPromotionUsed({ kind: "appointment", sourceId: a.id });
    await live.refresh();
  };

  const markPaid = async () => {
    setBusy(true);
    setError(null);
    const r = await markAppointmentPaid(a.id);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? "Recording payments is coming soon." : "Couldn't record the payment. Try again.");
      if (r.code === "ATX10") void live.refresh();
      return;
    }
    showToast("Payment recorded.", booked && started);
    offerPromotionUsed({ kind: "appointment", sourceId: a.id });
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
    showToast(r.value.paidToRefund ? `Appointment cancelled. ${client} has been told. They paid: give the money back.` : `Appointment cancelled. ${client} has been told.`, false);
    await live.refresh();
  };

  return (
    <div>
      <OpsHeader back kicker="Appointments" title={a.serviceName} sub={`${dayTitle(new Date(a.startsAt))}, ${rangeClock12(a.startsAt, a.endsAt)}`} />

      <KitLabel label="Client" />
      <ListCard label="Client">
        <KitRow icon={User} title={client} sub={a.bookedAt ? `Booked ${dayClock(a.bookedAt)}` : undefined} />
        {/* B12 follow-up: a desk booking isn't blocked by the waiver; it says when it is still owed. */}
        {a.waiverPending && <KitRow icon={FileWarning} title="Terms not accepted yet" sub={`${client} accepts them in the app before the visit.`} chip={{ label: "Waiver", tone: "warn" }} />}
        {msg.can && a.clientId && <KitRow icon={MessageCircle} title={`Message ${client}`} onClick={() => void msg.open(a.clientId!)} disabled={!online || msg.busy} />}
      </ListCard>
      {msg.error && (
        <p role="alert" className="text-[11.5px] font-bold text-status-high text-center" style={{ margin: "-6px 0 10px" }}>
          {msg.error}
        </p>
      )}

      <KitLabel label="Details" />
      <ListCard label="Details">
        <KitRow icon={Clock} title="Duration" value={`${a.durationMin} min`} />
        <KitRow icon={Tag} title="Price" value={money(a.price)} />
        <KitRow
          icon={Banknote}
          title="Payment"
          sub={a.paymentMethod === "whish" ? "Coming soon" : paid ?? undefined}
          value={a.paymentMethod === "whish" ? "Whish" : "Cash at the visit"}
        />
      </ListCard>

      <KitLabel label="Status" />
      <ListCard label="Status">
        <KitRow icon={a.status === "cancelled" ? CircleX : CalendarCheck} title={chip.label} sub={a.bookedAt ? dayClock(a.bookedAt) : undefined} chip={chip} />
      </ListCard>

      {error && !cancelOpen && (
        <p role="alert" className="text-[11.5px] font-bold text-status-high text-center" style={{ marginBottom: 6 }}>
          {error}
        </p>
      )}
      {unpaid && a.paymentMethod === "cash" && <TextButton label="Mark as paid" onClick={() => void markPaid()} disabled={!online || busy} />}
      {booked && (
        <>
          <TextButton label="Mark as no-show" onClick={() => void mark("no_show")} disabled={!online || busy || !started} />
          <TextButton tone="high" label="Cancel appointment" onClick={() => setCancelOpen(true)} disabled={!online || busy || started} />
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
