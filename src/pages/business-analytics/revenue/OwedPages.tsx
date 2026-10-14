import React, { useMemo, useState } from "react";
import { ArrowDownUp, BadgeCheck, SlidersHorizontal } from "lucide-react";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Toast } from "../../../components/ui/Toast";
import {
  dated,
  dayOf,
  dddDMon,
  dMon,
  markPaid,
  money,
  monthYear,
  owed as owedOf,
  sortOwed,
  sum,
  today as todayIso,
  type OwedRow,
  type OwedSort,
  type PaymentRecord,
} from "../../../services/business-revenue";
import { useAnalytics } from "../analyticsContext";
import {
  ErrorLine,
  OfflineLine,
  PayHeader,
  Skel,
  v,
  vocabOf,
  whoOf,
} from "./kit";
import {
  PayBoxes,
  PayControls,
  PayDetail,
  PayEmpty,
  PayList,
  type HistRow,
} from "./PayKit";
import { owedChip, REVENUE_BASE } from "./payModel";
import { useRevenue } from "./revenueContext";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";

// Money owed (AN14-035 / -037 to -043, PaySeeAllV2 kind "owed"), the owed
// detail (AN14-044 / -089) and the Mark as paid pop-up and toast (AN14-046,
// -048). Today every unpaid item is cash at the desk (AN14-089). Mark as paid
// calls the existing mark-paid functions; the row leaves the list and the
// totals drop (AN14-048 row 2). Not yet: Undo (needs unmark, B8), Send
// reminder / Follow up (business-to-member messages, B7, and the reminder
// log, B8), "+1 vs last" (needs history, B8), Whish (Soon).

const PAY_CHIP = (o: OwedRow) => {
  const c = owedChip(o);
  if (c.severe) return { t: c.long, bg: v("high-bg"), ink: v("high") };
  if (c.late) return { t: c.long, bg: v("caution-bg"), ink: v("pay-caution") };
  return { t: c.long, bg: v("soft"), ink: v("ink-soft") };
};

/** The Mark as paid pop-up (AN14-046) and its toast (AN14-048), for one record. */
export function useMarkPaid(
  onDone: (rec: PaymentRecord, message: string) => void,
) {
  const { reload } = useRevenue();
  const [rec, setRec] = useState<PaymentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const amount = rec ? money(rec.amount ?? 0) : "";
  const ui = (
    <>
      <ConfirmCard
        open={!!rec}
        layout="stacked"
        frame="ops"
        scrimBlur
        icon={<BadgeCheck size={20} strokeWidth={2.2} aria-hidden />}
        disc={{
          bg: "rgb(var(--c-status-good-bg))",
          ink: "rgb(var(--c-status-good))",
        }}
        title={rec ? `Mark ${amount} from ${whoOf(rec)} as paid?` : ""}
        subtitle={
          err
            ? undefined
            : rec
              ? `Records that you received ${amount} in cash for ${rec.item}${rec.kind === "membership" && rec.dueOn ? ", " + monthOf(rec.dueOn) : ""}.`
              : undefined
        }
        extra={
          err ? (
            <p
              role="alert"
              className="text-[13px] font-bold mt-[6px]"
              style={{ color: "#C0392B" }}
            >
              {err}
            </p>
          ) : undefined
        }
        confirmLabel="Mark as paid"
        busy={busy}
        onCancel={() => {
          if (busy) return;
          setRec(null);
          setErr(null);
        }}
        onConfirm={async () => {
          if (!rec || busy) return;
          setBusy(true);
          setErr(null);
          const r = await markPaid(rec);
          setBusy(false);
          if (!r.ok) {
            setErr(r.message);
            return;
          }
          const done = rec;
          setRec(null);
          onDone(
            done,
            `${money(done.amount ?? 0)} from ${whoOf(done)} marked as paid. Removed from Money owed.`,
          );
          reload();
        }}
      />
    </>
  );
  return { open: (r: PaymentRecord) => setRec(r), ui };
}

/** The toast a page was sent back with after Mark as paid (AN14-048, 4 s), and the row it removed. */
export function useRouteToast(): {
  toast: React.ReactNode;
  paidKey: string | null;
} {
  const loc = useLocation();
  const st = (loc.state ?? null) as { toast?: string; paidKey?: string } | null;
  const [msg, setMsg] = useState<string | null>(st?.toast ?? null);
  return {
    paidKey: st?.paidKey ?? null,
    toast: (
      <Toast
        open={!!msg}
        message={msg ?? ""}
        variant="business"
        shape="market"
        duration={4000}
        onExpire={() => setMsg(null)}
      />
    ),
  };
}

