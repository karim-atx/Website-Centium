import { useState } from "react";
import { useParams } from "react-router-dom";
import { Banknote, CalendarCheck, CircleX, Clock, FileWarning, MessageCircle, Tag, User } from "lucide-react";
import { apptChip, cancelAppointment, fetchDiaryDetail, markAppointment, markAppointmentPaid, payWords } from "../../../services/appointments";
import { offerPromotionUsed } from "../../../components/promotions/promotionUsed";

import { dayClock, dayTitle, money } from "../../../services/store/format";
import { rangeClock12 } from "../../../utils/time12";
import { useOnline } from "../../../hooks/useOnline";
import { t, tk, tx } from "../../../i18n/core";
import { CtaSpacer, EmptyCard, ErrorCard, FixedCta, KitLabel, KitPop, KitRow, ListCard, ListSkeleton, OpsHeader, TextButton, useOpsToast } from "../store/opsKit";
import { useLive, useMessagePerson } from "../store/storeShared";

// services/appointments' status and payment words, shown through t() here.
tk("Booked");
tk("Done");
tk("Cancelled");
tk("No-show");
tk("Paid");
tk("Refunded");

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
        <OpsHeader back kicker={t("Appointments")} title={t("Appointment")} />
        <KitLabel label={t("Client")} />
        <ListSkeleton rows={1} />
        <KitLabel label={t("Details")} />
        <ListSkeleton rows={3} />
      </div>
    );
  }
  if (s.status === "error") {
    return (
      <div>
        <OpsHeader back kicker={t("Appointments")} title={t("Appointment")} />
        <ErrorCard text={t("Couldn't load this appointment.")} onRetry={live.reload} />
      </div>
    );
  }
  if (!a) {
    return (
      <div>
        <OpsHeader back kicker={t("Appointments")} title={t("Appointment")} />
        <EmptyCard icon={CalendarCheck} title={t("Appointment not found")} body={t("It may have been removed.")} />
      </div>
    );
  }

  const client = a.clientLabel;
  const booked = a.status === "booked";
  const started = new Date(a.startsAt).getTime() <= Date.now();
  const rawChip = apptChip(a.status);
  const chip = { ...rawChip, label: t(rawChip.label) };
  const unpaid = a.paymentStatus === "pending" && a.price > 0 && a.status !== "cancelled";
  const paidWord = payWords(a.paymentStatus);
  const paid = paidWord ? t(paidWord) : null;

  const mark = async (status: "completed" | "no_show") => {
    setBusy(true);
    setError(null);
    const r = await markAppointment(a.id, status);
    if (!r.ok) {
      setBusy(false);
      setError(r.pending ? t("Appointment updates are coming soon.") : t("Couldn't update the appointment. Try again."));
      if (r.code === "ATX10") void live.refresh();
      return;
    }
    // Row 10: done with cash = recorded as paid.
    const p = status === "completed" && unpaid ? await markAppointmentPaid(a.id) : null;
    setBusy(false);
    if (status === "no_show") showToast(t("Marked as no-show."), false);
    else showToast(p && !p.ok ? t("Marked as done. Couldn't record the payment.") : t("Marked as done."), false);
    if (p?.ok) offerPromotionUsed({ kind: "appointment", sourceId: a.id });
    await live.refresh();
  };

  const markPaid = async () => {
    setBusy(true);
    setError(null);
    const r = await markAppointmentPaid(a.id);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? t("Recording payments is coming soon.") : t("Couldn't record the payment. Try again."));
      if (r.code === "ATX10") void live.refresh();
      return;
    }
    showToast(t("Payment recorded."), booked && started);
    offerPromotionUsed({ kind: "appointment", sourceId: a.id });
    await live.refresh();
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    const r = await cancelAppointment(a.id);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? t("Cancelling appointments is coming soon.") : t("Couldn't cancel the appointment. Try again."));
      return;
    }
    setCancelOpen(false);
    showToast(r.value.paidToRefund ? t("Appointment cancelled. {client} has been told. They paid: give the money back.", { client }) : t("Appointment cancelled. {client} has been told.", { client }), false);
    await live.refresh();
  };

  return (
    <div>
      <OpsHeader back kicker={t("Appointments")} title={a.serviceName} sub={`${dayTitle(new Date(a.startsAt))}, ${rangeClock12(a.startsAt, a.endsAt)}`} />

      <KitLabel label={t("Client")} />
      <ListCard label={t("Client")}>
        <KitRow icon={User} title={client} sub={a.bookedAt ? t("Booked {when}", { when: dayClock(a.bookedAt) }) : undefined} />
        {/* B12 follow-up: a desk booking isn't blocked by the waiver; it says when it is still owed. */}
        {a.waiverPending && <KitRow icon={FileWarning} title={t("Terms not accepted yet")} sub={t("{client} accepts them in the app before the visit.", { client })} chip={{ label: t("Waiver"), tone: "warn" }} />}
        {msg.can && a.clientId && <KitRow icon={MessageCircle} title={t("Message {client}", { client })} onClick={() => void msg.open(a.clientId!)} disabled={!online || msg.busy} />}
      </ListCard>
      {msg.error && (
        <p role="alert" className="text-[11.5px] font-bold text-status-high text-center" style={{ margin: "-6px 0 10px" }}>
          {msg.error}
        </p>
      )}

      <KitLabel label={t("Details")} />
      <ListCard label={t("Details")}>
        <KitRow icon={Clock} title={t("Duration")} value={t("{n} min", { n: a.durationMin })} />
        <KitRow icon={Tag} title={t("Price")} value={money(a.price)} />
        <KitRow
          icon={Banknote}
          title={tx("Payment", "how it is paid")}
          sub={a.paymentMethod === "whish" ? t("Coming soon") : paid ?? undefined}
          value={a.paymentMethod === "whish" ? "Whish" : t("Cash at the visit")}
        />
      </ListCard>

      <KitLabel label={t("Status")} />
      <ListCard label={t("Status")}>
        <KitRow icon={a.status === "cancelled" ? CircleX : CalendarCheck} title={chip.label} sub={a.bookedAt ? dayClock(a.bookedAt) : undefined} chip={chip} />
      </ListCard>

      {error && !cancelOpen && (
        <p role="alert" className="text-[11.5px] font-bold text-status-high text-center" style={{ marginBottom: 6 }}>
          {error}
        </p>
      )}
      {unpaid && a.paymentMethod === "cash" && <TextButton label={t("Mark as paid")} onClick={() => void markPaid()} disabled={!online || busy} />}
      {booked && (
        <>
          <TextButton label={t("Mark as no-show")} onClick={() => void mark("no_show")} disabled={!online || busy || !started} />
          <TextButton tone="high" label={t("Cancel appointment")} onClick={() => setCancelOpen(true)} disabled={!online || busy || started} />
        </>
      )}

      {booked && started && (
        <>
          <CtaSpacer />
          <FixedCta label={t("Mark as done")} onClick={() => void mark("completed")} busy={busy && !cancelOpen} disabled={!online} />
        </>
      )}

      <KitPop
        open={cancelOpen}
        icon={CircleX}
        title={t("Cancel this appointment?")}
        body={t("{client} is told by message. This can't be undone.", { client })}
        action={t("Cancel appointment")}
        keep={tx("Keep it", "appointment")}
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
