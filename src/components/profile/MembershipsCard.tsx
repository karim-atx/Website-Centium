import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { CentredPopup } from "../ui/CentredPopup";
import { PopupMenu } from "../ui/PopupMenu";
import { SwipeActions } from "../ui/SwipeActions";
import { useApp } from "../../context/AppContext";
import { MembershipStatusBadge } from "../marketplace/MembershipStatusBadge";
import {
  endMembership,
  fetchMyMemberships,
  redeemMemberCode,
  respondToMembership,
  type Membership,
} from "../../services/business-members";
import { Check, ChevronRight, LogOut, MoreVertical, Plus, Store, X } from "lucide-react";

// The member's side of a business membership: answer an invitation, redeem a
// code, leave. MO1.5 / MO1.5.1 layout (R15, batch C, C8).
//
// ACCEPT/DECLINE IS THE CALENDAR'S SHAPE, deliberately: somebody else created
// a row about you and the only thing you may write is the answer, so the item
// stays listed after you answer, carrying a badge that says what you said.
// The board does not draw pending invitations; they are kept.
//
// ENDING ONE: swipe the row left (the board's swipe-row, "End membership"),
// or the ⋮ menu, which is the same action for a mouse or keyboard (D12).
// Either way a confirm comes first; it used to be a tap-twice text button.
// Ended memberships stay listed, muted.
//
// REDEEMING IS ITS OWN CONSENT. A code redeemed here creates a membership
// already accepted. With no memberships the code box shows straight away (the
// board's empty card); once there is one, "Join another gym or studio"
// reveals it.

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const MembershipsCard: React.FC = () => {
  const { authUserId, profileReady } = useApp();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ending, setEnding] = useState<Membership | null>(null);
  const [menuFor, setMenuFor] = useState<{ membership: Membership; anchor: HTMLElement } | null>(null);

  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemNote, setRedeemNote] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  const load = async () => {
    if (!authUserId) return;
    const result = await fetchMyMemberships(authUserId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setMemberships(result.memberships);
  };

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchMyMemberships(authUserId);
      if (cancelled) return;
      setLoaded(true);
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

  const confirmEnd = async () => {
    if (!ending) return;
    const id = ending.id;
    setBusyId(id);
    const result = await endMembership(id);
    setBusyId(null);
    setEnding(null);
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

  const codeBox = (
    <>
      <div className="flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setRedeemNote(null);
          }}
          placeholder="Member code"
          aria-label="Member code"
          className="flex-1 min-w-0 rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button onClick={() => void redeem()} disabled={!code.trim() || redeeming}>
          {redeeming ? "…" : "Join"}
        </Button>
      </div>
      {redeemNote && <p className="mt-2 text-xs font-semibold text-charcoal-soft">{redeemNote}</p>}
    </>
  );

  const row = (m: Membership) => (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-2xl bg-cream-soft px-3.5 py-3",
        m.status === "ended" && "opacity-60"
      )}
    >
      <span className="w-11 h-11 rounded-2xl bg-cream-card flex items-center justify-center shrink-0" aria-hidden>
        <Store size={18} className="text-primary-dark" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-charcoal truncate">{m.businessName ?? "A business"}</p>
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
      {m.status === "active" && (
        <button
          type="button"
          onClick={(e) => setMenuFor({ membership: m, anchor: e.currentTarget })}
          aria-label={`Options for ${m.businessName ?? "this membership"}`}
          className="tap w-8 h-8 -me-1.5 rounded-full flex items-center justify-center text-charcoal-soft shrink-0"
        >
          <MoreVertical size={16} />
        </button>
      )}
    </div>
  );

  return (
    <section className="mb-6 animate-fade-slide-up" aria-labelledby="memberships-label">
      <p id="memberships-label" className="section-label text-charcoal-faint mb-2.5">
        Memberships
      </p>

      {error && <p className="mb-2 text-xs font-semibold text-status-high">{error}</p>}

      {memberships.length === 0 ? (
        // The board's empty card: nothing to show is still worth a card,
        // because the code box is how somebody with a code gets anywhere.
        <Card>
          {codeBox}
          {!redeemNote && loaded && (
            <p className="mt-2 text-xs text-charcoal-faint">
              Got a code from a gym or studio? Enter it here to become a member.
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-2.5">
          {memberships.map((m) => (
            <div key={m.id}>
              {m.status === "active" ? (
                <SwipeActions
                  actions={[
                    {
                      key: "end",
                      label: "End membership",
                      icon: <LogOut size={16} />,
                      onClick: () => setEnding(m),
                      destructive: true,
                    },
                  ]}
                >
                  {row(m)}
                </SwipeActions>
              ) : (
                row(m)
              )}
              {/* THE ONLY THING THIS SCREEN MAY WRITE ABOUT AN INVITATION:
                  respond_to_business_membership refuses anyone but the
                  invited person. */}
              {m.status === "pending" && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" fullWidth disabled={busyId === m.id} onClick={() => void answer(m.id, true)}>
                    <Check size={13} /> Accept
                  </Button>
                  <Button size="sm" fullWidth variant="outline" disabled={busyId === m.id} onClick={() => void answer(m.id, false)}>
                    <X size={13} /> Decline
                  </Button>
                </div>
              )}
            </div>
          ))}

          {joinOpen ? (
            <Card>{codeBox}</Card>
          ) : (
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="tap w-full flex items-center gap-3 rounded-2xl border border-charcoal/[0.08] bg-cream-card px-3.5 py-3 text-start"
            >
              <span className="w-10 h-10 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
                <Plus size={18} className="text-primary-dark" />
              </span>
              <span className="flex-1 min-w-0 text-[15px] font-semibold text-charcoal">Join another gym or studio</span>
              <ChevronRight size={16} className="text-charcoal-faint shrink-0 rtl:-scale-x-100" aria-hidden />
            </button>
          )}
        </div>
      )}

      <PopupMenu
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        anchor={menuFor?.anchor ?? null}
        width={200}
        options={[{ value: "end", label: "End membership", icon: <LogOut size={15} />, destructive: true }]}
        onSelect={() => {
          const m = menuFor?.membership ?? null;
          setMenuFor(null);
          setEnding(m);
        }}
      />

      <CentredPopup
        open={!!ending}
        onClose={() => busyId === null && setEnding(null)}
        title="End this membership?"
        icon={<LogOut size={22} />}
        body={`You'll stop being a member of ${ending?.businessName ?? "this business"}.`}
      >
        {/* The shared destructive fill, as the account-deletion confirm. */}
        <button
          type="button"
          onClick={() => void confirmEnd()}
          disabled={busyId !== null}
          className="tap w-full rounded-[14px] h-12 bg-status-high text-white dark:text-[#0D0B1A] text-[14px] font-bold disabled:opacity-60"
        >
          {busyId ? "Ending…" : "End membership"}
        </button>
        <button
          type="button"
          onClick={() => setEnding(null)}
          disabled={busyId !== null}
          className="tap mt-3 w-full text-center text-sm font-semibold text-charcoal-soft"
        >
          Keep membership
        </button>
      </CentredPopup>
    </section>
  );
};
