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
import { t, tn } from "../../../i18n/core";

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

const whoOfF = (f: FailedPayment) => f.who ?? t("Member");

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
        {t("Failed")}
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
        {failed.length ? t("{n} failed", { n: failed.length }) : t("No failed payments")}
      </p>
      <p
        className="text-[11px] leading-[15px] mt-[2px] flex-1"
        style={{ color: v("faint") }}
      >
        {failed.length
          ? retrying.length
            ? t("{n} retrying.", { n: retrying.length })
            : t("None retrying.")
          : t("Declined Whish payments show here.")}
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
        {failed.length ? t("See all {n}", { n: failed.length }) : t("All clear")}
        {failed.length > 0 && <ChevronRight size={14} aria-hidden className="rtl:-scale-x-100" />}
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
        crumb={`${t("Revenue")} · ${t("Payments")}`}
        title={t("Failed payments")}
        onBack={() => navigate(`${REVENUE_BASE}/payments`)}
      />
      <PayBoxes
        boxes={[
          {
            l: t("Failed"),
            v: money(sum(list.map((f) => f.amount))),
            faint: empty,
          },
          {
            l: t("Payments"),
            v: String(list.length),
            faint: empty,
            d: empty
              ? null
              : status === "stopped"
                ? t("stopped")
                : t("{n} retrying", { n: retrying }),
            dTone: "caution",
          },
        ]}
        line={
          empty
            ? t("No failed payments this period.")
            : tn(AUTO_RETRIES, "Whish retries automatically once. After that, follow up yourself.", "Whish retries automatically {n} times. After that, follow up yourself.")
        }
      />
      <PayControls
        open={menu}
        setOpen={setMenu}
        disabled={empty}
        count={
          empty
            ? undefined
            : tn(list.length, "{n} payment", "{n} payments")
        }
        ctrls={[
          {
            key: "sort",
            icon: ArrowDownUp,
            label: sort === "amount" ? t("Largest amount") : t("Newest"),
            menuLeft: 0,
            options: [
              { value: "newest", label: t("Newest"), header: t("Sort by") },
              { value: "amount", label: t("Largest amount") },
            ],
            selected: [sort],
            onPick: (x) => setSort(x as typeof sort),
          },
          {
            key: "filter",
            icon: SlidersHorizontal,
            label:
              status === "all"
                ? t("All statuses")
                : status === "stopped"
                  ? t("Stopped")
                  : t("Retrying"),
            menuLeft: 96,
            active: status !== "all",
            options: [
              { value: "all", label: t("All statuses"), header: t("Status") },
              { value: "retrying", label: t("Retrying") },
              { value: "stopped", label: t("Stopped") },
            ],
            selected: [status],
            onPick: (x) => setStatus(x as typeof status),
          },
        ]}
      />
      {empty ? (
        <PayEmpty
          title={t("No failed payments")}
          body={t("Payments that don't go through show here, with their retries.")}
        />
      ) : (
        <PayList
          rows={list.map((f) => ({
            key: f.key,
            who: f.who,
            title: whoOfF(f),
            sub: `${f.item} · ${t("failed {date}", { date: f.failedOn })}`,
            chip:
              f.state === "stopped"
                ? {
                    t: tn(AUTO_RETRIES, "Retried once, stopped", "Retried {n} times, stopped"),
                    bg: v("high-bg"),
                    ink: v("high"),
                  }
                : {
                    t: f.nextRetry ? t("Retrying {when}", { when: f.nextRetry }) : t("Retrying now"),
                    bg: v("caution-bg"),
                    ink: v("pay-caution"),
                  },
            s2: f.reason ?? t("Reason not recorded"),
            amt: money(f.amount),
            action: {
              icon: f.state === "stopped" ? MessageCircle : RotateCw,
              name: f.state === "stopped" ? t("Follow up with {name}", { name: whoOfF(f) }) : t("Retry now for {name}", { name: whoOfF(f) }),
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
      ? { t: t("Retrying now"), bg: v("caution-bg"), ink: v("pay-caution") }
      : used
        ? { t: t("No retries left"), bg: v("high-bg"), ink: v("high") }
        : f.state === "stopped"
          ? {
              t: tn(f.attempts.filter((a) => a.outcome === "failed").length, "Failed once", "Failed {n} times"),
              bg: v("high-bg"),
              ink: v("high"),
            }
          : {
              t: f.nextRetry ? t("Retrying {when}", { when: f.nextRetry }) : t("Retrying"),
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
        crumb={t("Failed payments")}
        title={t("Failed payment")}
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
          { l: t("Method"), v: "Whish" },
          { l: t("Reason"), v: f.reason ?? t("Reason not recorded") },
          { l: t("Failed on"), v: f.failedOn },
        ]}
        histTitle={t("Attempts")}
        hist={hist}
        banner={
          waiting
            ? {
                icon: Clock,
                t: t("Still waiting for Whish"),
                s: t("We'll update this payment when Whish answers. You can leave this screen."),
                bg: v("caution-bg"),
                ink: v("pay-caution"),
              }
            : f.state === "stopped" && !used
              ? {
                  icon: CircleX,
                  t: t("Payment didn't go through"),
                  s: t("Ask the member to top up, or record it if they paid in cash."),
                  bg: v("high-bg"),
                  ink: v("high"),
                }
              : undefined
        }
        actions={
          f.state === "inprogress"
            ? [
                {
                  t: t("Retrying…"),
                  icon: LoaderCircle,
                  primary: true,
                  disabled: true,
                  dim: 0.55,
                  onClick: () => undefined,
                },
              ]
            : [
                {
                  t: t("Retry now"),
                  icon: RotateCw,
                  primary: true,
                  disabled: used,
                  dim: used ? 0.4 : 1,
                  onClick: () => setConfirm(true),
                },
                {
                  t: t("Mark as paid"),
                  icon: BadgeCheck,
                  onClick: () => undefined,
                },
              ]
        }
        note={
          f.state === "inprogress"
            ? t("Whish is already trying this payment. It usually takes under a minute.")
            : used
              ? tn(AUTO_RETRIES + MANUAL_RETRIES, "You can retry a payment once. Record it if the member pays in cash.", "You can retry a payment {n} times. Record it if the member pays in cash.")
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
        title={t("Retry this payment now?")}
        subtitle={
          err
            ? undefined
            : t("Whish will try to collect it again. The member gets a notification.")
        }
        extra={
          <>
            <div
              className="mt-[12px] rounded-[14px] px-[14px] py-[4px] text-start"
              style={{ background: v("soft") }}
            >
              {[
                [t("Member"), name],
                [t("Item"), f.item],
                [t("Amount"), money(f.amount)],
                [t("Method"), "Whish"],
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
                {t(err)}
              </p>
            )}
          </>
        }
        confirmLabel={busy ? t("Retrying…") : t("Retry now")}
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
