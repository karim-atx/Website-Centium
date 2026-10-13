import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Copy, IdCard, Info, Plus, Share2, Sparkles, User, UserMinus, UserPlus, Users } from "lucide-react";
import { BizButton, BizConfirm, BizDropdown, BizFieldButton, BizHero, BizNote, BizPage, BizRow, BizSection, BizSheet, LoadError, RowsSkeleton } from "../../components/business-more/kit";
import { useBizToast } from "../../components/business-more/useBizToast";
import { copyText, shareOrCopy } from "../../components/business-more/share";
import { useBusiness } from "../../components/business-more/useBusiness";
import { STAFF_LABEL } from "../../components/business-more/kind";
import { useApp } from "../../context/AppContext";
import { useBusinessPlan } from "../../hooks/useBusinessPlan";
import { fetchTeamRows, type TeamRow } from "../../services/business-more";
import { removeTeamMember } from "../../services/business-team";
import { upgradeMailto } from "../../services/subscription-tiers/upgrade";

// OURS-MO1B-employees, -roles, -join-requests, -seats, -business-id
// (BizMoreV8 screen="employees" / "roles" / "joins" / "seats" / "bizid").
//
// LIVE: the team (business_employees with B0's accepted_at: an unaccepted
// row is an invite, "Pending"), removing someone (the old Employees tab's
// action, kept), seats from the plan (subscription_states.seat_blocks ×
// subscription_tiers.seats_per_unit), seat prices from subscription_tiers
// (V6-40), the business code (B5).
//
// PENDING (Batch 4 team agent: B0 invite / accept screens; B6 roles and
// seats): join requests (no request table yet: empty state), per-person
// roles (no role column: the permissions section is hidden, V6-84), buying
// seats in the app (V6-41: "Request more seats" emails Centium, recorded as
// a pending Centium charge by an admin).

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function useTeam() {
  const { business, kind, loading: bizLoading } = useBusiness();
  const [rows, setRows] = useState<TeamRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const bizId = business?.id ?? null;
  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchTeamRows(bizId).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setRows(r.value);
        setError(null);
      } else setError(r.message);
    });
    return () => {
      cancelled = true;
    };
  }, [bizId, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { business, kind, rows, error, reload, noBusiness: !bizLoading && !business };
}

const NoTeamYet = ({ onShare }: { onShare: () => void }) => (
  <BizSection>
    <BizRow icon={Users} title="No one on your team yet" desc="Share your business ID so professionals can ask to join." />
    <BizRow icon={IdCard} title="Business ID" desc="Copy or share it" onClick={onShare} />
  </BizSection>
);

// ---------------------------------------------------------------------------
// Employees

