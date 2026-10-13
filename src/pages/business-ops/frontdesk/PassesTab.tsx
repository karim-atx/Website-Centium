import React, { useMemo, useState } from "react";
import { AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { renewals, renewalSub, type FrontDeskMember, type Renewal } from "../../../services/front-desk/frontDeskLogic";
import { dayMonthYear } from "../../../services/venues/venueLogic";
import { ChipButton, DeskLabel, DeskRow, ErrorCard, LIST, ListCard, ListLine, NumberBoxes, RowsSkeleton, StatusChip } from "./frontDeskKit";

// OP1-017 (Passes and renewals) and OP1-019 (End membership?). Renewals are
// read from venue_members() (A4): active memberships ending in the next 7
// days, and those that ended in the last 7. Remind (BU2-09 / BU2-19 member
// messaging) and End at the end of the paid period (B9 · BU2-09) are not on
// the stack: Remind is drawn and marked Soon, End opens its pop-up with the
// action unavailable. Day pass sales are BU2-10: their boxes show "–".

const SOON = "Coming soon";

export const PassesTab: React.FC<{
  members: FrontDeskMember[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  today: string;
  online: boolean;
}> = ({ members, loading, error, onRetry, today, online }) => {
  const [seeAll, setSeeAll] = useState(false);
  const [menuFor, setMenuFor] = useState<Renewal | null>(null);
  const [ending, setEnding] = useState<Renewal | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const openMenu = (r: Renewal, el: HTMLElement) => {
    setAnchor(el.closest<HTMLElement>("[role=listitem]") ?? el);
    setMenuFor(r);
  };
  const due = useMemo(() => renewals(members, today, 7), [members, today]);
  const later = useMemo(() => renewals(members, today, 30).filter((r) => r.kind === "due" && r.days > 7), [members, today]);

  const row = (r: Renewal, i: number) => (
    <DeskRow
        key={r.membershipId}
        icon={r.kind === "expired" ? AlertCircle : RefreshCw}
        title={r.firstName}
        sub={renewalSub(r)}
        first={i === 0}
        ariaLabel={`${r.firstName}, ${renewalSub(r)}. Options`}
        menuOpen={menuFor?.membershipId === r.membershipId}
        onClick={(el) => openMenu(r, el)}
        trailing={
          r.kind === "expired" ? (
            <StatusChip tone="high">Expired</StatusChip>
          ) : (
            // Drawn as a chip, but it is an action (OP1-017 row 10): a
            // button with a 44 hit box. Reminders are B9: Soon.
            <ChipButton tone="pale" label="Remind" ariaLabel={`Remind ${r.firstName} (coming soon)`} disabled onClick={(el) => openMenu(r, el)} />
          )
        }
      />
  );

  if (seeAll) {
    // S2: renewals in the next 30 days, grouped This week / Later.
    return (
      <div className="flex flex-col">
        <DeskLabel action={{ label: "Back", onClick: () => setSeeAll(false), ariaLabel: "Back to passes and renewals" }}>Renewals in the next 30 days</DeskLabel>
        <p className="text-[11px] font-semibold leading-[14px] text-charcoal-faint" style={{ margin: "0 2px 6px" }}>This week</p>
        {due.length ? <ListCard label="This week">{due.map(row)}</ListCard> : <ListLine>None due</ListLine>}
        <p className="text-[11px] font-semibold leading-[14px] text-charcoal-faint" style={{ margin: "0 2px 6px" }}>Later</p>
        {later.length ? <ListCard label="Later">{later.map(row)}</ListCard> : <ListLine>None due</ListLine>}
        <RenewalMenu menuFor={menuFor} anchor={anchor} onClose={() => setMenuFor(null)} onEnd={setEnding} />
        <EndPopup ending={ending} online={online} onClose={() => setEnding(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PassCard />
      <DeskLabel action={due.length > 3 || later.length > 0 ? { label: "See all", onClick: () => setSeeAll(true), ariaLabel: "See all renewals" } : undefined}>Renewals due</DeskLabel>
      {loading && members.length === 0 ? (
        <RowsSkeleton />
      ) : error && members.length === 0 ? (
        <ErrorCard title="Couldn't load renewals" onRetry={onRetry} />
      ) : due.length === 0 ? (
        <ListLine>None due</ListLine>
      ) : (
        <ListCard label="Renewals due">{due.slice(0, 3).map(row)}</ListCard>
      )}
      <DeskLabel>Day passes this week</DeskLabel>
      {/* BU2-10: day pass sales are not recorded yet. "–" is the source's own no-value mark. */}
      <NumberBoxes
        items={[
          { label: "Sold", value: "–" },
          { label: "Revenue", value: "–" },
          { label: "Joined after", value: "–" },
        ]}
      />
      <RenewalMenu menuFor={menuFor} anchor={anchor} onClose={() => setMenuFor(null)} onEnd={setEnding} />
      <EndPopup ending={ending} online={online} onClose={() => setEnding(null)} />
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

/** S3: the row's menu. Both actions are B9; End opens its pop-up (OP1-019). */
const RenewalMenu: React.FC<{ menuFor: Renewal | null; anchor: HTMLElement | null; onClose: () => void; onEnd: (r: Renewal) => void }> = ({ menuFor, anchor, onClose, onEnd }) => (
  <PopupMenu
    open={!!menuFor && !!anchor}
    anchor={anchor}
    onClose={onClose}
    align="right"
    options={[
      { value: "remind", label: "Send a reminder", disabled: true, note: SOON },
      { value: "end", label: "End membership", destructive: true },
    ]}
    onSelect={(v) => {
      const r = menuFor;
      onClose();
      if (v === "end" && r) onEnd(r);
    }}
  />
);

/**
 * OP1-019: ending at the end of the paid period is B9 (gym_memberships has
 * cancelled_at only). The pop-up is drawn; its action is unavailable until
 * the stage lands.
 */
const EndPopup: React.FC<{ ending: Renewal | null; online: boolean; onClose: () => void }> = ({ ending, online, onClose }) => (
  <ConfirmCard
    open={!!ending}
    layout="stacked"
    frame="kit"
    tone="destructive"
    icon={<XCircle size={20} strokeWidth={2.2} />}
    title={ending ? `End ${ending.firstName}’s membership?` : ""}
    subtitle={`Their pass stops working at the end of the paid period. They're told by message.${online ? "" : " You're offline."}`}
    confirmLabel="End membership"
    cancelLabel="Keep it"
    initialFocus="cancel"
    confirmDisabled
    extra={
      <p className="text-[11.5px] font-bold leading-[16px] text-charcoal-faint" style={{ marginTop: 8 }}>
        {ending?.expiresOn ? `Ending a membership is coming soon. It runs until ${dayMonthYear(ending.expiresOn)}.` : "Ending a membership is coming soon."}
      </p>
    }
    onConfirm={onClose}
    onCancel={onClose}
  />
);
