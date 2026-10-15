import React, { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Undo2 } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Toast } from "../../../components/ui/Toast";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { isMaskedLabel } from "../../../services/venues/consoleLogic";
import {
  dddDMon,
  dMon,
  fetchLedgerPayment,
  ledgerItem,
  markTarget,
  moneyCents,
  monthYear,
  parseRefundAmount,
  recordKeyOf,
  recordRefund,
  refundable,
  today as todayIso,
  type LedgerPayment,
} from "../../../services/business-revenue";
import { daysBetween } from "../analyticsRange";
import { ErrorLine, PayHeader, Skel, v } from "./kit";
import { PayDetail, type DetailAction, type HistRow } from "./PayKit";
import { owedChip, REVENUE_BASE } from "./payModel";
import { useRevenue } from "./revenueContext";
import { useMarkPaid } from "./OwedPages";

// One ledger transaction (AN14-044 layout), reached from Transactions
// (/transactions/:paymentId) once transactions_page answers (B8 RV-01).
// The row is business_payments (revenue SELECT policy) with its refunds
// (business_refunds) and the readers' label (business_person_label); days are
// the business's own, as the readers give them.
//
// B8 RV-04, Refund: no frame draws it. Built in the Mark as paid pop-up's
// language (AN14-046: stacked ConfirmCard, ops frame, icon disc, title,
// body, primary + text Cancel, failure in the body 13/700 #C0392B) and its
// toast (AN14-048). The pop-up adds an Amount field (full amount prefilled,
// part refunds allowed) and an optional Reason (500 characters, the
// column's check). record_refund refuses a never-paid payment and an amount
// over what is left (22023, with the figures): shown in the pop-up. Needs the
// revenue permission. Every string in the refund pop-up, its toast and the
// detail's refund facts and history is OURS.

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

interface RefundSubject {
  paymentId: string;
  label: string;
  item: string;
  /** What is left to refund. */
  max: number;
}

const FIELD: React.CSSProperties = {
  background: v("card"),
  border: `1px solid ${v("border")}`,
  color: v("ink"),
};

