import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Banknote, CalendarCheck, Clock, FileWarning, Sparkles, Store } from "lucide-react";
import { acceptClassPolicies, pendingClassPolicies, type PendingClassPolicy } from "../../services/marketplace";
import { APPOINTMENT_POLICY_KINDS } from "../../services/marketplace/classBooking";
import { ClassTermsSheet } from "../marketplace/ClassTermsSheet";
import { PageHeader } from "../../components/ui/PageHeader";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { PopupButtons } from "../../components/cycle/cycleUi";
import { Toast } from "../../components/ui/Toast";
import { useApp } from "../../context/AppContext";
import { apptWords, cancelAppointment, fetchMyAppointment, fetchMyAppointments, isUpcoming, payWords } from "../../services/appointments";
import { dayTitle, money, shortDate } from "../../services/store/format";
import { clock12, rangeClock12 } from "../../utils/time12";
import { useOnline } from "../../hooks/useOnline";
import { useLive } from "../business-ops/store/storeShared";
import { ClientCard, ClientEmpty, ClientRow, InfoNote, RetryLine, Section, SkeletonCards } from "../store/clientKit";
import { t } from "../../i18n/core";

/** services/appointments apptWords, its label in the app's language. */
const shownWords = (w: ReturnType<typeof apptWords>) => ({ ...w, label: t(w.label) });

// OURS-customer-appointments (Designed by us): My appointments (Upcoming ·
// Past) and one appointment with Cancel. Entry: Profile › My appointments;
// after booking. B12: my_appointments(include_past) (can_cancel is the
// server's), cancel_appointment(id, reason) → paid_to_refund. The money is
// cash between the client and the place: nothing here says Centium holds it.

