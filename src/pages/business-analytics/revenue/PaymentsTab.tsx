import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronUp, HandCoins, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  collected,
  dddDMon,
  money,
  paidCount,
  renewals as renewalsOf,
  renewalWeeks,
  spanLabel,
  sum,
  today as todayIso,
  type OwedItem,
} from "../../../services/business-revenue";
import { useAnalytics } from "../analyticsContext";
import {
  Avatar,
  Pill,
  RCard,
  SecLabel,
  Skel,
  SoonChip,
  v,
  vocabOf,
  whoOf,
} from "./kit";
import { useRevenue } from "./revenueContext";
import { owedChip, owedSub, REVENUE_BASE, WHISH_LIVE } from "./payModel";
import { GRANTED_RENEWAL } from "../../../services/front-desk/frontDeskLogic";
import { FailedHalf } from "./FailedPages";
import { useMoneyOwed } from "./useMoneyOwed";
import { useCanRemind, useSendReminder } from "./OwedPages";

// AN14-019 / -024 / -027 / -028 / -030 / -032 / -034 (AnInsightsV3 sub
// "payments"). Before Whish (OURS-AN14-pending-whish): the split card shows
// Whish as "–" with a Soon chip and a cash-only bar; the Failed half card is
// hidden (failed payments are online only, V6-44) so Money owed takes the
// full width. Money owed reads money_owed (B8 RV-02) like the full list;
// each owed row has Follow up (send_payment_reminder) where the payer has an
// account and the viewer has the revenue permission. Renewals: four-week bars in Monday weeks (V6, user
// rule), a fifth column only when the 30-day window reaches it.

