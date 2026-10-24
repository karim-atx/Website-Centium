import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useIsDark } from "../../hooks/useIsDark";
import { useBack } from "../../hooks/useBack";
import { textPx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { marketPalette } from "../../theme/marketTokens";
import { TicketStub } from "../../components/market/TicketStub";
import { MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { FOCUS_CSS } from "../../components/market/usePress";
import { VOUCHER_TABS, fetchMyVouchers, liveStatus, tabOf, voucherRow, type Voucher, type VoucherTab } from "../../services/vouchers";
import type { MarketResult } from "../../services/market/rpc";
import { ownerInitials } from "../../services/offers";
import { BackRow } from "./rewards/rewardsParts";

// Market + Share 3.0 · W2 · C-MO.4.6 My rewards (`rewardsActive`,
// `rewardsEmpty`) at /app/marketplace/rewards/mine. Literal values, Client
// Explore Screens lines 550–594 (the `list` drawing) and the script's
// `list` / `stub()`:
// - back + "My rewards" 22 / 800;
// - the segmented track (margin-top 10): --segtrack, radius 16, padding 6, gap
//   5; tabs flex 1, 40 tall, padding 0 10, radius 12, 13 / 700 nowrap; on
//   --segactive / --onfill, off --segidle / --segink (Active · Used ·
//   Expired, VOUCHER_TABS);
// - the rows (margin-top 14, gap 10): the W1 TicketStub, stub 46 with the
//   vertical label 10.5 / 800 0.16em caps (tones from voucherRow: Active teal,
//   a week or less left pale "3 days", used / expired muted); the body
//   padding 12 14, gap 12: the 44 tile radius 12 --pale (initials 12.5 / 800
//   --accent), the headline 14 / 700, the owner 12 / 600 --accent (the
//   business, or "Rami · Coach or instructor": ownerSubtitle), the meta
//   11.5 --faint (margin-top 1). A row opens the voucher;
// - empty (padding 56 24 0, a centred column, gap 10): the 56 tile radius 18
//   --pale with the 24 calendar glyph (stroke 1.75, --accent), the title
//   16 / 800, the body 13 / 1.55 --faint, the outline button (margin-top 6,
//   min-height 40, radius 12, 1px --border, padding 0 14, 12.5 / 800 --pdark)
//   "Browse rewards" → Explore › Rewards.
// The vouchers are DB2's `vouchers` rows (fetchMyVouchers); a void voucher
// (cancelled and refunded by Centium) sits under Expired.

const EMPTY: Record<VoucherTab, { title: string; body: string }> = {
  active: { title: "No active vouchers", body: "Vouchers you redeem with your points will show here." },
  used: { title: "No used vouchers", body: "Vouchers you've used at a business or with a professional show here." },
  expired: { title: "No expired vouchers", body: "Vouchers that pass their date without being used show here." },
};

const isTab = (t: string | null): t is VoucherTab => t === "active" || t === "used" || t === "expired";

type Load = { state: "loading" } | { state: "done"; result: MarketResult<Voucher[]> };

export default function MyRewardsPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const back = useBack("/app/marketplace?tab=rewards");
  const [params, setParams] = useSearchParams();
  const tab: VoucherTab = isTab(params.get("tab")) ? (params.get("tab") as VoucherTab) : "active";
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const fetchIt = useCallback(() => {
    let live = true;
    setLoad({ state: "loading" });
    void fetchMyVouchers().then((result) => live && setLoad({ state: "done", result }));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => fetchIt(), [fetchIt]);

  const setTab = (t: VoucherTab) => setParams(t === "active" ? {} : { tab: t }, { replace: true });
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = VOUCHER_TABS.length;
    const j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    setTab(VOUCHER_TABS[j].key);
    tabRefs.current[j]?.focus();
  };

  const now = new Date();
  const rows = load.state === "done" && load.result.ok ? load.result.value.filter((v) => tabOf(liveStatus(v, now)) === tab) : [];

  return (
    <div style={{ paddingBottom: 32, lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      <BackRow onBack={back} title="My rewards" />

      <div role="tablist" aria-label="Vouchers" style={{ marginTop: 10, display: "flex", gap: 5, padding: 6, borderRadius: 16, background: m.segtrack }}>
        {VOUCHER_TABS.map((t, i) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`rewards-tab-${t.key}`}
              aria-selected={on}
              aria-controls="rewards-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onKey(e, i)}
              className="market-focus"
              style={{ flex: 1, minWidth: 0, height: 40, padding: "0 10px", borderRadius: 12, border: 0, background: on ? m.segactive : m.segidle, color: on ? m.onfill : m.segink, display: "flex", alignItems: "center", justifyContent: "center", font: "inherit", fontSize: textPx(13), fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id="rewards-panel" role="tabpanel" aria-labelledby={`rewards-tab-${tab}`}>
        {load.state === "loading" ? (
          <MarketSkeleton radius={18} count={2} rows={3} label="Loading your rewards" style={{ marginTop: 14 }} />
        ) : !load.result.ok ? (
          <MarketError thing="your rewards" onRetry={fetchIt} style={{ marginTop: 14 }} />
        ) : rows.length === 0 ? (
          <EmptyState tab={tab} onBrowse={() => navigate("/app/marketplace?tab=rewards")} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {rows.map((v) => {
              const row = voucherRow(v, now);
              return (
                <TicketStub
                  key={v.id}
                  stubWidth={46}
                  vertical
                  stubLabel={row.stub}
                  tone={row.tone}
                  labelType={[10.5, "0.16em"]}
                  onPress={() => navigate(`/app/marketplace/vouchers/${encodeURIComponent(v.id)}`)}
                  ariaLabel={`${[v.offerHeadline, v.ownerSubtitle].filter(Boolean).join(", ")}. ${row.meta}. ${row.stub}`}
                  className="market-focus"
                  bodyStyle={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}
                >
                  <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(12.5), fontWeight: 800, color: m.accent, flexShrink: 0 }}>
                    {ownerInitials(v.ownerName)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <span style={{ display: "block", fontSize: textPx(14), fontWeight: 700 }}>{v.offerHeadline}</span>
                    <span style={{ display: "block", fontSize: textPx(12), fontWeight: 600, color: m.accent }}>{v.ownerSubtitle}</span>
                    <span style={{ display: "block", fontSize: textPx(11.5), color: m.faint, marginTop: 1 }}>{row.meta}</span>
                  </span>
                </TicketStub>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const EmptyState: React.FC<{ tab: VoucherTab; onBrowse: () => void }> = ({ tab, onBrowse }) => {
  const m = marketPalette(useIsDark());
  const e = EMPTY[tab];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "56px 24px 0" }}>
      <span aria-hidden style={{ width: 56, height: 56, borderRadius: 18, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", color: m.accent }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={NO_ICON_SCALE}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
        </svg>
      </span>
      <div style={{ fontSize: textPx(16), fontWeight: 800 }}>{e.title}</div>
      <div style={{ fontSize: textPx(13), lineHeight: 1.55, color: m.faint }}>{e.body}</div>
      <button
        type="button"
        onClick={onBrowse}
        className="hit market-focus"
        style={{ marginTop: 6, minHeight: 40, borderRadius: 12, border: `1px solid ${m.border}`, background: "none", display: "inline-flex", alignItems: "center", padding: "0 14px", font: "inherit", fontSize: textPx(12.5), fontWeight: 800, color: m.pdark, cursor: "pointer" }}
      >
        Browse rewards
      </button>
    </div>
  );
};
