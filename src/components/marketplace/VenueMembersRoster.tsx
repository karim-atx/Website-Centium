import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { PopupMenu } from "../ui/PopupMenu";
import { initials } from "../professionals/typeColour";
import { fetchVenueMembers, markMembershipPaid } from "../../services/venues/console";
import { MEMBER_FILTERS, MEMBERS_PAGE_SIZE, methodLabel, money, pageLine, paidLine, venueMemberTag, type MembershipStatus, type VenueMember } from "../../services/venues/consoleLogic";
import { dayMonthYear } from "../../services/venues/venueLogic";
import { useOnline } from "../../hooks/useOnline";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { DIVIDER, VAvatar, VCardError, VDetailCard, VDetailRow, VFooterLink, VOfflineLine, VPill, VSkeletonRows, VTextTabs, type PillTone } from "./VenueKit";

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
// pending (mark_gym_membership_paid, insider-gated and idempotent). "Message"
// waits for B7's business-to-member threads (V6-26): no message buttons
// before B7 is on the stack.

/** K8 tone for a member's tag (Valid good, Awaiting payment caution, else soft; an upcoming renewal "Starts {date}", MB-05). */
function passPill(m: VenueMember): { tone: PillTone; label: string } {
  const t = venueMemberTag(m);
  return { label: t.label, tone: t.tone === "member" ? "good" : t.tone === "pending" ? "caution" : "soft" };
}

// "Paid {d Mon}" from venue_members.paid_at (20261120080000); a fact about the
// row, never a sum (Revenue waits for B8's ledger).
const memberFact = (m: VenueMember) => [m.planName, money(m.priceAgreed), methodLabel(m.paymentMethod), paidLine(m)].filter(Boolean).join(" · ");
const memberDates = (m: VenueMember) => (m.expiresOn ? `${dayMonthYear(m.startedOn)} to ${dayMonthYear(m.expiresOn)}` : `From ${dayMonthYear(m.startedOn)}`);

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
    onToast?.(`Marked as paid. ${m.firstName}'s pass is valid now.`);
    setTick((t) => t + 1);
    onChanged?.();
  };

  const statusWord = status ? `${status} ` : "";
  const header = card ? "Members" : `${total.toLocaleString()} ${statusWord}membership${total === 1 ? "" : "s"}`;
  const right = card ? (current ? `${total.toLocaleString()} membership${total === 1 ? "" : "s"}` : undefined) : "Unpaid first";

  const rows = (
    <>
      {!current && !error && <VSkeletonRows rows={card ? 3 : 6} pill />}
      {error && !current && <VCardError title="Couldn't load members" message={error} onRetry={() => setTick((t) => t + 1)} />}
      {current && fresh && members.length === 0 && (
        <VDetailRow
          avatar={<VAvatar icon={Users} />}
          title={status ? `No ${status} memberships at this venue.` : "No memberships at this venue yet."}
        />
      )}
      <div className={clsx(!fresh && current && "opacity-60")} aria-busy={!fresh}>
        {members.map((m) => {
          const pill = passPill(m);
          // Recording cash is a desk action: mark_gym_membership_paid needs front_desk (Database b95ef5c).
          const canPay = m.paymentStatus === "pending" && deskOk;
          return (
            <VDetailRow
              key={m.membershipId}
              avatar={<VAvatar initial={initials(m.firstName)} />}
              title={m.firstName}
              titleExtra={m.isMinor && <VPill tone="pale" label="Under 18" />}
              sub={memberFact(m)}
              sub2={memberDates(m)}
              right={<VPill tone={pill.tone} label={pill.label} />}
              onClick={canPay ? (e) => setMenu({ member: m, anchor: e.currentTarget }) : undefined}
              ariaLabel={canPay ? `${m.firstName}, ${pill.label}. Actions` : undefined}
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
          <ChevronLeft size={14} aria-hidden /> Previous
        </button>
        <span className="text-center text-[11.5px] text-charcoal-faint tabular-nums">{pageLine(offset, members.length, total)}</span>
        <button
          type="button"
          disabled={offset + MEMBERS_PAGE_SIZE >= total}
          onClick={() => setOffset((o) => o + MEMBERS_PAGE_SIZE)}
          className="tap justify-self-end inline-flex items-center gap-1 min-h-[44px] px-2 text-[12.5px] font-extrabold text-primary-dark disabled:text-charcoal-tertiary"
        >
          Next <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    ) : null;

  return (
    <div id={id}>
      {!card && (
        <VTextTabs
          label="Membership status"
          value={filter}
          onChange={choose}
          tabs={MEMBER_FILTERS.map((f) => ({ value: (f.value ?? "all") as Filter, label: f.label }))}
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
            {card && onSeeAll && total > 3 && <VFooterLink label={`See all ${total.toLocaleString()}`} onClick={onSeeAll} />}
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
        heading={menu?.member.firstName}
        options={[{ value: "paid", label: "Mark as paid", disabled: !online }]}
        onSelect={() => menu && void markPaid(menu.member)}
      />
    </div>
  );
}
