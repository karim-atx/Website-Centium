import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette, tierRank, tierStyle } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { PointsFigure } from "../../components/market/PointsFigure";
import { MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { FOCUS_CSS } from "../../components/market/usePress";
import { hexAlpha, liftInk } from "../../components/market/marketColor";
import { fetchLedger, groupLedger, ledgerCursor, ledgerLines, signedPoints, amountTone, type LedgerEntry } from "../../services/points";
import { BackTitle } from "./BackTitle";
import { appLocale } from "../../i18n/format";
import { t, tk } from "../../i18n/core";

// Market + Share 3.0 · W2 · Points history (C-MO.4.7 `history`,
// `historyReversal`, `historyEmpty`; Client Explore Screens lines 598–633,
// script `LEDGER`, `ledger`).
// - back row + "Points history" 22 / 800;
// - the Balance card in the client's tier (margin-top 12, radius 20, padding
//   14 16, --tierfill, 0.5px --tierborder): "Balance" 10 / 15 800 1.4px caps
//   in the tier's TEXT ink (W1 Q1), then (margin-top 2) the 44 / 52 700
//   figure and the 30 tier icon (PointsFigure mark "tier");
// - KEPT (PLAN §3.1) from the old Explore points card: "{a} from achievements
//   · {r} from referrals[ · {o} other]" as a line under the card (11 / 16.5
//   --faint, margin-top 8; our placement);
// - the ledger (margin-top 6): day headings 10.5 / 700 0.1em caps --faint
//   (padding 16 0 6); rows (padding 11 0, gap 12, 0.5px --div bottom): the
//   title 13.5 / 700, the kind 11 --faint; right-aligned the amount 14 / 800
//   tabular (#4F8F8A earned, #7D67D9 spent) and the balance after 11 --faint
//   tabular;
// - "Load more" (not drawn; the empty CTA's outline style) while there is
//   more;
// - the empty state (historyEmpty): padding 56 24 0, gap 10: the 56 tile
//   radius 18 #EEEAF8 with the clock 24 (stroke 1.9) #7D67D9; "Your points
//   activity will appear here." 14 / 20 --ink2, max 240.
// The ledger is fetchLedger (my_points_ledger, keyset-paged on (created_at, id):
// "Load more" passes ledgerCursor of the rows shown), the row words its
// ref_label and description, the balance and tier my_points_summary
// (AppContext), achievement titles my_achievements (AppContext).

const PAGE = 50;

export default function PointsHistoryPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const { pointsSummary, pointTiers, achievements, refreshAchievements } = useApp();
  // Round D R7: streak rungs read as a neutral "Logging bonus" in recovery-sensitive mode.
  const hideNumbers = useHideNumbers();
  // Opened straight from a link (or Explore's hero), the summary and the
  // achievements may not have been read yet: the app's one points read.
  const known = !!pointsSummary && !!achievements;
  useEffect(() => {
    if (!known) refreshAchievements();
  }, [known, refreshAchievements]);
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [more, setMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setFailed(false);
    void fetchLedger(null, PAGE).then((r) => {
      if (cancelled) return;
      if (!r.ok) return setFailed(true);
      setEntries(r.value.entries);
      setMore(r.value.more);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const loadMore = useCallback(async () => {
    if (!entries || entries.length === 0 || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    const r = await fetchLedger(ledgerCursor(entries), PAGE);
    setLoadingMore(false);
    if (!r.ok) return setMoreFailed(true);
    setEntries([...entries, ...r.value.entries]);
    setMore(r.value.more);
  }, [entries, loadingMore]);

  const rank = tierRank(pointTiers, pointsSummary?.tierName);
  const tier = tierStyle(rank, dark);
  const items = useMemo(() => (entries ? groupLedger(entries, pointsSummary?.balance ?? 0) : null), [entries, pointsSummary?.balance]);
  const title = (key: string) => achievements?.find((a) => a.key === key)?.title ?? null;
  const earnedInk = dark ? liftInk("#4F8F8A") : "#4F8F8A";
  const spentInk = dark ? m.accent : "#7D67D9";

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <BackTitle title={t("Points history")} parent="/app/marketplace" />

      {pointsSummary ? (
        <>
          <section aria-label={t("Balance")} style={{ marginTop: 12, borderRadius: 20, padding: "14px 16px", background: tier.fill, border: `0.5px solid ${tier.border}` }}>
            {/* The board's label is an inline span in the card's 16px line box (22 tall), as here. */}
            <div style={{ fontSize: 16, lineHeight: "normal" }}>
              <span style={{ fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.4px", color: tier.text }}>{t("Balance")}</span>
            </div>
            <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
              <PointsFigure value={pointsSummary.balance} mark="tier" rank={rank} tierName={pointsSummary.tierName} size={44} lineHeight={52} />
            </div>
          </section>
          <p style={{ margin: "8px 0 0", fontSize: textPx(11), lineHeight: linePx(16.5), color: m.faint }}>
            {t("{achievements} from achievements · {referrals} from referrals", {
              achievements: pointsSummary.achievementPoints.toLocaleString(appLocale("en-US")),
              referrals: pointsSummary.referralPoints.toLocaleString(appLocale("en-US")),
            })}
            {pointsSummary.otherPoints !== 0 ? ` · ${t("{n} other", { n: pointsSummary.otherPoints.toLocaleString(appLocale("en-US")) })}` : ""}
          </p>
        </>
      ) : (
        <div aria-hidden className="animate-skeleton-pulse" style={{ marginTop: 12, height: 106, borderRadius: 20, background: m.soft }} />
      )}

      {failed ? (
        <MarketError thing={tk("your points history")} onRetry={() => setTick((x) => x + 1)} style={{ marginTop: 16 }} />
      ) : items === null ? (
        <MarketSkeleton radius={20} rows={4} count={1} height={228} label={tk("Loading your points history")} style={{ marginTop: 16 }} />
      ) : items.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "56px 24px 0" }}>
          <span aria-hidden style={{ width: 56, height: 56, borderRadius: 18, background: dark ? hexAlpha("#7D67D9", 0.16) : "#EEEAF8", display: "flex", alignItems: "center", justifyContent: "center", color: dark ? m.accent : "#7D67D9" }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", ...NO_ICON_SCALE }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </span>
          <p style={{ margin: 0, fontSize: textPx(14), lineHeight: linePx(20), color: m.ink2, maxWidth: 240 }}>{t("Your points activity will appear here.")}</p>
        </div>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column" }}>
          {items.map((it) =>
            it.kind === "head" ? (
              <h2 key={it.key} style={{ margin: 0, padding: "16px 0 6px", fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>
                {it.label}
              </h2>
            ) : (
              <LedgerRow key={it.key} entry={it.entry} balanceAfter={pointsSummary ? it.balanceAfter : null} lines={ledgerLines(it.entry, title, hideNumbers)} ink={amountTone(it.entry.amount) === "earned" ? earnedInk : spentInk} />
            )
          )}
          {more ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="market-focus"
              style={{ marginTop: 16, minHeight: 44, borderRadius: 12, border: `1px solid ${m.border}`, background: "none", font: "inherit", fontSize: textPx(12.5), fontWeight: 800, color: m.pdark, cursor: "pointer", opacity: loadingMore ? 0.6 : 1 }}
            >
              {loadingMore ? t("Loading…") : t("Load more")}
            </button>
          ) : null}
          {moreFailed ? <MarketError thing={tk("more of your history")} onRetry={() => void loadMore()} style={{ marginTop: 10 }} /> : null}
        </div>
      )}
    </div>
  );
}

const LedgerRow: React.FC<{ entry: LedgerEntry; balanceAfter: number | null; lines: { title: string; kind: string }; ink: string }> = ({ entry, balanceAfter, lines, ink }) => {
  const m = marketPalette(useIsDark());
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `0.5px solid ${m.div}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: textPx(13.5), fontWeight: 700, color: m.ink }}>{lines.title}</div>
        <div style={{ fontSize: textPx(11), color: m.faint }}>{lines.kind}</div>
      </div>
      <div style={{ textAlign: "end" }}>
        <div style={{ fontSize: textPx(14), fontWeight: 800, color: ink, fontVariantNumeric: "tabular-nums" }}>{signedPoints(entry.amount)}</div>
        {balanceAfter !== null ? <div style={{ fontSize: textPx(11), color: m.faint, fontVariantNumeric: "tabular-nums" }}>{balanceAfter.toLocaleString(appLocale("en-US"))}</div> : null}
      </div>
    </div>
  );
};
