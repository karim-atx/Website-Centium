import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { CentredPopup } from "../ui/CentredPopup";
import { CtaButton } from "../ui/PinnedCta";
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
import { Check, ChevronRight, LogOut, Plus, Store, Trash2, X } from "lucide-react";

// The member's side of a business membership: answer an invitation, redeem a
// code, leave. MO1.5 / MO1.5.1 layout (R15, batch C, C8).
//
// ACCEPT/DECLINE IS THE CALENDAR'S SHAPE, deliberately: somebody else created
// a row about you and the only thing you may write is the answer, so the item
// stays listed after you answer, carrying a badge that says what you said.
// The board does not draw pending invitations; they are kept.
//
// ENDING ONE: swipe the row left (the board's swipe-row, "End membership"; a
// mouse drags it the same way). Handover-complete pass: the ⋮ menu (D12, not
// drawn) is gone; the keyboard path is the swipe row's own, with nothing
// drawn (focus the row, ArrowLeft). A confirm comes first (kept: it guards
// ending a paid membership by a stray swipe).
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
          // Foundations Inputs (MO1.5 row 3, measured: 255 × 44, radius 12):
          // height 44, radius 12, padding 0 14, value 14/600.
          className="flex-1 min-w-0 h-11 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 text-sm font-semibold text-charcoal placeholder:font-normal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
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
        // MO1.5.1 anatomy row 3 (2x frame): 72 tall, radius 18, padding 16,
        // a 40 white tile radius 12 (x 64–143, y 672–751). Decision 23
        // (item 83): the frame's #F0EDF9 row (primary-pale) and white pill.
        "flex items-center gap-3 rounded-[18px] bg-primary-pale p-4",
        m.status === "ended" && "opacity-60"
      )}
    >
      <span className="w-10 h-10 rounded-xl bg-cream-card flex items-center justify-center shrink-0" aria-hidden>
        <Store size={18} className="text-primary-dark" />
      </span>
      <div className="min-w-0 flex-1">
        {/* MO1.5.1 anatomy row 3: title 15/700. */}
        <p className="text-[15px] font-bold text-charcoal truncate">{m.businessName ?? "A business"}</p>
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
      {/* White on the lavender row, as drawn; the shared badge's own fills
          stay for the business's member list. */}
      <MembershipStatusBadge status={m.status} className="!bg-cream-card" />
    </div>
  );

  return (
    <section className="mb-6 animate-fade-slide-up" aria-labelledby="memberships-label">
      {/* MO1.5 row 3 (2x frame): "Section label" 10.5/700 uppercase, 14
          line, 0.12em, no rule, inset 4 (glyphs from x 20.5), 8 above the
          card. Pre-R1 ink kept (light-colour rule). */}
      <p id="memberships-label" className="px-1 mb-2 text-[10.5px] leading-[14px] font-bold uppercase tracking-[0.12em] text-charcoal-faint">
        Memberships
      </p>

      {error && <p className="mb-2 text-xs font-semibold text-status-high">{error}</p>}

      {!loaded ? (
        // MO1.5 States, Loading: a skeleton block where the card sits
        // (surface.soft, the card's radius 18; the empty card is 113 tall on
        // the 2x frame, y 640–866), in place of the code box flashing in.
        <div className="h-[113px] rounded-[18px] bg-cream-soft animate-pulse" aria-hidden />
      ) : memberships.length === 0 ? (
        // The board's empty card: nothing to show is still worth a card,
        // because the code box is how somebody with a code gets anywhere.
        // MO1.5 row 3 (2x frame): radius 18, padding 14; the helper 10
        // under the field.
        <Card padded={false} className="!rounded-[18px] p-3.5">
          {codeBox}
          {!redeemNote && (
            <p className="mt-2.5 text-xs text-charcoal-faint">
              Got a code from a gym or studio? Enter it here to become a member.
            </p>
          )}
        </Card>
      ) : (
        // MO1.5.1: 8 between the rows (2x frame: 783 → 800).
        <div className="space-y-2">
          {memberships.map((m) => (
            <div key={m.id}>
              {m.status === "active" ? (
                <SwipeActions
                  radius={18}
                  keyboardLabel={`${m.businessName ?? "Membership"}. Press left arrow for End membership`}
                  actions={[
                    {
                      key: "end",
                      label: "End membership",
                      // Foundations swipe-row (Membership card): a Trash2 16 tile.
                      icon: <Trash2 size={16} />,
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
              {/* Decision 23 (item 85): the Pinned CTA row pair, in place:
                  primary.tint secondary first, then the filled primary
                  (48, radius 14, gap 8, 15 icons). */}
              {m.status === "pending" && (
                <div className="flex gap-2 mt-2">
                  <CtaButton
                    size="page"
                    variant="secondary"
                    label="Decline"
                    icon={<X size={15} aria-hidden />}
                    disabled={busyId === m.id}
                    onClick={() => void answer(m.id, false)}
                  />
                  <CtaButton
                    size="page"
                    label="Accept"
                    icon={<Check size={15} aria-hidden />}
                    disabled={busyId === m.id}
                    onClick={() => void answer(m.id, true)}
                  />
                </div>
              )}
            </div>
          ))}

          {joinOpen ? (
            <Card padded={false} className="!rounded-[18px] p-3.5">{codeBox}</Card>
          ) : (
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="tap w-full flex items-center gap-3 rounded-[18px] border border-charcoal/[0.08] bg-cream-card px-3.5 py-3 text-start"
            >
              {/* MO1.5.1: Plus 16/1.75 in a 32 r10 tile, row 58 with 12
                  padding, radius 18 (2x frame: tile 826–889, row 800–915). */}
              <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
                <Plus size={16} strokeWidth={1.75} className="text-primary-dark" />
              </span>
              <span className="flex-1 min-w-0 text-[15px] font-semibold text-charcoal">Join another gym or studio</span>
              <ChevronRight size={15} className="text-charcoal-faint shrink-0 rtl:-scale-x-100" aria-hidden />
            </button>
          )}
        </div>
      )}

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
