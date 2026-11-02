import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Mail, MapPin, Phone, TrendingDown, TrendingUp } from "lucide-react";
import { Toast } from "../../../components/ui/Toast";
import { SectionHead, ListCard, type ListRow } from "../../../components/pro/client/kit";
import { ListSkeleton, OfflineLine, ProError } from "../../../components/pro/states";
import { INK } from "../../../components/pro/proInk";
import { ConsoleLinks, EyebrowHead, InvitationCard, DeclinePopup, LeavePopup } from "../../../components/pro/businesses/BusinessParts";
import { useBusinesses } from "../../../components/pro/businesses/useBusinesses";
import { useBack } from "../../../hooks/useBack";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { invalidateConsoleAccess } from "../../../services/business-console";
import { acceptEmployment, removeMyEmployment } from "../../../services/business-team/employment";
import type { AcceptRefusalKind } from "../../../services/business-team/inviteRefusals";
import { invitationState } from "../../../components/pro/businesses/invitationLogic";
import { textPx } from "../../../theme/textSize";
import { todayLocal } from "../../../utils/date";
import { range12, time12 } from "../../../utils/time12";
import { appLocale } from "../../../i18n/format";
import { t, tx } from "../../../i18n/core";

/**
 * Release 3 · a business's page (/app/more/businesses/:id; MO13, gen/r13.js
 * bizDetail13): head19 with the "Business" eyebrow, the cover (110, r18), the
 * numbers, "Your schedule here", "Contact", and "Leave {business}" in red.
 *
 * Built from real data only:
 * - Classes this month: the classes the business assigned me this month
 *   (business_classes.professional_id), with the change from last month;
 * - Your schedule here: my next classes there (a tap opens that day in Calendar);
 * - Contact: the business's public email, phone and location;
 * - the console areas this team's owner turned on (kept from the old Your businesses page).
 * NOT DRAWN (no source): "Clients from here" (no booking-through-a-business
 * link) and "Earnings this month" (Centium moves no money); the owner's name
 * (their profile isn't readable by staff). A pending invitation shows its
 * Accept / Decline card instead.
 */
