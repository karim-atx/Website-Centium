import React, { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { SegmentedTabs } from "../../../components/ui/SegmentedTabs";
import {
  presetRange,
  rangeLine,
  type AnalyticsRange,
  type RangeKey,
} from "../analyticsRange";
import { AnalyticsContext, useAnalytics } from "../analyticsContext";
import { CustomRangeSheet } from "../CustomRangeSheet";
import { ErrorLine, OfflineLine, v } from "./kit";
import { OverviewTab } from "./OverviewTab";
import { StreamsTab } from "./StreamsTab";
import { PaymentsTab } from "./PaymentsTab";
import { TransactionsTab } from "./TransactionsTab";
import { OwedListPage, PaymentDetailPage } from "./OwedPages";
import { RenewalDetailPage, RenewalsPage } from "./RenewalPages";
import { FailedDetailPage, FailedListPage } from "./FailedPages";
import { REVENUE_BASE } from "./payModel";
import { RevenueContext } from "./revenueContext";
import { useRevenueData } from "./useRevenueData";
import "./revenue.css";

// Analytics › Revenue (AN14, AnInsightsV3 page "revenue"): its own sub-page
// of Analytics (AN14-001 row 1): "Back to Analytics", title "Revenue" 27/700,
// subtitle, range tabs (the shell's range, shared with every section), sub
// tabs Overview · Streams · Payments · Transactions, the range line and the
// S065 line (V6-43: always visible). The See all pages (PaySeeAllV2) are
// routes under /payments. Registered in the shell through sections.tsx
// (SUBPAGE_VIEWS.revenue).

const SUBS = [
  { key: "overview", label: "Overview" },
  { key: "streams", label: "Streams" },
  { key: "payments", label: "Payments" },
  { key: "transactions", label: "Transactions" },
];
const RANGE_TABS: { key: RangeKey; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "4w", label: "4 weeks" },
  { key: "12w", label: "12 weeks" },
  { key: "custom", label: "Custom" },
];

export default function RevenuePage() {
  const params = useParams();
  const rest = (params["*"] ?? "").replace(/\/+$/, "");
  const parts = rest ? rest.split("/") : [];
  const state = useRevenueData();
  const navigate = useNavigate();
  // Its own range, like Reputation (a full-page section draws its own tabs).
  const shell = useAnalytics();
  const [range, setRange] = useState<AnalyticsRange>(() => shell.range);
  const [customOpen, setCustomOpen] = useState(false);
  const ctx = useMemo(() => ({ ...shell, range }), [shell, range]);

  // PaySeeAll pages (full pages with their own header).
  let page: React.ReactNode = null;
  if (parts[0] === "payments" && parts[1] === "owed")
    page = parts[2] ? <PaymentDetailPage from="owed" recKey={decodeURIComponent(parts[2])} /> : <OwedListPage />;
  else if (parts[0] === "payments" && parts[1] === "renewals")
    page = parts[2] ? <RenewalDetailPage recKey={decodeURIComponent(parts[2])} /> : <RenewalsPage />;
  else if (parts[0] === "payments" && parts[1] === "failed")
    page = parts[2] ? <FailedDetailPage recKey={decodeURIComponent(parts[2])} /> : <FailedListPage />;
  else if (parts[0] === "transactions" && parts[1])
    page = <PaymentDetailPage from="transactions" recKey={decodeURIComponent(parts[1])} />;
  else if (parts.length > 1) return <Navigate to={REVENUE_BASE} replace />;

  const sub = parts[0] ?? "overview";
  if (!page && !SUBS.some((s) => s.key === sub))
    return <Navigate to={REVENUE_BASE} replace />;

  return (
    <AnalyticsContext.Provider value={ctx}>
      <RevenueContext.Provider value={state}>
        <div className="rv-scope" style={{ color: v("ink") }}>
          {page ?? (
            <div className="pb-6">
              <div className="flex items-center gap-[8px] mb-[10px]">
                <button
                  type="button"
                  aria-label="Back to Analytics"
                  onClick={() => navigate("/app/business/analytics/overview")}
                  className="tap w-[44px] h-[44px] -my-[5px] -ml-[5px] rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
                >
                  <span
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
                    style={{ background: v("soft"), color: v("ink-soft") }}
                  >
                    <ChevronLeft size={17} strokeWidth={2.4} aria-hidden />
                  </span>
                </button>
                <span
                  className="text-[12px] font-bold"
                  style={{ color: v("ink-soft") }}
                >
                  Analytics
                </span>
              </div>
              <h1
                className="text-[27px] font-bold tracking-[-0.022em] leading-[36px]"
                style={{ color: v("ink") }}
              >
                Revenue
              </h1>
              <p
                className="text-[13px] font-medium leading-[19px] mt-[4px]"
                style={{ color: v("faint") }}
              >
                Money coming in, and from where
              </p>
              <SegmentedTabs
                className="mt-[16px]"
                size="compact"
                items={RANGE_TABS}
                activeKey={range.key}
                onChange={(k) =>
                  k === "custom"
                    ? setCustomOpen(true)
                    : setRange(presetRange(k as Exclude<RangeKey, "custom">))
                }
              />
              <SegmentedTabs
                className="mt-[10px]"
                items={SUBS}
                activeKey={sub}
                onChange={(k) =>
                  navigate(
                    k === "overview" ? REVENUE_BASE : `${REVENUE_BASE}/${k}`,
                  )
                }
              />
              <p
                className="text-[11px] leading-[15px] mt-[16px]"
                style={{ color: v("faint") }}
              >
                {rangeLine(range)}
              </p>
              <p
                className="text-[11px] leading-[15px] mt-[4px]"
                style={{ color: v("faint") }}
              >
                Every figure comes from recorded payments. Amounts in USD, as
                set on your plans.
              </p>
              {!state.online && <OfflineLine at={state.loadedAt} />}
              {state.error && !state.data ? (
                <ErrorLine
                  message="Couldn't load revenue."
                  onRetry={state.reload}
                />
              ) : (
                <>
                  {sub === "overview" && <OverviewTab />}
                  {sub === "streams" && <StreamsTab />}
                  {sub === "payments" && <PaymentsTab />}
                  {sub === "transactions" && <TransactionsTab />}
                </>
              )}
            </div>
          )}
          <CustomRangeSheet
            open={customOpen}
            onClose={() => setCustomOpen(false)}
            initial={range}
            onApply={(r) => {
              setRange(r);
              setCustomOpen(false);
            }}
          />
        </div>
      </RevenueContext.Provider>
    </AnalyticsContext.Provider>
  );
}
