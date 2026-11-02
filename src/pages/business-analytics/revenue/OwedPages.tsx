import React, { useState } from "react";
import {
  ArrowDownUp,
  BadgeCheck,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Toast } from "../../../components/ui/Toast";
import { offerPromotionUsed } from "../../../components/promotions/promotionUsed";
import {
  dated,
  dayOf,
  dddDMon,
  dMon,
  markPaid,
  markTarget,
  money,
  monthYear,
  owed as owedOf,
  owedItemFromRecord,
  remindersLine,
  sendPaymentReminder,
  sum,
  today as todayIso,
  unmarkPaymentPaid,
  type OwedItem,
  type OwedItemFilter,
  type OwedSort,
  type PayKind,
} from "../../../services/business-revenue";
import { startMemberThread } from "../../../services/messaging";
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
  type DetailAction,
  type HistRow,
} from "./PayKit";
import { owedChip, paidHistRows, REVENUE_BASE } from "./payModel";
import { useRevenue } from "./revenueContext";
import { useMoneyOwed } from "./useMoneyOwed";
import { usePaidHistory } from "./usePaidHistory";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { t, tn } from "../../../i18n/core";
import { labelText, monthName } from "../../../services/business-revenue/model";

// Money owed (AN14-035 / -037 to -043, PaySeeAllV2 kind "owed"), the owed
// detail (AN14-044 / -089), the Mark as paid pop-up and toast (AN14-046,
// -048) and Send reminder / Follow up (AN14-044 S2, AN14-049). Today every
// unpaid item is cash at the desk (AN14-089).
//
// B8 RV-02: the list, its sort and Item type filter, the totals and the
// detail read money_owed (business-wide, masked labels, the server's days
// overdue); the Method filter is applied here (money_owed has none). Undo on
// the Mark-as-paid toast calls unmark_payment_paid; Send reminder calls
// send_payment_reminder, which sends a fixed payment_reminder card from the
// business into the member's thread (no free-text prefill), then the toast
// offers "Open chat". Both need the revenue permission; Mark as paid needs
// front_desk. While money_owed is missing on the database the list is the
// client-side one and Undo / reminders stay off (the pending rule). Not yet:
// "+1 vs last" (needs history), Whish (Soon). Recent payments (AN14-044 B1)
// are the person's latest paid business_payments rows (usePaidHistory).

const PAY_CHIP = (o: OwedItem) => {
  const c = owedChip(o);
  if (c.severe) return { t: c.long, bg: v("high-bg"), ink: v("high") };
  if (c.late) return { t: c.long, bg: v("caution-bg"), ink: v("pay-caution") };
  return { t: c.long, bg: v("soft"), ink: v("ink-soft") };
};

const monthOf = (iso: string) => monthName(iso);

/** What Mark as paid needs to know about the item being marked. */
export interface MarkSubject {
  label: string;
  amount: number;
  item: string;
  membership: boolean;
  dueOn: string | null;
  target: { kind: PayKind; id: string };
}

const subjectOf = (o: OwedItem): MarkSubject | null => {
  const target = markTarget(o);
  return target
    ? {
        label: labelText(o.label),
        amount: o.amount,
        item: o.item,
        membership: o.sourceKind === "membership",
        dueOn: o.dueOn,
        target,
      }
    : null;
};

