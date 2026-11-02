import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Clock, X } from "lucide-react";
import { Toast } from "../../../components/ui/Toast";
import { SectionHead, ListCard, Chip, type ListRow } from "../../../components/pro/client/kit";
import { EmptyState } from "../../../components/pro/EmptyState";
import { ListSkeleton, OfflineLine, ProError } from "../../../components/pro/states";
import { INK } from "../../../components/pro/proInk";
import { BizCard, DeclinePopup, InvitationCard, JoinById, PageHead } from "../../../components/pro/businesses/BusinessParts";
import { useBusinesses } from "../../../components/pro/businesses/useBusinesses";
import { useApp } from "../../../context/AppContext";
import { useBack } from "../../../hooks/useBack";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { invalidateConsoleAccess } from "../../../services/business-console";
import { acceptEmployment, removeMyEmployment, type MyEmployment } from "../../../services/business-team/employment";
import { withdrawJoinRequest } from "../../../services/pro/businesses";
import type { AcceptRefusalKind } from "../../../services/business-team/inviteRefusals";
import { invitationState } from "../../../components/pro/businesses/invitationLogic";
import { fmtDay } from "../../../components/pro/client/clientFormat";
import { textPx } from "../../../theme/textSize";
import { todayLocal } from "../../../utils/date";
import { t, tx } from "../../../i18n/core";

/**
 * Release 3 · Businesses (/app/more/businesses; MO9 v3, decision 1: a
 * professional may work with several businesses). Replaces
 * the old Your businesses page, keeping every feature it had:
 * - Invitations (business_employees with accepted_at null, my_business_employments):
 *   Accept (accept_business_employment) and Decline (own row deleted), confirmed;
 * - Connected teams, each with the console areas its owner turned on for me
 *   (staffAreas, chooseConsoleBusiness, ConsoleGate) and a page of its own
 *   (MO13); the business I own, with its console;
 * - Leave, confirmed (MO9 v3 leave confirmation), from the business's page;
 * - Requests sent (business_join_requests): Pending with Withdraw
 *   (withdraw_join_request), Declined in red;
 * - Join by business ID (request_to_join_business). Ask to join is on Explore.
 * Layout (gen/r13.js business13, r14.js business14): pageHead, then
 * sectionHead + bizCard13 cards, listCard6 for requests, the ID field.
 */