export function EmployeesPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { business, kind, rows, error, reload } = useTeam();
  const { plan } = useBusinessPlan();
  const [toast, showToast] = useBizToast();
  const [removing, setRemoving] = useState<TeamRow | null>(null);
  const [busy, setBusy] = useState(false);

  const accepted = rows?.filter((r) => r.acceptedAt).length ?? 0;
  const free = Math.max(0, (plan?.totalSeats ?? 0) - accepted);

  return (
    <BizPage title={STAFF_LABEL[kind]}>
      {error && <LoadError message="Couldn't load your team." onRetry={reload} />}
      {!rows && !error && <RowsSkeleton rows={4} label="Loading your team" />}
      {rows && rows.length === 0 && <NoTeamYet onShare={() => navigate("/app/business/more/business-id")} />}
      {rows && rows.length > 0 && (
        <BizSection label="Your team">
          <BizRow icon={User} title={user.firstName || "You"} desc="Owner · everything" />
          {rows.map((r) => (
            <BizRow
              key={r.professionalId}
              icon={User}
              title={r.name}
              desc={r.acceptedAt ? `Joined ${fmt(r.acceptedAt)}` : `Invited ${fmt(r.invitedAt)}`}
              value={r.acceptedAt ? undefined : "Pending"}
              onClick={() => setRemoving(r)}
            />
          ))}
        </BizSection>
      )}
      {rows && (
        <BizSection>
          <BizRow
            icon={UserPlus}
            title="Invite a professional"
            desc={plan ? (plan.totalSeats > 0 ? `Uses a free seat · ${free} left` : "Add seats to invite professionals") : undefined}
            onClick={() => navigate(plan && plan.totalSeats > 0 && free > 0 ? "/app/business/more/business-id" : "/app/business/more/seats")}
          />
        </BizSection>
      )}
      <BizConfirm
        open={!!removing}
        icon={UserMinus}
        title={removing?.acceptedAt ? `Remove ${removing?.name}?` : `Cancel ${removing?.name}'s invite?`}
        body={removing?.acceptedAt ? "They lose access to your business. Their own account stays." : "They won't be able to join with this invite."}
        action={removing?.acceptedAt ? "Remove" : "Cancel invite"}
        cancel="Keep them"
        busy={busy}
        onCancel={() => setRemoving(null)}
        onAction={async () => {
          if (!business || !removing) return;
          setBusy(true);
          const r = await removeTeamMember(business.id, removing.professionalId);
          setBusy(false);
          const who = removing.name;
          setRemoving(null);
          if (!r.ok) showToast(r.message ?? "Couldn't remove them. Try again.");
          else {
            showToast(`${who} removed.`);
            reload();
          }
        }}
      />
      {toast}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// Roles and permissions (V6-84: the per-role permission toggles stay hidden
// until the roles backend ships)

export function RolesPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { rows, error, reload } = useTeam();
  return (
    <BizPage title="Roles and permissions" sub="Pick a role for each person. You can fine-tune a role's access.">
      {error && <LoadError message="Couldn't load your team." onRetry={reload} />}
      {!rows && !error && <RowsSkeleton rows={3} />}
      {rows && (
        <BizSection label="People" footer={rows.length > 0 ? "Choosing a role for each person is coming soon." : undefined}>
          <BizRow title={user.firstName || "You"} desc="Owner · everything" value="Owner" />
          {rows.map((r) => (
            <BizRow key={r.professionalId} title={r.name} desc={r.acceptedAt ? "Team member" : "Invited"} dim />
          ))}
        </BizSection>
      )}
      {rows && rows.length === 0 && <NoTeamYet onShare={() => navigate("/app/business/more/business-id")} />}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// Join requests (BACKEND: professionals can't send a request by business ID yet)

export function JoinRequestsPage() {
  const navigate = useNavigate();
  return (
    <BizPage title="Join requests" sub="Professionals who entered your business ID.">
      <BizSection>
        <BizRow icon={UserPlus} title="No requests right now" desc="Share your business ID so professionals can ask to join." />
        <BizRow icon={IdCard} title="Business ID" desc="Copy or share it" onClick={() => navigate("/app/business/more/business-id")} />
      </BizSection>
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// Seats

const money = (n: number) => `$${n.toFixed(2)}`;

export function SeatsPage() {
  const navigate = useNavigate();
  const { rows, error, reload } = useTeam();
  const { plan, loading, error: planError } = useBusinessPlan();
  const [sheet, setSheet] = useState(false);

  const per = plan?.seatAddon?.seatsPerUnit ?? 0;
  const accepted = rows?.filter((r) => r.acceptedAt) ?? [];
  const total = plan?.totalSeats ?? 0;
  const blocks = plan?.seatBlocks ?? 0;

  return (
    <BizPage title="Seats">
      {(error || planError) && <LoadError onRetry={reload} />}
      {(loading || !rows) && !error && !planError && <RowsSkeleton rows={3} label="Loading your seats" />}
      {plan && rows && (
        <>
          <BizHero
            label="Seats used"
            value={`${accepted.length} of ${total}`}
            sub={blocks > 0 ? `${blocks} seat block${blocks === 1 ? "" : "s"} · ${per} professionals per block` : "No seat blocks yet"}
            actions={plan.seatAddon ? [{ label: "Add seats", icon: Plus, primary: true, onClick: () => setSheet(true) }] : []}
          />
          {Array.from({ length: blocks }, (_, b) => {
            const members = accepted.slice(b * per, (b + 1) * per);
            return (
              <BizSection key={b} label={`Block ${b + 1}`}>
                {members.map((m) => (
                  <BizRow key={m.professionalId} icon={User} title={m.name} desc="Team member" />
                ))}
                {Array.from({ length: Math.max(0, per - members.length) }, (_, i) => (
                  <BizRow key={`free-${i}`} icon={Plus} title="Free seat" desc="Invite a professional" onClick={() => navigate("/app/business/more/business-id")} />
                ))}
              </BizSection>
            );
          })}
          {accepted.length > total && (
            <BizNote>{accepted.length - total} on your team without a seat. Add a seat block to cover them.</BizNote>
          )}
          {sheet && plan.seatAddon && (
            <AddSeatsSheet
              per={per}
              price={plan.seatAddon.monthlyPrice}
              base={plan.base?.monthlyPrice ?? 0}
              blocks={blocks}
              onClose={() => setSheet(false)}
            />
          )}
        </>
      )}
    </BizPage>
  );
}

function AddSeatsSheet({ per, price, base, blocks, onClose }: { per: number; price: number; base: number; blocks: number; onClose: () => void }) {
  const [add, setAdd] = useState(1);
  const [open, setOpen] = useState(false);
  const newBlocks = blocks + add;
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
        value={`${newBlocks * per} seats · ${money(base + newBlocks * price)} a month`}
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
// Business ID (B5 business_code)

export function BusinessIdPage() {
  const { business, loading, error, reload } = useBusiness();
  const [toast, showToast] = useBizToast();
  const code = business?.code ?? null;
  return (
    <BizPage title="Business ID" sub="Professionals enter this code to ask to join your team.">
      {error && <LoadError onRetry={reload} />}
      {loading && !business && <RowsSkeleton rows={1} />}
      {!loading && (
        <BizHero
          label="Your business ID"
          value={code ?? "Not ready yet"}
          sub="Approve each request before they join. Each one uses a seat."
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
                      void shareOrCopy({ title: "Our business ID on Centium", text: `Join ${business?.name ?? "our team"} on Centium with our business ID: ${code}`, copy: code }).then((r) => {
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
        <BizRow icon={UserPlus} title="No requests right now" desc="Requests show here when a professional enters your ID." />
      </BizSection>
      {toast}
    </BizPage>
  );
}
