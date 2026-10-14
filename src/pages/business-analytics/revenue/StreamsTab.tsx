import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { money, sum } from "../../../services/business-revenue";
import { useAnalytics } from "../analyticsContext";
import { ErrorLine, RCard, SecLabel, Skel, v } from "./kit";
import { useRevenue } from "./revenueContext";
import { useRecordedRevenue } from "./useRecordedRevenue";

// AN14-013 to -018 (AnInsightsV3 sub "streams"): two collapsible cards,
// "Revenue by stream" and "Revenue by membership plan" (Classes: "plan or
// pack"; hidden for a store, AN14-018 row 2). Both cards may be open.
// B8 RV-01: streams are recorded_revenue_by_stream's price types (net of
// refunds; a row's detail: payments, a membership's plans, refunds), plans
// are recorded_revenue_by_plan (the null plan is "Classes and other", never
// dropped, so the plans add up to the revenue). Before B8 (readers missing)
// both are the records' sums. Discounts join when promotions (B13) exist.

const Collapsible: React.FC<{
  title: string;
  line: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, line, open, onToggle, children }) => (
  <RCard>
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="tap w-full flex items-center gap-[10px] p-[16px] text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark"
    >
      <span className="flex-1 min-w-0">
        <span
          className="block text-[14px] font-extrabold"
          style={{ color: v("ink") }}
        >
          {title}
        </span>
        <span
          className="block text-[12px] leading-[17px] mt-[3px]"
          style={
            { color: v("ink-soft"), textWrap: "pretty" } as React.CSSProperties
          }
        >
          {line}
        </span>
      </span>
      <span
        aria-hidden
        className="flex"
        style={{
          color: v("faint"),
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s ease",
        }}
      >
        <ChevronDown size={18} />
      </span>
    </button>
    {open && (
      <div
        className="px-[16px] pb-[16px]"
        style={{ borderTop: `1px solid ${v("divider")}` }}
      >
        {children}
      </div>
    )}
  </RCard>
);