/** The Mark as paid pop-up (AN14-046) and its toast (AN14-048), for one item. */
export function useMarkPaid(
  onDone: (s: MarkSubject, message: string) => void,
) {
  const { reload } = useRevenue();
  const [rec, setRec] = useState<MarkSubject | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const amount = rec ? money(rec.amount) : "";
  const ui = (
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
      title={rec ? t("Mark {amount} from {name} as paid?", { amount, name: rec.label }) : ""}
      subtitle={
        err
          ? undefined
          : rec
            ? t("Records that you received {amount} in cash for {item}.", { amount, item: rec.membership && rec.dueOn ? t("{item}, {month}", { item: rec.item, month: monthOf(rec.dueOn) }) : rec.item })
            : undefined
      }
      extra={
        err ? (
          <p
            role="alert"
            className="text-[13px] font-bold mt-[6px]"
            style={{ color: "#C0392B" }}
          >
            {t(err)}
          </p>
        ) : undefined
      }
      confirmLabel={t("Mark as paid")}
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
        const r = await markPaid(rec.target);
        setBusy(false);
        if (!r.ok) {
          setErr(r.message);
          return;
        }
        const done = rec;
        setRec(null);
        offerPromotionUsed({ kind: done.target.kind === "membership" ? "membership" : "class_booking", sourceId: done.target.id });
        onDone(
          done,
          t("{amount} from {name} marked as paid. Removed from Money owed.", { amount: money(done.amount), name: done.label }),
        );
        reload();
      }}
    />
  );
  return { open: (s: MarkSubject) => setRec(s), ui };
}

/**
 * Send reminder / Follow up (AN14-044 S2, AN14-049 as the server builds it):
 * a confirm, then send_payment_reminder sends the fixed reminder card into
 * the member's business thread; the toast offers "Open chat".
 */
export function useSendReminder(onSent: () => void) {
  const { businessId: revBusiness } = useRevenue();
  const access = useConsoleAccess();
  const businessId = access.businessId ?? revBusiness;
  const navigate = useNavigate();
  const [item, setItem] = useState<OwedItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    personId: string | null;
  } | null>(null);

  const openChat = async (personId: string) => {
    if (!businessId) return;
    const t = await startMemberThread(businessId, personId);
    if (!t.ok) {
      setToast({ msg: t.message, personId: null });
      return;
    }
    navigate("/app/messages", { state: { threadId: t.threadId } });
  };

  const due = item?.dueOn ? dddDMon(item.dueOn) : null;
  const ui = (
    <>
      <ConfirmCard
        open={!!item}
        layout="stacked"
        frame="ops"
        scrimBlur
        icon={<MessageCircle size={20} strokeWidth={2.2} aria-hidden />}
        disc={{
          bg: "rgb(var(--c-primary-pale))",
          ink: "rgb(var(--c-primary-dark))",
        }}
        title={item ? t("Send {name} a reminder?", { name: labelText(item.label) }) : ""}
        subtitle={
          err
            ? undefined
            : item
              ? due
                ? t("They get a private message from your business: {amount} owed for {item}, due {date}.", { amount: money(item.amount), item: item.item, date: due })
                : t("They get a private message from your business: {amount} owed for {item}.", { amount: money(item.amount), item: item.item })
              : undefined
        }
        extra={
          err ? (
            <p
              role="alert"
              className="text-[13px] font-bold mt-[6px]"
              style={{ color: "#C0392B" }}
            >
              {t(err)}
            </p>
          ) : undefined
        }
        confirmLabel={t("Send reminder")}
        busy={busy}
        onCancel={() => {
          if (busy) return;
          setItem(null);
          setErr(null);
        }}
        onConfirm={async () => {
          if (!item?.paymentId || busy) return;
          setBusy(true);
          setErr(null);
          const r = await sendPaymentReminder(item.paymentId);
          setBusy(false);
          if (!r.ok) {
            setErr(r.message);
            return;
          }
          const done = item;
          setItem(null);
          setToast({
            msg: t("Reminder sent to {name}.", { name: labelText(done.label) }),
            personId: done.personId,
          });
          onSent();
        }}
      />
      <Toast
        open={!!toast}
        message={toast ? t(toast.msg) : ""}
        variant="business"
        shape="market"
        duration={4000}
        action={
          toast?.personId
            ? {
                label: t("Open chat"),
                onClick: () => {
                  const p = toast.personId as string;
                  setToast(null);
                  void openChat(p);
                },
              }
            : undefined
        }
        onExpire={() => setToast(null)}
      />
    </>
  );
  return { open: (o: OwedItem) => setItem(o), ui };
}