export default function Businesses() {
  const { user } = useApp();
  const navigate = useNavigate();
  const back = useBack("/app/more");
  const access = useConsoleAccess();
  const { data, failed, offline, reload } = useBusinesses();
  const [busy, setBusy] = useState<string | null>(null);
  const [decline, setDecline] = useState<MyEmployment | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [refused, setRefused] = useState<Record<string, AcceptRefusalKind>>({});

  if (user.accountType !== "professional") return null;

  const invites = (data?.employments ?? []).filter((e) => !e.acceptedAt);
  const teams = (data?.employments ?? []).filter((e) => e.acceptedAt);
  const owned: MyEmployment[] = access.seats
    .filter((s) => s.isOwner)
    .map((s) => ({ businessId: s.businessId, businessName: s.businessName, acceptedAt: null, invitedAt: "", role: null, message: null }));
  const today = todayLocal();
  const upcomingAt = (id: string) => (data?.classes ?? []).filter((c) => c.businessId === id && c.date >= today);

  const accept = async (e: MyEmployment) => {
    setBusy(e.businessId);
    const r = await acceptEmployment(e.businessId);
    setBusy(null);
    if (!r.ok) {
      setToast(r.message);
      // Batch 2 CO: withdrawn or expired stops offering Accept at once, before the
      // reload brings my_business_employments' own answer; gone drops out on the reload.
      const kind = r.refused;
      if (kind === "withdrawn" || kind === "expired") setRefused((m) => ({ ...m, [e.businessId]: kind }));
      if (kind !== undefined) reload();
      return;
    }
    setToast(t("You joined {business}.", { business: e.businessName }));
    invalidateConsoleAccess();
    reload();
  };
  const declineInvitation = async (e: MyEmployment) => {
    setBusy(e.businessId);
    const r = await removeMyEmployment(e.businessId);
    setBusy(null);
    setDecline(null);
    if (!r.ok) return setToast(r.message);
    setToast(t("You declined {business}'s invitation.", { business: e.businessName }));
    invalidateConsoleAccess();
    reload();
  };
  /** An expired or withdrawn invitation: nothing to decline, so no confirm; the same own-row delete. */
  const removeDead = async (e: MyEmployment) => {
    setBusy(e.businessId);
    const r = await removeMyEmployment(e.businessId);
    setBusy(null);
    if (!r.ok) return setToast(r.message);
    setToast(t("Invitation removed."));
    reload();
  };
  const withdraw = async (id: string) => {
    setBusy(id);
    const r = await withdrawJoinRequest(id);
    setBusy(null);
    if (!r.ok) return setToast(r.message);
    setToast(t("Request withdrawn."));
    reload();
  };

  const requestRows: ListRow[] = (data?.requests ?? []).map((r) =>
    r.status === "pending"
      ? {
          key: r.id,
          icon: Clock,
          title: r.businessName,
          meta: t("Sent {date} · waiting for reply", { date: fmtDay(r.createdAt) }),
          trailing: (
            <span className="flex flex-col items-end shrink-0" style={{ gap: 2 }}>
              <Chip label={t("Pending")} tone="req" />
              <button
                type="button"
                onClick={() => void withdraw(r.id)}
                disabled={busy === r.id}
                className="tap min-h-[32px] disabled:opacity-50"
                style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}
              >
                {t("Withdraw")}
              </button>
            </span>
          ),
        }
      : {
          key: r.id,
          icon: X,
          title: r.businessName,
          meta: (
            <span style={{ color: INK.hi, fontWeight: 700 }}>{t("Declined {when}", { when: fmtDay(r.resolvedAt ?? r.createdAt) })}</span>
          ),
          trailing: <Chip label={t("Declined")} tone="att" />,
        }
  );

  return (
    <div data-pro-businesses="">
      <PageHead title={t("Businesses")} sub={t("Where you work with a business")} onBack={back} />
      {offline && <OfflineLine />}
      {failed ? (
        <ProError onRetry={reload} />
      ) : !data ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          {invites.length > 0 && (
            <section aria-label={t("Invitations")}>
              <SectionHead label={t("Invitations")} />
              {invites.map((e) => (
                <InvitationCard
                  key={e.businessId}
                  e={e}
                  busy={busy === e.businessId}
                  state={invitationState(e.invite, refused[e.businessId])}
                  onAccept={() => void accept(e)}
                  onDecline={() => setDecline(e)}
                  onRemove={() => void removeDead(e)}
                />
              ))}
            </section>
          )}

          <section aria-label={tx("Connected", "businesses")}>
            <SectionHead label={tx("Connected", "businesses")} />
            {[...owned, ...teams].map((e) => (
              <BizCard key={e.businessId} e={e} facts={data.facts[e.businessId]} upcoming={upcomingAt(e.businessId)} onOpen={() => navigate(`/app/more/businesses/${e.businessId}`)} />
            ))}
            {owned.length + teams.length === 0 && (
              <div style={{ marginBottom: 12 }}>
                <EmptyState icon={Building2} title={t("You're not on a business's team yet.")} line={t("Enter a business ID below, or ask to join one from Explore.")} />
              </div>
            )}
          </section>

          {requestRows.length > 0 && (
            <section aria-label={t("Requests sent")}>
              <SectionHead label={t("Requests sent")} />
              <ListCard rows={requestRows} />
            </section>
          )}

          <section aria-label={t("Join a business")}>
            <SectionHead label={t("Join a business")} />
            <JoinById hint={t("Ask the business for its ID. They confirm your credentials before you appear on their team.")} onSent={reload} onToast={setToast} />
          </section>
        </>
      )}

      <DeclinePopup name={decline?.businessName ?? null} busy={!!busy} onClose={() => setDecline(null)} onDecline={() => decline && void declineInvitation(decline)} />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
