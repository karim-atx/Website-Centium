import { useEffect, useState } from "react";
import { fetchVenueDashboard } from "../../services/venues/console";
import { money, type VenueDashboard } from "../../services/venues/consoleLogic";
import { CARD, VCardError, VGroupHeader, VNumberCard } from "./VenueKit";
import { appLocale } from "../../i18n/format";
import { t, tn } from "../../i18n/core";

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
// WHO SEES THE MONEY CARD (OURS-OP1-venue-figures rows 12-13): B15 moved the
// gate into venue_dashboard itself. Any insider reads the venue; the two money
// figures come back null without "revenue" (the owner always has it; an
// employee only with "See Revenue"). Null = the card is left out, never "$0";
// while loading it is left out too, rather than shown to the wrong person.

export function VenueFigures({ gymId, timezone, refreshKey = 0 }: { gymId: string; timezone: string; refreshKey?: number }) {
  const [data, setData] = useState<{ gymId: string; value: VenueDashboard | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

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
  const n = (v: number | undefined) => (d && v !== undefined ? v.toLocaleString(appLocale()) : null);
  const showMoney = !!d && d.amountAwaitingPayment !== null && d.amountMarkedPaidThisMonth !== null;

  return (
    <section aria-label={t("This venue")}>
      <VGroupHeader left={t("This venue")} />
      {error && !d ? (
        <div className={`${CARD} rounded-[22px] overflow-hidden`}>
          <VCardError title={t("Couldn't load this part")} message={error} onRetry={() => setTick((t) => t + 1)} />
        </div>
      ) : (
        <div className="space-y-[12px]">
          <VNumberCard
            boxes={[
              { label: t("Active members"), value: n(d?.activeMembers) },
              { label: t("Awaiting payment"), value: n(d?.membershipsAwaitingPayment) },
            ]}
            line={
              d
                ? d.membersTotal === 0
                  ? t("No memberships at this venue yet.")
                  : tn(d.membersTotal, "{count} membership in total. Unpaid ones are listed first under Members.", "{count} memberships in total. Unpaid ones are listed first under Members.", { count: d.membersTotal.toLocaleString(appLocale()) })
                : null
            }
          />
          {showMoney && <VNumberCard
            boxes={[
              { label: t("Agreed, not yet paid"), value: d && d.amountAwaitingPayment !== null ? money(d.amountAwaitingPayment) : null },
              { label: t("Marked paid this month"), value: d && d.amountMarkedPaidThisMonth !== null ? money(d.amountMarkedPaidThisMonth) : null },
            ]}
            line={t("Payments happen at the venue, not through Centium. These figures are what was agreed and what your staff marked as paid.")}
          />}
          <VNumberCard
            boxes={[
              { label: t("Classes this week"), value: n(d?.classesThisWeek) },
              { label: t("Bookings this week"), value: n(d?.bookingsThisWeek) },
            ]}
            line={t("Monday to Sunday, on the venue's clock ({timezone}).", { timezone })}
          />
          <VNumberCard
            boxes={[
              { label: t("On waitlists"), value: n(d?.waitlistWaiting) },
              { label: t("Cancellations this week"), value: n(d?.cancellationsThisWeek) },
            ]}
            line={t("People waiting for a place, and class bookings cancelled this week.")}
          />
        </div>
      )}
    </section>
  );
}