/** Who may send a reminder for this item: money_owed answered, revenue, and a payer with an account. */
export function useCanRemind(live: boolean) {
  const access = useConsoleAccess();
  const revenue = access.meets("revenue") || access.failed;
  return (o: OwedItem) => live && revenue && !!o.paymentId && !!o.personId;
}

interface RouteToastState {
  toast?: string;
  paidKey?: string;
  /** Mark as paid on a money_owed item: what Undo reverts. */
  undo?: { paymentId: string; label: string; amount: number };
}

/**
 * The toast a page was sent back with after Mark as paid (AN14-048, 4 s),
 * the row it removed, and Undo (unmark_payment_paid, revenue permission).
 */
export function useRouteToast(onUndone: () => void): {
  toast: React.ReactNode;
  paidKey: string | null;
} {
  const loc = useLocation();
  const st = (loc.state ?? null) as RouteToastState | null;
  const access = useConsoleAccess();
  const [msg, setMsg] = useState<string | null>(st?.toast ?? null);
  const [paidKey, setPaidKey] = useState<string | null>(st?.paidKey ?? null);
  const [undo, setUndo] = useState(st?.undo ?? null);
  const canUndo = !!undo && (access.meets("revenue") || access.failed);
  return {
    paidKey,
    toast: (
      <Toast
        open={!!msg}
        message={msg ? t(msg) : ""}
        variant="business"
        shape="market"
        duration={4000}
        onUndo={
          canUndo
            ? () => {
                const u = undo;
                setUndo(null);
                void unmarkPaymentPaid(u.paymentId).then((r) => {
                  if (!r.ok) {
                    setMsg(r.message);
                    return;
                  }
                  setPaidKey(null);
                  setMsg(t("{amount} from {name} is back in Money owed.", { amount: money(u.amount), name: u.label }));
                  onUndone();
                });
              }
            : undefined
        }
        onExpire={() => {
          setMsg(null);
          setUndo(null);
        }}
      />
    ),
  };
}

