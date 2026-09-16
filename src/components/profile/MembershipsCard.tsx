import React, { useCallback, useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { MembershipStatusBadge } from "../marketplace/MembershipStatusBadge";
import {
  endMembership,
  fetchMyMemberships,
  redeemMemberCode,
  respondToMembership,
  type Membership,
} from "../../services/business-members";
import { Check, X, Store } from "lucide-react";

// The member's side of a business membership: answer an invitation, redeem a
// code, leave.
//
// ACCEPT/DECLINE IS THE CALENDAR'S SHAPE, deliberately. A membership invitation
// and a calendar invitation are the same idea — somebody else created a row
// about you and the only thing you may write is the answer — so this reuses
// that layout rather than inventing a second notification vocabulary: the item
// stays listed after you answer, carrying a badge that says what you said.
//
// REDEEMING IS ITS OWN CONSENT. A code redeemed here creates a membership
// already accepted, so it appears as active with nothing to answer. That is
// why the redeem box and the invitation list sit in one card: they are two
// doors into the same relationship.

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const MembershipsCard: React.FC = () => {
  const { authUserId, profileReady } = useApp();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemNote, setRedeemNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authUserId) return;
    const result = await fetchMyMemberships(authUserId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setMemberships(result.memberships);
  }, [authUserId]);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchMyMemberships(authUserId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setMemberships(result.memberships);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady]);

  const answer = async (id: string, accept: boolean) => {
    setBusyId(id);
    const result = await respondToMembership(id, accept);
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    await load();
  };

  const leave = async (id: string) => {
    if (confirmEnd !== id) {
      setConfirmEnd(id);
      setTimeout(() => setConfirmEnd((c) => (c === id ? null : c)), 3000);
      return;
    }
    setConfirmEnd(null);
    setBusyId(id);
    const result = await endMembership(id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    await load();
  };

  const redeem = async () => {
    if (!code.trim() || redeeming) return;
    setRedeeming(true);
    const result = await redeemMemberCode(code);
    setRedeeming(false);
    setRedeemNote(result.message);
    if (!result.ok) return;
    setCode("");
    await load();
  };

  // Nothing to show and nothing pending is still worth a card, because the
  // redeem box is how somebody with a code in their hand gets anywhere.
  return (
    <Card className="mb-6 animate-fade-slide-up">
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Memberships
      </p>

      {error && <p className="mb-2 text-xs font-semibold text-status-high">{error}</p>}

      <div className="space-y-2.5 mb-4">
        {memberships.map((m) => (
          <div key={m.id} className="rounded-2xl bg-cream-soft px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                <Store size={15} className="text-primary-dark" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal truncate">
                  {m.businessName ?? "A business"}
                </p>
                <p className="text-xs text-charcoal-faint truncate">
                  {m.planName ? `${m.planName} · ` : ""}
                  {m.status === "ended" && m.endedAt
                    ? `Ended ${dateLabel(m.endedAt)}`
                    : m.status === "pending"
                    ? `Invited ${dateLabel(m.invitedAt)}`
                    : m.respondedAt
                    ? `Since ${dateLabel(m.respondedAt)}`
                    : dateLabel(m.invitedAt)}
                </p>
              </div>
              <MembershipStatusBadge status={m.status} />
            </div>

            {/* THE ONLY THING THIS SCREEN MAY WRITE ABOUT AN INVITATION —
                respond_to_business_membership refuses anyone but the invited
                person, so this is the shape of what the server accepts, not a
                UI convention. */}
            {m.status === "pending" && (
              <div className="flex gap-2 mt-2.5">
                <Button
                  size="sm"
                  fullWidth
                  disabled={busyId === m.id}
                  onClick={() => void answer(m.id, true)}
                >
                  <Check size={13} /> Accept
                </Button>
                <Button
                  size="sm"
                  fullWidth
                  variant="outline"
                  disabled={busyId === m.id}
                  onClick={() => void answer(m.id, false)}
                >
                  <X size={13} /> Decline
                </Button>
              </div>
            )}

            {/* Either side may end it; this is the member's half. */}
            {m.status === "active" && (
              <button
                onClick={() => void leave(m.id)}
                disabled={busyId === m.id}
                className="tap mt-2 text-[11px] font-semibold text-status-high"
              >
                {confirmEnd === m.id ? "Tap again to end this membership" : "End membership"}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setRedeemNote(null);
          }}
          placeholder="Member code"
          className="flex-1 rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button onClick={() => void redeem()} disabled={!code.trim() || redeeming}>
          {redeeming ? "…" : "Join"}
        </Button>
      </div>
      {redeemNote && <p className="mt-2 text-xs font-semibold text-charcoal-soft">{redeemNote}</p>}
      {memberships.length === 0 && !redeemNote && (
        <p className="mt-2 text-xs text-charcoal-faint">
          Got a code from a gym or studio? Enter it here to become a member.
        </p>
      )}
    </Card>
  );
};