/** The Refund pop-up (AN14-046 pattern) and its toast (AN14-048 pattern), for one paid payment. */
function useRefund(onDone: () => void) {
  const [subject, setSubject] = useState<RefundSubject | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [fieldErr, setFieldErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const open = (s: RefundSubject) => {
    setSubject(s);
    setAmount(String(s.max));
    setReason("");
    setFieldErr(null);
    setErr(null);
  };
  const parsed = subject ? parseRefundAmount(amount, subject.max) : null;
  const shown = parsed?.ok ? parsed.value : (subject?.max ?? 0);

  const ui = (
    <>
      <ConfirmCard
        open={!!subject}
        layout="stacked"
        frame="ops"
        scrimBlur
        icon={<Undo2 size={20} strokeWidth={2.2} aria-hidden />}
        disc={{
          bg: "rgb(var(--c-primary-pale))",
          ink: "rgb(var(--c-primary-dark))",
        }}
        title={subject ? `Refund ${moneyCents(shown)} to ${subject.label}?` : ""}
        subtitle={
          err
            ? undefined
            : subject
              ? `Records money you gave back for ${subject.item}. It comes off your revenue.`
              : undefined
        }
        extra={
          subject ? (
            <div className="rv-scope text-left">
              {err && (
                <p
                  role="alert"
                  className="text-[13px] font-bold mt-[6px] text-center"
                  style={{ color: "#C0392B" }}
                >
                  {err}
                </p>
              )}
              <label className="block mt-[14px]">
                <span
                  className="block text-[12px] font-bold mb-[6px]"
                  style={{ color: v("ink-soft") }}
                >
                  Amount
                </span>
                <span
                  className="flex items-center gap-[4px] h-[46px] rounded-[14px] px-[12px]"
                  style={{
                    ...FIELD,
                    border: `1px solid ${fieldErr ? "#C0392B" : v("border")}`,
                  }}
                >
                  <span className="text-[15px] font-bold" style={{ color: v("faint") }}>
                    $
                  </span>
                  <input
                    inputMode="decimal"
                    value={amount}
                    disabled={busy}
                    aria-invalid={!!fieldErr || undefined}
                    aria-describedby="refund-amount-note"
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setFieldErr(null);
                      setErr(null);
                    }}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-bold rv-num"
                    style={{ color: v("ink") }}
                  />
                </span>
                <span
                  id="refund-amount-note"
                  className="block text-[11.5px] leading-[16px] mt-[4px]"
                  style={{ color: fieldErr ? "#C0392B" : v("faint") }}
                >
                  {fieldErr ?? `Up to ${moneyCents(subject.max)}.`}
                </span>
              </label>
              <label className="block mt-[10px]">
                <span
                  className="block text-[12px] font-bold mb-[6px]"
                  style={{ color: v("ink-soft") }}
                >
                  Reason (optional)
                </span>
                <input
                  value={reason}
                  disabled={busy}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-[46px] rounded-[14px] px-[12px] outline-none text-[14px]"
                  style={FIELD}
                />
              </label>
            </div>
          ) : undefined
        }
        confirmLabel="Record refund"
        busy={busy}
        onCancel={() => {
          if (busy) return;
          setSubject(null);
        }}
        onConfirm={async () => {
          if (!subject || busy) return;
          const p = parseRefundAmount(amount, subject.max);
          if (!p.ok) {
            setFieldErr(p.message);
            return;
          }
          setBusy(true);
          setErr(null);
          const r = await recordRefund(subject.paymentId, p.value, reason);
          setBusy(false);
          if (!r.ok) {
            setErr(r.message);
            return;
          }
          const done = subject;
          setSubject(null);
          setToast(`Refund of ${moneyCents(p.value)} to ${done.label} recorded.`);
          onDone();
        }}
      />
      <Toast
        open={!!toast}
        message={toast ?? ""}
        variant="business"
        shape="market"
        duration={4000}
        onExpire={() => setToast(null)}
      />
    </>
  );
  return { open, ui };
}