export const OwedListPage: React.FC = () => {
  const { kind } = useAnalytics();
  const { online, loadedAt } = useRevenue();
  const navigate = useNavigate();
  const vocab = vocabOf(kind);
  const [sort, setSort] = useState<OwedSort>("amount");
  const [method, setMethod] = useState<"all" | "cash" | "whish">("all");
  const [item, setItem] = useState<OwedItemFilter>("all");
  const [menu, setMenu] = useState<string | null>(null);
  const owed = useMoneyOwed(sort, item, method);
  const { toast, paidKey } = useRouteToast(owed.reload);
  const remind = useSendReminder(owed.reload);
  const canRemind = useCanRemind(owed.live);

  const all = owed.items.filter((o) => o.key !== paidKey);
  const list = all;
  const total = sum(list.map((o) => o.amount));
  const filtered = method !== "all" || item !== "all";
  const oldest = list.reduce<OwedItem | null>(
    (m, o) => (!m || o.overdue > m.overdue ? o : m),
    null,
  );
  // Empty means nothing owed at all: an Item type filter that matches nothing
  // is "Nothing owed here", not the paid-up card.
  const empty = all.length === 0 && item === "all" && method === "all";

  const itemOpts = [
    { value: "all", label: t("All items"), header: t("Item type") },
    {
      value: "membership",
      // money_owed puts class packs with classes, so this one is plans only (user, 14 Oct).
      label: kind === "classes" ? t("Plans") : t("Memberships"),
    },
    {
      value: "class",
      label: kind === "classes" ? t("Classes and packs") : t("Classes"),
    },
  ];
  const ctrls = [
    {
      key: "sort",
      icon: ArrowDownUp,
      label: sort === "overdue" ? t("Most overdue") : t("Largest amount"),
      menuLeft: 0,
      options: [
        { value: "amount", label: t("Largest amount"), header: t("Sort by") },
        { value: "overdue", label: t("Most overdue") },
      ],
      selected: [sort],
      onPick: (x: string) => setSort(x as OwedSort),
    },
    {
      key: "filter",
      icon: SlidersHorizontal,
      label:
        method === "cash"
          ? t("Cash")
          : item !== "all"
            ? (itemOpts.find((o) => o.value === item)?.label ?? "")
            : t("All methods"),
      menuLeft: 108,
      active: filtered,
      options: [
        { value: "m:all", label: t("All methods"), header: t("Method") },
        { value: "m:cash", label: t("Cash") },
        { value: "m:whish", label: "Whish", disabled: true, soon: true },
        ...itemOpts.map((o) => ({ ...o, value: "i:" + o.value })),
      ],
      selected: ["m:" + method, "i:" + item],
      onPick: (x: string) =>
        x.startsWith("m:")
          ? setMethod(x.slice(2) as typeof method)
          : setItem(x.slice(2) as OwedItemFilter),
    },
  ];

  // PaySeeAllV2 boxLine: "Oldest: …, 21 days overdue. Reminders go out as
  // private messages." The second sentence only once reminders exist.
  const reminders = owed.live ? " " + t("Reminders go out as private messages.") : "";
  let line: string;
  if (empty) line = t("Nobody owes you anything right now.");
  else if (oldest && oldest.overdue > 0)
    line = tn(oldest.overdue, "Oldest: {name}, {n} day overdue.", "Oldest: {name}, {n} days overdue.", { name: labelText(oldest.label) }) + reminders;
  else line = t("None are overdue yet.") + reminders;

  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader
        crumb={`${t("Revenue")} · ${t("Payments")}`}
        title={t("Money owed")}
        onBack={() => navigate(`${REVENUE_BASE}/payments`)}
      />
      {!online && <OfflineLine at={loadedAt} />}
      {owed.error && !owed.items.length && !owed.live ? (
        <ErrorLine message={t("Couldn't load money owed.")} onRetry={owed.reload} />
      ) : owed.loading ? (
        <div role="status" aria-label={t("Loading")}>
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
              { l: t("Total owed"), v: money(total), faint: empty },
              {
                l: vocab.peopleCap,
                v: String(list.length),
                faint: empty,
                d: method === "cash" ? t("cash only") : null,
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
                : vocab.count(list.length)
            }
          />
          {empty ? (
            <PayEmpty
              title={t("Nothing owed")}
              body={
                owed.denied
                  ? t("Money owed shows here for people with the Revenue permission.")
                  : t("Everyone is paid up. Unpaid cash and memberships due show here.")
              }
            />
          ) : list.length === 0 ? (
            <PayEmpty
              title={
                method === "cash" ? t("Nothing owed in cash") : t("Nothing owed here")
              }
              body={t("Try another filter.")}
            />
          ) : (
            <PayList
              rows={list.map((o) => ({
                key: o.key,
                who: o.who,
                title: labelText(o.label),
                sub:
                  o.sourceKind === "membership" && o.dueOn
                    ? `${o.item} · ${monthOf(o.dueOn)}`
                    : o.dueOn ? t("{item}, {month}", { item: o.item, month: dMon(o.dueOn) }) : o.item,
                chip: PAY_CHIP(o),
                s2: o.method === "whish" ? t("Expects Whish") : t("Expects cash"),
                amt: money(o.amount),
                action: canRemind(o)
                  ? {
                      icon: MessageCircle,
                      name: t("Follow up with {name}", { name: labelText(o.label) }),
                      onClick: () => remind.open(o),
                    }
                  : undefined,
                onClick: () =>
                  navigate(
                    `${REVENUE_BASE}/payments/owed/${encodeURIComponent(o.key)}`,
                  ),
              }))}
            />
          )}
        </>
      )}
      {toast}
      {remind.ui}
    </div>
  );
};

