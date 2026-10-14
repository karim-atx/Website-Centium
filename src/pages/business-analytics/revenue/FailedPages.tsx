import React, { useEffect, useRef, useState } from "react";
import { retryPayment } from "../../../services/business-revenue";
import {
  ArrowDownUp,
  BadgeCheck,
  ChevronRight,
  CircleAlert,
  CircleX,
  Clock,
  LoaderCircle,
  MessageCircle,
  RotateCw,
  SlidersHorizontal,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { money, sum } from "../../../services/business-revenue";
import { PayHeader, v } from "./kit";
import {
  PayBoxes,
  PayControls,
  PayDetail,
  PayEmpty,
  PayList,
  type HistRow,
} from "./PayKit";
import {
  AUTO_RETRIES,
  MANUAL_RETRIES,
  REVENUE_BASE,
  WHISH_LIVE,
} from "./payModel";

// Failed payments and retries (AN14-019 Failed half card, -025, -052 to
// -061, -073 to -088). Built now and HIDDEN until Whish is live (V6-44,
// OURS-AN14-pending-whish row 3): only online payments can fail, cash cannot.
// Policy (V6-44 / OD-9): Whish retries twice automatically, then one manual
// retry: 3 attempts in all. Data comes from B8's payment_attempts and the
// Whish callback (HANDOVER_API Stage 5); there is no reader yet, so the list
// is empty and every route here returns to Payments while WHISH_LIVE is off.

export interface FailedAttempt {
  at: string;
  label: string;
  reason: string;
  outcome: "failed" | "next";
}
export interface FailedPayment {
  key: string;
  who: string | null;
  item: string;
  amount: number;
  failedOn: string;
  reason: string | null;
  state: "retrying" | "stopped" | "inprogress";
  nextRetry: string | null;
  manualUsed: number;
  attempts: FailedAttempt[];
}

/**
 * Failed payments: always empty until Whish (B8 RV-03; cash can't fail), and
 * every route here returns to Payments while WHISH_LIVE is off.
 */
export function useFailedPayments(): FailedPayment[] {
  return [];
}

const whoOfF = (f: FailedPayment) => f.who ?? "Member";

/** The Failed half card (AN14-019 row 3, circle-alert #C0392B). */
export const FailedHalf: React.FC = () => {
  const navigate = useNavigate();
  const failed = useFailedPayments();
  const total = sum(failed.map((f) => f.amount));
  const retrying = failed.filter((f) => f.state === "retrying");
  return (
    <div
      className="rounded-[22px] pt-[14px] px-[14px] pb-[6px] flex flex-col min-w-0"
      style={{ background: v("card"), border: `1px solid ${v("border")}` }}
    >
      <p
        className="flex items-center gap-[6px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase whitespace-nowrap"
        style={{ color: v("high") }}
      >
        <CircleAlert size={13} strokeWidth={2.4} aria-hidden />
        Failed
      </p>
      <p
        className="text-[26px] font-extrabold leading-[30px] tracking-[-0.02em] mt-[8px] rv-num"
        style={{ color: total ? v("ink") : v("tert") }}
      >
        {money(total)}
      </p>
      <p
        className="text-[12px] font-bold leading-[16px] mt-[2px]"
        style={{ color: v("ink") }}
      >
        {failed.length ? `${failed.length} failed` : "No failed payments"}
      </p>
      <p
        className="text-[11px] leading-[15px] mt-[2px] flex-1"
        style={{ color: v("faint") }}
      >
        {failed.length
          ? retrying.length
            ? `${retrying.length} retrying.`
            : "None retrying."
          : "Declined Whish payments show here."}
      </p>
      <button
        type="button"
        disabled={!failed.length}
        onClick={() => navigate(`${REVENUE_BASE}/payments/failed`)}
        className="tap min-h-[44px] mt-[6px] flex items-center justify-center gap-[4px] text-[12.5px] font-extrabold whitespace-nowrap"
        style={{
          borderTop: `1px solid ${v("divider")}`,
          color: failed.length ? v("pdark") : v("faint"),
        }}
      >
        {failed.length ? `See all ${failed.length}` : "All clear"}
        {failed.length > 0 && <ChevronRight size={14} aria-hidden />}
      </button>
    </div>
  );
};

export const FailedListPage: React.FC = () => {
  const navigate = useNavigate();
  const failed = useFailedPayments();
  const [status, setStatus] = useState<"all" | "retrying" | "stopped">("all");
  const [sort, setSort] = useState<"newest" | "amount">("newest");
  const [menu, setMenu] = useState<string | null>(null);
  if (!WHISH_LIVE) return <Navigate to={`${REVENUE_BASE}/payments`} replace />;
  const list = failed
    .filter(
      (f) =>
        status === "all" ||
        (status === "stopped" ? f.state === "stopped" : f.state !== "stopped"),
    )
    .sort((a, b) =>
      sort === "amount"
        ? b.amount - a.amount
        : a.failedOn < b.failedOn
          ? 1
          : -1,
    );
  const empty = failed.length === 0;
  const retrying = list.filter((f) => f.state !== "stopped").length;
  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader
        crumb="Revenue · Payments"
        title="Failed payments"
        onBack={() => navigate(`${REVENUE_BASE}/payments`)}
      />
      <PayBoxes
        boxes={[
          {
            l: "Failed",
            v: money(sum(list.map((f) => f.amount))),
            faint: empty,
          },
          {
            l: "Payments",
            v: String(list.length),
            faint: empty,
            d: empty
              ? null
              : status === "stopped"
                ? "stopped"
                : `${retrying} retrying`,
            dTone: "caution",
          },
        ]}
        line={
          empty
            ? "No failed payments this period."
            : `Whish retries automatically ${AUTO_RETRIES === 2 ? "twice" : AUTO_RETRIES + " times"}. After that, follow up yourself.`
        }
      />
      <PayControls
        open={menu}
        setOpen={setMenu}
        disabled={empty}
        count={
          empty
            ? undefined
            : `${list.length} ${list.length === 1 ? "payment" : "payments"}`
        }
        ctrls={[
          {
            key: "sort",
            icon: ArrowDownUp,
            label: sort === "amount" ? "Largest amount" : "Newest",
            menuLeft: 0,
            options: [
              { value: "newest", label: "Newest", header: "Sort by" },
              { value: "amount", label: "Largest amount" },
            ],
            selected: [sort],
            onPick: (x) => setSort(x as typeof sort),
          },
          {
            key: "filter",
            icon: SlidersHorizontal,
            label:
              status === "all"
                ? "All statuses"
                : status === "stopped"
                  ? "Stopped"
                  : "Retrying",
            menuLeft: 96,
            active: status !== "all",
            options: [
              { value: "all", label: "All statuses", header: "Status" },
              { value: "retrying", label: "Retrying" },
              { value: "stopped", label: "Stopped" },
            ],
            selected: [status],
            onPick: (x) => setStatus(x as typeof status),
          },
        ]}
      />
      {empty ? (
        <PayEmpty
          title="No failed payments"
          body="Payments that don't go through show here, with their retries."
        />
      ) : (
        <PayList
          rows={list.map((f) => ({
            key: f.key,
            who: f.who,
            title: whoOfF(f),
            sub: `${f.item} · failed ${f.failedOn}`,
            chip:
              f.state === "stopped"
                ? {
                    t: `Retried ${AUTO_RETRIES === 2 ? "twice" : AUTO_RETRIES + " times"}, stopped`,
                    bg: v("high-bg"),
                    ink: v("high"),
                  }
                : {
                    t: f.nextRetry ? `Retrying ${f.nextRetry}` : "Retrying now",
                    bg: v("caution-bg"),
                    ink: v("pay-caution"),
                  },
            s2: f.reason ?? "Reason not recorded",
            amt: money(f.amount),
            action: {
              icon: f.state === "stopped" ? MessageCircle : RotateCw,
              name: `${f.state === "stopped" ? "Follow up with" : "Retry now for"} ${whoOfF(f)}`,
              onClick: () =>
                navigate(
                  `${REVENUE_BASE}/payments/failed/${encodeURIComponent(f.key)}?confirm=1`,
                ),
            },
            onClick: () =>
              navigate(
                `${REVENUE_BASE}/payments/failed/${encodeURIComponent(f.key)}`,
              ),
          }))}
        />
      )}
    </div>
  );
};

