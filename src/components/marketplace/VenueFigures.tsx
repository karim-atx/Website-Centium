import { useEffect, useState } from "react";
import { Users, Clock, Wallet, HandCoins, CalendarDays, Ticket, ListOrdered, CalendarX, Star } from "lucide-react";
import { Card } from "../ui/Card";
import { MemberTag } from "./MemberTag";
import { fetchVenueDashboard } from "../../services/venues/console";
import { money, reviewsLine, type VenueDashboard } from "../../services/venues/consoleLogic";
import { openNowTag } from "../../services/venues/hours";

// venue_dashboard(id) (stage A4) in the Analytics tab's KPI card grid: the
// same 2-up Card, 16px primary icon, 18/700 value, 11/600 label and 10.5
// sub-line. NOT YET MATCHED TO THE BUSINESS UI BOARD.
//
// THE TWO MONEY FIGURES ARE NOT REVENUE (the contract: payments happen outside
// Centium, BR-04). One is what was agreed and is unpaid; the other is what
// somebody at the venue pressed "mark paid" on this month. Labelled as exactly
// that. The week and month are the venue's own (computed in gyms.timezone).

export function VenueFigures({ gymId }: { gymId: string }) {
  const [data, setData] = useState<{ gymId: string; value: VenueDashboard | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [gymId]);

  const d = data?.gymId === gymId ? data.value : null;
  const open = d ? openNowTag(d.isOpenNow) : null;

  const tiles = d
    ? [
        { icon: Users, label: "Active members", value: d.activeMembers.toLocaleString(), sub: `${d.membersTotal.toLocaleString()} memberships in total` },
        { icon: Clock, label: "Awaiting payment", value: d.membershipsAwaitingPayment.toLocaleString(), sub: "Active memberships not yet paid" },
        { icon: Wallet, label: "Agreed, not yet paid", value: money(d.amountAwaitingPayment), sub: "Memberships waiting to be marked paid" },
        { icon: HandCoins, label: "Marked paid this month", value: money(d.amountMarkedPaidThisMonth), sub: "Memberships and class bookings" },
        { icon: CalendarDays, label: "Classes this week", value: d.classesThisWeek.toLocaleString(), sub: "Monday to Sunday, venue time" },
        { icon: Ticket, label: "Bookings this week", value: d.bookingsThisWeek.toLocaleString(), sub: "Across this week's classes" },
        { icon: ListOrdered, label: "On waitlists", value: d.waitlistWaiting.toLocaleString(), sub: "People waiting for a place" },
        { icon: CalendarX, label: "Cancellations this week", value: d.cancellationsThisWeek.toLocaleString(), sub: "Class bookings cancelled" },
        { icon: Star, label: "Reviews", value: d.reviewsAverage === null ? "–" : d.reviewsAverage.toFixed(1), sub: reviewsLine(d.reviewsAverage, d.reviewsCount) },
      ]
    : [];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <p className="section-label text-charcoal-faint">This venue</p>
        {open && <MemberTag label={open.label} tone={open.tone} />}
      </div>
      {error && <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">{error}</p>}
      {!d && !error && <p className="text-xs text-charcoal-faint mb-3">Loading figures…</p>}
      {d && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {tiles.map((k) => (
              <Card key={k.label} className="animate-fade-slide-up">
                <k.icon size={16} className="text-primary mb-2" />
                <p className="text-lg font-bold text-charcoal leading-tight tabular-nums">{k.value}</p>
                <p className="text-[11px] font-semibold text-charcoal-soft leading-tight mt-1">{k.label}</p>
                <p className="text-[10.5px] text-charcoal-faint leading-tight mt-0.5">{k.sub}</p>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-charcoal-faint text-center mt-2.5">
            Payments happen at the venue, not through Centium. These figures are what was agreed and what your staff marked as paid.
          </p>
        </>
      )}
    </div>
  );
}