export const OwedListPage: React.FC = () => {
  const { kind } = useAnalytics();
  const { data, loading, error, reload, online, loadedAt } = useRevenue();
  const navigate = useNavigate();
  const vocab = vocabOf(kind);
  const [sort, setSort] = useState<OwedSort>("amount");
  const [method, setMethod] = useState<"all" | "cash" | "whish">("all");
  const [item, setItem] = useState<"all" | "membership" | "class">("all");
  const [menu, setMenu] = useState<string | null>(null);
  const today = todayIso();
  const { toast, paidKey } = useRouteToast();

  const all = useMemo(
    () =>
      owedOf(data?.records ?? [], today).filter((o) => o.rec.key !== paidKey),
    [data, today, paidKey],
  );
  const list = sortOwed(
    all.filter(
      (o) =>
        (method === "all" || o.rec.method === method) &&
        (item === "all" || o.rec.kind === item),
    ),
    sort,
  );
  const total = sum(list.map((o) => o.rec.amount ?? 0));
  const filtered = method !== "all" || item !== "all";
  const oldest = sortOwed(list, "overdue")[0];
  const empty = all.length === 0;

  const itemOpts = [
    { value: "all", label: "All items", header: "Item type" },
    {
      value: "membership",
      label: kind === "classes" ? "Plans and packs" : "Memberships",
    },
    {
      value: "class",
      label: kind === "classes" ? "Class bookings" : "Classes",
    },
  ];
  const ctrls = [
    {
      key: "sort",
      icon: ArrowDownUp,
      label: sort === "overdue" ? "Most overdue" : "Largest amount",
      menuLeft: 0,
      options: [
        { value: "amount", label: "Largest amount", header: "Sort by" },
        { value: "overdue", label: "Most overdue" },
      ],
      selected: [sort],
      onPick: (x: string) => setSort(x as OwedSort),
    },
    {
      key: "filter",
      icon: SlidersHorizontal,
      label:
        method === "cash"
          ? "Cash"
          : item !== "all"
            ? (itemOpts.find((o) => o.value === item)?.label ?? "")
            : "All methods",
      menuLeft: 108,
      active: filtered,
      options: [
        { value: "m:all", label: "All methods", header: "Method" },
        { value: "m:cash", label: "Cash" },
        { value: "m:whish", label: "Whish", disabled: true, soon: true },
        ...itemOpts.map((o) => ({ ...o, value: "i:" + o.value })),
      ],
      selected: ["m:" + method, "i:" + item],
      onPick: (x: string) =>
        x.startsWith("m:")
          ? setMethod(x.slice(2) as typeof method)
          : setItem(x.slice(2) as typeof item),
    },
  ];

  let line: string;
  if (empty) line = "Nobody owes you anything right now.";
  else if (oldest && oldest.overdue > 0)
    line = `Oldest: ${whoOf(oldest.rec)}, ${oldest.overdue} ${oldest.overdue === 1 ? "day" : "days"} overdue.`;
  else line = "None are overdue yet.";

  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader
        crumb="Revenue · Payments"
        title="Money owed"
        onBack={() => navigate(`${REVENUE_BASE}/payments`)}
      />
      {!online && <OfflineLine at={loadedAt} />}
      {error && !data ? (
        <ErrorLine message="Couldn't load money owed." onRetry={reload} />
      ) : loading && !data ? (
        <div role="status" aria-label="Loading">
          <div
            className="rounded-[22px] p-[16px] grid grid-cols-2 gap-[16px]"
            style={{
              background: v("card"),
              border: `1px solid ${v("border")}`,
            }}
          >
            <Skel h={28} />
            <Skel h={28} />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <Skel key={i} h={78} r={0} className="mt-[1px] first:mt-[60px]" />
          ))}
        </div>
      ) : (
        <>
          <PayBoxes
            boxes={[
              { l: "Total owed", v: money(total), faint: empty },
              {
                l: vocab.peopleCap,
                v: String(list.length),
                faint: empty,
                d: method === "cash" ? "cash only" : null,
                dTone: "neutral",
              },
            ]}
            line={line}
          />
          <PayControls
            ctrls={ctrls}
            open={menu}
            setOpen={setMenu}
            disabled={empty}
            count={
              empty
                ? undefined
                : `${list.length} ${list.length === 1 ? vocab.person : vocab.people}`
            }
          />
          {empty ? (
            <PayEmpty
              title="Nothing owed"
              body="Everyone is paid up. Unpaid cash and memberships due show here."
            />
          ) : list.length === 0 ? (
            <PayEmpty
              title={
                method === "cash" ? "Nothing owed in cash" : "Nothing owed here"
              }
              body="Try another filter."
            />
          ) : (
            <PayList
              rows={list.map((o) => ({
                key: o.rec.key,
                who: o.rec.who,
                title: whoOf(o.rec),
                sub:
                  o.rec.kind === "membership" && o.rec.dueOn
                    ? `${o.rec.item} · ${monthOf(o.rec.dueOn)}`
                    : `${o.rec.item}${o.rec.dueOn ? ", " + dMon(o.rec.dueOn) : ""}`,
                chip: PAY_CHIP(o),
                s2: o.rec.method === "whish" ? "Expects Whish" : "Expects cash",
                amt: money(o.rec.amount ?? 0),
                onClick: () =>
                  navigate(
                    `${REVENUE_BASE}/payments/owed/${encodeURIComponent(o.rec.key)}`,
                  ),
              }))}
            />
          )}
        </>
      )}
      {toast}
    </div>
  );
};

const MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const monthOf = (iso: string) => MONTH[Number(iso.slice(5, 7)) - 1];

/**
 * One payment (AN14-044 layout): owed items reached from Money owed
 * (/payments/owed/:key) and any transaction (/transactions/:key).
 */
export const PaymentDetailPage: React.FC<{ from: "owed" | "transactions"; recKey: string }> = ({
  from,
  recKey,
}) => {
  const { data, loading, error, reload } = useRevenue();
  const navigate = useNavigate();
  const today = todayIso();
  const [paid, setPaid] = useState(false);
  const access = useConsoleAccess();
  const canMark = access.meets("front_desk") || access.failed;
  const back =
    from === "owed"
      ? `${REVENUE_BASE}/payments/owed`
      : `${REVENUE_BASE}/transactions`;
  const mark = useMarkPaid((_r, message) => {
    setPaid(true);
    navigate(back, { state: { toast: message, paidKey: recKey } });
  });
  const rec = data?.records.find((r) => r.key === recKey) ?? null;

  if (error && !data)
    return (
      <div className="pt-[12px] pb-[120px]">
        <PayHeader
          crumb={from === "owed" ? "Money owed" : "Revenue · Transactions"}
          title="Payment"
          onBack={() => navigate(back)}
        />
        <ErrorLine message="Couldn't load this payment." onRetry={reload} />
      </div>
    );
  if (loading && !data)
    return (
      <div className="pt-[12px] pb-[120px]" role="status" aria-label="Loading">
        <div
          className="rounded-[22px] pt-[18px] px-[16px] pb-[16px] flex flex-col items-center gap-[8px]"
          style={{ background: v("card"), border: `1px solid ${v("border")}` }}
        >
          <Skel h={56} r={999} className="w-[56px]" />
          <Skel h={14} className="w-[40%]" />
          <Skel h={12} className="w-[55%]" />
          <Skel h={40} className="w-[30%] mt-[10px]" />
        </div>
      </div>
    );
  if (!rec) return <Navigate to={back} replace />;

  const owedRow = owedOf([rec], today)[0] ?? null;
  const unpaid = !!owedRow && !paid;
  const name = whoOf(rec);
  const sub =
    rec.kind === "membership"
      ? rec.startedOn
        ? `Member since ${monthYear(rec.startedOn)}`
        : rec.item
      : rec.item;
  let chip: { t: string; bg: string; ink: string };
  if (unpaid) {
    const c = owedChip(owedRow);
    chip = c.late
      ? { t: c.long, bg: v("caution-bg"), ink: v("pay-caution") }
      : { t: "Unpaid, cash", bg: v("caution-bg"), ink: v("pay-caution") };
  } else if (rec.status === "paid")
    chip = {
      t: dated(rec) ? `Paid ${dMon(dayOf(rec.paidAt as string))}` : "Paid",
      bg: v("good-bg"),
      ink: v("good"),
    };
  else chip = { t: "Refunded", bg: v("soft"), ink: v("ink-soft") };

  const facts = [
    {
      l: "Item",
      v:
        rec.kind === "membership" && rec.dueOn
          ? `${rec.item} · ${monthOf(rec.dueOn)}`
          : rec.item,
    },
    ...(rec.dueOn
      ? [
          {
            l: unpaid && owedRow.overdue > 0 ? "Was due" : "Due",
            v: dddDMon(rec.dueOn),
          },
        ]
      : []),
    {
      l: unpaid ? "Expected method" : "Method",
      v: rec.method === "whish" ? "Whish" : "Cash at the desk",
    },
    ...(rec.status === "paid" && !dated(rec)
      ? [{ l: "Paid on", v: "Not shared yet" }]
      : []),
  ];
  const hist: HistRow[] =
    unpaid && owedRow.overdue > 0 && rec.dueOn
      ? [
          {
            t: "Not paid at the desk",
            s: "Cash payments can't be retried",
            d: dMon(rec.dueOn),
            kind: "warn",
          },
        ]
      : [];

  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader
        crumb={from === "owed" ? "Money owed" : "Revenue · Transactions"}
        title={name}
        onBack={() => navigate(back)}
      />
      <PayDetail
        who={rec.who}
        name={name}
        sub={sub}
        amt={money(rec.amount ?? 0)}
        amtInk={rec.status === "refunded" ? v("faint") : undefined}
        chip={chip}
        facts={facts}
        histTitle="Recent payments"
        hist={hist}
        actions={
          // Recording cash is a desk action (mark_*_paid need front_desk,
          // Database b95ef5c), not part of seeing revenue.
          unpaid && canMark
            ? [
                {
                  t: "Mark as paid",
                  icon: BadgeCheck,
                  primary: true,
                  onClick: () => mark.open(rec),
                },
              ]
            : []
        }
        note={
          unpaid
            ? "Cash payments are recorded by hand. Whish payments are coming."
            : undefined
        }
      />
      {mark.ui}
    </div>
  );
};
