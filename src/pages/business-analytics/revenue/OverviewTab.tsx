import React, { useMemo } from "react";
import {
  ScrubChart,
  type ScrubCfg,
  type ScrubMode,
  type ScrubTipRow,
} from "../../../components/charts/ScrubChart";
import {
  daysBetween,
  mondayOf,
  previousOf,
  rangeWords,
} from "../analyticsRange";
import {
  activeMembers,
  bestWeek,
  dddDMon,
  dMon,
  money,
  moneyDelta,
  moneyK,
  pctDelta,
  recurringMonthly,
  streamLabel,
  sum,
  today as todayIso,
} from "../../../services/business-revenue";
import { useAnalytics } from "../analyticsContext";
import { ErrorLine, RCard, SecLabel, Skel, v } from "./kit";
import { useRevenue } from "./revenueContext";
import { useRecordedRevenue } from "./useRecordedRevenue";

// AN14-001 / -003 / -005 to -009 / -011 (AnInsightsV3 page "revenue", sub
// "overview"; chart cfg chA, modes Total / By stream). Every value comes from
// recorded payments with a known paid date (V6-43). Deltas need a full
// previous period (no deltas in the first 4 weeks: "early"); the chart needs
// 2 weeks of payments; nothing recorded at all is the $0 state.
//
// B8 RV-01: the hero, the period before and the streams are
// recorded_revenue_by_stream (net of refunds); the daily series is the paid
// transactions_page rows on the business's own days. The records' sums are
// only the fallback while those readers are missing (useRecordedRevenue).
// Recurring each month and active members stay on the memberships: they are
// not payments.

/** Memberships, Class bookings and Products as AN14-003 row 2; the other price types OURS. */
const STREAM_COL: Record<string, string> = {
  membership: v("primary"),
  class: v("teal-dark"),
  drop_in: v("teal-dark"),
  product: v("caution"),
  class_pack: v("pdark"),
  day_pass: v("good"),
  intro_offer: v("amber"),
  intro_week: v("week-bar"),
  delivery: v("pay-caution"),
  other: v("tert"),
};
const colOf = (k: string) => STREAM_COL[k] ?? v("tert");

/** "the 4 weeks before" etc. for the lead. */
function beforeWords(key: string): string {
  if (key === "week") return "the week before";
  if (key === "4w") return "the 4 weeks before";
  if (key === "12w") return "the 12 weeks before";
  return "the period before";
}

