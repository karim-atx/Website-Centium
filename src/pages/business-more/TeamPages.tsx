import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Clock3, Copy, IdCard, Plus, Share2, User, UserPlus, UserX, Users } from "lucide-react";
import { BizHero, BizNote, BizPage, BizRow, BizSection, LoadError, RowsSkeleton } from "../../components/business-more/kit";
import { useBizToast } from "../../components/business-more/useBizToast";
import { copyText, shareOrCopy } from "../../components/business-more/share";
import { useBusiness } from "../../components/business-more/useBusiness";
import { useApp } from "../../context/AppContext";
import { useBusinessPlan } from "../../hooks/useBusinessPlan";
import { useCentiumBilling } from "../../hooks/useCentiumBilling";
import { SeatsSheet } from "../business-analytics/team/SeatsSheet";
import "../business-analytics/shell/analytics.css";
import "../business-analytics/team/an5.css";
import { personUsesSeat } from "../../services/business-team/seats";
import { fetchJoinRequests, fetchSeatCapacity, fetchTeam, type JoinRequest, type SeatCapacity, type TeamPerson } from "../../services/business-team/team";
import { ROLE_LABEL, inviteState, inviteWhen, isWithdrawn, lowerFirst, roleAndProfession, shortDay, withdrawnPeople } from "../business-team/teamLogic";
import { formatShortDate } from "../../utils/date";
import { t, tn } from "../../i18n/core";

// OURS-MO1B-employees, -roles, -join-requests, -seats, -business-id
// (BizMoreV8 screen="employees" / "roles" / "joins" / "seats" / "bizid").
//
// v6 Batch 4 wired these to B0 consent and B6:
// - Employees and Join requests are the OP1 team screens now
//   (/app/business/employees and /requests, pages/business-team); these two
//   routes forward there so More › Team and access opens the one Team page.
// - Roles: each person's B6 role; changing role, permissions and pay is on
//   the person page (set_employee_terms, B6 follow-up).
// - Seats: capacity from business_plan_summary (B8 RV-06: included seats +
//   blocks × seats per block); invitations hold no seat (B0); Add seats opens
//   the AN5 purchase flow (buy_seat_blocks, owner only), and an order
//   awaiting payment to Centium shows with its amount.
// - Business ID: the B5 code, plus the waiting join requests (B6).

const fmt = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short" });

function useTeam() {
  const { business, loading: bizLoading } = useBusiness();
  const [rows, setRows] = useState<TeamPerson[] | null>(null);
  const [capacity, setCapacity] = useState<SeatCapacity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const bizId = business?.id ?? null;
  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void Promise.all([fetchTeam(bizId), fetchSeatCapacity()]).then(([t, c]) => {
      if (cancelled) return;
      if (t.ok) setRows(t.value);
      if (c.ok) setCapacity(c.value);
      setError(!t.ok ? t.message : !c.ok ? c.message : null);
    });
    return () => {
      cancelled = true;
    };
  }, [bizId, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { business, rows, capacity, error, reload, noBusiness: !bizLoading && !business };
}

const NoTeamYet = ({ onShare }: { onShare: () => void }) => (
  <BizSection>
    <BizRow icon={Users} title={t("No one on your team yet")} desc={t("Share your business ID so professionals can ask to join.")} />
    <BizRow icon={IdCard} title={t("Business ID")} desc={t("Copy or share it")} onClick={onShare} />
  </BizSection>
);

// ---------------------------------------------------------------------------
// Employees and Join requests: the OP1 Team screens.

export function EmployeesPage() {
  return <Navigate to="/app/business/employees" replace />;
}

export function JoinRequestsPage() {
  return <Navigate to="/app/business/employees/requests" replace />;
}

// ---------------------------------------------------------------------------
// Roles and permissions: each person's role; rows open the person page,
// where set_employee_terms changes role, permissions and pay.

