import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Package, ScanLine, Truck } from "lucide-react";
import type { DashPalette } from "./palette";
import type { TodayBlock as TodayModel } from "./dashboardModel";
import { KitBars, KitEmpty, KitLabel, KitList, KitTip, NumberBoxes } from "./parts";
import { fetchVenueDashboard } from "../../services/venues/console";
import { money, reviewsLine, type VenueDashboard } from "../../services/venues/consoleLogic";
import { openNowTag } from "../../services/venues/hours";
import { MemberTag } from "../marketplace/MemberTag";
import { linePx, textPx } from "../../theme/textSize";

// The per-type "Today" block under the gauge cluster (V6-52 / D-BU4-1):
// BizTypeKit's glance screen (DA1-003 classes, DA1-007 gym, DA1-011 store)
// with its early (005 / 009 / 013) and empty (006 / 010 / 014) states. The
// frame's own kicker and title are not repeated (the Dashboard header is
// DA1-015 #2-#7); its "At a glance" label reads "Today" here (OURS, DA1-003 #4).
// Store (B11): Orders to fulfil and Low stock lists, each with See all (as drawn).
// Gym (B10, DA1-007 / 009): Busy times today bars and Recent entries (See all
// opens the Front desk); members masked as the rest of the Dashboard.

export function TodayBlock({
  c,
  model,
  onSeeAll,
  onOpenClass,
  onOrders,
  onOpenOrder,
  onProducts,
  onEntries,
}: {
  c: DashPalette;
  model: TodayModel;
  onSeeAll: () => void;
  onOpenClass: () => void;
  /** Store (DA1-011): the Orders tab, one order, the Products tab. */
  onOrders?: () => void;
  onOpenOrder?: (id: string) => void;
  onProducts?: () => void;
  /** Gym (DA1-007 #6): the Front desk's entries (default: the Front desk tab). */
  onEntries?: () => void;
}) {
  const navigate = useNavigate();
  const openEntries = onEntries ?? (() => navigate("/app/business/operations"));
  return (
    <section aria-label="Today" style={{ marginBottom: 6 }}>
      <KitLabel c={c} label="Today" />
      {model.kind === "empty" ? (
        <>
          {model.boxes && <NumberBoxes c={c} boxes={model.boxes} />}
          <KitEmpty c={c} icon={model.icon} title={model.title} body={model.body} />
        </>
      ) : model.kind === "store" ? (
        <>
          <NumberBoxes c={c} boxes={model.boxes} />
          {model.orders.length > 0 && (
            <>
              <KitLabel c={c} label="Orders to fulfil" action="See all" onAction={onOrders} />
              <KitList c={c} rows={model.orders.map((o) => ({ key: o.id, Icon: o.glyph === "truck" ? Truck : Package, title: o.title, detail: o.detail, pill: o.pill, onClick: onOpenOrder ? () => onOpenOrder(o.id) : undefined }))} />
            </>
          )}
          {model.low.length > 0 && (
            <>
              <KitLabel c={c} label="Low stock" action="See all" onAction={onProducts} />
              <KitList c={c} rows={model.low.map((p) => ({ key: p.id, Icon: Package, title: p.title, detail: p.detail, value: p.value, onClick: onProducts }))} />
            </>
          )}
          {model.tip && <KitTip c={c} text={model.tip} />}
        </>
      ) : model.kind === "gym" ? (
        <>
          <NumberBoxes c={c} boxes={model.boxes} />
          {model.bars.length > 0 && <KitBars c={c} title="Busy times today" sub="When is the floor busiest?" bars={model.bars} hi={model.hi} />}
          {model.recent.length > 0 && (
            <>
              <KitLabel c={c} label="Recent entries" action="See all" onAction={openEntries} />
              <KitList c={c} rows={model.recent.map((r) => ({ key: r.id, Icon: ScanLine, title: r.title, detail: r.detail, pill: r.pill, onClick: openEntries }))} />
            </>
          )}
          {model.tip && <KitTip c={c} text={model.tip} />}
        </>
      ) : (
        <>
          <NumberBoxes c={c} boxes={model.boxes} />
          {model.bars.length > 0 && <KitBars c={c} title="Fill by class today" sub="Which classes are filling up?" bars={model.bars} hi={model.hi} />}
          {model.next.length > 0 && (
            <>
              <KitLabel c={c} label="Next up" action="See all" onAction={onSeeAll} />
              <KitList c={c} rows={model.next.map((r) => ({ key: r.id, Icon: CalendarDays, title: r.title, detail: r.detail, pill: r.pill, onClick: onOpenClass }))} />
            </>
          )}
          {model.tip && <KitTip c={c} text={model.tip} />}
        </>
      )}
    </section>
  );
}

/**
 * OURS-DA-kept-features #5: the venue's own figures (venue_dashboard, stage
 * A4) as BizTypeKit number boxes, for the venue chosen in the switcher. The
 * labels and the payments note are the existing VenueFigures strings.
 */
export function VenueBoxes({ c, gymId }: { c: DashPalette; gymId: string }) {
  const [data, setData] = useState<{ gymId: string; value: VenueDashboard | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchVenueDashboard(gymId);
      if (cancelled) return;
      if (!r.ok) return setError(r.message);
      setError(null);
      setData({ gymId, value: r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId]);
  const d = data?.gymId === gymId ? data.value : null;
  const open = d ? openNowTag(d.isOpenNow) : null;
  return (
    <section aria-label="This venue" style={{ marginBottom: 6 }}>
      <div style={{ position: "relative" }}>
        <KitLabel c={c} label="This venue" />
        {open && (
          <span style={{ position: "absolute", right: 2, top: 0 }}>
            <MemberTag label={open.label} tone={open.tone} />
          </span>
        )}
      </div>
      {error && <p style={{ fontSize: textPx(12), lineHeight: linePx(18), color: c.high, margin: "0 2px 12px" }}>{error}</p>}
      {!d && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginBottom: 14 }} aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-skeleton-pulse" style={{ borderRadius: 16, background: c.listBg, height: 72 }} />
          ))}
        </div>
      )}
      {d && (
        <>
          <NumberBoxes
            c={c}
            cols={3}
            boxes={[
              { value: d.activeMembers.toLocaleString(), label: "Active members" },
              { value: d.membershipsAwaitingPayment.toLocaleString(), label: "Awaiting payment" },
              // B15: null without "revenue": the two money boxes are left out, never "$0".
              ...(d.amountAwaitingPayment !== null && d.amountMarkedPaidThisMonth !== null
                ? [
                    { value: money(d.amountAwaitingPayment), label: "Agreed, not yet paid" },
                    { value: money(d.amountMarkedPaidThisMonth), label: "Marked paid this month" },
                  ]
                : []),
              { value: d.classesThisWeek.toLocaleString(), label: "Classes this week" },
              { value: d.bookingsThisWeek.toLocaleString(), label: "Bookings this week" },
              { value: d.waitlistWaiting.toLocaleString(), label: "On waitlists" },
              { value: d.cancellationsThisWeek.toLocaleString(), label: "Cancellations this week" },
              { value: d.reviewsAverage === null ? "–" : d.reviewsAverage.toFixed(1), label: "Reviews", delta: reviewsLine(d.reviewsAverage, d.reviewsCount) },
            ]}
          />
          {d.amountAwaitingPayment !== null && (
            <p style={{ fontSize: textPx(11), lineHeight: linePx(16), color: c.faint, textAlign: "center", margin: "-4px 0 14px" }}>
              Payments happen at the venue, not through Centium. These figures are what was agreed and what your staff marked as paid.
            </p>
          )}
        </>
      )}
    </section>
  );
}