/** The failed detail with the retry pop-up (AN14-056, -075, -077, -081, -086, -088). */
export const FailedDetailPage: React.FC<{ recKey: string }> = ({ recKey }) => {
  const navigate = useNavigate();
  const failed = useFailedPayments();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );
  if (!WHISH_LIVE) return <Navigate to={`${REVENUE_BASE}/payments`} replace />;
  const f = failed.find((x) => x.key === recKey);
  if (!f) return <Navigate to={`${REVENUE_BASE}/payments/failed`} replace />;
  const used = f.manualUsed >= MANUAL_RETRIES;
  const name = whoOfF(f);
  const chip =
    f.state === "inprogress"
      ? { t: "Retrying now", bg: v("caution-bg"), ink: v("pay-caution") }
      : used
        ? { t: "No retries left", bg: v("high-bg"), ink: v("high") }
        : f.state === "stopped"
          ? {
              t: `Failed ${f.attempts.filter((a) => a.outcome === "failed").length} times`,
              bg: v("high-bg"),
              ink: v("high"),
            }
          : {
              t: f.nextRetry ? `Retrying ${f.nextRetry}` : "Retrying",
              bg: v("caution-bg"),
              ink: v("pay-caution"),
            };
  const hist: HistRow[] = f.attempts.map((a) => ({
    t: a.label,
    s: a.reason,
    d: a.at,
    kind: a.outcome === "failed" ? "bad" : "warn",
  }));
  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader
        crumb="Failed payments"
        title="Failed payment"
        onBack={() => navigate(`${REVENUE_BASE}/payments/failed`)}
      />
      <PayDetail
        who={f.who}
        name={name}
        sub={f.item}
        amt={money(f.amount)}
        amtInk={v("high")}
        chip={chip}
        facts={[
          { l: "Method", v: "Whish" },
          { l: "Reason", v: f.reason ?? "Reason not recorded" },
          { l: "Failed on", v: f.failedOn },
        ]}
        histTitle="Attempts"
        hist={hist}
        banner={
          waiting
            ? {
                icon: Clock,
                t: "Still waiting for Whish",
                s: "We'll update this payment when Whish answers. You can leave this screen.",
                bg: v("caution-bg"),
                ink: v("pay-caution"),
              }
            : f.state === "stopped" && !used
              ? {
                  icon: CircleX,
                  t: "Payment didn't go through",
                  s: "Ask the member to top up, or record it if they paid in cash.",
                  bg: v("high-bg"),
                  ink: v("high"),
                }
              : undefined
        }
        actions={
          f.state === "inprogress"
            ? [
                {
                  t: "Retrying…",
                  icon: LoaderCircle,
                  primary: true,
                  disabled: true,
                  dim: 0.55,
                  onClick: () => undefined,
                },
              ]
            : [
                {
                  t: "Retry now",
                  icon: RotateCw,
                  primary: true,
                  disabled: used,
                  dim: used ? 0.4 : 1,
                  onClick: () => setConfirm(true),
                },
                {
                  t: "Mark as paid",
                  icon: BadgeCheck,
                  onClick: () => undefined,
                },
              ]
        }
        note={
          f.state === "inprogress"
            ? "Whish is already trying this payment. It usually takes under a minute."
            : used
              ? `You can retry a payment ${AUTO_RETRIES + MANUAL_RETRIES} times. Record it if the member pays in cash.`
              : undefined
        }
      />
      <ConfirmCard
        open={confirm}
        layout="stacked"
        scrimBlur
        icon={<RotateCw size={20} strokeWidth={2.2} aria-hidden />}
        disc={{
          bg: "rgb(var(--c-primary-pale))",
          ink: "rgb(var(--c-primary-dark))",
        }}
        title="Retry this payment now?"
        subtitle={
          err
            ? undefined
            : "Whish will try to collect it again. The member gets a notification."
        }
        extra={
          <>
            <div
              className="mt-[12px] rounded-[14px] px-[14px] py-[4px] text-left"
              style={{ background: v("soft") }}
            >
              {[
                ["Member", name],
                ["Item", f.item],
                ["Amount", money(f.amount)],
                ["Method", "Whish"],
              ].map(([l, val], i) => (
                <div
                  key={l}
                  className="flex justify-between gap-[10px] min-h-[36px] items-center"
                  style={{
                    borderTop: i ? `1px solid ${v("divider")}` : "none",
                  }}
                >
                  <span
                    className="text-[12.5px] shrink-0"
                    style={{ color: v("ink-soft") }}
                  >
                    {l}
                  </span>
                  <span
                    className="text-[13px] font-extrabold whitespace-nowrap"
                    style={{ color: v("ink") }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
            {err && (
              <p
                role="alert"
                className="text-[13px] font-bold mt-[6px]"
                style={{ color: "#C0392B" }}
              >
                {err}
              </p>
            )}
          </>
        }
        confirmLabel={busy ? "Retrying…" : "Retry now"}
        busy={busy}
        onCancel={() => !busy && setConfirm(false)}
        onConfirm={() => {
          // B8 RV-03 retry_payment(id) (f.key is the payment id). After 30 s
          // without an answer the pop-up closes and the waiting banner shows.
          setBusy(true);
          setErr(null);
          timer.current = window.setTimeout(() => {
            setBusy(false);
            setConfirm(false);
            setWaiting(true);
          }, 30_000);
          void retryPayment(f.key).then((r) => {
            if (timer.current) window.clearTimeout(timer.current);
            setBusy(false);
            if (!r.ok) return setErr(r.message);
            setConfirm(false);
            setWaiting(true);
          });
        }}
      />
    </div>
  );
};
