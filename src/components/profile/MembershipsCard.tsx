import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { CentredPopup } from "../ui/CentredPopup";
import { CtaButton } from "../ui/PinnedCta";
import { PopupMenu } from "../ui/PopupMenu";
import { SwipeActions } from "../ui/SwipeActions";
import { useApp } from "../../context/AppContext";
import { MembershipStatusBadge } from "../marketplace/MembershipStatusBadge";
import {
  endMembership,
  fetchMyMemberships,
  newMemberships,
  OFFLINE_LINE,
  PREVIEW_UNUSABLE,
  previewLines,
  previewMemberCode,
  redeemedLine,
  redeemMemberCode,
  respondToMembership,
  type CodePreview,
  type Membership,
} from "../../services/business-members";
import { useOnline } from "../../hooks/useOnline";
import { useNavigate } from "react-router-dom";
import { MemberTag } from "../marketplace/MemberTag";
import { endMyGymMembership, fetchGymBusinessIds, fetchMembershipTerms, fetchMyGymMemberships, type GymMembership } from "../../services/venues";
import { NameSharingCard } from "./NameSharingCard";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { commitmentLines, dayMonthYear, membershipTag, validRange } from "../../services/venues/venueLogic";
import { GRANTED_LABEL } from "../../services/venues/consoleLogic";
import { Check, ChevronRight, Dumbbell, LogOut, MoreVertical, Plus, Store, Trash2, X } from "lucide-react";

