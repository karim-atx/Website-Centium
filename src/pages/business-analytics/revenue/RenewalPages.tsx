import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarRange, MessageCircle, SlidersHorizontal } from "lucide-react";
import {
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  busiestDay,
  dddDMon,
  longDay,
  money,
  monthYear,
  renewals as renewalsOf,
  renewalWeeks,
  spanLabel,
  sum,
  today as todayIso,
} from "../../../services/business-revenue";
import { startMemberThread } from "../../../services/messaging";
import { Toast } from "../../../components/ui/Toast";
import { ErrorLine, OfflineLine, PayHeader, Skel, v, whoOf } from "./kit";
import {
  PayBoxes,
  PayControls,
  PayDetail,
  PayEmpty,
  PayGroupHead,
  PayList,
} from "./PayKit";
import { paidHistRows, REVENUE_BASE } from "./payModel";
import { usePaidHistory } from "./usePaidHistory";
import { useRevenue } from "./revenueContext";

// Renewals by week (AN14-062 to -067, -070 to -072: PaySeeAllV2 kind
// "renewals") and the plan detail (AN14-068). A renewal is an active
// membership whose period ends in the next 30 days (gym_memberships.
// expires_on), at its agreed price. Weeks are Monday to Sunday (user rule).
// The detail shows the member's last paid payments (business_payments, B8)
// and "Message member" (start_member_thread, B7). Not yet: bookings or
// visits this month (B9 / B10).

/** Plan dot colours in plan order (Monthly #AEA1DC, 12 months #6F9993, pack #C9922E). */
const PLAN_DOTS = [v("primary"), v("pay-teal"), v("amber")];

export const RenewalsPage: React.FC = () => {
  const { data, loading, error, reload, online, loadedAt } = useRevenue();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const today = todayIso();
  const [week, setWeek] = useState<string>("all");
  const [plan, setPlan] = useState<string>("all");
  const [menu, setMenu] = useState<string | null>(null);

  const ren = useMemo(
    () => renewalsOf(data?.records ?? [], today, data?.renewalsDue ?? null),
    [data, today],
  );
  const weeks = useMemo(() => renewalWeeks(ren, today), [ren, today]);
  const plans = useMemo(() => [...new Set(ren.map((r) => r.rec.item))], [ren]);
  const dotOf = (p: string) => PLAN_DOTS[plans.indexOf(p) % PLAN_DOTS.length];
  const groups = weeks
    .map((w, i) => ({
      ...w,
      i,
      rows: w.rows.filter((r) => plan === "all" || r.rec.item === plan),
    }))
    .filter((g) => (week === "all" || String(g.i) === week) && g.rows.length);
  const n = sum(groups.map((g) => g.rows.length));
  const total = sum(
    groups.map((g) => sum(g.rows.map((r) => r.rec.amount ?? 0))),
  );
  const empty = ren.length === 0;
  const busiest = busiestDay(ren);

  // Arriving from the Payments card's "See all" scrolls to that week (AN14-067).
  const target = params.get("week");
  useEffect(() => {
    if (target === null || !data) return;
    const el = document.getElementById(`rv-week-${target}`);
    el?.scrollIntoView({ block: "start" });
  }, [target, data]);

  let line: string;
  if (empty) line = "No renewals in the next 30 days.";
  else if (plan !== "all")
    line =
      "Filtered by plan. Renewals keep the payment method the member last used.";
  else if (busiest)
    line = `${longDay(busiest.day)} is the busiest day: ${busiest.n} renewals.`;
  else line = "Renewals keep the payment method the member last used.";

  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader
        crumb="Revenue · Payments · next 30 days"
        title="Renewals"
        onBack={() => navigate(`${REVENUE_BASE}/payments`)}
      />
      {!online && <OfflineLine at={loadedAt} />}
      {error && !data ? (
        <ErrorLine message="Couldn't load renewals." onRetry={reload} />
      ) : loading && !data ? (
        <div role="status" aria-label="Loading">
          <Skel h={118} r={22} />
          <Skel h={300} r={20} className="mt-[60px]" />
        </div>
      ) : (
        <>
          <PayBoxes
            boxes={[
              { l: "Renewals due", v: String(n), faint: empty },
              { l: "Expected", v: money(total), faint: empty },
            ]}
            line={line}
          />
          <PayControls
            open={menu}
            setOpen={setMenu}
            disabled={empty}
            ctrls={[
              {
                key: "week",
                icon: CalendarRange,
                label:
                  week === "all"
                    ? "All weeks"
                    : (weeks[Number(week)]?.label ?? "All weeks"),
                menuLeft: 0,
                active: week !== "all",
                options: [
                  { value: "all", label: "All weeks", header: "Week" },
                  ...weeks.map((w, i) => ({
                    value: String(i),
                    label: w.label,
                  })),
                ],
                selected: [week],
                onPick: setWeek,
              },
              {
                key: "filter",
                icon: SlidersHorizontal,
                label: plan === "all" ? "All plans" : plan,
                menuLeft: 102,
                active: plan !== "all",
                options: [
                  { value: "all", label: "All plans", header: "Plan" },
                  ...plans.map((p) => ({ value: p, label: p })),
                ],
                selected: [plan],
                onPick: setPlan,
              },
            ]}
          />
          {empty ? (
            <PayEmpty
              icon={CalendarCheck}
              title="No renewals coming up"
              body="Memberships renewing in the next 30 days show here, grouped by week."
            />
          ) : groups.length === 0 ? (
            <PayEmpty
              icon={CalendarCheck}
              title="No renewals here"
              body="Try another filter."
            />
          ) : (
            groups.map((g) => (
              <React.Fragment key={g.from}>
                <PayGroupHead
                  id={`rv-week-${g.i}`}
                  h={`${g.label} · ${spanLabel(g.from, g.to)}`}
                  s={`${g.rows.length} · ${money(sum(g.rows.map((r) => r.rec.amount ?? 0)))}`}
                />
                <PayList
                  rows={g.rows.map((r) => ({
                    key: r.rec.key,
                    who: r.rec.who,
                    title: whoOf(r.rec),
                    dot: dotOf(r.rec.item),
                    sub: `${r.rec.item} · renews ${dddDMon(r.on)}`,
                    s2: r.rec.method === "whish" ? "Whish" : "Cash",
                    amt: money(r.rec.amount ?? 0),
                    onClick: () =>
                      navigate(
                        `${REVENUE_BASE}/payments/renewals/${encodeURIComponent(r.rec.key)}`,
                      ),
                  }))}
                />
              </React.Fragment>
            ))
          )}
        </>
      )}
    </div>
  );
};