export function RolesPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { rows, error, reload } = useTeam();
  return (
    <BizPage title={t("Roles and permissions")} sub={t("Each person's role sets what they can see and change.")}>
      {error && <LoadError message={t("Couldn't load your team.")} onRetry={reload} />}
      {!rows && !error && <RowsSkeleton rows={3} />}
      {rows && (
        <BizSection label={t("People")} footer={rows.length > 0 ? t("Tap a person to change their role, what they can do and their pay.") : undefined}>
          <BizRow title={user.firstName || t("You")} desc={t("Owner · everything")} value={t("Owner")} />
          {rows.map((r) => (
            <BizRow
              key={r.professionalId}
              title={r.name}
              desc={isWithdrawn(r) ? inviteWhen(r) ?? t("Withdrawn") : (r.acceptedAt ? roleAndProfession(r) : t("Invited, hasn't accepted yet") + (inviteWhen(r) ? ` · ${inviteWhen(r)}` : "")) + (personUsesSeat(r) ? ` · ${t("uses a seat")}` : "")}
              value={t(ROLE_LABEL[r.role])}
              dim={!r.acceptedAt}
              onClick={() => navigate(`/app/business/employees/${r.professionalId}`)}
            />
          ))}
        </BizSection>
      )}
      {rows && rows.length === 0 && <NoTeamYet onShare={() => navigate("/app/business/more/business-id")} />}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// Seats

const money = (n: number) => `$${n.toFixed(2)}`;

export function SeatsPage() {
  const navigate = useNavigate();
  const { business, rows, capacity, error, reload } = useTeam();
  // B8 RV-06: business_plan_summary is the seat answer (capacity, blocks,
  // block price); the order awaiting payment comes from the billing history.
  // Without RV-06 on the database the earlier reads stay (pending rule).
  const billing = useCentiumBilling();
  const legacy = useBusinessPlan();
  const [sheet, setSheet] = useState(false);
  const s = billing.summary;
  const live = billing.available && !!s;
  const plan = legacy.plan;

  const per = (live ? s.seatsPerBlock : null) ?? plan?.seatAddon?.seatsPerUnit ?? capacity?.seatsPerUnit ?? 5;
  // Seats count instructors and trainers only (B6 follow-up, Q-09).
  const accepted = rows?.filter((r) => r.acceptedAt && personUsesSeat(r)) ?? [];
  // Batch 2 CO: a withdrawn invitation holds nothing; it's listed apart, with no actions.
  const invited = rows?.filter((r) => !r.acceptedAt && personUsesSeat(r) && !isWithdrawn(r)) ?? [];
  const noSeat = rows?.filter((r) => !personUsesSeat(r) && !isWithdrawn(r)) ?? [];
  const withdrawn = rows ? withdrawnPeople(rows) : [];
  const total = live ? s.capacity : (capacity?.capacity ?? 0);
  const blocks = live ? s.seatBlocks : (capacity?.seatBlocks ?? 0);
  const included = Math.max(0, total - blocks * per);
  const groups = Math.ceil(total / per);
  const planActive = live ? s.active : !!plan?.active;
  const blockPrice = live ? s.seatBlockPrice : (plan?.seatAddon?.monthlyPrice ?? null);
  const canAdd = live ? planActive && billing.isOwner && s.seatsPerBlock !== null : !!plan?.seatAddon;
  const order = live ? billing.pendingSeat : null;
  const ready = !!rows && (live ? true : !!plan && !!capacity);
  const loadError = error || (live ? billing.summaryError : legacy.error);

  return (
    <BizPage title={t("Seats")}>
      {loadError && (
        <LoadError
          onRetry={() => {
            reload();
            billing.reload();
          }}
        />
      )}
      {!ready && !loadError && <RowsSkeleton rows={3} label={t("Loading your seats")} />}
      {ready && (
        <>
          <BizHero
            label={t("Seats used")}
            value={t("{used} of {total}", { used: capacity?.used ?? accepted.length, total })}
            sub={
              total === 0
                ? t("No seats yet")
                : [included > 0 ? t("{n} included in your plan", { n: included }) : null, blocks > 0 ? tn(blocks, "{n} seat block", "{n} seat blocks") : null].filter(Boolean).join(" · ")
            }
            actions={canAdd ? [{ label: t("Add seats"), icon: Plus, primary: true, onClick: () => setSheet(true) }] : []}
          />
          {order && (
            <BizSection label={t("Seat order")}>
              <BizRow
                icon={Clock3}
                title={tn(order.quantity, "{n} seat block awaiting payment", "{n} seat blocks awaiting payment")}
                desc={t("{amount} · ordered {date}. Seats are added once Centium records your payment.", { amount: money(order.amount), date: fmt(order.createdAt) })}
                onClick={() => setSheet(true)}
              />
            </BizSection>
          )}
          {Array.from({ length: groups }, (_, b) => {
            const members = accepted.slice(b * per, (b + 1) * per);
            return (
              <BizSection key={b} label={b === 0 && included > 0 ? "Included seats" : `Block ${b + (included > 0 ? 0 : 1)}`}>
                {members.map((m) => (
                  <BizRow key={m.professionalId} icon={User} title={m.name} desc={roleAndProfession(m)} onClick={() => navigate(`/app/business/employees/${m.professionalId}`)} />
                ))}
                {Array.from({ length: Math.max(0, per - members.length) }, (_, i) => (
                  <BizRow key={`free-${i}`} icon={Plus} title={t("Free seat")} desc={t("Invite a professional")} onClick={() => navigate("/app/business/employees")} />
                ))}
              </BizSection>
            );
          })}
          {invited.length > 0 && (
            <BizSection label={t("Invited")} footer={t("An invitation uses a seat only once it's accepted.")}>
              {invited.map((m) => (
                <BizRow key={m.professionalId} icon={UserPlus} title={m.name} desc={t("Invited {date}", { date: shortDay(m.invitedAt) }) + (inviteWhen(m) ? ` · ${inviteWhen(m)}` : "")} value={inviteState(m) === "expired" ? t("Expired") : t("Pending")} onClick={() => navigate(`/app/business/employees/${m.professionalId}`)} />
              ))}
            </BizSection>
          )}
          {noSeat.length > 0 && (
            <BizSection label={t("No seat needed")} footer={t("Front desk, managers, staff and shop assistants don't use a seat.")}>
              {noSeat.map((m) => (
                <BizRow key={m.professionalId} icon={User} title={m.name} desc={m.acceptedAt ? ROLE_LABEL[m.role] : `${ROLE_LABEL[m.role]} · invited` + (inviteWhen(m) ? ` · ${lowerFirst(inviteWhen(m)!)}` : "")} onClick={() => navigate(`/app/business/employees/${m.professionalId}`)} />
              ))}
            </BizSection>
          )}
          {withdrawn.length > 0 && (
            <BizSection label={t("Withdrawn")} footer={billing.isOwner ? t("Open one to invite them again.") : undefined}>
              {withdrawn.map((m) => (
                <BizRow key={m.professionalId} icon={UserX} title={m.name} desc={inviteWhen(m) ?? t("Withdrawn")} dim onClick={() => navigate(`/app/business/employees/${m.professionalId}`)} />
              ))}
            </BizSection>
          )}
          {accepted.length > total && (
            <BizNote>{t("{n} on your team without a seat. Add a seat block to cover them.", { n: accepted.length - total })}</BizNote>
          )}
          {/* Add seats: the drawn AN5 057-060 flow (TeamFlowsV4), one purchase path for every entry point. */}
          <SeatsSheet
            open={sheet}
            mode="add"
            seats={{ capacity: total, planActive, blocks, perBlock: per, blockPrice, period: live ? s.period : "monthly" }}
            used={accepted.length}
            pending={invited.length}
            billing={billing}
            businessId={business?.id ?? null}
            doneLabel={t("Done")}
            onClose={() => setSheet(false)}
            onPlan={() => navigate("/app/business/more/subscription")}
            onChanged={() => {
              billing.reload();
              reload();
            }}
          />
        </>
      )}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// Business ID (B5 business_code) and the waiting join requests (B6)

export function BusinessIdPage() {
  const navigate = useNavigate();
  const { business, loading, error, reload } = useBusiness();
  const [toast, showToast] = useBizToast();
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const code = business?.code ?? null;
  const bizId = business?.id ?? null;

  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchJoinRequests(bizId).then((r) => !cancelled && r.ok && setRequests(r.value));
    return () => {
      cancelled = true;
    };
  }, [bizId]);

  const n = requests?.length ?? 0;
  return (
    <BizPage title={t("Business ID")} sub={t("Professionals enter this code to ask to join your team.")}>
      {error && <LoadError onRetry={reload} />}
      {loading && !business && <RowsSkeleton rows={1} />}
      {!loading && (
        <BizHero
          label={t("Your business ID")}
          value={code ?? t("Not ready yet")}
          sub={t("Approve each request, then they accept. Each person uses a seat.")}
          actions={
            code
              ? [
                  {
                    label: t("Copy"),
                    icon: Copy,
                    onClick: () => void copyText(code).then((ok) => showToast(ok ? t("Business ID copied.") : t("Couldn't copy. Try again."))),
                  },
                  {
                    label: t("Share"),
                    icon: Share2,
                    primary: true,
                    onClick: () =>
                      void shareOrCopy({
                        title: t("Our business ID on Centium"),
                        text: business?.name ? t("Join {name} on Centium. Enter business ID {code} when you ask to join.", { name: business.name, code }) : t("Join our team on Centium. Enter business ID {code} when you ask to join.", { code }),
                        copy: code,
                      }).then((r) => {
                        if (r === "copied") showToast(t("Business ID copied."));
                        if (r === "failed") showToast(t("Couldn't share right now. Try again."));
                      }),
                  },
                ]
              : []
          }
        />
      )}
      <BizSection label={t("Join requests")}>
        <BizRow
          icon={UserPlus}
          title={requests === null ? t("Join requests") : n === 0 ? t("No requests right now") : t("{n} waiting for you", { n })}
          desc={n === 0 ? t("Requests show here when a professional enters your ID.") : t("Approve or deny them")}
          onClick={() => navigate("/app/business/employees/requests")}
        />
      </BizSection>
      {toast}
    </BizPage>
  );
}