export const StreamsTab: React.FC = () => {
  const { range, kind } = useAnalytics();
  const { data } = useRevenue();
  const navigate = useNavigate();
  const [aOpen, setAOpen] = useState(false);
  const [bOpen, setBOpen] = useState(false);
  const [rowOpen, setRowOpen] = useState<string | null>(null);
  const store = kind === "store";
  const rec = useRecordedRevenue(range, data?.records ?? null, { series: false });
  const f = rec.figures;

  const rows = f?.streams ?? [];
  const plans = f?.plans ?? [];
  const total = sum(rows.map((r) => r.value));
  const mx = Math.max(1, ...rows.map((r) => r.value));
  const planMx = Math.max(1, ...plans.map((p) => p.value));

  if (rec.error && !f)
    return <ErrorLine message="Couldn't load revenue." onRetry={rec.reload} />;
  if (!f)
    return (
      <div role="status" aria-label="Loading">
        <SecLabel>Revenue by stream</SecLabel>
        <Skel h={74} r={24} />
        <SecLabel>Revenue by membership plan</SecLabel>
        <Skel h={75} r={24} />
      </div>
    );

  const denied = f.denied
    ? "Revenue shows here for people with the Revenue permission."
    : null;
  let aLine: string;
  if (denied) aLine = denied;
  else if (!total) aLine = "No revenue yet.";
  else if (rows.length === 1)
    aLine = `All revenue comes from ${rows[0].label.toLowerCase()}.`;
  else {
    const top = rows.slice().sort((a, b) => b.value - a.value)[0];
    aLine = `${top.label} bring in ${Math.round((top.value / total) * 100)}%.`;
  }
  const hasPlans = (data?.plans.length ?? 0) > 0;
  // The plan that brings in the most (the reader's order); "Classes and other" only when no plan earned.
  const topPlan = plans.find((p) => p.key !== "none") ?? plans[0];
  const bLine = denied
    ? denied
    : !hasPlans && kind === "gym"
      ? "No membership plans yet."
      : topPlan
        ? `${topPlan.label} brings in the most: ${money(topPlan.value)} from ${topPlan.n} ${topPlan.n === 1 ? "payment" : "payments"}.`
        : kind === "classes"
          ? "No plan or pack revenue yet."
          : "No membership revenue yet.";

  return (
    <div>
      <SecLabel>Revenue by stream</SecLabel>
      <Collapsible
        title="Where does your revenue come from?"
        line={aLine}
        open={aOpen}
        onToggle={() => setAOpen((o) => !o)}
      >
        <div className="flex flex-col mt-[8px]">
          {rows.length === 0 && (
            <p
              className="py-[10px] text-[12px] leading-[17px]"
              style={{ color: v("faint") }}
            >
              Revenue shows here once payments are recorded.
            </p>
          )}
          {rows.map((r, i) => {
            const open = rowOpen === r.key;
            return (
              <button
                key={r.key}
                type="button"
                aria-expanded={open}
                onClick={() => setRowOpen(open ? null : r.key)}
                className="tap w-full text-left py-[10px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark rounded-[6px]"
                style={{ borderTop: i ? `1px solid ${v("divider")}` : "none" }}
              >
                <span className="flex justify-between items-baseline gap-[8px]">
                  <span
                    className="text-[13px] font-extrabold"
                    style={{ color: v("ink") }}
                  >
                    {r.label}
                  </span>
                  <span
                    className="text-[13px] font-extrabold rv-num"
                    style={{ color: v("ink") }}
                  >
                    {money(r.value)}
                  </span>
                </span>
                <span className="flex items-center gap-[8px] mt-[6px]">
                  <span
                    className="flex-1 h-[10px] rounded-full overflow-hidden"
                    style={{ background: v("track") }}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${((r.value / mx) * 100).toFixed(1)}%`,
                        background: i === 0 ? v("pdark") : v("primary"),
                      }}
                    />
                  </span>
                  <span
                    className="text-[11px] w-[34px] text-right"
                    style={{ color: v("faint") }}
                  >
                    {Math.round((r.value / total) * 100)}%
                  </span>
                </span>
                {open && (
                  <span
                    className="mt-[8px] rounded-[12px] px-[10px] py-[8px] flex flex-col gap-[4px]"
                    style={{ background: v("soft") }}
                  >
                    {r.details.map((d, k) => (
                      <span
                        key={k}
                        className="flex justify-between text-[11.5px]"
                      >
                        <span style={{ color: v("ink-soft") }}>{d.label}</span>
                        <span
                          className="font-extrabold rv-num"
                          style={{ color: d.bad ? v("high") : v("ink") }}
                        >
                          {d.value}
                        </span>
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p
          className="flex justify-between pt-[10px] text-[13px] font-extrabold"
          style={{ borderTop: `1px solid ${v("divider")}`, color: v("ink") }}
        >
          <span>Net revenue</span>
          <span className="rv-num">{money(total)}</span>
        </p>
        <p
          className="text-[11px] leading-[15px] mt-[6px]"
          style={{ color: v("faint") }}
        >
          Tap a stream for its breakdown.
        </p>
      </Collapsible>

      {!store && (
        <>
          <SecLabel>
            {kind === "classes"
              ? "Revenue by plan or pack"
              : "Revenue by membership plan"}
          </SecLabel>
          <Collapsible
            title="Which plans bring in the most?"
            line={bLine}
            open={bOpen}
            onToggle={() => setBOpen((o) => !o)}
          >
            {!hasPlans && kind === "gym" ? (
              <div className="mt-[12px]">
                <p
                  className="text-[12px] leading-[17px]"
                  style={{ color: v("ink-soft") }}
                >
                  No membership plans yet.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/app/business/gym")}
                  className="tap min-h-[44px] text-[12.5px] font-extrabold"
                  style={{ color: v("pdark") }}
                >
                  Add a plan
                </button>
              </div>
            ) : plans.length === 0 ? (
              <p
                className="mt-[12px] text-[12px] leading-[17px]"
                style={{ color: v("faint") }}
              >
                Plans show here once their payments are recorded with a date.
              </p>
            ) : (
              <div className="flex flex-col gap-[12px] mt-[12px]">
                {plans.map((p) => (
                  <div key={p.key}>
                    <div
                      className="flex justify-between text-[12.5px]"
                      style={{ color: v("ink") }}
                    >
                      <span className="font-extrabold">{p.label}</span>
                      <span className="font-extrabold rv-num">
                        {money(p.value)}
                      </span>
                    </div>
                    <div
                      className="h-[8px] rounded-full mt-[5px] overflow-hidden"
                      style={{ background: v("track") }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${((p.value / planMx) * 100).toFixed(1)}%`,
                          background: v("primary"),
                        }}
                      />
                    </div>
                    <p
                      className="text-[11px] mt-[3px]"
                      style={{ color: v("faint") }}
                    >
                      {p.n} {p.n === 1 ? "payment" : "payments"}
                      {p.each !== null ? ` · ${money(p.each)} each` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Collapsible>
        </>
      )}
    </div>
  );
};