const DetailLoading: React.FC = () => (
  <div className="pt-[12px] pb-[120px]" role="status" aria-label={t("Loading")}>
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

/** One owed item (AN14-044 / -089), reached from Money owed (/payments/owed/:key). */
export const OwedDetailPage: React.FC<{ itemKey: string }> = ({ itemKey }) => {
  const navigate = useNavigate();
  const owed = useMoneyOwed("overdue", "all");
  const o = owed.items.find((x) => x.key === itemKey) ?? null;
  const access = useConsoleAccess();
  const canMark = access.meets("front_desk") || access.failed;
  const canRemind = useCanRemind(owed.live);
  const back = `${REVENUE_BASE}/payments/owed`;
  const mark = useMarkPaid((s, message) => {
    navigate(back, {
      state: {
        toast: message,
        paidKey: itemKey,
        undo: o?.paymentId
          ? { paymentId: o.paymentId, label: s.label, amount: s.amount }
          : undefined,
      } satisfies RouteToastState,
    });
  });
  const remind = useSendReminder(owed.reload);
  const { businessId: revBusiness } = useRevenue();
  const paidHist = usePaidHistory(access.businessId ?? revBusiness, o?.personId ?? null, 2);

  if (owed.error && !o)
    return (
      <div className="pt-[12px] pb-[120px]">
        <PayHeader crumb={t("Money owed")} title={t("Payment")} onBack={() => navigate(back)} />
        <ErrorLine message={t("Couldn't load this payment.")} onRetry={owed.reload} />
      </div>
    );
  if (owed.loading) return <DetailLoading />;
  if (!o) return <Navigate to={back} replace />;

  const sub =
    o.sourceKind === "membership" && o.startedOn
      ? t("Member since {date}", { date: monthYear(o.startedOn) })
      : o.item;
  const c = owedChip(o);
  const chip = c.late
    ? { t: c.long, bg: v("caution-bg"), ink: v("pay-caution") }
    : { t: t("Unpaid, cash"), bg: v("caution-bg"), ink: v("pay-caution") };
  const facts = [
    {
      l: t("Item"),
      v:
        o.sourceKind === "membership" && o.dueOn
          ? `${o.item} · ${monthOf(o.dueOn)}`
          : o.item,
    },
    ...(o.dueOn
      ? [{ l: o.overdue > 0 ? t("Was due") : t("Due"), v: dddDMon(o.dueOn) }]
      : []),
    {
      l: t("Expected method"),
      v: o.method === "whish" ? "Whish" : t("Cash at the desk"),
    },
    ...(owed.live ? [{ l: t("Reminders sent"), v: remindersLine(o.remindersSent, o.lastReminderAt) }] : []),
  ];
  const hist: HistRow[] =
    o.overdue > 0 && o.dueOn
      ? [
          {
            t: t("Not paid at the desk"),
            s: t("Cash payments can't be retried"),
            d: dMon(o.dueOn),
            kind: "warn",
          },
        ]
      : [];
  if (paidHist) hist.push(...paidHistRows(paidHist, "owed"));
  const subject = subjectOf(o);
  const actions: DetailAction[] = [
    // Recording cash is a desk action (mark_*_paid need front_desk,
    // Database b95ef5c), not part of seeing revenue; only memberships and
    // class bookings have a mark-paid function.
    ...(canMark && subject
      ? [
          {
            t: t("Mark as paid"),
            icon: BadgeCheck,
            primary: true,
            onClick: () => mark.open(subject),
          },
        ]
      : []),
    // A desk guest (no account) has nobody to message.
    ...(canRemind(o)
      ? [
          {
            t: t("Send reminder"),
            icon: MessageCircle,
            onClick: () => remind.open(o),
          },
        ]
      : []),
  ];

  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader crumb={t("Money owed")} title={labelText(o.label)} onBack={() => navigate(back)} />
      <PayDetail
        who={o.who}
        name={labelText(o.label)}
        sub={sub}
        amt={money(o.amount)}
        chip={chip}
        facts={facts}
        histTitle={t("Recent payments")}
        hist={hist}
        actions={actions}
        note={t("Cash payments are recorded by hand. Whish payments are coming.")}
      />
      {mark.ui}
      {remind.ui}
    </div>
  );
};

/**
 * One record as a transaction (AN14-044 layout), before B8: reached from
 * Transactions (/transactions/kind:id) only while transactions_page is
 * missing. A ledger row opens TransactionDetailPage (TransactionDetail.tsx).
 */