export default function MyAppointmentsPage() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const live = useLive(authUserId ? () => fetchMyAppointments(true) : null, 120000, authUserId ?? "");
  const s = live.state;
  const list =
    s.status === "ok"
      ? s.value.filter((a) => (tab === "upcoming" ? isUpcoming(a) : !isUpcoming(a))).sort((x, y) => (tab === "upcoming" ? x.startsAt.localeCompare(y.startsAt) : y.startsAt.localeCompare(x.startsAt)))
      : [];

  return (
    <div>
      <PageHeader title={t("My appointments")} showBack sub />
      <SegmentedTabs
        items={[
          { key: "upcoming", label: t("Upcoming") },
          { key: "past", label: t("Past") },
        ]}
        activeKey={tab}
        onChange={(v) => setTab(v as "upcoming" | "past")}
        darkTone="partB"
      />
      <div style={{ marginTop: 16 }}>
        {s.status === "loading" ? (
          <SkeletonCards label={t("Loading your appointments")} />
        ) : s.status === "error" ? (
          <RetryLine text={t("Couldn't load your appointments.")} onRetry={live.reload} />
        ) : list.length === 0 ? (
          <>
            <ClientEmpty
              icon={CalendarCheck}
              title={tab === "upcoming" ? t("No appointments coming up") : t("No past appointments")}
              line={tab === "upcoming" ? t("Book with wellness services on Explore and they show here.") : t("Appointments you've had or cancelled show here.")}
            />
            {s.status === "pending" && <InfoNote>{t("Booking appointments is coming soon.")}</InfoNote>}
          </>
        ) : (
          <ClientCard label={tab === "upcoming" ? t("Upcoming") : t("Past")}>
            {list.map((a) => (
              <ClientRow
                key={a.id}
                icon={Clock}
                title={a.serviceName}
                sub={`${a.businessName ? `${a.businessName} · ` : ""}${dayTitle(new Date(a.startsAt))}, ${clock12(a.startsAt)}`}
                pill={shownWords(apptWords(a))}
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
  const live = useLive(() => fetchMyAppointment(appointmentId), 0, appointmentId);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(params.get("booked") ? t("Booked. It's in your calendar.") : null);
  const s = live.state;
  const a = s.status === "ok" ? s.value : null;
  const { authUserId } = useApp();

  // B12 follow-up: a booking the place made for the client isn't blocked by
  // its terms, so an upcoming appointment asks for them here
  // (pending_policies, the appointment kinds; ClassTermsSheet in "booked" words).
  const termsFor = a && a.canCancel ? a.businessId : null;
  const [pending, setPending] = useState<{ key: string; docs: PendingClassPolicy[] } | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsBusy, setTermsBusy] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  useEffect(() => {
    if (!termsFor) return;
    let alive = true;
    void pendingClassPolicies(termsFor, APPOINTMENT_POLICY_KINDS).then((r) => {
      if (alive) setPending({ key: termsFor, docs: r.ok ? r.value : [] });
    });
    return () => {
      alive = false;
    };
  }, [termsFor]);
  const docs = pending && pending.key === termsFor ? pending.docs : [];
  const agree = async () => {
    if (!authUserId || docs.length === 0) return;
    setTermsBusy(true);
    setTermsError(null);
    const r = await acceptClassPolicies(
      authUserId,
      docs.map((d) => d.versionId)
    );
    setTermsBusy(false);
    if (!r.ok) {
      setTermsError(r.message);
      return;
    }
    setTermsOpen(false);
    setPending(termsFor ? { key: termsFor, docs: [] } : null);
    setToast(t("Thanks. You've accepted the terms."));
  };

  if (s.status === "loading") {
    return (
      <div>
        <PageHeader title={t("Appointment")} showBack sub />
        <SkeletonCards heights={[112, 112]} label={t("Loading your appointment")} />
      </div>
    );
  }
  if (s.status !== "ok" || !a) {
    return (
      <div>
        <PageHeader title={t("Appointment")} showBack sub />
        {s.status === "error" ? <RetryLine text={t("Couldn't load this appointment.")} onRetry={live.reload} /> : <ClientEmpty icon={CalendarCheck} title={t("Appointment not found")} line={t("It may have been removed.")} />}
      </div>
    );
  }

  const place = a.businessName ?? t("The place");
  const words = shownWords(apptWords(a));
  const paidWord = payWords(a.paymentStatus);
  const paid = paidWord ? t(paidWord) : null;
  const close = () => {
    if (busy) return;
    setCancelOpen(false);
    setError(null);
  };
  const cancel = async () => {
    setBusy(true);
    setError(null);
    const r = await cancelAppointment(a.id, reason);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? t("Cancelling is coming soon.") : t("Couldn't cancel. Try again."));
      return;
    }
    setCancelOpen(false);
    setReason("");
    setToast(r.value.paidToRefund ? t("Appointment cancelled. You paid {place}: ask them for your money back.", { place }) : t("Appointment cancelled."));
    await live.refresh();
  };

  return (
    <div>
      <PageHeader title={a.serviceName} subtitle={`${shortDate(new Date(a.startsAt))}, ${rangeClock12(a.startsAt, a.endsAt)}`} showBack sub />
      <ClientCard label={t("Appointment")}>
        <ClientRow icon={Store} title={place} sub={t("Where")} />
        <ClientRow icon={Sparkles} title={t("{n} min", { n: a.durationMin })} sub={t("How long")} pill={words} />
        <ClientRow icon={Banknote} title={money(a.price)} sub={paid ?? t("Cash at the visit")} />
      </ClientCard>
      {docs.length > 0 && (
        <Section label={t("Before your visit")}>
          <InfoNote icon={FileWarning}>{t("{place} asks you to accept its terms before your appointment.", { place })}</InfoNote>
          <button type="button" onClick={() => setTermsOpen(true)} disabled={!online} className="tap w-full text-[14px] font-bold text-primary-dark disabled:opacity-40" style={{ minHeight: 44 }}>
            {t("Read and accept")}
          </button>
        </Section>
      )}
      <ClassTermsSheet
        docs={termsOpen ? docs : null}
        businessName={place}
        busy={termsBusy}
        online={online}
        error={termsError}
        booked
        onAgree={() => void agree()}
        onClose={() => {
          if (termsBusy) return;
          setTermsOpen(false);
          setTermsError(null);
        }}
      />
      {a.canCancel && (
        <Section label={t("Change of plans")}>
          <button type="button" onClick={() => setCancelOpen(true)} disabled={!online} className="tap w-full text-[14px] font-bold text-status-high disabled:opacity-40" style={{ minHeight: 44 }}>
            {t("Cancel appointment")}
          </button>
        </Section>
      )}
      <CentredPopup open={cancelOpen} onClose={close} title={t("Cancel this appointment?")} geometry="partB" align="start">
        <p className="text-[13px] leading-[20.2px] text-charcoal-soft" style={{ marginTop: -6 }}>
          {t("{place} is told. This can't be undone.", { place })}
        </p>
        <textarea
          aria-label={t("Reason for the place")}
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("Reason (optional)")}
          className="w-full bg-cream-soft border-[0.5px] border-charcoal/[0.10] rounded-[12px] text-[14px] leading-[21px] text-charcoal placeholder:text-charcoal-faint outline-none focus:border-primary-dark"
          style={{ marginTop: 12, padding: "10px 12px", resize: "none" }}
        />
        {error && (
          <p role="alert" className="text-[12px] font-semibold text-status-high" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
        <div style={{ marginTop: 16 }}>
          <PopupButtons cancel={t("Keep it")} onCancel={close} confirm={t("Cancel appointment")} onConfirm={() => void cancel()} destructive busy={busy} />
        </div>
      </CentredPopup>
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
