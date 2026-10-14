import { useEffect, useState } from "react";
import { canSeeVenueMoney, fetchMyVenues, fetchVenueDashboard } from "../../services/venues/console";
import { money, type VenueDashboard } from "../../services/venues/consoleLogic";
import { CARD, VCardError, VGroupHeader, VNumberCard } from "./VenueKit";

// venue_dashboard(id) (stage A4), restyled per OURS-OP1-venue-figures: four
// K5 two-up number-box cards (the OpsTabsV4 "Active plans | Members on plans"
// card), each with its line. The reviews figure moved into the console head.
// No deltas: venue_dashboard returns no previous period (data honesty).
//
// THE TWO MONEY FIGURES ARE NOT REVENUE (the contract: payments happen outside
// Centium, BR-04). One is what was agreed and is unpaid; the other is what
// somebody at the venue pressed "mark paid" on this month. Labelled as exactly
// that, with the not-revenue note as that card's line. The week and month are
// the venue's own (computed in gyms.timezone). "–" only while loading; a real
// 0 shows "0".
//
// WHO SEES THE MONEY CARD (OURS-OP1-venue-figures rows 12-13): B6 roles.
// business_can(business, 'revenue'): the owner always, an accepted employee
// only with the revenue permission ("See Revenue"). Until the answer is in,
// the card is left out rather than shown to the wrong person.

export function VenueFigures({ gymId, timezone, refreshKey = 0 }: { gymId: string; timezone: string; refreshKey?: number }) {
  const [data, setData] = useState<{ gymId: string; value: VenueDashboard | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [moneyGate, setMoney] = useState<{ gymId: string; ok: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const v = await fetchMyVenues();
      const businessId = v.ok ? v.value.find((x) => x.gymId === gymId)?.businessId : undefined;
      const ok = businessId ? await canSeeVenueMoney(businessId) : false;
      if (!cancelled) setMoney({ gymId, ok });
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId, refreshKey]);
  const showMoney = moneyGate?.gymId === gymId && moneyGate.ok;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchVenueDashboard(gymId);
      if (cancelled) return;
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      setData({ gymId, value: r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId, refreshKey, tick]);

  const d = data?.gymId === gymId ? data.value : null;
  const n = (v: number | undefined) => (d && v !== undefined ? v.toLocaleString() : null);

  return (
    <section aria-label="This venue">
      <VGroupHeader left="This venue" />
      {error && !d ? (
        <div className={`${CARD} rounded-[22px] overflow-hidden`}>
          <VCardError title="Couldn't load this part" message={error} onRetry={() => setTick((t) => t + 1)} />
        </div>
      ) : (
        <div className="space-y-[12px]">
          <VNumberCard
            boxes={[
              { label: "Active members", value: n(d?.activeMembers) },
              { label: "Awaiting payment", value: n(d?.membershipsAwaitingPayment) },
            ]}
            line={
              d
                ? d.membersTotal === 0
                  ? "No memberships at this venue yet."
                  : `${d.membersTotal.toLocaleString()} membership${d.membersTotal === 1 ? "" : "s"} in total. Unpaid ones are listed first under Members.`
                : null
            }
          />
          {showMoney && <VNumberCard
            boxes={[
              { label: "Agreed, not yet paid", value: d ? money(d.amountAwaitingPayment) : null },
              { label: "Marked paid this month", value: d ? money(d.amountMarkedPaidThisMonth) : null },
            ]}
            line="Payments happen at the venue, not through Centium. These figures are what was agreed and what your staff marked as paid."
          />}
          <VNumberCard
            boxes={[
              { label: "Classes this week", value: n(d?.classesThisWeek) },
              { label: "Bookings this week", value: n(d?.bookingsThisWeek) },
            ]}
            line={`Monday to Sunday, on the venue's clock (${timezone}).`}
          />
          <VNumberCard
            boxes={[
              { label: "On waitlists", value: n(d?.waitlistWaiting) },
              { label: "Cancellations this week", value: n(d?.cancellationsThisWeek) },
            ]}
            line="People waiting for a place, and class bookings cancelled this week."
          />
        </div>
      )}
    </section>
  );
}
