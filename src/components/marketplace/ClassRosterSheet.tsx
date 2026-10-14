import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { initials } from "../professionals/typeColour";
import { fetchClassRoster } from "../../services/venues/console";
import { isMaskedLabel, methodLabel, money, splitRoster, type RosterEntry } from "../../services/venues/consoleLogic";
import { range12 } from "../../utils/time12";
import { useOnline } from "../../hooks/useOnline";
import { CARD, VAvatar, VCardError, VDetailRow, VOfflineLine, VPill, VSkeletonRows, VTextTabs, type PillTone } from "./VenueKit";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// One class's roster (stage A4, venue_class_roster()): who is booked and who
// is waiting, a first name and a minor flag each. Gated on the class's
// business, so a class with no venue still has a roster. Restyled per
// OURS-OP1-class-roster: the OpsTabsV4 sheet (K15, header 62), a session
// line, K14 Booked / Waitlist tabs and the K9 rows of OP1 083's "Booked
// members" card (the one roster language, Q-R1). No cap: the sheet is the
// "See all".
//
// Mark as paid for a booking needs venue_class_roster to return the booking
// id (BU2-21 / B8); it doesn't on the local stack, so the action is hidden.

const PAY: Record<string, { label: string; tone: PillTone }> = {
  paid: { label: "Paid", tone: "good" },
  pending: { label: "Awaiting payment", tone: "caution" },
  refunded: { label: "Refunded", tone: "soft" },
};

export interface RosterSession {
  date: string;
  startTime: string;
  endTime: string;
  maxCapacity?: number | null;
}

/** "Mon 12 Oct" from an ISO date (no time zone shift). */
export function weekdayDayMonth(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = WD[dt.getUTCDay()];
  const mon = MON[dt.getUTCMonth()];
  return `${wd} ${d} ${mon}`;
}

/** "2 Oct" from a timestamp, on this device's calendar. */
const dayMonth = (ts: string) => {
  const dt = new Date(ts);
  return `${dt.getDate()} ${MON[dt.getMonth()]}`;
};

export function ClassRosterSheet({
  classId,
  title,
  onClose,
  session,
}: {
  classId: string | null;
  title: string;
  onClose: () => void;
  session?: RosterSession | null;
}) {
  const online = useOnline();
  const [state, setState] = useState<{ classId: string; entries: RosterEntry[] } | null>(null);
  const [error, setError] = useState<{ classId: string; message: string } | null>(null);
  const [tab, setTab] = useState<"booked" | "waitlist">("booked");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    void (async () => {
      const r = await fetchClassRoster(classId);
      if (cancelled) return;
      if (!r.ok) {
        setError({ classId, message: r.message });
        return;
      }
      setError(null);
      setState({ classId, entries: r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, tick]);

  // A new class opens on Booked.
  const [shownFor, setShownFor] = useState<string | null>(classId);
  if (shownFor !== classId) {
    setShownFor(classId);
    setTab("booked");
  }

  const entries = state && state.classId === classId ? state.entries : null;
  const failed = error && error.classId === classId ? error.message : null;
  const { booked, waitlist } = splitRoster(entries ?? []);
  const view = waitlist.length === 0 ? "booked" : tab;
  const list = view === "booked" ? booked : waitlist;

  const row = (e: RosterEntry, i: number) => {
    const pay = e.paymentStatus ? PAY[e.paymentStatus] : null;
    const price = e.priceAgreed !== null ? (e.priceAgreed > 0 ? money(e.priceAgreed) : "Free") : null;
    const sub =
      e.kind === "booked"
        ? [e.at ? `Booked ${dayMonth(e.at)}` : null, price, methodLabel(e.paymentMethod) || null].filter(Boolean).join(" · ")
        : `Waiting, number ${e.waitlistPosition ?? "–"} in line`;
    return (
      <VDetailRow
        key={`${e.kind}-${i}`}
        avatar={e.kind === "waitlist" ? <VAvatar number={e.waitlistPosition ?? i + 1} /> : isMaskedLabel(e.label) ? <VAvatar masked /> : <VAvatar initial={initials(e.label)} />}
        title={e.label}
        titleExtra={e.isMinor && <VPill tone="pale" label="Under 18" />}
        sub={sub}
        right={e.kind === "booked" && pay ? <VPill tone={pay.tone} label={pay.label} /> : undefined}
      />
    );
  };

  return (
    <BottomSheet
      open={!!classId}
      onClose={onClose}
      title={title || "Class roster"}
      tone="business"
      headerHeight={62}
      bodyPadding={{ top: 18, right: 18, bottom: 30, left: 18 }}
    >
      <div className="space-y-[14px]">
        {session && (
          <div className="relative rounded-[16px] bg-cream-soft overflow-hidden" style={{ padding: "12px 14px 12px 18px" }}>
            <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary-fill" />
            <p className="text-[13.5px] font-extrabold text-charcoal">
              {weekdayDayMonth(session.date)} · {range12(session.startTime, session.endTime)}
            </p>
            {entries && (
              <p className="text-[12px] text-charcoal-soft mt-[2px]">
                {booked.length} {session.maxCapacity ? `of ${session.maxCapacity} ` : ""}booked · {waitlist.length} waiting
              </p>
            )}
          </div>
        )}
        {!online && <VOfflineLine />}
        {entries && waitlist.length > 0 && (
          <VTextTabs
            label="Roster"
            value={view}
            onChange={setTab}
            tabs={[
              { value: "booked", label: `Booked (${booked.length})` },
              { value: "waitlist", label: `Waitlist (${waitlist.length})` },
            ]}
          />
        )}
        <div className={`${CARD} rounded-[22px] overflow-hidden [&>*:first-child]:border-t-0`}>
          {!entries && !failed && <VSkeletonRows rows={4} pill />}
          {failed && !entries && <VCardError title="Couldn't load this roster" message={failed} onRetry={() => setTick((t) => t + 1)} />}
          {entries && waitlist.length === 0 && (
            <p className="text-[14px] font-extrabold text-charcoal" style={{ padding: "14px 16px 6px" }}>
              Booked ({booked.length})
            </p>
          )}
          {entries && list.map(row)}
          {entries && view === "booked" && booked.length === 0 && <VDetailRow avatar={<VAvatar icon={Users} />} title="Nobody has booked yet." />}
        </div>
      </div>
    </BottomSheet>
  );
}
