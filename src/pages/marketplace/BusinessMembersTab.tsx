import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { BusinessPrototypeNotice } from "../../components/marketplace/BusinessPrototypeNotice";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { MembershipStatusBadge } from "../../components/marketplace/MembershipStatusBadge";
import { useBusinessTeam } from "../../hooks/useBusinessTeam";
import { useMembershipPlans } from "../../hooks/useBusinessCatalog";
import {
  createMemberCode,
  endMembership,
  fetchMyMemberCodes,
  fetchMyMembers,
  type MemberCode,
  type Membership,
} from "../../services/business-members";
import { Plus, Copy, Check, UserPlus, Ticket } from "lucide-react";

// The walk-in desk: who is a member, and how somebody becomes one.
//
// WHY A CODE AND NOT A SEARCH BOX. business_invite_member exists and takes an
// account uuid, but nothing a business can read yields one — there is no user
// search in this schema, `profiles` is own-row, and the two summary views
// exclude customers or cover only a professional's own clients. So the invite
// this screen offers is the one a walk-in desk actually performs: hand over a
// code. redeem_business_member_code creates the membership already accepted,
// because redeeming IS the consent.
//
// NO NAMES ON THE ROSTER, and that is structural rather than unfinished. A
// business cannot resolve a member's first name by any path available to it.
// The roster shows what it genuinely knows — status, plan, when — and says so
// instead of printing a placeholder that looks like a missing name.

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function BusinessMembersTab() {
  const { businessId } = useBusinessTeam();
  const { plans } = useMembershipPlans();

  const [members, setMembers] = useState<Membership[]>([]);
  const [codes, setCodes] = useState<MemberCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [planId, setPlanId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    const [roster, issued] = await Promise.all([
      fetchMyMembers(businessId),
      fetchMyMemberCodes(businessId),
    ]);
    setLoading(false);
    // A failed read keeps whatever is on screen — the rule every hydration in
    // this app follows. An empty roster and an unreachable server look the
    // same once rendered, and only one of them is true.
    if (!roster.ok) {
      setError(roster.message);
      return;
    }
    setError(null);
    setMembers(roster.members);
    if (issued.ok) setCodes(issued.codes);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    void (async () => {
      const [roster, issued] = await Promise.all([
        fetchMyMembers(businessId),
        fetchMyMemberCodes(businessId),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (!roster.ok) {
        setError(roster.message);
        return;
      }
      setError(null);
      setMembers(roster.members);
      if (issued.ok) setCodes(issued.codes);
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const issueCode = async () => {
    if (!businessId || creating) return;
    setCreating(true);
    const result = await createMemberCode(businessId, planId || null);
    setCreating(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setCodes((prev) => [result.code, ...prev]);
    setInviteOpen(false);
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1600);
    } catch {
      setCopied(null);
    }
  };

  const end = async (membershipId: string) => {
    if (confirmEnd !== membershipId) {
      setConfirmEnd(membershipId);
      setTimeout(() => setConfirmEnd((c) => (c === membershipId ? null : c)), 3000);
      return;
    }
    setConfirmEnd(null);
    const result = await endMembership(membershipId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    await load();
  };

  const liveCodes = codes.filter((c) => !c.redeemed && new Date(c.expiresAt) > new Date());

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle="Walk-ins and members of your business"
        showBack
        right={
          <button
            onClick={() => setInviteOpen(true)}
            disabled={!businessId}
            className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft disabled:opacity-40"
            aria-label="Invite a member"
          >
            <Plus size={18} />
          </button>
        }
      />
      <BusinessPrototypeNotice />

      {error && (
        <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">
          {error}
        </p>
      )}

      {liveCodes.length > 0 && (
        <>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            Codes waiting to be used
          </p>
          <div className="space-y-2.5 mb-6">
            {liveCodes.map((c) => (
              <Card key={c.id} className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-gold/15 flex items-center justify-center shrink-0">
                  <Ticket size={17} className="text-gold" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-charcoal tracking-wide">{c.code}</p>
                  <p className="text-xs text-charcoal-faint">
                    Expires {dateLabel(c.expiresAt)}
                    {c.membershipPlanId
                      ? ` · ${plans.find((p) => p.id === c.membershipPlanId)?.name ?? "plan"}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => void copy(c.code)}
                  aria-label={`Copy ${c.code}`}
                  className="tap flex items-center gap-1 text-xs font-semibold text-primary shrink-0"
                >
                  {copied === c.code ? <Check size={13} /> : <Copy size={13} />}
                  {copied === c.code ? "Copied" : "Copy"}
                </button>
              </Card>
            ))}
          </div>
        </>
      )}

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Members</p>
      <div className="space-y-2.5">
        {members.map((m) => (
          <Card key={m.id} className="flex items-center gap-3 animate-fade-slide-up">
            <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
              <UserPlus size={18} className="text-primary-dark" />
            </span>
            <div className="min-w-0 flex-1">
              {/* NOT A PLACEHOLDER NAME. The business genuinely cannot read
                  who this is, so the card says what it does know rather than
                  printing "Unknown" where a name would go. */}
              <p className="text-sm font-semibold text-charcoal">
                {m.planName ?? "Member"}
              </p>
              <p className="text-xs text-charcoal-faint">
                {m.status === "ended" && m.endedAt
                  ? `Ended ${dateLabel(m.endedAt)}`
                  : m.status === "pending"
                  ? `Invited ${dateLabel(m.invitedAt)}`
                  : m.respondedAt
                  ? `Since ${dateLabel(m.respondedAt)}`
                  : `Invited ${dateLabel(m.invitedAt)}`}
              </p>
            </div>
            <MembershipStatusBadge status={m.status} />
            {/* Either side may end a membership; this is the business's half.
                Offered only while there is something to end. */}
            {(m.status === "active" || m.status === "pending") && (
              <button
                onClick={() => void end(m.id)}
                className="tap text-[10px] font-bold text-status-high shrink-0"
              >
                {confirmEnd === m.id ? "Confirm" : "End"}
              </button>
            )}
          </Card>
        ))}

        {members.length === 0 && !loading && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">
              {businessId
                ? "No members yet — create a code and hand it to someone at the desk."
                : "Save your business profile first — members belong to it."}
            </p>
          </Card>
        )}
      </div>

      <BottomSheet open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a member">
        <div className="space-y-4 animate-fade-slide-up">
          <p className="text-sm text-charcoal-soft leading-relaxed">
            Create a code and give it to the person at the desk. They redeem it from their own
            Centium profile, and become a member straight away.
          </p>

          {plans.length > 0 && (
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
                Membership plan <span className="text-charcoal-faint font-normal">(optional)</span>
              </span>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">No plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.price}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
          <Button fullWidth size="lg" onClick={() => void issueCode()} disabled={creating}>
            {creating ? "Creating…" : "Create code"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
