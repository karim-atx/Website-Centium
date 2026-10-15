import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { startMemberThread } from "../../../services/messaging";
import { Banknote, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { useBizToast } from "../../../components/business-more/useBizToast";
import { endGymMembership, markDeskSalePaid, renewMembership } from "../../../services/front-desk";
import { offerPromotionUsed } from "../../../components/promotions/promotionUsed";

import { deskMoney, renewalSub, weekSales, type DeskSale, type FrontDeskMember, type RenewalDue } from "../../../services/front-desk/frontDeskLogic";
import type { DeskState } from "./useFrontDesk";
import { dayMonthYear } from "../../../services/venues/venueLogic";
import { ChipButton, DeskLabel, DeskRow, ErrorCard, LIST, ListCard, ListLine, NumberBoxes, RowsSkeleton, StatusChip } from "./frontDeskKit";

// OP1-017 (Passes and renewals) and OP1-019 (End membership?), on B7 MB-05:
// - the list is venue_renewals_due(gym, 30): the tab shows the next 7 days,
//   See all the next 30 (This week / Later);
// - Renew = renew_gym_membership(id): the next period starts where this one
//   ends and arrives payment pending (it shows in Money owed); hidden once
//   already_renewed, and for a member ending at the period end ("Ending",
//   don't chase);
// - End = end_gym_membership(id, reason, at_period_end): at the end of the
//   paid period by default, or now;
// - Remind = start_member_thread(business, person) (B7 MB-02), then the
//   member's one thread opens in Messages to write the reminder. It needs
//   the messages permission; without it the chip stays, unavailable.
// Day passes this week (OP1-017 row 13, B10 OP-02): desk_sales at the desk
// venue since Monday: Sold = every sale, Revenue = the paid ones' total;
// "Joined after" needs a reader that links a day pass to a later membership
// (not in B10): "–". A business with no day pass plan hides the section (O2).
// Day passes sold "pay later" list under the boxes with Mark paid
// (mark_desk_sale_paid; OURS, no frame), needing front_desk.


export const PassesTab: React.FC<{
  renewals: RenewalDue[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  online: boolean;
  /** After a renew or an end: the lists reload. */
  onChanged: () => void;
  /** Plan commitment lines by plan name, information only (never blocks ending). */
  planTerms?: Map<string, string[]>;
  /** The desk venue's B10 reads (this week's day pass sales). */
  desk: DeskState;
  /** The business has a day pass plan on sale. */
  sellsDayPass: boolean;
  /** The masked members list: a member's sale shows their label (Q-05). */
  members: FrontDeskMember[];
  /** A desk sale was marked paid. */
  onDeskChanged: () => void;
}> = ({ renewals, loading, error, onRetry, online, onChanged, planTerms, desk, sellsDayPass, members, onDeskChanged }) => {
  const [seeAll, setSeeAll] = useState(false);
  const [menuFor, setMenuFor] = useState<RenewalDue | null>(null);
  const [ending, setEnding] = useState<RenewalDue | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useBizToast();
  const access = useConsoleAccess();
  const navigate = useNavigate();
  const canRemind = (r: RenewalDue) => online && !!r.personId && !!access.businessId && access.meets("messages");
  const remind = async (r: RenewalDue) => {
    if (busy || !access.businessId || !r.personId) return;
    setBusy(true);
    const res = await startMemberThread(access.businessId, r.personId);
    setBusy(false);
    if (!res.ok) return showToast(res.message);
    navigate("/app/messages", { state: { threadId: res.threadId } });
  };
  const openMenu = (r: RenewalDue, el: HTMLElement) => {
    setAnchor(el.closest<HTMLElement>("[role=listitem]") ?? el);
    setMenuFor(r);
  };
  const week = renewals.filter((r) => r.daysLeft <= 7);
  const week2 = desk.live === true && desk.weekSales ? weekSales(desk.weekSales) : null;
  const unpaid = desk.live === true ? (desk.weekSales ?? []).filter((x) => !x.paid) : [];
  const canDesk = access.meets("front_desk");
  const labelOf = new Map(members.filter((m) => m.personId).map((m) => [m.personId as string, m.label]));
  const saleWho = (sale: DeskSale) => (sale.personId ? labelOf.get(sale.personId) ?? "Member" : sale.who);
  const markSalePaid = async (sale: DeskSale) => {
    if (busy || !canDesk) return;
    setBusy(true);
    const res = await markDeskSalePaid(sale.id);
    setBusy(false);
    if (!res.ok) return showToast(res.message);
    showToast(`${saleWho(sale)}'s ${sale.planName} is marked as paid.`);
    offerPromotionUsed({ kind: "day_pass", sourceId: sale.id });
    onDeskChanged();
  };
  const later = renewals.filter((r) => r.daysLeft > 7);

  const renew = async (r: RenewalDue) => {
    if (busy) return;
    setBusy(true);
    const res = await renewMembership(r.membershipId);
    setBusy(false);
    if (!res.ok) {
      showToast(res.message);
      return;
    }
    showToast(`${r.label}'s membership is renewed from ${dayMonthYear(r.expiresOn)}. Payment is due.`);
    onChanged();
  };

  const row = (r: RenewalDue, i: number) => (
    <DeskRow
      key={r.membershipId}
      icon={r.alreadyRenewed ? CheckCircle2 : r.cancelAtPeriodEnd ? XCircle : RefreshCw}
      title={r.label}
      sub={renewalSub(r)}
      first={i === 0}
      ariaLabel={`${r.label}, ${renewalSub(r)}. Options`}
      menuOpen={menuFor?.membershipId === r.membershipId}
      onClick={(el) => openMenu(r, el)}
      trailing={
        r.alreadyRenewed ? (
          <StatusChip tone="good">Renewed</StatusChip>
        ) : r.cancelAtPeriodEnd ? (
          <StatusChip tone="warn">Ending</StatusChip>
        ) : (
          // Drawn as a chip, but it is an action (OP1-017 row 10): a button
          // with a 44 hit box; it opens the member's thread (MB-02).
          <ChipButton
            tone="pale"
            label="Remind"
            ariaLabel={canRemind(r) ? `Remind ${r.label}` : `Remind ${r.label} (needs messages access)`}
            disabled={!canRemind(r) || busy}
            onClick={() => void remind(r)}
          />
        )
      }
    />
  );

  const overlays = (
    <>
      <RenewalMenu
        menuFor={menuFor}
        anchor={anchor}
        online={online}
        onClose={() => setMenuFor(null)}
        onRenew={(r) => void renew(r)}
        onRemind={access.businessId && access.meets("messages") ? (r) => void remind(r) : null}
        onEnd={setEnding}
      />
      <EndPopup
        key={ending?.membershipId ?? "none"}
        ending={ending}
        terms={ending ? planTerms?.get(ending.planName) ?? null : null}
        online={online}
        onClose={() => setEnding(null)}
        onDone={(r, status) => {
          setEnding(null);
          showToast(status === "cancelled" ? `${r.label}'s membership has ended.` : `${r.label}'s membership ends on ${dayMonthYear(r.expiresOn)}.`);
          onChanged();
        }}
      />
      {toast}
    </>
  );

  if (seeAll) {
    // S2: renewals in the next 30 days, grouped This week / Later.
    return (
      <div className="flex flex-col">
        <DeskLabel action={{ label: "Back", onClick: () => setSeeAll(false), ariaLabel: "Back to passes and renewals" }}>Renewals in the next 30 days</DeskLabel>
        <p className="text-[11px] font-semibold leading-[14px] text-charcoal-faint" style={{ margin: "0 2px 6px" }}>This week</p>
        {week.length ? <ListCard label="This week">{week.map(row)}</ListCard> : <ListLine>None due</ListLine>}
        <p className="text-[11px] font-semibold leading-[14px] text-charcoal-faint" style={{ margin: "0 2px 6px" }}>Later</p>
        {later.length ? <ListCard label="Later">{later.map(row)}</ListCard> : <ListLine>None due</ListLine>}
        {overlays}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PassCard />
      <DeskLabel action={week.length > 3 || later.length > 0 ? { label: "See all", onClick: () => setSeeAll(true), ariaLabel: "See all renewals" } : undefined}>Renewals due</DeskLabel>
      {loading && renewals.length === 0 ? (
        <RowsSkeleton />
      ) : error && renewals.length === 0 ? (
        <ErrorCard title="Couldn't load renewals" onRetry={onRetry} />
      ) : week.length === 0 ? (
        <ListLine>None due</ListLine>
      ) : (
        <ListCard label="Renewals due">{week.slice(0, 3).map(row)}</ListCard>
      )}
      {(sellsDayPass || (desk.weekSales?.length ?? 0) > 0 || desk.live !== true) && (
        <>
          <DeskLabel>Day passes this week</DeskLabel>
          {/* "–" is the source's own no-value mark: no B10, an unreadable list, or no reader (Joined after). */}
          <NumberBoxes
            items={[
              { label: "Sold", value: week2 ? String(week2.sold) : "–" },
              { label: "Revenue", value: week2 ? deskMoney(week2.revenue) : "–" },
              { label: "Joined after", value: "–" },
            ]}
          />
        </>
      )}
      {unpaid.length > 0 && (
        <>
          <DeskLabel>Day passes to collect</DeskLabel>
          <ListCard label="Day passes to collect">
            {unpaid.map((sale, i) => (
              <DeskRow
                key={sale.id}
                icon={Banknote}
                title={saleWho(sale)}
                sub={`${sale.planName} · ${deskMoney(sale.amount)} · ${dayMonthYear(sale.soldOn)}`}
                first={i === 0}
                trailing={
                  <ChipButton
                    tone="warn"
                    label="Mark paid"
                    ariaLabel={`Mark ${saleWho(sale)}'s ${sale.planName} paid`}
                    disabled={!online || busy || !canDesk}
                    onClick={() => void markSalePaid(sale)}
                  />
                }
              />
            ))}
          </ListCard>
        </>
      )}
      {overlays}
    </div>
  );
};

/** OP1-017 rows 3-5: an explanation card, not a live code. */
const PassCard: React.FC = () => (
  <div className={`${LIST} flex items-center`} style={{ borderRadius: 20, padding: 16, gap: 14, marginBottom: 14 }}>
    <PassIllustration />
    <div className="min-w-0">
      <p className="text-[14px] font-extrabold leading-[19px] text-charcoal">Member QR pass</p>
      <p className="text-[12px] leading-[17px] text-charcoal-soft" style={{ marginTop: 4, textWrap: "pretty" } as React.CSSProperties}>
        Each member has a pass in their app. It scans at the door and works offline.
      </p>
    </div>
  </div>
);

/** 96 × 96 r12 on #FFFFFF in both modes, 9 × 9 modules #241F1B, gap 1, padding 7. Decorative. */
const ILLUSTRATION_CELLS: boolean[] = (() => {
  let h = 0x5eed;
  return Array.from({ length: 81 }, (_, i) => {
    const r = Math.floor(i / 9);
    const c = i % 9;
    // Three solid finder corners, then a fixed pseudo-random fill.
    if ((r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)) return true;
    h = (h * 1103515245 + 12345) >>> 0;
    return (h >> 16) % 2 === 0;
  });
})();

const PassIllustration: React.FC = () => {
  const cells = ILLUSTRATION_CELLS;
  return (
    <div aria-hidden className="shrink-0 grid" style={{ width: 96, height: 96, borderRadius: 12, background: "#FFFFFF", padding: 7, gap: 1, gridTemplateColumns: "repeat(9, 1fr)" }}>
      {cells.map((on, i) => (
        <span key={i} style={{ background: on ? "#241F1B" : "#FFFFFF", borderRadius: 1 }} />
      ))}
    </div>
  );
};

/** S3: the row's menu. Renew and Send a reminder are hidden once renewed or ending; a reminder needs messages. */
const RenewalMenu: React.FC<{
  menuFor: RenewalDue | null;
  anchor: HTMLElement | null;
  online: boolean;
  onClose: () => void;
  onRenew: (r: RenewalDue) => void;
  /** Null when this seat can't message the member (no messages permission, or no person id yet). */
  onRemind: ((r: RenewalDue) => void) | null;
  onEnd: (r: RenewalDue) => void;
}> = ({ menuFor, anchor, online, onClose, onRenew, onRemind, onEnd }) => {
  const chase = !!menuFor && !menuFor.alreadyRenewed && !menuFor.cancelAtPeriodEnd;
  const offline = online ? undefined : "You're offline";
  return (
    <PopupMenu
      open={!!menuFor && !!anchor}
      anchor={anchor}
      onClose={onClose}
      align="right"
      options={[
        ...(chase ? [{ value: "renew", label: "Renew", disabled: !online, note: offline }] : []),
        ...(chase && onRemind && menuFor.personId ? [{ value: "remind", label: "Send a reminder", disabled: !online, note: offline }] : []),
        { value: "end", label: "End membership", destructive: true, disabled: !online, note: offline },
      ]}
      onSelect={(v) => {
        const r = menuFor;
        onClose();
        if (!r) return;
        if (v === "renew") onRenew(r);
        if (v === "remind") onRemind?.(r);
        if (v === "end") onEnd(r);
      }}
    />
  );
};

/**
 * OP1-019: end_gym_membership. At the end of the paid period by default (the
 * member keeps their pass until expires_on), or now; an optional reason
 * (500 characters). The returned status says which happened. Keyed by the
 * membership, so every opening starts from the default.
 */
const EndPopup: React.FC<{
  ending: RenewalDue | null;
  /** "Minimum term: 3 months", "30 days' notice": shown, not enforced (MB-05 follow-up 5). */
  terms: string[] | null;
  online: boolean;
  onClose: () => void;
  onDone: (r: RenewalDue, status: string) => void;
}> = ({ ending, terms, online, onClose, onDone }) => {
  const [now, setNow] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const until = ending ? dayMonthYear(ending.expiresOn) : "";
  const run = async () => {
    if (!ending || busy) return;
    setBusy(true);
    setError(null);
    const r = await endGymMembership(ending.membershipId, !now, reason);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onDone(ending, r.value);
  };
  const choice = (on: boolean, label: string, sub: string, pick: () => void) => (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={pick}
      className={`tap w-full text-start rounded-[14px] border-[1.5px] border-solid ${on ? "border-primary bg-primary-pale" : "border-charcoal/[0.11] dark:border-charcoal/[0.08]"}`}
      style={{ padding: "10px 12px", minHeight: 44 }}
    >
      <span className="block text-[13px] font-extrabold leading-[18px] text-charcoal">{label}</span>
      <span className="block text-[11.5px] leading-[16px] text-charcoal-soft">{sub}</span>
    </button>
  );
  return (
    <ConfirmCard
      open={!!ending}
      layout="stacked"
      frame="kit"
      tone="destructive"
      icon={<XCircle size={20} strokeWidth={2.2} />}
      title={ending ? `End ${ending.label}’s membership?` : ""}
      subtitle={now ? "Their pass stops working straight away." : `Their pass stops working at the end of the paid period, on ${until}.`}
      confirmLabel={busy ? "Ending…" : "End membership"}
      cancelLabel="Keep it"
      initialFocus="cancel"
      busy={busy}
      confirmDisabled={!online}
      extra={
        <div className="text-start" style={{ marginTop: 12 }}>
          {terms && terms.length > 0 && (
            <p className="text-center text-[12px] font-bold leading-[17px] text-charcoal-soft" style={{ marginBottom: 10 }}>
              Plan terms: {terms.join(" · ")}
            </p>
          )}
          <div role="radiogroup" aria-label="When it ends" className="flex flex-col" style={{ gap: 8 }}>
            {choice(!now, "At the end of the paid period", `They keep their pass until ${until}.`, () => setNow(false))}
            {choice(now, "Now", "Their pass stops working today.", () => setNow(true))}
          </div>
          <label htmlFor="fd-end-reason" className="block text-[12px] font-bold leading-[16px] text-charcoal-soft" style={{ margin: "12px 0 6px" }}>
            Reason (optional)
          </label>
          <input
            id="fd-end-reason"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For your records"
            className="w-full bg-cream-soft border-[1.5px] border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08] focus:outline-none text-[13.5px] font-bold text-charcoal placeholder:font-medium placeholder:text-charcoal-faint"
            style={{ height: 46, borderRadius: 14, padding: "0 12px" }}
          />
          {!online && (
            <p role="status" className="text-[11.5px] font-bold leading-[16px] text-charcoal-faint" style={{ marginTop: 8 }}>
              You're offline.
            </p>
          )}
          {error && (
            <p role="alert" className="text-[11.5px] font-bold leading-[16px] text-status-high" style={{ marginTop: 8 }}>
              {error}
            </p>
          )}
        </div>
      }
      onConfirm={() => void run()}
      onCancel={onClose}
    />
  );
};
