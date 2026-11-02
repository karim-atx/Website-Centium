import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { PopupMenu } from "../ui/PopupMenu";
import { initials } from "../professionals/typeColour";
import { fetchVenueMembers, markMembershipPaid } from "../../services/venues/console";
import { offerPromotionUsed } from "../../components/promotions/promotionUsed";

import { MEMBER_FILTERS, MEMBERS_PAGE_SIZE, methodLabel, money, venueMemberTag, isMaskedLabel, type MembershipStatus, type VenueMember } from "../../services/venues/consoleLogic";
import { dayMonthYear } from "../../services/venues/venueLogic";
import { useOnline } from "../../hooks/useOnline";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { useNavigate } from "react-router-dom";
import { startMemberThread } from "../../services/messaging";
import { DIVIDER, VAvatar, VCardError, VDetailCard, VDetailRow, VFooterLink, VOfflineLine, VPill, VSkeletonRows, VTextTabs, type PillTone } from "./VenueKit";
import { appLocale } from "../../i18n/format";
import { fetchBusinessBookingPauses, liftBookingPause, pausedChip, PAUSES_COPY, type MemberPause } from "../../services/no-shows";
import { t, tn, tx } from "../../i18n/core";
import { formatShortDate } from "../../utils/date";

// A venue's member roster (stage A4, venue_members()): THE one roster
// component (V6-163, Q-R1), in the OP1 083 "Booked members" language
// (OURS-OP1-venue-members-roster; OURS-AN4-member-rosters adopts it). Two
// modes: "card" on the console (capped 3, "See all {n}") and "page" (the
// full list with the K14 status tabs and paging).
//
// A FIRST NAME AND A MINOR FLAG, NOTHING MORE (the contract's line). Unpaid
// rows come first from the server (they are the ones somebody must act on);
// total_count drives the paging so there is no second call. A row with
// something to do opens a K20 menu: "Mark as paid" while the payment is
// pending (mark_gym_membership_paid, needs front_desk) and "Message" for
// staff holding messages (B7 MB-02 start_member_thread: one thread per
// member whoever presses it; it opens in Messages).
//
// Round F2 AB4 (Karim F22): for staff holding members, a member whose class
// bookings are paused (business_booking_pauses, matched on person_id) shows
// "Paused until {date}", and the row's menu offers "Lift pause"
// (lift_booking_pause; the member is told).

/** K8 tone for a member's tag (Valid good, Awaiting payment caution, else soft; an upcoming renewal "Starts {date}", MB-05). */
function passPill(m: VenueMember): { tone: PillTone; label: string } {
  const tag = venueMemberTag(m);
  // venueMemberTag()'s label (consoleLogic passStateTag, shared with the business pages), in the app's language.
  const label =
    m.passState === "upcoming"
      ? t("Starts {date}", { date: dayMonthYear(m.startedOn) })
      : m.passState === "valid"
        ? tx("Valid", "pass state")
        : m.passState === "awaiting_payment"
          ? t("Awaiting payment")
          : m.passState === "expired"
            ? t("Expired")
            : m.passState === "cancelled"
              ? t("Cancelled")
              : m.passState === "refunded"
                ? t("Refunded")
                : t("Status unavailable");
  return { label, tone: tag.tone === "member" ? "good" : tag.tone === "pending" ? "caution" : "soft" };
}

// "Paid {d Mon}" from venue_members.paid_at (20261120080000); a fact about the
// row, never a sum (Revenue sums B8's payment ledger, not these rows). CN: a
// membership granted by a member code was never sold, so it shows the label
// instead of a $0 cash payment.
/** "Paid Oct 2" (consoleLogic paidLine's rule), in the app's language. */
function paidText(m: Pick<VenueMember, "paidAt" | "paymentStatus">): string | null {
  if (!m.paidAt || m.paymentStatus !== "paid") return null;
  const d = new Date(m.paidAt);
  return Number.isNaN(d.getTime()) ? null : t("Paid {date}", { date: formatShortDate(d, { day: "numeric", month: "short" }) });
}

const memberFact = (m: VenueMember) =>
  (m.granted ? [m.planName, t("Granted with a code")] : [m.planName, money(m.priceAgreed), methodLabel(m.paymentMethod) ? t(methodLabel(m.paymentMethod)) : "", paidText(m)]).filter(Boolean).join(" · ");
const memberDates = (m: VenueMember) =>
  m.expiresOn ? t("{start} to {end}", { start: dayMonthYear(m.startedOn), end: dayMonthYear(m.expiresOn) }) : t("From {date}", { date: dayMonthYear(m.startedOn) });

/** "1–20 of 64" (consoleLogic pageLine's rule). */
const pageText = (offset: number, shown: number, total: number) =>
  total === 0 || shown === 0 ? "" : t("{from}–{to} of {total}", { from: offset + 1, to: offset + shown, total });

