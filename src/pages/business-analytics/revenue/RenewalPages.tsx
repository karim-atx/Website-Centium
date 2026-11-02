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
  renewalAmountOf,
  renewalAmountText,
  renewals as renewalsOf,
  renewalWeeks,
  spanLabel,
  sum,
  today as todayIso,
} from "../../../services/business-revenue";
import { grantedRenewal } from "../../../services/front-desk/frontDeskLogic";
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
import { t, tn, tx } from "../../../i18n/core";
import { monShortYear } from "../../../services/business-revenue/model";

// Renewals by week (AN14-062 to -067, -070 to -072: PaySeeAllV2 kind
// "renewals") and the plan detail (AN14-068). A renewal is an active
// membership whose period ends in the next 30 days (gym_memberships.
// expires_on), at what renewing charges (venue_renewals_due.renewal_price, the
// plan's price, so a granted membership counts at its plan price; the agreed
// price on a stack without it). Weeks are Monday to Sunday (user rule).
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
    groups.map((g) => sum(g.rows.map((r) => r.amount ?? 0))),
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
  if (empty) line = t("No renewals in the next 30 days.");
  else if (plan !== "all")
    line = t("Filtered by plan. Renewals keep the payment method the member last used.");
  else if (busiest)
    line = tn(busiest.n, "{day} is the busiest day: {n} renewal.", "{day} is the busiest day: {n} renewals.", { day: longDay(busiest.day) });
  else line = t("Renewals keep the payment method the member last used.");

  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader
        crumb={`${t("Revenue")} · ${t("Payments")} · ${t("next 30 days")}`}
        title={t("Renewals")}
        onBack={() => navigate(`${REVENUE_BASE}/payments`)}
      />
      {!online && <OfflineLine at={loadedAt} />}
      {error && !data ? (
        <ErrorLine message={t("Couldn't load renewals.")} onRetry={reload} />
      ) : loading && !data ? (
        <div role="status" aria-label={t("Loading")}>
          <Skel h={118} r={22} />
          <Skel h={300} r={20} className="mt-[60px]" />
        </div>
      ) : (
        <>
          <PayBoxes
            boxes={[
              { l: t("Renewals due"), v: String(n), faint: empty },
              { l: t("Expected"), v: money(total), faint: empty },
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
                    ? t("All weeks")
                    : (weeks[Number(week)]?.label ?? t("All weeks")),
                menuLeft: 0,
                active: week !== "all",
                options: [
                  { value: "all", label: t("All weeks"), header: t("Week") },
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
                label: plan === "all" ? t("All plans") : plan,
                menuLeft: 102,
                active: plan !== "all",
                options: [
                  { value: "all", label: t("All plans"), header: t("Plan") },
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
              title={t("No renewals coming up")}
              body={t("Memberships renewing in the next 30 days show here, grouped by week.")}
            />
          ) : groups.length === 0 ? (
            <PayEmpty
              icon={CalendarCheck}
              title={t("No renewals here")}
              body={t("Try another filter.")}
            />
          ) : (
            groups.map((g) => (
              <React.Fragment key={g.from}>
                <PayGroupHead
                  id={`rv-week-${g.i}`}
                  h={`${g.label} · ${spanLabel(g.from, g.to)}`}
                  s={`${g.rows.length} · ${money(sum(g.rows.map((r) => r.amount ?? 0)))}`}
                />
                <PayList
                  rows={g.rows.map((r) => ({
                    key: r.rec.key,
                    who: r.rec.who,
                    title: whoOf(r.rec),
                    dot: dotOf(r.rec.item),
                    // CN: a granted membership stays listed, labelled: it was
                    // never paid for, and renewing it charges the plan price.
                    sub: `${r.rec.item} · ${t("renews {date}", { date: dddDMon(r.on) })}${r.rec.granted ? ` · ${grantedRenewal(r.amount, money)}` : ""}`,
                    s2: r.rec.granted ? tx("Granted", "membership") : r.rec.method === "whish" ? "Whish" : t("Cash"),
                    amt: renewalAmountText(r),
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
  const due = rec ? data?.renewalsDue.find((d) => d.membershipId === rec.id) : undefined;
  const personId = due?.personId ?? null;
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
          crumb={t("Renewals")}
          title={t("Renewal")}
          onBack={() => navigate(back)}
        />
        <ErrorLine message={t("Couldn't load this renewal.")} onRetry={reload} />
      </div>
    );
  if (loading && !data)
    return (
      <div className="pt-[12px] pb-[120px]" role="status" aria-label={t("Loading")}>
        <Skel h={220} r={22} />
      </div>
    );
  if (!rec || !rec.expiresOn) return <Navigate to={back} replace />;
  const name = whoOf(rec);
  // 251ab70: what renewing charges (renewal_price), a grant included.
  const amount = renewalAmountOf(rec, due);
  const amt = renewalAmountText({ rec, amount });
  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader crumb={t("Renewals")} title={name} onBack={() => navigate(back)} />
      <PayDetail
        who={rec.who}
        name={name}
        sub={
          rec.startedOn
            ? `${rec.item} · ${t("member since {date}", { date: monShortYear(rec.startedOn) })}`
            : rec.item
        }
        amt={amt}
        chip={{
          t: t("Renews {date}", { date: dddDMon(rec.expiresOn) }),
          bg: v("teal-pale"),
          ink: v("teal-ink"),
        }}
        facts={[
          { l: t("Plan"), v: rec.item },
          ...(rec.granted
            ? [
                { l: t("How they got it"), v: t("Granted with a code") },
                { l: t("Renewing"), v: amount !== null ? t("Charges {amount}", { amount: amt }) : t("Charges the plan price") },
              ]
            : [
                { l: t("Price"), v: amt },
                { l: t("Payment method"), v: rec.method === "whish" ? "Whish" : t("Cash") },
              ]),
          { l: t("Current period ends"), v: dddDMon(rec.expiresOn) },
        ]}
        histTitle={t("Last payments")}
        hist={paid ? paidHistRows(paid, "renewal") : undefined}
        actions={
          personId
            ? [
                {
                  t: t("Message member"),
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
        message={toast ? t(toast) : ""}
        variant="business"
        shape="market"
        duration={4000}
        onExpire={() => setToast(null)}
      />
    </div>
  );
};