export const PaymentDetailPage: React.FC<{ recKey: string }> = ({ recKey }) => {
  const { data, loading, error, reload } = useRevenue();
  const navigate = useNavigate();
  const today = todayIso();
  const [paid, setPaid] = useState(false);
  const access = useConsoleAccess();
  const canMark = access.meets("front_desk") || access.failed;
  const back = `${REVENUE_BASE}/transactions`;
  const mark = useMarkPaid((_s, message) => {
    setPaid(true);
    navigate(back, { state: { toast: message, paidKey: recKey } });
  });
  const rec = data?.records.find((r) => r.key === recKey) ?? null;

  if (error && !data)
    return (
      <div className="pt-[12px] pb-[120px]">
        <PayHeader
          crumb={`${t("Revenue")} · ${t("Transactions")}`}
          title={t("Payment")}
          onBack={() => navigate(back)}
        />
        <ErrorLine message={t("Couldn't load this payment.")} onRetry={reload} />
      </div>
    );
  if (loading && !data) return <DetailLoading />;
  if (!rec) return <Navigate to={back} replace />;

  const owedRow = owedOf([rec], today)[0] ?? null;
  const owedItem = owedRow ? owedItemFromRecord(owedRow) : null;
  const unpaid = !!owedItem && !paid;
  const name = whoOf(rec);
  const sub =
    rec.kind === "membership"
      ? rec.startedOn
        ? t("Member since {date}", { date: monthYear(rec.startedOn) })
        : rec.item
      : rec.item;
  let chip: { t: string; bg: string; ink: string };
  if (unpaid) {
    const c = owedChip(owedItem);
    chip = c.late
      ? { t: c.long, bg: v("caution-bg"), ink: v("pay-caution") }
      : { t: t("Unpaid, cash"), bg: v("caution-bg"), ink: v("pay-caution") };
  } else if (rec.status === "paid")
    chip = {
      t: dated(rec) ? t("Paid {date}", { date: dMon(dayOf(rec.paidAt as string)) }) : t("Paid"),
      bg: v("good-bg"),
      ink: v("good"),
    };
  else chip = { t: t("Refunded"), bg: v("soft"), ink: v("ink-soft") };

  const facts = [
    {
      l: t("Item"),
      v:
        rec.kind === "membership" && rec.dueOn
          ? `${rec.item} · ${monthOf(rec.dueOn)}`
          : rec.item,
    },
    ...(rec.dueOn
      ? [
          {
            l: unpaid && owedItem.overdue > 0 ? t("Was due") : t("Due"),
            v: dddDMon(rec.dueOn),
          },
        ]
      : []),
    {
      l: unpaid ? t("Expected method") : t("Method"),
      v: rec.method === "whish" ? "Whish" : t("Cash at the desk"),
    },
    ...(rec.status === "paid" && !dated(rec)
      ? [{ l: t("Paid on"), v: t("Not shared yet") }]
      : []),
  ];
  const hist: HistRow[] =
    unpaid && owedItem.overdue > 0 && rec.dueOn
      ? [
          {
            t: t("Not paid at the desk"),
            s: t("Cash payments can't be retried"),
            d: dMon(rec.dueOn),
            kind: "warn",
          },
        ]
      : [];

  return (
    <div className="pt-[12px] pb-[120px]">
      <PayHeader
        crumb={`${t("Revenue")} · ${t("Transactions")}`}
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
        histTitle={t("Recent payments")}
        hist={hist}
        actions={
          unpaid && canMark
            ? [
                {
                  t: t("Mark as paid"),
                  icon: BadgeCheck,
                  primary: true,
                  onClick: () =>
                    mark.open({
                      label: name,
                      amount: rec.amount ?? 0,
                      item: rec.item,
                      membership: rec.kind === "membership",
                      dueOn: rec.dueOn,
                      target: { kind: rec.kind, id: rec.id },
                    }),
                },
              ]
            : []
        }
        note={
          unpaid
            ? t("Cash payments are recorded by hand. Whish payments are coming.")
            : undefined
        }
      />
      {mark.ui}
    </div>
  );
};