// The member's side of a business membership: answer an invitation, redeem a
// code, leave. MO1.5 / MO1.5.1 layout (R15, batch C, C8).
//
// ACCEPT/DECLINE IS THE CALENDAR'S SHAPE, deliberately: somebody else created
// a row about you and the only thing you may write is the answer, so the item
// stays listed after you answer, carrying a badge that says what you said.
// The board does not draw pending invitations; they are kept.
//
// ENDING ONE: swipe the row left (the board's swipe-row, "End membership"; a
// mouse drags it the same way; the keyboard focuses the row and presses
// ArrowLeft), or the ⋮ menu, which is the same action for a mouse or
// keyboard (D12). Restore round 2 (user, 2026-10-07): the ⋮ and its menu are
// back as on main, in Foundations' dropdown. Either way a confirm comes first
// (it guards ending a paid membership by a stray swipe).
// Ended memberships stay listed, muted.
//
// REDEEMING IS ITS OWN CONSENT. A code redeemed here creates a membership
// already accepted. With no memberships the code box shows straight away (the
// board's empty card); once there is one, "Join another gym or studio"
// reveals it.
//
// CN (Batch 2): a code may also grant a membership or pass. "Check code"
// reads preview_business_member_code first and shows the business, what the
// code comes with (plan and type, at which gym), until when it works, and the
// gym's minimum age when it's above the platform's 16; Join appears there. No
// row means the code can't be used, and we don't guess why. After joining,
// the server's sentence says what happened (granted, already held at that
// gym, or a plain member code) and my_gym_memberships is re-read to name the
// new membership or pass (plan_type says which). A refused code is not used
// up: it stays in the box to correct or retry. A granted row is labelled
// "Granted with a code".
//
// GYM MEMBERSHIPS BOUGHT ON EXPLORE (backend stage 4b, MO1.4.2.2.1 note:
// "membership appears in Profile") are listed first, from
// my_gym_memberships(), in the same row with the venue's tag (Member, or the
// amber "Pay on your first visit" until the gym marks it paid). A row opens
// the gym page, where the pass is.
//
// B7 MB-05: the member may end their own venue membership (end_gym_membership,
// either side). An active row has a ⋮ with "End membership": at the end of the
// paid period by default (the pass keeps working until then), or today. An
// upcoming renewal says "Starts {date}" (membershipTag) and grants nothing yet.

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const MembershipsCard: React.FC = () => {
  const { authUserId, profileReady } = useApp();
  const online = useOnline();
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [gymMemberships, setGymMemberships] = useState<GymMembership[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ending, setEnding] = useState<Membership | null>(null);
  const [menuFor, setMenuFor] = useState<{ membership: Membership; anchor: HTMLElement } | null>(null);
  const [gymMenu, setGymMenu] = useState<{ membership: GymMembership; anchor: HTMLElement } | null>(null);
  const [gymEnding, setGymEnding] = useState<GymMembership | null>(null);
  const [gymBusy, setGymBusy] = useState(false);
  const [gymError, setGymError] = useState<string | null>(null);
  /** Ended at the period end this session: my_gym_memberships() does not return cancel_at_period_end. */
  const [endsOn, setEndsOn] = useState<Record<string, string>>({});
  /** Each membership's plan terms, information only (never blocks ending). */
  const [terms, setTerms] = useState<Map<string, string[]>>(new Map());
  useEffect(() => {
    if (gymMemberships.length === 0) return;
    let cancelled = false;
    void fetchMembershipTerms(gymMemberships).then((t) => {
      if (cancelled) return;
      setTerms(new Map([...t].map(([id, x]) => [id, commitmentLines(x.minimumTermMonths, x.noticeDays)] as const).filter(([, l]) => l.length > 0)));
    });
    return () => {
      cancelled = true;
    };
  }, [gymMemberships]);

  /** Business id → the name to show on the Your name card (MB-01). */
  const [gymBiz, setGymBiz] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (gymMemberships.length === 0) return;
    let cancelled = false;
    void fetchGymBusinessIds(gymMemberships.map((m) => m.gymId)).then((b) => {
      if (!cancelled) setGymBiz(b);
    });
    return () => {
      cancelled = true;
    };
  }, [gymMemberships]);
  const businessNames = new Map<string, string>();
  for (const g of gymMemberships) {
    const b = gymBiz.get(g.gymId);
    if (b && !businessNames.has(b)) businessNames.set(b, g.gymName);
  }
  for (const m of memberships) if (m.businessName && !businessNames.has(m.businessId)) businessNames.set(m.businessId, m.businessName);

  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [checking, setChecking] = useState(false);
  /** The last preview, for the code it was read for (null value: the code can't be used). */
  const [preview, setPreview] = useState<{ code: string; value: CodePreview | null } | null>(null);
  const current = preview && preview.code === code.trim() ? preview : null;
  /** A refusal (kept beside the code box) or the success line (shown above the list). */
  const [redeemNote, setRedeemNote] = useState<{ text: string; ok: boolean } | null>(null);
  const [tick, setTick] = useState(0);
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
      const [result, gyms] = await Promise.all([fetchMyMemberships(authUserId), fetchMyGymMemberships()]);
      if (cancelled) return;
      setLoaded(true);
      if (gyms.ok) setGymMemberships(gyms.value);
      if (!result.ok || !gyms.ok) {
        // Short, beside its Try again (lead, Batch 2); offline keeps its own line.
        const msg = !result.ok ? result.message : gyms.ok ? null : gyms.message;
        setError(msg === OFFLINE_MESSAGE ? msg : "Couldn't load your memberships.");
        if (result.ok) setMemberships(result.memberships);
        return;
      }
      setError(null);
      setMemberships(result.memberships);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, tick]);

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

  const endGym = async (atPeriodEnd: boolean) => {
    const m = gymEnding;
    if (!m || gymBusy) return;
    setGymBusy(true);
    setGymError(null);
    const r = await endMyGymMembership(m.id, atPeriodEnd);
    setGymBusy(false);
    if (!r.ok) {
      setGymError(r.message);
      return;
    }
    setGymEnding(null);
    if (r.value === "active" && m.expiresOn) setEndsOn((e) => ({ ...e, [m.id]: m.expiresOn as string }));
    const gyms = await fetchMyGymMemberships();
    if (gyms.ok) setGymMemberships(gyms.value);
  };

  const check = async () => {
    if (!code.trim() || checking || redeeming) return;
    if (!online) return setRedeemNote({ text: OFFLINE_LINE, ok: false });
    setChecking(true);
    setRedeemNote(null);
    const asked = code.trim();
    const r = await previewMemberCode(asked);
    setChecking(false);
    if (!r.ok) return setRedeemNote({ text: r.message, ok: false });
    setPreview({ code: asked, value: r.value });
  };

  const redeem = async () => {
    if (!code.trim() || redeeming || !authUserId) return;
    // Refusals keep the code in the box: a refused code is not used up.
    if (!online) return setRedeemNote({ text: OFFLINE_LINE, ok: false });
    setRedeeming(true);
    setRedeemNote(null);
    const before = gymMemberships;
    // The previewed business, in case the membership list can't be re-read.
    const previewed = current?.value?.businessName ?? null;
    const result = await redeemMemberCode(code);
    if (!result.ok) {
      setRedeeming(false);
      setRedeemNote({ text: result.message, ok: false });
      return;
    }
    setCode("");
    setPreview(null);
    // What came with the code: whatever my_gym_memberships now holds that it did not.
    const [mine, gyms] = await Promise.all([fetchMyMemberships(authUserId), fetchMyGymMemberships()]);
    setRedeeming(false);
    if (mine.ok) setMemberships(mine.memberships);
    if (gyms.ok) setGymMemberships(gyms.value);
    const listed = mine.ok ? mine.memberships.find((m) => m.businessId === result.businessId)?.businessName : undefined;
    const business = listed || previewed;
    const granted = gyms.ok ? newMemberships(before, gyms.value) : [];
    setRedeemNote({ text: redeemedLine(granted, business, result.outcome, !gyms.ok || !!gyms.value.some((g) => g.cachedAt)), ok: true });
  };

  const codeBox = (helper: string) => (
    <>
      <div className="flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (redeemNote && !redeemNote.ok) setRedeemNote(null);
          }}
          placeholder="Member code"
          aria-label="Member code"
          // Foundations Inputs (MO1.5 row 3, measured: 255 × 44, radius 12):
          // height 44, radius 12, padding 0 14, value 14/600.
          className="flex-1 min-w-0 h-11 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 text-sm font-semibold text-charcoal placeholder:font-normal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button className="shrink-0" variant={current?.value ? "outline" : "primary"} onClick={() => void check()} disabled={!code.trim() || checking || redeeming}>
          {checking ? "Checking…" : "Check code"}
        </Button>
      </div>
      {current?.value && (
        <div className="mt-2.5 rounded-[14px] bg-cream-soft px-3.5 py-3" role="status">
          <p className="text-[14px] font-bold text-charcoal break-words">{current.value.businessName}</p>
          {previewLines(current.value).map((l) => (
            <p key={l} className="mt-1 text-xs text-charcoal-soft break-words">
              {l}
            </p>
          ))}
          <Button className="mt-3" fullWidth onClick={() => void redeem()} disabled={redeeming}>
            {redeeming ? "Joining…" : "Join"}
          </Button>
        </div>
      )}
      {redeemNote && !redeemNote.ok ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-status-high">
          {redeemNote.text}
        </p>
      ) : current && !current.value ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-status-high">
          {PREVIEW_UNUSABLE}
        </p>
      ) : (
        !current && <p className="mt-2.5 text-xs text-charcoal-faint">{helper}</p>
      )}
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
      {/* D12 (restore round 2): the visible path to End membership. The 16 pt
          ⋮ in its pre-redesign text.soft; a 32 wide, 44 tall target that
          sits inside the row's 16 padding. */}
      {m.status === "active" && (
        <button
          type="button"
          onClick={(e) => setMenuFor({ membership: m, anchor: e.currentTarget })}
          aria-label={`Options for ${m.businessName ?? "this membership"}`}
          aria-haspopup="menu"
          aria-expanded={menuFor?.membership.id === m.id}
          className="tap w-8 h-11 -my-1 -me-2 rounded-lg flex items-center justify-center text-charcoal-soft shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent"
        >
          <MoreVertical size={16} aria-hidden />
        </button>
      )}
    </div>
  );

  const gymRow = (m: GymMembership) => {
    // 20261121020000: my_gym_memberships() returns cancel_at_period_end, so
    // "Ends {date}" survives a reload.
    const ends = endsOn[m.id] ?? (m.cancelAtPeriodEnd && m.expiresOn ? m.expiresOn : undefined);
    const lines = terms.get(m.id);
    const tag = ends ? { label: `Ends ${dayMonthYear(ends)}`, tone: "muted" as const } : membershipTag(m);
    // Explicit per status (MB-05): only a running membership can be ended here.
    const canEnd = m.status === "active" && !ends;
    return (
      <div key={m.id} className={clsx("flex items-center gap-1 rounded-[18px] bg-primary-pale", m.status === "expired" || m.status === "cancelled" ? "opacity-60" : undefined)}>
      <button
        type="button"
        onClick={() => navigate(`/app/marketplace/gym?id=${encodeURIComponent(m.gymId)}`)}
        className="tap flex-1 min-w-0 text-start flex items-center gap-3 p-4"
      >
        <span className="w-10 h-10 rounded-xl bg-cream-card flex items-center justify-center shrink-0" aria-hidden>
          <Dumbbell size={18} className="text-primary-dark" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-charcoal truncate">{m.gymName}</span>
          <span className="block text-xs text-charcoal-faint truncate">
            {m.planName} · {validRange(m.startedOn, m.expiresOn)}
          </span>
          {m.granted && <span className="block text-[11.5px] font-semibold text-charcoal-soft truncate">{GRANTED_LABEL}</span>}
          {lines && <span className="block text-[11.5px] text-charcoal-faint truncate">{lines.join(" · ")}</span>}
        </span>
        <MemberTag label={tag.label} tone={tag.tone} />
      </button>
      {canEnd && (
        <button
          type="button"
          onClick={(e) => setGymMenu({ membership: m, anchor: e.currentTarget })}
          aria-label={`Options for ${m.gymName}`}
          aria-haspopup="menu"
          aria-expanded={gymMenu?.membership.id === m.id}
          className="tap w-8 h-11 me-2 rounded-lg flex items-center justify-center text-charcoal-soft shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent"
        >
          <MoreVertical size={16} aria-hidden />
        </button>
      )}
      </div>
    );
  };

  return (
    <section className="mb-6 animate-fade-slide-up" aria-labelledby="memberships-label">
      {/* MO1.5 row 3 (2x frame): "Section label" 10.5/700 uppercase, 14
          line, 0.12em, no rule, inset 4 (glyphs from x 20.5), 8 above the
          card. Pre-R1 ink kept (light-colour rule). */}
      <p id="memberships-label" className="px-1 mb-2 text-[10.5px] leading-[14px] font-bold uppercase tracking-[0.12em] text-charcoal-faint">
        Memberships
      </p>

      {error && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p role="alert" className="text-xs font-semibold text-status-high">
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setTick((t) => t + 1);
            }}
            className="tap min-h-11 px-3 shrink-0 rounded-xl text-xs font-bold text-primary-dark"
          >
            Try again
          </button>
        </div>
      )}
      {redeemNote?.ok && (
        <p role="status" className="mb-2 rounded-[14px] bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-charcoal">
          {redeemNote.text}
        </p>
      )}

      {!loaded ? (
        // MO1.5 States, Loading: a skeleton block where the card sits
        // (surface.soft, the card's radius 18; the empty card is 113 tall on
        // the 2x frame, y 640–866), in place of the code box flashing in.
        <div className="h-[113px] rounded-[18px] bg-cream-soft animate-skeleton-pulse" aria-hidden />
      ) : memberships.length === 0 && gymMemberships.length === 0 ? (
        // The board's empty card: nothing to show is still worth a card,
        // because the code box is how somebody with a code gets anywhere.
        // MO1.5 row 3 (2x frame): radius 18, padding 14; the helper 10
        // under the field.
        <Card padded={false} className="!rounded-[18px] p-3.5">
          {codeBox("Got a code from a gym or studio? Enter it and check what it comes with before you join.")}
        </Card>
      ) : (
        // MO1.5.1: 8 between the rows (2x frame: 783 → 800).
        <div className="space-y-2">
          {gymMemberships.map(gymRow)}
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
            <Card padded={false} className="!rounded-[18px] p-3.5">{codeBox("Check what the code comes with before you join.")}</Card>
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

      {loaded && <NameSharingCard names={businessNames} />}

      {/* D12 (restore round 2): End membership without a swipe, in
          Foundations' dropdown (the 36 pt rows of the Journal / Habits
          menus). It opens the same confirm as the swipe tile. */}
      <PopupMenu
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        anchor={menuFor?.anchor ?? null}
        width={200}
        rowLineHeight={16}
        options={[{ value: "end", label: "End membership", icon: <LogOut size={15} strokeWidth={1.75} />, destructive: true }]}
        onSelect={() => {
          const m = menuFor?.membership ?? null;
          setMenuFor(null);
          setEnding(m);
        }}
      />

      <PopupMenu
        open={!!gymMenu}
        onClose={() => setGymMenu(null)}
        anchor={gymMenu?.anchor ?? null}
        width={200}
        rowLineHeight={16}
        options={[{ value: "end", label: "End membership", icon: <LogOut size={15} strokeWidth={1.75} />, destructive: true }]}
        onSelect={() => {
          const m = gymMenu?.membership ?? null;
          setGymMenu(null);
          setGymError(null);
          setGymEnding(m);
        }}
      />

      <CentredPopup
        open={!!gymEnding}
        onClose={() => !gymBusy && setGymEnding(null)}
        title="End your membership?"
        icon={<LogOut size={22} />}
        body={
          gymEnding?.expiresOn
            ? `Your pass keeps working until ${dayMonthYear(gymEnding.expiresOn)}, then your membership at ${gymEnding.gymName} ends. The gym can see that you ended it.`
            : `Your membership at ${gymEnding?.gymName ?? "this gym"} ends today.`
        }
      >
        {gymEnding && terms.get(gymEnding.id) && (
          <p className="mb-3 text-center text-xs font-semibold text-charcoal-soft">
            Your plan's terms: {terms.get(gymEnding.id)!.join(" · ")}.
          </p>
        )}
        {gymError && <p role="alert" className="mb-3 text-xs font-semibold text-status-high">{gymError}</p>}
        {gymEnding?.expiresOn && (
          <button
            type="button"
            onClick={() => void endGym(true)}
            disabled={gymBusy}
            className="tap w-full rounded-[14px] h-12 bg-status-high text-white dark:text-[#0D0B1A] text-[14px] font-bold disabled:opacity-60"
          >
            {gymBusy ? "Ending…" : `End on ${dayMonthYear(gymEnding.expiresOn)}`}
          </button>
        )}
        <button
          type="button"
          onClick={() => void endGym(false)}
          disabled={gymBusy}
          className={gymEnding?.expiresOn ? "tap mt-3 w-full text-center text-sm font-semibold text-status-high disabled:opacity-60" : "tap w-full rounded-[14px] h-12 bg-status-high text-white dark:text-[#0D0B1A] text-[14px] font-bold disabled:opacity-60"}
        >
          {gymEnding?.expiresOn ? "End it today instead (your pass stops now)" : gymBusy ? "Ending…" : "End membership"}
        </button>
        <button
          type="button"
          onClick={() => setGymEnding(null)}
          disabled={gymBusy}
          className="tap mt-3 w-full text-center text-sm font-semibold text-charcoal-soft"
        >
          Keep membership
        </button>
      </CentredPopup>

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