/** "12 active memberships" for the page header under a status filter. */
function statusCount(s: MembershipStatus, n: number, count: string): string {
  if (s === "active") return tn(n, "{count} active membership", "{count} active memberships", { count });
  if (s === "expired") return tn(n, "{count} expired membership", "{count} expired memberships", { count });
  if (s === "cancelled") return tn(n, "{count} cancelled membership", "{count} cancelled memberships", { count });
  return tn(n, "{count} upcoming membership", "{count} upcoming memberships", { count });
}

/** "No active memberships at this venue." */
const noneWith = (s: MembershipStatus) =>
  s === "active" ? t("No active memberships at this venue.") : s === "expired" ? t("No expired memberships at this venue.") : s === "cancelled" ? t("No cancelled memberships at this venue.") : t("No upcoming memberships at this venue.");

/** A status word for the filter tabs and the header ("Active" is a membership's state here). */
const statusLabel = (s: MembershipStatus | null) =>
  s === null ? t("All") : s === "active" ? tx("Active", "membership status") : s === "expired" ? t("Expired") : s === "cancelled" ? t("Cancelled") : t("Upcoming");

type Filter = "all" | MembershipStatus;

export function VenueMembersRoster({
  gymId,
  mode = "card",
  onSeeAll,
  onToast,
  onChanged,
  refreshKey = 0,
  id,
}: {
  gymId: string;
  mode?: "card" | "page";
  onSeeAll?: () => void;
  onToast?: (message: string) => void;
  /** After a mark-paid, so the console figures reload. */
  onChanged?: () => void;
  refreshKey?: number;
  id?: string;
}) {
  const online = useOnline();
  const access = useConsoleAccess();
  const deskOk = access.meets("front_desk") || access.failed;
  const canMessage = access.meets("messages") && !!access.businessId;
  const canPause = access.meets("members") && !!access.businessId;
  const [pauses, setPauses] = useState<Map<string, MemberPause>>(new Map());
  const [pauseTick, setPauseTick] = useState(0);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<{ key: string; members: VenueMember[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [menu, setMenu] = useState<{ member: VenueMember; anchor: HTMLElement } | null>(null);
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const lastKey = useRef<string>("");
  const status = filter === "all" ? null : filter;
  const card = mode === "card";
  const limit = card ? 3 : MEMBERS_PAGE_SIZE;
  const key = `${gymId}|${status ?? ""}|${offset}|${limit}`;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchVenueMembers(gymId, status, limit, offset);
      if (cancelled) return;
      if (!r.ok) {
        // A failed page keeps the previous one on screen.
        setError(r.message);
        return;
      }
      setError(null);
      lastKey.current = key;
      setPage({ key, ...r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId, status, offset, limit, key, refreshKey, tick]);

  // The previous page stays while the next loads or fails (same venue only).
  const current = page && (page.key === key || page.key.startsWith(`${gymId}|`)) ? page : null;
  const fresh = page?.key === key;
  const members = current?.members ?? [];
  const total = current?.total ?? 0;

  // AB4: the paused members, keyed by account (a failed read shows no chips).
  const pauseBiz = canPause ? access.businessId : null;
  useEffect(() => {
    if (!pauseBiz) return;
    let cancelled = false;
    void fetchBusinessBookingPauses(pauseBiz).then((r) => {
      if (!cancelled && r.ok) setPauses(new Map(r.value.map((p) => [p.memberId, p])));
    });
    return () => {
      cancelled = true;
    };
  }, [pauseBiz, pauseTick, refreshKey]);
  const pauseOf = (m: VenueMember) => (canPause && m.personId ? (pauses.get(m.personId) ?? null) : null);

  const liftPause = async (m: VenueMember) => {
    setMenu(null);
    if (busy || !access.businessId || !m.personId) return;
    setBusy(true);
    setRowError(null);
    const r = await liftBookingPause(access.businessId, m.personId);
    setBusy(false);
    if (!r.ok) return setRowError(r.message);
    onToast?.(t(PAUSES_COPY.lifted));
    setPauseTick((x) => x + 1);
  };

  const choose = (f: Filter) => {
    setFilter(f);
    setOffset(0);
  };

  const markPaid = async (m: VenueMember) => {
    setMenu(null);
    if (busy) return;
    setBusy(true);
    setRowError(null);
    const r = await markMembershipPaid(m.membershipId);
    setBusy(false);
    if (!r.ok) {
      setRowError(r.message);
      return;
    }
    onToast?.(t("Marked as paid. {name}'s pass is valid now.", { name: m.label }));
    offerPromotionUsed({ kind: "membership", sourceId: m.membershipId });
    setTick((t) => t + 1);
    onChanged?.();
  };

  const message = async (m: VenueMember) => {
    setMenu(null);
    if (busy || !access.businessId || !m.personId) return;
    setBusy(true);
    setRowError(null);
    const r = await startMemberThread(access.businessId, m.personId);
    setBusy(false);
    if (!r.ok) return setRowError(r.message);
    navigate("/app/messages", { state: { threadId: r.threadId } });
  };

  const count = total.toLocaleString(appLocale());
  const memberships = tn(total, "{count} membership", "{count} memberships", { count });
  const header = card ? t("Members") : status ? statusCount(status, total, count) : memberships;
  const right = card ? (current ? memberships : undefined) : t("Unpaid first");

  const rows = (
    <>
      {!current && !error && <VSkeletonRows rows={card ? 3 : 6} pill />}
      {error && !current && <VCardError title={t("Couldn't load members")} message={error} onRetry={() => setTick((t) => t + 1)} />}
      {current && fresh && members.length === 0 && (
        <VDetailRow
          avatar={<VAvatar icon={Users} />}
          title={status ? noneWith(status) : t("No memberships at this venue yet.")}
        />
      )}
      <div className={clsx(!fresh && current && "opacity-60")} aria-busy={!fresh}>
        {members.map((m) => {
          const pill = passPill(m);
          // Recording cash is a desk action: mark_gym_membership_paid needs front_desk (Database b95ef5c).
          const paused = pauseOf(m);
          const hasActions = (m.paymentStatus === "pending" && deskOk) || (canMessage && !!m.personId) || !!paused;
          return (
            <VDetailRow
              key={m.membershipId}
              avatar={isMaskedLabel(m.label) ? <VAvatar masked /> : <VAvatar initial={initials(m.label)} />}
              title={m.label}
              titleExtra={
                (m.isMinor || paused) && (
                  <>
                    {m.isMinor && <VPill tone="pale" label={t("Under 18")} />}
                    {paused && <VPill tone="caution" label={pausedChip(paused.pausedUntil)} />}
                  </>
                )
              }
              sub={memberFact(m)}
              sub2={memberDates(m)}
              right={<VPill tone={pill.tone} label={pill.label} />}
              onClick={hasActions ? (e) => setMenu({ member: m, anchor: e.currentTarget }) : undefined}
              ariaLabel={hasActions ? `${m.label}${t(", ")}${pill.label}. ${t("Actions")}` : undefined}
              disabled={busy}
            />
          );
        })}
      </div>
      {rowError && <p className={clsx("border-t text-[11.5px] font-bold leading-[16px] text-status-high", DIVIDER)} style={{ padding: "10px 16px" }}>{rowError}</p>}
    </>
  );

  const paging =
    !card && total > MEMBERS_PAGE_SIZE ? (
      <div className={clsx("grid grid-cols-3 items-center border-t min-h-[44px]", DIVIDER)} style={{ padding: "0 8px" }}>
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - MEMBERS_PAGE_SIZE))}
          className="tap justify-self-start inline-flex items-center gap-1 min-h-[44px] px-2 text-[12.5px] font-extrabold text-primary-dark disabled:text-charcoal-tertiary"
        >
          <ChevronLeft size={14} aria-hidden /> {t("Previous")}
        </button>
        <span className="text-center text-[11.5px] text-charcoal-faint tabular-nums">{pageText(offset, members.length, total)}</span>
        <button
          type="button"
          disabled={offset + MEMBERS_PAGE_SIZE >= total}
          onClick={() => setOffset((o) => o + MEMBERS_PAGE_SIZE)}
          className="tap justify-self-end inline-flex items-center gap-1 min-h-[44px] px-2 text-[12.5px] font-extrabold text-primary-dark disabled:text-charcoal-tertiary"
        >
          {t("Next")} <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    ) : null;

  return (
    <div id={id}>
      {!card && (
        <VTextTabs
          label={t("Membership status")}
          value={filter}
          onChange={choose}
          tabs={MEMBER_FILTERS.map((f) => ({ value: (f.value ?? "all") as Filter, label: statusLabel(f.value) }))}
        />
      )}
      {!online && <VOfflineLine className="mb-[8px]" />}
      <VDetailCard
        title={header}
        right={right}
        className={card ? undefined : "!mt-0"}
        footer={
          <>
            {paging}
            {card && onSeeAll && total > 3 && <VFooterLink label={t("See all {count}", { count })} onClick={onSeeAll} />}
          </>
        }
      >
        {rows}
      </VDetailCard>
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        variant="field"
        width={204}
        heading={menu?.member.label}
        options={[
          ...(menu && menu.member.paymentStatus === "pending" && deskOk ? [{ value: "paid", label: t("Mark as paid"), disabled: !online }] : []),
          ...(menu && canMessage && menu.member.personId ? [{ value: "message", label: t("Message"), disabled: !online }] : []),
          ...(menu && pauseOf(menu.member) ? [{ value: "lift", label: t(PAUSES_COPY.lift), disabled: !online }] : []),
        ]}
        onSelect={(v) => menu && void (v === "message" ? message(menu.member) : v === "lift" ? liftPause(menu.member) : markPaid(menu.member))}
      />
    </div>
  );
}