export const OverviewTab: React.FC = () => {
  const { range, kind } = useAnalytics();
  const { data } = useRevenue();
  const today = todayIso();
  const store = kind === "store";
  const rec = useRecordedRevenue(range, data?.records ?? null, { plans: false });
  const f = rec.figures;

  const m = useMemo(() => {
    if (!f) return null;
    const age = f.first ? daysBetween(f.first, today) : 0;
    const early = !!f.first && age < 28;
    return {
      ...f,
      records: data?.records ?? [],
      prev: previousOf(range),
      early,
      chartEarly: !!f.first && age < 14,
      compare: range.compare && !early,
      und: f.undated,
    };
  }, [f, data, range, today]);

  if (rec.error && !m)
    return <ErrorLine message="Couldn't load revenue." onRetry={rec.reload} />;
  if (!m)
    return (
      <div role="status" aria-label="Loading">
        <RCard className="mt-[16px] px-[16px] pt-[20px] pb-[16px]">
          <Skel h={44} className="mx-auto w-[60%]" />
          <div className="grid grid-cols-2 gap-[16px] mt-[20px]">
            <Skel h={28} />
            <Skel h={28} />
          </div>
        </RCard>
        <SecLabel>Revenue trend</SecLabel>
        <RCard className="p-[16px]">
          <Skel h={44} r={14} />
          <Skel h={140} className="mt-[12px]" />
        </RCard>
      </div>
    );

  const empty = !m.anyPaid;

  // ---- hero ----
  const heroValue = empty ? "$0" : money(m.tot);
  const heroDelta = !empty && m.compare ? pctDelta(m.tot, m.totP) : null;
  const heroLabel = empty
    ? "Revenue collected"
    : store
      ? "Sales this period"
      : "Revenue collected this period";

  // ---- boxes (COPY per type) ----
  type Box = { v: string; d: string | null; l: string; dGood?: boolean };
  let boxes: Box[];
  if (store) {
    // Orders and returns are B11 (not on the server): no store sales exist to divide.
    boxes = [
      { v: "$0", d: null, l: "Average order" },
      { v: "–", d: null, l: "Returned" },
    ];
  } else {
    const recurring = recurringMonthly(m.records, today);
    let second: Box;
    if (kind === "classes") {
      const { n, nP } = m.bookings;
      const per = n ? m.bookings.amount / n : 0;
      const perP = nP ? m.bookings.amountP / nP : 0;
      second = {
        v: money(per),
        d: m.compare && n && nP ? moneyDelta(per, perP) : null,
        l: "Per booking",
        dGood: per >= perP,
      };
    } else {
      const act = activeMembers(m.records, today);
      second = {
        v: money(act ? m.tot / act : 0),
        d: null,
        l: "Per active member",
      };
    }
    boxes = [{ v: money(recurring), d: null, l: "Recurring each month" }, second];
  }
  if (empty)
    boxes = boxes.map((b) => ({ ...b, v: b.v === "–" ? "–" : "$0", d: null }));

  // ---- lead (template sentences from numbers only, OD-4) ----
  let lead: string;
  if (m.denied)
    lead = "Revenue shows here for people with the Revenue permission.";
  else if (empty)
    lead =
      "No transactions yet. Revenue appears once you record a payment. Cash today, Whish soon.";
  else if (m.early)
    lead =
      "Your first payments came in less than 4 weeks ago. Comparisons start after a full period.";
  else {
    const parts: string[] = [];
    if (m.compare) {
      const p = pctDelta(m.tot, m.totP);
      if (p === null)
        parts.push(`Nothing was recorded in ${beforeWords(range.key)}.`);
      else if (m.tot > m.totP)
        parts.push(`Up ${p.slice(1)} on ${beforeWords(range.key)}.`);
      else if (m.tot < m.totP)
        parts.push(`Down ${p.slice(1)} on ${beforeWords(range.key)}.`);
      else parts.push(`The same as ${beforeWords(range.key)}.`);
    }
    const bw = bestWeek(m.series);
    if (bw) parts.push(`The week of ${dMon(bw)} was your best.`);
    if (!parts.length)
      parts.push(
        m.tot
          ? `${money(m.tot)} collected ${rangeWords(range)}.`
          : `Nothing was recorded ${rangeWords(range)}.`,
      );
    lead = parts.join(" ");
  }

  // ---- chart ----
  const days = m.series.days;
  // Each stream with money in the range, in the by-stream order (most revenue first).
  const present = [...m.streams.map((s) => s.key), ...Object.keys(m.series.byKind)]
    .filter((k, i, a) => a.indexOf(k) === i)
    .filter((k) => sum(m.series.byKind[k] ?? []) > 0)
    .map((k) => ({ key: k, label: streamLabel(k) }));
  const tips: ScrubTipRow[][] = days.map((_, i) => {
    const rows: ScrubTipRow[] = [{ l: "Total", v: money(m.series.total[i]) }];
    if (present.length > 1)
      present.forEach((s) =>
        rows.push({
          l: s.label,
          v: money(m.series.byKind[s.key][i]),
          col: colOf(s.key),
        }),
      );
    rows.push({ l: "Transactions", v: String(m.series.count[i]) });
    if (m.compare) {
      const p = m.prevSeries.total[i] ?? 0;
      const d = m.series.total[i] - p;
      rows.push({
        l: "vs last period",
        v:
          (d >= 0 ? "+" : "−") +
          money(Math.abs(d)) +
          (p > 0
            ? ` (${d >= 0 ? "+" : "−"}${Math.round((Math.abs(d) / p) * 100)}%)`
            : ""),
        prev: true,
      });
    }
    return rows;
  });
  const hi = Math.max(
    1,
    ...m.series.total,
    ...(m.compare ? m.prevSeries.total : []),
  );
  const step = hi > 1500 ? 500 : hi > 300 ? 100 : hi > 60 ? 20 : 5;
  let modes: ScrubMode[];
  let labels = days.map(dddDMon);
  let xl = days.length
    ? [
        dMon(days[0]),
        dMon(days[Math.floor((days.length - 1) / 2)]),
        dMon(days[days.length - 1]),
      ]
    : [];
  if (store) {
    // COPY: store revenue is "Sales by week" (weekly bars).
    const weeks: string[] = [];
    const vals: number[] = [];
    days.forEach((d, i) => {
      const w = mondayOf(d);
      if (weeks[weeks.length - 1] !== w) {
        weeks.push(w);
        vals.push(0);
      }
      vals[vals.length - 1] += m.series.total[i];
    });
    labels = weeks.map((w) => `Week of ${dMon(w)}`);
    xl = weeks.length ? [dMon(weeks[0]), dMon(weeks[weeks.length - 1])] : [];
    modes = [
      {
        t: "Total",
        kind: "bars",
        unit: "$ per week",
        cur: vals,
        min: 0,
        step,
        fmt: moneyK,
        tips: vals.map((x) => [{ l: "Sales", v: money(x) }]),
      },
    ];
  } else {
    modes = [
      {
        t: "Total",
        unit: "$ per day",
        cur: m.series.total,
        prev: m.compare ? m.prevSeries.total : [],
        min: 0,
        step,
        fmt: moneyK,
        tips,
      },
    ];
    // By stream needs payments tagged by stream: shown once two streams carry money (AN14-003 O1).
    if (present.length > 1)
      modes.push({
        t: "By stream",
        kind: "stack",
        unit: "$ per day",
        cur: m.series.total,
        prev: m.compare ? m.prevSeries.total : [],
        min: 0,
        step,
        fmt: moneyK,
        series: present.map((s) => ({
          t: s.label,
          vals: m.series.byKind[s.key],
          col: colOf(s.key),
        })),
        tips,
      });
  }
  const cfg: ScrubCfg = {
    vh: 140,
    labels,
    xl,
    aria: store ? "Sales per week" : "Revenue per day",
    caption:
      "Drag across to read each day, tap to pin one. Tap the legend to show or hide a series.",
    earlyText: "The trend starts after 2 weeks of payments.",
    emptyText: "Revenue shows here once payments are recorded.",
    curLabel: "Collected",
    prevLabel:
      range.key === "week"
        ? "Week before"
        : `${daysBetween(m.prev.from, m.prev.to) + 1} days before`,
    modes,
  };
  const chartEmpty = empty || m.chartEarly || m.tot === 0;

  let bestI = 0;
  m.series.total.forEach((x, i) => {
    if (x > m.series.total[bestI]) bestI = i;
  });
  const avg = days.length ? m.tot / days.length : 0;
  const avgP = days.length ? m.totP / days.length : 0;
  const summary =
    !chartEmpty && !m.early
      ? [
          {
            l: "Total",
            v: money(m.tot),
            d: m.compare ? pctDelta(m.tot, m.totP) : null,
            good: m.tot >= m.totP,
          },
          {
            l: "Best day",
            v: money(m.series.total[bestI]),
            d: days[bestI] ? dMon(days[bestI]) : null,
            faint: true,
          },
          {
            l: "Average per day",
            v: money(avg),
            d: m.compare ? moneyDelta(avg, avgP) : null,
            good: avg >= avgP,
          },
        ]
      : [];

  return (
    <div>
      {m.early && !empty && (
        <p
          className="mt-[12px] text-[11.5px] leading-[16px] rounded-[12px] px-[12px] py-[8px]"
          style={{ color: v("ink-soft"), background: v("soft") }}
        >
          Early data: your first payments came in less than 4 weeks ago.
        </p>
      )}

      <RCard className="mt-[16px]">
        <div className="pt-[20px] px-[16px] pb-[16px] text-center">
          <p className="flex items-baseline justify-center gap-[8px]">
            <span
              className="text-[44px] font-extrabold tracking-[-0.035em] leading-[46px] rv-num"
              style={{ color: empty ? v("tert") : v("ink") }}
            >
              {heroValue}
            </span>
            {heroDelta && (
              <span
                className="text-[12px] font-extrabold whitespace-nowrap"
                style={{ color: m.tot >= m.totP ? v("good") : v("high") }}
              >
                {heroDelta}
              </span>
            )}
          </p>
          <p
            className="text-[12px] font-semibold leading-[16px] mt-[8px]"
            style={{ color: v("faint") }}
          >
            {heroLabel}
          </p>
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "minmax(0,1fr) 1px minmax(0,1fr)",
            borderTop: `1px solid ${v("divider")}`,
          }}
        >
          {boxes.map((b, i) => (
            <React.Fragment key={b.l}>
              <div className="pt-[16px] px-[8px] pb-[14px] text-center">
                <p className="flex items-baseline justify-center gap-[6px] flex-wrap">
                  <span
                    className="text-[26px] font-extrabold tracking-[-0.03em] leading-[28px] rv-num"
                    style={{
                      color:
                        b.v === "–" || b.v === "0" || b.v === "$0"
                          ? v("tert")
                          : v("ink"),
                    }}
                  >
                    {b.v}
                  </span>
                  {b.d && (
                    <span
                      className="text-[11px] font-extrabold whitespace-nowrap"
                      style={{
                        color: b.dGood === false ? v("high") : v("good"),
                      }}
                    >
                      {b.d}
                    </span>
                  )}
                </p>
                <p
                  className="text-[11px] font-semibold leading-[14px] mt-[5px]"
                  style={{ color: v("faint") }}
                >
                  {b.l}
                </p>
              </div>
              {i === 0 && (
                <span
                  aria-hidden
                  className="my-[12px]"
                  style={{ background: v("divider") }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div
          className="px-[20px] py-[12px] text-[12px] leading-[17px]"
          style={
            {
              borderTop: `1px solid ${v("divider")}`,
              color: v("ink-soft"),
              textWrap: "pretty",
            } as React.CSSProperties
          }
        >
          <p>{lead}</p>
          {m.und.n > 0 && (
            <p className="mt-[6px]">
              Not counted yet: {money(m.und.amount)} from {m.und.n}{" "}
              {m.und.n === 1 ? "membership" : "memberships"} marked paid. Their
              payment dates aren't shared with Analytics yet.
            </p>
          )}
        </div>
      </RCard>

      <SecLabel>{store ? "Sales by week" : "Revenue trend"}</SecLabel>
      <RCard className="p-[16px]">
        <p className="text-[14px] font-extrabold" style={{ color: v("ink") }}>
          Is revenue growing, and where does it come from?
        </p>
        <p
          className="text-[11.5px] leading-[16px] mt-[2px] mb-[12px]"
          style={
            { color: v("ink-soft"), textWrap: "pretty" } as React.CSSProperties
          }
        >
          {store
            ? "Sales recorded each week."
            : m.compare
              ? `Money collected each day. The dashed line is the ${daysBetween(m.prev.from, m.prev.to) + 1} days before.`
              : "Money collected each day."}
        </p>
        <ScrubChart
          cfg={cfg}
          early={m.chartEarly && !empty}
          empty={chartEmpty}
        />
        {summary.length > 0 && (
          <div
            className="grid grid-cols-3 mt-[12px] pt-[12px]"
            style={{ borderTop: `1px solid ${v("divider")}` }}
          >
            {summary.map((s, i) => (
              <div
                key={s.l}
                className="text-center px-[4px] min-w-0"
                style={{ borderLeft: i ? `1px solid ${v("divider")}` : "none" }}
              >
                <p
                  className="text-[10.5px] font-bold whitespace-nowrap"
                  style={{ color: v("faint") }}
                >
                  {s.l}
                </p>
                <p
                  className="text-[16px] font-extrabold leading-[20px] mt-[3px] whitespace-nowrap rv-num"
                  style={{ color: v("ink") }}
                >
                  {s.v}
                </p>
                {s.d && (
                  <p
                    className="text-[10.5px] font-extrabold whitespace-nowrap"
                    style={{
                      color: s.faint
                        ? v("faint")
                        : s.good
                          ? v("good")
                          : v("high"),
                    }}
                  >
                    {s.d}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </RCard>
    </div>
  );
};