export const RenewalDetailPage: React.FC<{ recKey: string }> = ({ recKey }) => {
  const { data, loading, error, reload, businessId } = useRevenue();
  const navigate = useNavigate();
  const back = `${REVENUE_BASE}/payments/renewals`;
  const rec =
    data?.records.find((r) => r.key === recKey) ?? null;
  // B7 venue_renewals_due names the member (null on a guest or an older database).
  const personId =
    (rec && data?.renewalsDue.find((d) => d.membershipId === rec.id)?.personId) ?? null;
  const paid = usePaidHistory(businessId, personId, 3);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const message = async () => {
    if (!businessId || !personId || busy) return;
    setBusy(true);
    const t = await startMemberThread(businessId, personId);
    setBusy(false);
    if (!t.ok) {
      setToast(t.message);
      return;
    }
    navigate("/app/messages", { state: { threadId: t.threadId } });
  };
  if (error && !data)
    return (
      <div className="pt-[12px] pb-[120px]">
        <PayHeader
          crumb="Renewals"
          title="Renewal"
          onBack={() => navigate(back)}
        />
        <ErrorLine message="Couldn't load this renewal." onRetry={reload} />
      </div>
    );
  if (loading && !data)
    return (
      <div className="pt-[12px] pb-[120px]" role="status" aria-label="Loading">
        <Skel h={220} r={22} />
      </div>
    );
  if (!rec || !rec.expiresOn) return <Navigate to={back} replace />;
  const name = whoOf(rec);
  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader crumb="Renewals" title={name} onBack={() => navigate(back)} />
      <PayDetail
        who={rec.who}
        name={name}
        sub={
          rec.startedOn
            ? `${rec.item} · member since ${monthYear(rec.startedOn).replace(/^(\w{3})\w*/, "$1")}`
            : rec.item
        }
        amt={money(rec.amount ?? 0)}
        chip={{
          t: `Renews ${dddDMon(rec.expiresOn)}`,
          bg: v("teal-pale"),
          ink: v("teal-ink"),
        }}
        facts={[
          { l: "Plan", v: rec.item },
          { l: "Price", v: money(rec.amount ?? 0) },
          { l: "Payment method", v: rec.method === "whish" ? "Whish" : "Cash" },
          { l: "Current period ends", v: dddDMon(rec.expiresOn) },
        ]}
        histTitle="Last payments"
        hist={paid ? paidHistRows(paid, "renewal") : undefined}
        actions={
          personId
            ? [
                {
                  t: "Message member",
                  icon: MessageCircle,
                  disabled: busy,
                  onClick: () => void message(),
                },
              ]
            : []
        }
      />
      <Toast
        open={!!toast}
        message={toast ?? ""}
        variant="business"
        shape="market"
        duration={4000}
        onExpire={() => setToast(null)}
      />
    </div>
  );
};