export const PaymentsTab: React.FC = () => {
  const { range, kind } = useAnalytics();
  const { data, loading } = useRevenue();
  const navigate = useNavigate();
  const [list, setList] = useState(false);
  const [week, setWeek] = useState<number | null>(null);
  const today = todayIso();
  const vocab = vocabOf(kind);
  const records = useMemo(() => data?.records ?? [], [data]);

  const cash = collected(
    records.filter((r) => r.method === "cash"),
    range,
  );
  const cashN = paidCount(
    records.filter((r) => r.method === "cash"),
    range,
  );
  const owedState = useMoneyOwed("amount", "all");
  const owed = owedState.items;
  const remind = useSendReminder(owedState.reload);
  const canRemind = useCanRemind(owedState.live);
  const owedT = sum(owed.map((o) => o.amount));
  const late = owed.filter((o) => o.overdue > 0);
  const oldest = late.reduce((m, o) => Math.max(m, o.overdue), 0);
  const ren = useMemo(() => renewalsOf(records, today, data?.renewalsDue ?? null), [records, today, data]);
  const weeks = useMemo(() => renewalWeeks(ren, today), [ren, today]);
  const showRenewals = kind !== "store";

  if ((loading && !data) || owedState.loading)
    return (
      <div role="status" aria-label="Loading">
        <SecLabel>How {vocab.people} pay</SecLabel>
        <RCard className="p-[16px]">
          <Skel h={32} />
          <Skel h={14} r={999} className="mt-[12px]" />
        </RCard>
        <Skel h={160} r={22} className="mt-[22px]" />
      </div>
    );

  const wkMax = Math.max(1, ...weeks.map((w) => w.total));
  const sel = week !== null ? weeks[week] : null;
  const renN = ren.length;
  const renT = sum(ren.map((r) => r.rec.amount ?? 0));
  const thisWeek = weeks[0];
  const openOwed = (o: OwedItem) =>
    navigate(`${REVENUE_BASE}/payments/owed/${encodeURIComponent(o.key)}`);

  return (
    <div>
      <SecLabel>How {vocab.people} pay</SecLabel>
      <RCard className="p-[16px]">
        <p className="text-[14px] font-extrabold" style={{ color: v("ink") }}>
          How much comes in by Whish, and how much in cash?
        </p>
        <div
          className="flex h-[14px] rounded-full overflow-hidden mt-[12px] gap-[2px]"
          style={{ background: cash ? "transparent" : v("track") }}
        >
          {cash > 0 && (
            <span className="flex-1" style={{ background: v("teal-dark") }} />
          )}
        </div>
        <div className="grid grid-cols-2 gap-[10px] mt-[10px]">
          <div>
            <p
              className="flex items-center gap-[6px] text-[11.5px] font-bold"
              style={{ color: v("ink-soft") }}
            >
              <span
                aria-hidden
                className="w-[10px] h-[10px] rounded-[3px]"
                style={{ background: v("primary") }}
              />
              Whish
              <SoonChip />
            </p>
            <p
              className="text-[18px] font-extrabold mt-[2px] rv-num"
              style={{ color: v("tert") }}
            >
              –
            </p>
          </div>
          <div>
            <p
              className="flex items-center gap-[6px] text-[11.5px] font-bold"
              style={{ color: v("ink-soft") }}
            >
              <span
                aria-hidden
                className="w-[10px] h-[10px] rounded-[3px]"
                style={{ background: v("teal-dark") }}
              />
              Cash
            </p>
            <p
              className="text-[18px] font-extrabold mt-[2px] rv-num"
              style={{ color: cash ? v("ink") : v("tert") }}
            >
              {money(cash)}
            </p>
            {cash > 0 && (
              <p className="text-[11px]" style={{ color: v("faint") }}>
                {cashN} {cashN === 1 ? "payment" : "payments"}
              </p>
            )}
          </div>
        </div>
        <p className="text-[11px] mt-[8px]" style={{ color: v("faint") }}>
          Cash only for now. Whish is coming.
        </p>
      </RCard>

      <div
        className="grid gap-[10px] mt-[22px]"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}
      >
        <div
          className="rounded-[22px] pt-[14px] px-[14px] pb-[6px] flex flex-col min-w-0"
          style={{ background: v("card"), border: `1px solid ${v("border")}` }}
        >
          <p
            className="flex items-center gap-[6px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase whitespace-nowrap"
            style={{ color: v("caution-ink") }}
          >
            <HandCoins size={13} strokeWidth={2.4} aria-hidden />
            Money owed
          </p>
          <p
            className="text-[26px] font-extrabold leading-[30px] tracking-[-0.02em] mt-[8px] rv-num"
            style={{ color: owedT ? v("ink") : v("tert") }}
          >
            {money(owedT)}
          </p>
          <p
            className="text-[12px] font-bold leading-[16px] mt-[2px]"
            style={{ color: v("ink") }}
          >
            {owed.length ? `${owed.length} owed` : "Nothing owed"}
          </p>
          <p
            className="text-[11px] leading-[15px] mt-[2px] flex-1"
            style={
              { color: v("faint"), textWrap: "pretty" } as React.CSSProperties
            }
          >
            {!owed.length
              ? "Unpaid cash and late memberships show here."
              : oldest > 0
                ? `Oldest is ${oldest} ${oldest === 1 ? "day" : "days"} late.`
                : "None are late yet."}
          </p>
          <button
            type="button"
            disabled={!owed.length}
            aria-expanded={owed.length ? list : undefined}
            aria-label={
              owed.length
                ? `Money owed, ${money(owedT)}, ${list ? "hide list" : "see all"}`
                : undefined
            }
            onClick={() => setList((l) => !l)}
            className="tap min-h-[44px] mt-[6px] flex items-center justify-center gap-[4px] text-[12.5px] font-extrabold whitespace-nowrap focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark rounded-[8px]"
            style={{
              borderTop: `1px solid ${v("divider")}`,
              color: owed.length ? v("pdark") : v("faint"),
            }}
          >
            {!owed.length
              ? "All paid up"
              : list
                ? "Hide list"
                : `See all ${owed.length}`}
            {owed.length > 0 &&
              (list ? (
                <ChevronUp size={14} aria-hidden />
              ) : (
                <ChevronRight size={14} aria-hidden />
              ))}
          </button>
        </div>
        {/* Failed (AN14-019 row 3): online payments only, built and hidden until Whish is live (V6-44, AN14-019 O2). */}
        {WHISH_LIVE && <FailedHalf />}
      </div>

      {list && owed.length > 0 && (
        <>
          <SecLabel>
            Money owed · {owed.length} · {money(owedT)}
          </SecLabel>
          <RCard>
            {owed.map((o, i) => {
              const chip = owedChip(o);
              const follow = canRemind(o);
              // AnInsightsV3 row action: 32 tall r10 padding 0 10, 1px
              // primary, 11.5/800 pDark, send 12/2.4 "Follow up". It sits
              // over an invisible copy of itself inside the row button (a
              // button can't hold a button).
              const followUp = (
                <>
                  <Send size={12} strokeWidth={2.4} aria-hidden />
                  Follow up
                </>
              );
              const followCls =
                "h-[32px] px-[10px] rounded-[10px] inline-flex items-center gap-[4px] text-[11.5px] font-extrabold whitespace-nowrap box-border";
              return (
                <div
                  key={o.key}
                  className="relative"
                  style={{ borderTop: i ? `1px solid ${v("divider")}` : "none" }}
                >
                  <button
                    type="button"
                    onClick={() => openOwed(o)}
                    className="tap w-full grid items-center text-left px-[16px] py-[12px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark"
                    style={{
                      gridTemplateColumns: "34px minmax(0,1fr) auto",
                      columnGap: 10,
                    }}
                  >
                    <Avatar who={o.who} size={34} font={12} icon={16} />
                    <span className="min-w-0">
                      <span
                        className="block text-[13px] font-extrabold leading-[17px] truncate"
                        style={{ color: v("ink") }}
                      >
                        {o.label}
                      </span>
                      <span
                        className="block text-[11px] leading-[15px] mt-[1px]"
                        style={{ color: v("faint") }}
                      >
                        {owedSub(o)}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-[4px]">
                      <span
                        className="text-[14px] font-extrabold whitespace-nowrap rv-num"
                        style={{ color: v("ink") }}
                      >
                        {money(o.amount)}
                      </span>
                      <Pill tone={chip.late ? "warn" : "soft"}>{chip.short}</Pill>
                      {follow && (
                        <span
                          aria-hidden
                          className={followCls + " invisible"}
                          style={{ border: "1px solid transparent" }}
                        >
                          {followUp}
                        </span>
                      )}
                    </span>
                  </button>
                  {follow && (
                    <button
                      type="button"
                      aria-label={`Follow up with ${o.label}`}
                      onClick={() => remind.open(o)}
                      className={
                        followCls +
                        " tap absolute right-[16px] bottom-[12px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
                      }
                      style={{
                        border: `1px solid ${v("primary")}`,
                        color: v("pdark"),
                      }}
                    >
                      {followUp}
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => navigate(`${REVENUE_BASE}/payments/owed`)}
              className="tap w-full min-h-[44px] flex items-center justify-center gap-[4px] text-[12.5px] font-extrabold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark"
              style={{
                borderTop: `1px solid ${v("divider")}`,
                color: v("pdark"),
              }}
            >
              Sort and filter
              <ChevronRight size={14} aria-hidden />
            </button>
          </RCard>
        </>
      )}

      {showRenewals && (
        <>
          <SecLabel>Renewals in the next 30 days</SecLabel>
          <RCard className="p-[16px]">
            <p
              className="text-[14px] font-extrabold leading-[19px]"
              style={{ color: v("ink") }}
            >
              {renN
                ? `${renN} ${renN === 1 ? "renewal" : "renewals"} due in the next 30 days`
                : "No renewals due in the next 30 days"}
            </p>
            <p
              className="text-[12px] leading-[17px] mt-[2px]"
              style={{ color: v("ink-soft") }}
            >
              {renN
                ? `${money(renT)} expected · ${thisWeek.rows.length} this week, ${money(thisWeek.total)}`
                : kind === "classes"
                  ? "Plans and packs that renew show here."
                  : "Memberships that renew show here."}
            </p>
            <div
              role="list"
              aria-label="Renewals by week"
              className="grid gap-[8px] mt-[14px] items-end"
              style={{
                gridTemplateColumns: `repeat(${weeks.length},minmax(0,1fr))`,
              }}
            >
              {weeks.map((w, i) => {
                const now = i === 0;
                const on = week === i;
                const h = renN
                  ? Math.max(6, Math.round((w.total / wkMax) * 96))
                  : 4;
                return (
                  <button
                    key={w.from}
                    type="button"
                    role="listitem"
                    aria-pressed={on}
                    aria-disabled={!w.rows.length}
                    aria-label={`${w.label}, ${spanLabel(w.from, w.to)}, ${w.rows.length} renewals, ${money(w.total)}`}
                    onClick={() => w.rows.length && setWeek(on ? null : i)}
                    className="tap flex flex-col items-center gap-[6px] min-w-0 rounded-[16px] pt-[8px] px-[2px] pb-[8px] box-border focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
                    style={{
                      background: on
                        ? v("pale")
                        : now
                          ? v("week-now")
                          : "transparent",
                      border: `1.5px solid ${on ? v("primary") : now ? v("border") : "transparent"}`,
                    }}
                  >
                    <span
                      className="text-[15px] font-extrabold leading-[18px] rv-num"
                      style={{ color: now || on ? v("deep") : v("ink") }}
                    >
                      {w.rows.length}
                    </span>
                    <span
                      className="text-[11px] font-bold leading-[14px] whitespace-nowrap rv-num"
                      style={{ color: v("ink-soft") }}
                    >
                      {money(w.total)}
                    </span>
                    <span className="w-full h-[100px] flex items-end justify-center">
                      <span
                        className="block w-[62%]"
                        style={{
                          height: h,
                          borderRadius: "8px 8px 4px 4px",
                          background: now
                            ? v("fill")
                            : on
                              ? v("pdark")
                              : v("week-bar"),
                        }}
                      />
                    </span>
                    <span
                      className="text-[10.5px] font-extrabold leading-[13px] whitespace-nowrap"
                      style={{ color: now ? v("deep") : v("ink-soft") }}
                    >
                      {w.label}
                    </span>
                    <span
                      className="text-[10px] leading-[12px] whitespace-nowrap"
                      style={{ color: v("faint") }}
                    >
                      {spanLabel(w.from, w.to)}
                    </span>
                  </button>
                );
              })}
            </div>
            {sel && (
              <div
                className="mt-[12px] pt-[12px]"
                style={{ borderTop: `1px solid ${v("divider")}` }}
              >
                <p className="flex justify-between items-baseline gap-[8px]">
                  <span
                    className="text-[13px] font-extrabold"
                    style={{ color: v("ink") }}
                  >
                    {sel.label} · {spanLabel(sel.from, sel.to)} ·{" "}
                    {sel.rows.length}{" "}
                    {sel.rows.length === 1 ? "renewal" : "renewals"}
                  </span>
                  <span
                    className="text-[13px] font-extrabold rv-num"
                    style={{ color: v("ink") }}
                  >
                    {money(sel.total)}
                  </span>
                </p>
                {sel.rows.slice(0, 3).map((r, i) => (
                  <div
                    key={r.rec.key}
                    className="flex items-center gap-[10px] py-[9px]"
                    style={{
                      borderTop: i ? `1px solid ${v("divider")}` : "none",
                    }}
                  >
                    <Avatar who={r.rec.who} size={30} font={11} icon={14} />
                    <span className="flex-1 min-w-0">
                      <span
                        className="block text-[12.5px] font-extrabold truncate"
                        style={{ color: v("ink") }}
                      >
                        {whoOf(r.rec)}
                      </span>
                      <span
                        className="block text-[11px]"
                        style={{ color: v("faint") }}
                      >
                        {r.rec.item} · {dddDMon(r.on)}
                        {r.rec.granted ? ` · ${GRANTED_RENEWAL}` : ""}
                      </span>
                    </span>
                    <span
                      className="text-[12.5px] font-extrabold rv-num"
                      style={{ color: v("ink") }}
                    >
                      {r.rec.granted ? "Plan price" : money(r.rec.amount ?? 0)}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    navigate(`${REVENUE_BASE}/payments/renewals?week=${week}`)
                  }
                  className="tap w-full min-h-[44px] flex items-center justify-center gap-[4px] text-[12.5px] font-extrabold whitespace-nowrap focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark rounded-[8px]"
                  style={{
                    borderTop: `1px solid ${v("divider")}`,
                    color: v("pdark"),
                  }}
                >
                  See all {sel.rows.length}
                  <ChevronRight size={14} aria-hidden />
                </button>
              </div>
            )}
            {!sel && renN > 0 && (
              <p
                className="text-[11px] leading-[15px] mt-[10px]"
                style={{ color: v("faint") }}
              >
                Tap a week to see who renews.
              </p>
            )}
          </RCard>
        </>
      )}
      {remind.ui}
    </div>
  );
};