export default function BusinessDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const back = useBack("/app/more/businesses");
  const access = useConsoleAccess();
  const { data, failed, offline, reload } = useBusinesses();
  const [leaving, setLeaving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** Batch 2 CO: an accept the server refused as withdrawn or expired, kept until the list is read again. */
  const [refused, setRefused] = useState<AcceptRefusalKind | null>(null);

  const e = data?.employments.find((x) => x.businessId === id) ?? null;
  const ownSeat = access.seats.find((s) => s.businessId === id && s.isOwner) ?? null;
  const name = e?.businessName ?? ownSeat?.businessName ?? data?.facts[id]?.name ?? "";
  if (data && !e && !ownSeat && access.ready) return <Navigate to="/app/more/businesses" replace />;

  const facts = data?.facts[id];
  const today = todayLocal();
  const month = today.slice(0, 7);
  const now = new Date();
  const lastMonth = `${new Date(now.getFullYear(), now.getMonth() - 1, 1).getFullYear()}-${String(new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth() + 1).padStart(2, "0")}`;
  const mine = (data?.classes ?? []).filter((c) => c.businessId === id);
  const thisMonth = mine.filter((c) => c.date.startsWith(month)).length;
  const delta = thisMonth - mine.filter((c) => c.date.startsWith(lastMonth)).length;
  const next = mine.filter((c) => c.date >= today).slice(0, 5);

  const schedule: ListRow[] = next.map((c) => ({
    key: c.id,
    icon: CalendarDays,
    title: c.title,
    meta: `${new Date(`${c.date}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "short", day: "numeric", month: "short" })} · ${c.endTime ? range12(c.startTime, c.endTime) : time12(c.startTime)}`,
    onClick: () => navigate(`/app/pro/calendar?day=${c.date}`),
  }));
  const contact: ListRow[] = [
    ...(facts?.email ? [{ key: "email", icon: Mail, title: facts.email, meta: t("Email"), onClick: () => window.open(`mailto:${facts.email}`, "_self") }] : []),
    ...(facts?.phone ? [{ key: "phone", icon: Phone, title: facts.phone, meta: t("Phone"), onClick: () => window.open(`tel:${facts.phone}`, "_self") }] : []),
    ...(facts?.location ? [{ key: "address", icon: MapPin, title: facts.location, meta: t("Address") }] : []),
  ];

  const leave = async () => {
    setBusy(true);
    const r = await removeMyEmployment(id);
    setBusy(false);
    setLeaving(false);
    setDeclining(false);
    if (!r.ok) return setToast(r.message);
    invalidateConsoleAccess();
    navigate("/app/more/businesses", { replace: true });
  };
  /** An expired or withdrawn invitation: nothing to decline, so no confirm; the same own-row delete. */
  const removeDead = async () => {
    setBusy(true);
    const r = await removeMyEmployment(id);
    setBusy(false);
    if (!r.ok) return setToast(r.message);
    navigate("/app/more/businesses", { replace: true });
  };
  const accept = async () => {
    setBusy(true);
    const r = await acceptEmployment(id);
    setBusy(false);
    if (!r.ok) {
      setToast(r.message);
      // Batch 2 CO: as on the Businesses page, stop offering Accept and read again.
      const kind = r.refused;
      if (kind === "withdrawn" || kind === "expired") setRefused(kind);
      if (kind !== undefined) reload();
      return;
    }
    setToast(t("You joined {business}.", { business: name }));
    invalidateConsoleAccess();
    reload();
  };

  return (
    <div data-pro-business="">
      <EyebrowHead eyebrow={t("Business")} title={name || " "} onBack={back} />
      {offline && <OfflineLine />}
      {failed ? (
        <ProError onRetry={reload} />
      ) : !data ? (
        <ListSkeleton rows={3} />
      ) : e && !e.acceptedAt ? (
        <InvitationCard
          e={e}
          busy={busy}
          state={invitationState(e.invite, refused)}
          onAccept={() => void accept()}
          onDecline={() => setDeclining(true)}
          onRemove={() => void removeDead()}
        />
      ) : (
        <>
          {/* bizDetail13 cover: 110, r18, 1px 10% border, the soft stripes (or the cover photo); 12 below. */}
          <div
            aria-hidden
            className="overflow-hidden"
            style={{ height: 110, borderRadius: 18, border: `1px solid ${INK.b10}`, marginBottom: 12, background: `repeating-linear-gradient(45deg, ${INK.soft} 0 8px, ${INK.card} 8px 16px)` }}
          >
            {facts?.coverUrl && /^https?:/.test(facts.coverUrl) && <img src={facts.coverUrl} alt="" className="w-full h-full object-cover" />}
          </div>

          {/* boxes11 / box10: r18 card, pad 12 12 11; label 10.5 / 600 text.faint; value 22 / 800; delta 11 / 700 with the trend arrow; the sub 10 text.tertiary. */}
          <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
            <div className="min-w-0" style={{ flex: "0 0 calc(50% - 4px)", background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "12px 12px 11px" }}>
              <p className="truncate" style={{ fontSize: textPx(10.5), fontWeight: 600, color: INK.chF }}>
                {t("Classes this month")}
              </p>
              <p className="flex items-baseline" style={{ gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: textPx(22), fontWeight: 800, letterSpacing: "-0.02em", color: INK.ch, lineHeight: 1 }}>{thisMonth}</span>
                {delta !== 0 && (
                  <span className="inline-flex items-center" style={{ gap: 2, fontSize: textPx(11), fontWeight: 700, color: delta > 0 ? INK.good : INK.hi }}>
                    {delta > 0 ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
                    <bdi>{delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}</bdi>
                  </span>
                )}
              </p>
              <p className="truncate" style={{ fontSize: textPx(10), color: INK.chT, marginTop: 4 }}>{t("At {name}", { name })}</p>
            </div>
          </div>

          <SectionHead label={t("Your schedule here")} />
          {schedule.length > 0 ? (
            <ListCard rows={schedule} />
          ) : (
            <p style={{ fontSize: textPx(12.5), color: INK.chF, margin: "0 0 12px" }}>{t("No classes scheduled for you here.")}</p>
          )}

          <SectionHead label={t("Business console")} />
          <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "4px 14px", marginBottom: 12 }}>
            <ConsoleLinks businessId={id} businessName={name} bare />
          </div>

          {contact.length > 0 && (
            <>
              <SectionHead label={tx("Contact", "section")} />
              <ListCard rows={contact} />
            </>
          )}

          {e?.acceptedAt && (
            <button type="button" onClick={() => setLeaving(true)} className="tap w-full flex items-center justify-center" style={{ minHeight: 48, fontSize: textPx(15), fontWeight: 700, color: INK.hi, marginTop: 4 }}>
              {t("Leave {business}", { business: name })}
            </button>
          )}
        </>
      )}
      <LeavePopup name={leaving ? name : null} busy={busy} onClose={() => setLeaving(false)} onLeave={() => void leave()} />
      <DeclinePopup name={declining ? name : null} busy={busy} onClose={() => setDeclining(false)} onDecline={() => void leave()} />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