const DetailLoading: React.FC = () => (
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

/** One transaction from the ledger: facts, refunds, Mark as paid (owed) and Refund (paid). */
export const TransactionDetailPage: React.FC<{ paymentId: string }> = ({
  paymentId,
}) => {
  const { data, businessId, reload: reloadRevenue } = useRevenue();
  const navigate = useNavigate();
  const access = useConsoleAccess();
  const canMark = access.meets("front_desk") || access.failed;
  const canRefund = access.meets("revenue") || access.failed;
  const back = `${REVENUE_BASE}/transactions`;
  const [read, setRead] = useState<{ p: LedgerPayment | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void fetchLedgerPayment(businessId, paymentId).then((r) => {
      if (!alive) return;
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      setRead({ p: r.value });
    });
    return () => {
      alive = false;
    };
  }, [businessId, paymentId, tick]);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
    reloadRevenue();
  }, [reloadRevenue]);
  const mark = useMarkPaid((_s, message) => {
    setToast(message.replace(" Removed from Money owed.", ""));
    reload();
  });
  const refund = useRefund(reload);

  if (error && !read)
    return (
      <div className="pt-[12px] pb-[120px]">
        <PayHeader crumb="Revenue · Transactions" title="Payment" onBack={() => navigate(back)} />
        <ErrorLine message="Couldn't load this payment." onRetry={reload} />
      </div>
    );
  if (!read) return <DetailLoading />;
  const p = read.p;
  if (!p) return <Navigate to={back} replace />;

  const today = todayIso();
  const recKey = recordKeyOf(p.sourceKind, p.sourceId);
  const rec = recKey ? data?.records.find((r) => r.key === recKey) : undefined;
  const item = ledgerItem(p.priceType, rec);
  const membership = p.sourceKind === "membership";
  const sub = membership && rec?.startedOn ? `Member since ${monthYear(rec.startedOn)}` : item;
  const masked = isMaskedLabel(p.label);
  const pending = p.status === "pending";
  const left = refundable(p.status, p.amount, p.refunded);
  const overdue = pending && p.dueOn ? daysBetween(p.dueOn, today) : 0;

  let chip: { t: string; bg: string; ink: string };
  if (pending) {
    const c = owedChip({ overdue, dueOn: p.dueOn });
    chip = c.late
      ? { t: c.long, bg: v("caution-bg"), ink: v("pay-caution") }
      : { t: "Unpaid, cash", bg: v("caution-bg"), ink: v("pay-caution") };
  } else if (p.status === "paid")
    chip = p.refunded > 0
      ? { t: "Part refunded", bg: v("soft"), ink: v("ink-soft") }
      : { t: p.paidOn ? `Paid ${dMon(p.paidOn)}` : "Paid", bg: v("good-bg"), ink: v("good") };
  else if (p.status === "refunded") chip = { t: "Refunded", bg: v("soft"), ink: v("ink-soft") };
  else if (p.status === "failed") chip = { t: "Failed", bg: v("high-bg"), ink: v("high") };
  else chip = { t: "Void", bg: v("soft"), ink: v("ink-soft") };

  const facts = [
    { l: "Item", v: membership && p.dueOn ? `${item} · ${monthOf(p.dueOn)}` : item },
    ...(pending && p.dueOn ? [{ l: overdue > 0 ? "Was due" : "Due", v: dddDMon(p.dueOn) }] : []),
    {
      l: pending ? "Expected method" : "Method",
      v: p.method === "whish" ? "Whish" : "Cash at the desk",
    },
    ...(p.paidOn ? [{ l: "Paid on", v: dddDMon(p.paidOn) }] : []),
    ...(p.refunded > 0
      ? [
          { l: "Refunded", v: moneyCents(p.refunded) },
          { l: "Kept", v: moneyCents(Math.max(0, p.amount - p.refunded)) },
        ]
      : []),
  ];
  const hist: HistRow[] = [
    ...p.refunds.map((r) => ({
      t: `Refunded ${moneyCents(r.amount)}`,
      s: r.reason ?? "No reason given",
      d: dMon(r.on),
      kind: "info" as const,
    })),
    ...(pending && overdue > 0 && p.dueOn
      ? [
          {
            t: "Not paid at the desk",
            s: "Cash payments can't be retried",
            d: dMon(p.dueOn),
            kind: "warn" as const,
          },
        ]
      : []),
  ];
  const target = markTarget(p);
  const actions: DetailAction[] = [
    ...(pending && canMark && target
      ? [
          {
            t: "Mark as paid",
            icon: BadgeCheck,
            primary: true,
            onClick: () =>
              mark.open({
                label: p.label,
                amount: p.amount,
                item,
                membership,
                dueOn: p.dueOn,
                target,
              }),
          },
        ]
      : []),
    ...(left > 0 && canRefund
      ? [
          {
            t: "Refund",
            icon: Undo2,
            onClick: () => refund.open({ paymentId: p.id, label: p.label, item, max: left }),
          },
        ]
      : []),
  ];

  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader crumb="Revenue · Transactions" title={p.label} onBack={() => navigate(back)} />
      <PayDetail
        who={masked ? null : p.label}
        name={p.label}
        sub={sub}
        amt={moneyCents(p.amount)}
        amtInk={p.status === "refunded" ? v("faint") : undefined}
        chip={chip}
        facts={facts}
        histTitle={p.refunds.length ? "Refunds" : "Recent payments"}
        hist={hist}
        actions={actions}
        note={
          pending
            ? "Cash payments are recorded by hand. Whish payments are coming."
            : left > 0 && canRefund
              ? "A refund records money you gave back. Centium doesn't send it."
              : undefined
        }
      />
      {mark.ui}
      {refund.ui}
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
