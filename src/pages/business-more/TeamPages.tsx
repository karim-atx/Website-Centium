import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Copy, IdCard, Info, Plus, Share2, Sparkles, User, UserPlus, Users } from "lucide-react";
import { BizButton, BizDropdown, BizFieldButton, BizHero, BizNote, BizPage, BizRow, BizSection, BizSheet, LoadError, RowsSkeleton } from "../../components/business-more/kit";
import { useBizToast } from "../../components/business-more/useBizToast";
import { copyText, shareOrCopy } from "../../components/business-more/share";
import { useBusiness } from "../../components/business-more/useBusiness";
import { useApp } from "../../context/AppContext";
import { useBusinessPlan } from "../../hooks/useBusinessPlan";
import { personUsesSeat } from "../../services/business-team/seats";
import { fetchJoinRequests, fetchSeatCapacity, fetchTeam, type JoinRequest, type SeatCapacity, type TeamPerson } from "../../services/business-team/team";
import { upgradeMailto } from "../../services/subscription-tiers/upgrade";
import { ROLE_LABEL, roleAndProfession } from "../business-team/teamLogic";
import { formatShortDate } from "../../utils/date";

// OURS-MO1B-employees, -roles, -join-requests, -seats, -business-id
// (BizMoreV8 screen="employees" / "roles" / "joins" / "seats" / "bizid").
//
// v6 Batch 4 wired these to B0 consent and B6:
// - Employees and Join requests are the OP1 team screens now
//   (/app/business/employees and /requests, pages/business-team); these two
//   routes forward there so More › Team and access opens the one Team page.
// - Roles: each person's B6 role; changing role, permissions and pay is on
//   the person page (set_employee_terms, B6 follow-up).
// - Seats: capacity from business_seat_capacity (included seats + blocks ×
//   seats per block); invitations hold no seat (B0); buying seats is the
//   email request until B8 records a Centium charge (V6-41).
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
    <BizRow icon={Users} title="No one on your team yet" desc="Share your business ID so professionals can ask to join." />
    <BizRow icon={IdCard} title="Business ID" desc="Copy or share it" onClick={onShare} />
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
    <BizPage title="Roles and permissions" sub="Each person's role sets what they can see and change.">
      {error && <LoadError message="Couldn't load your team." onRetry={reload} />}
      {!rows && !error && <RowsSkeleton rows={3} />}
      {rows && (
        <BizSection label="People" footer={rows.length > 0 ? "Tap a person to change their role, what they can do and their pay." : undefined}>
          <BizRow title={user.firstName || "You"} desc="Owner · everything" value="Owner" />
          {rows.map((r) => (
            <BizRow
              key={r.professionalId}
              title={r.name}
              desc={(r.acceptedAt ? roleAndProfession(r) : "Invited, hasn't accepted yet") + (personUsesSeat(r) ? " · uses a seat" : "")}
              value={ROLE_LABEL[r.role]}
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
  const { rows, capacity, error, reload } = useTeam();
  const { plan, loading, error: planError } = useBusinessPlan();
  const [sheet, setSheet] = useState(false);

  const per = plan?.seatAddon?.seatsPerUnit ?? capacity?.seatsPerUnit ?? 5;
  // Seats count instructors and trainers only (B6 follow-up, Q-09).
  const accepted = rows?.filter((r) => r.acceptedAt && personUsesSeat(r)) ?? [];
  const invited = rows?.filter((r) => !r.acceptedAt && personUsesSeat(r)) ?? [];
  const noSeat = rows?.filter((r) => !personUsesSeat(r)) ?? [];
  const total = capacity?.capacity ?? 0;
  const blocks = capacity?.seatBlocks ?? 0;
  const included = Math.max(0, total - blocks * per);
  const groups = Math.ceil(total / per);

  return (
    <BizPage title="Seats">
      {(error || planError) && <LoadError onRetry={reload} />}
      {(loading || !rows || !capacity) && !error && !planError && <RowsSkeleton rows={3} label="Loading your seats" />}
      {plan && rows && capacity && (
        <>
          <BizHero
            label="Seats used"
            value={`${capacity?.used ?? accepted.length} of ${total}`}
            sub={
              total === 0
                ? "No seats yet"
                : [included > 0 ? `${included} included in your plan` : null, blocks > 0 ? `${blocks} seat block${blocks === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ")
            }
            actions={plan.seatAddon ? [{ label: "Add seats", icon: Plus, primary: true, onClick: () => setSheet(true) }] : []}
          />
          {Array.from({ length: groups }, (_, b) => {
            const members = accepted.slice(b * per, (b + 1) * per);
            return (
              <BizSection key={b} label={b === 0 && included > 0 ? "Included seats" : `Block ${b + (included > 0 ? 0 : 1)}`}>
                {members.map((m) => (
                  <BizRow key={m.professionalId} icon={User} title={m.name} desc={roleAndProfession(m)} onClick={() => navigate(`/app/business/employees/${m.professionalId}`)} />
                ))}
                {Array.from({ length: Math.max(0, per - members.length) }, (_, i) => (
                  <BizRow key={`free-${i}`} icon={Plus} title="Free seat" desc="Invite a professional" onClick={() => navigate("/app/business/employees")} />
                ))}
              </BizSection>
            );
          })}
          {invited.length > 0 && (
            <BizSection label="Invited" footer="An invitation uses a seat only once it's accepted.">
              {invited.map((m) => (
                <BizRow key={m.professionalId} icon={UserPlus} title={m.name} desc={`Invited ${fmt(m.invitedAt)}`} value="Pending" onClick={() => navigate(`/app/business/employees/${m.professionalId}`)} />
              ))}
            </BizSection>
          )}
          {noSeat.length > 0 && (
            <BizSection label="No seat needed" footer="Front desk, managers, staff and shop assistants don't use a seat.">
              {noSeat.map((m) => (
                <BizRow key={m.professionalId} icon={User} title={m.name} desc={m.acceptedAt ? ROLE_LABEL[m.role] : `${ROLE_LABEL[m.role]} · invited`} onClick={() => navigate(`/app/business/employees/${m.professionalId}`)} />
              ))}
            </BizSection>
          )}
          {accepted.length > total && (
            <BizNote>{accepted.length - total} on your team without a seat. Add a seat block to cover them.</BizNote>
          )}
          {sheet && plan.seatAddon && (
            <AddSeatsSheet
              per={per}
              price={plan.seatAddon.monthlyPrice}
              base={plan.base?.monthlyPrice ?? 0}
              total={total}
              blocks={blocks}
              onClose={() => setSheet(false)}
            />
          )}
        </>
      )}
    </BizPage>
  );
}

function AddSeatsSheet({ per, price, base, total, blocks, onClose }: { per: number; price: number; base: number; total: number; blocks: number; onClose: () => void }) {
  const [add, setAdd] = useState(1);
  const [open, setOpen] = useState(false);
  return (
    <BizSheet open onClose={onClose} title="Add seats" lead={`Each seat block lets ${per} more professionals join your team.`}>
      <BizFieldButton
        id="seats-add"
        label="Blocks to add"
        value={`${add} block${add === 1 ? "" : "s"} (${add * per} seats)`}
        icon={open ? ChevronUp : ChevronDown}
        expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <BizDropdown
          label="Blocks to add"
          options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} block${n === 1 ? "" : "s"} (${n * per} seats)` }))}
          value={String(add)}
          onPick={(v) => {
            setAdd(Number(v));
            setOpen(false);
          }}
        />
      )}
      <BizFieldButton id="seats-price" label="Price per block" value={`${money(price)} a month`} icon={Info} />
      <BizFieldButton
        id="seats-total"
        label="New total"
        value={`${total + add * per} seats · ${money(base + (blocks + add) * price)} a month`}
        icon={Sparkles}
      />
      <BizButton label="Request more seats" onClick={() => (window.location.href = upgradeMailto())} />
      <p className="text-center text-[11px] leading-[16px] text-charcoal-faint" style={{ marginTop: 8 }}>
        We'll add them and send you the bill. Paying in the app is coming soon.
      </p>
    </BizSheet>
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
    <BizPage title="Business ID" sub="Professionals enter this code to ask to join your team.">
      {error && <LoadError onRetry={reload} />}
      {loading && !business && <RowsSkeleton rows={1} />}
      {!loading && (
        <BizHero
          label="Your business ID"
          value={code ?? "Not ready yet"}
          sub="Approve each request, then they accept. Each person uses a seat."
          actions={
            code
              ? [
                  {
                    label: "Copy",
                    icon: Copy,
                    onClick: () => void copyText(code).then((ok) => showToast(ok ? "Business ID copied." : "Couldn't copy. Try again.")),
                  },
                  {
                    label: "Share",
                    icon: Share2,
                    primary: true,
                    onClick: () =>
                      void shareOrCopy({
                        title: "Our business ID on Centium",
                        text: `Join ${business?.name ?? "our team"} on Centium. Enter business ID ${code} when you ask to join.`,
                        copy: code,
                      }).then((r) => {
                        if (r === "copied") showToast("Business ID copied.");
                        if (r === "failed") showToast("Couldn't share right now. Try again.");
                      }),
                  },
                ]
              : []
          }
        />
      )}
      <BizSection label="Join requests">
        <BizRow
          icon={UserPlus}
          title={requests === null ? "Join requests" : n === 0 ? "No requests right now" : `${n} waiting for you`}
          desc={n === 0 ? "Requests show here when a professional enters your ID." : "Approve or deny them"}
          onClick={() => navigate("/app/business/employees/requests")}
        />
      </BizSection>
      {toast}
    </BizPage>
  );
}
