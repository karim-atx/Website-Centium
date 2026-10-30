import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChevronRight, HeartPulse, Star, Wallet, type LucideIcon } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { usePoll } from "../../../hooks/usePoll";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { linePx, textPx } from "../../../theme/textSize";
import { ErrorRow } from "../../../components/business-dashboard/parts";
import { ListingSheet } from "../../../components/business-dashboard/HeaderParts";
import { saveListingActive } from "../../../services/business-market";
import { useAnalytics } from "../analyticsContext";
import { useRevenueData } from "../revenue/useRevenueData";
import { useRecordedRevenue } from "../revenue/useRecordedRevenue";
import { loadOverview } from "./overviewData";
import { dayItems, emptyNextLine, headline, headlineSize, insights, isoDay, overviewCsv, type OvRaw } from "./overviewModel";
import { anPalette, type AnPalette } from "./palette";
import { LiveNowCard } from "./LiveNowCard";

// Analytics › Overview (AN1, BizAnalyticsV45 section "overview"), the body
// under the shared shell (title, tabs, range, range line and Export CSV are
// AnalyticsShell's): "Headline numbers" (the 2 × 2 panel, hl "panel"), the
// Live now card with the day clock, and "More insights" (Reputation, Revenue,
// and V6-28's full-width Client outcomes card that opens its own screen).
// Replaces the embedded old BusinessAnalyticsTab (HANDOVER §5: Replaced);
// V6-71: no prototype notice.
//
// ONLY REAL NUMBERS: the headline is B15's business_period_stats (a metric
// the caller may not hold has no cell), the dial is business_day, the rest
// comes from rows on the stack (overviewData). Live data (AN1-034 S6, D2):
// a Realtime channel on B15 business_activity (the same feed as the
// dashboard's useActivityFeed, filtered by business_id; RLS limits each kind
// to a caller with its permission) re-reads the page shortly after a new
// booking, join or payment lands; the 2-minute poll while visible stays as the
// fallback for a silent socket; pull-to-refresh (the Meal Prep / Health
// gesture and 70 px threshold) and Retry re-read on demand.

const POLL_MS = 2 * 60 * 1000;
/** Realtime bursts (a class booked by several people) collapse into one re-read. */
const LIVE_DEBOUNCE_MS = 1500;
const PULL_THRESHOLD = 70;

const tint = (col: string, a: number) =>
  col.startsWith("#")
    ? `rgba(${parseInt(col.slice(1, 3), 16)},${parseInt(col.slice(3, 5), 16)},${parseInt(col.slice(5, 7), 16)},${a})`
    : col.replace(/^rgb\(var\((--[\w-]+)\)\)$/, `rgb(var($1) / ${a})`);

export function OverviewSection() {
  const { range, kind, setExport, pushed } = useAnalytics();
  const { authUserId, profileReady, accessibility } = useApp();
  const navigate = useNavigate();
  const dark = useIsDark();
  const c = useMemo(() => anPalette(dark, !!accessibility.highContrast), [dark, accessibility.highContrast]);
  const rm = useReducedMotion();
  const online = useOnline();
  const textScale = accessibility.largerText ? 1.15 : 1;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const today = isoDay(now);

  const [raw, setRaw] = useState<OvRaw | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [listingOpen, setListingOpen] = useState(false);

  const rangeKey = `${range.from}|${range.to}|${range.compare}`;
  const load = useCallback(async () => {
    if (!authUserId) return;
    const r = await loadOverview(authUserId, range, isoDay(new Date()));
    if (!r.ok) {
      // A failed re-read keeps what is on screen; the inline error offers Retry.
      setError(r.message);
      return;
    }
    setError(null);
    setRaw(r.raw);
    setLoadedFor(`${range.from}|${range.to}|${range.compare}`);
    setUpdatedAt(Date.now());
  }, [authUserId, range]);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [profileReady, authUserId, load]);
  // The Revenue card reads what Revenue › Overview reads (M1): one reader, same sums.
  const rev = useRevenueData();
  const revRecords = rev.data?.records ?? null;
  // B8 RV-01: the totals from recorded_revenue_by_stream (the records' sums while it is missing).
  const recorded = useRecordedRevenue(range, revRecords, { plans: false, series: false });
  const reloadRev = rev.reload;
  const reloadRecorded = recorded.reload;
  const refreshAll = useCallback(() => {
    void load();
    reloadRev();
    reloadRecorded();
  }, [load, reloadRev, reloadRecorded]);
  usePoll(refreshAll, POLL_MS, !!raw && online);

  // B15 business_activity INSERTs (DI-03) trigger the re-read.
  const bizId = raw?.business?.id ?? null;
  const refreshRef = useRef(refreshAll);
  useEffect(() => {
    refreshRef.current = refreshAll;
  });
  useEffect(() => {
    if (!bizId || !online) return;
    let timer: number | null = null;
    const channel = supabase
      .channel(`analytics-overview:${bizId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "business_activity", filter: `business_id=eq.${bizId}` }, () => {
        if (timer !== null) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          timer = null;
          refreshRef.current();
        }, LIVE_DEBOUNCE_MS);
      })
      .subscribe();
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [bizId, online]);

  // Pull-to-refresh at the top of the page (MealPrepPanel's gesture).
  const [pullY, setPullY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const pullStart = (clientY: number, target: EventTarget) => {
    if (pulling || window.scrollY > 0 || (target as Element).closest?.("[data-readout]")) return;
    pullStartY.current = clientY;
  };
  const pullMove = (clientY: number) => {
    if (pullStartY.current === null || pulling) return;
    const delta = clientY - pullStartY.current;
    if (delta > 0) setPullY(Math.min(delta, 100));
  };
  const pullEnd = () => {
    if (pullStartY.current === null) return;
    pullStartY.current = null;
    if (pullY >= PULL_THRESHOLD && online) {
      setPulling(true);
      void load().finally(() => setPulling(false));
      reloadRev();
      reloadRecorded();
    }
    setPullY(0);
  };

  // A new range reloads with the skeleton (OURS-AN1-custom-range-sheet #8).
  const loading = !raw || loadedFor !== rangeKey;
  const cells = useMemo(() => (raw ? headline(kind, raw, range) : null), [raw, kind, range]);
  const revFigures = recorded.figures;
  const ins = useMemo(
    () => (raw ? insights(raw, revFigures ? { records: revRecords, range, today, figures: revFigures } : null) : null),
    [raw, revRecords, revFigures, range, today],
  );
  const revLoading = (rev.loading && !rev.data) || (!revFigures && !recorded.error);
  const revError = (rev.error && !rev.data ? rev.error : null) ?? (!revFigures ? recorded.error : null);
  const revCard = loading || revLoading ? null : revError ? { value: "–", delta: "", sub: revError, up: false } : (ins?.[1] ?? null);
  const items = useMemo(() => (raw ? dayItems(kind, raw, today) : []), [raw, kind, today]);
  const isEmpty = kind !== "store" && !!raw && !raw.anyClass;

  useEffect(() => {
    if (!cells || !ins || loading || revLoading) {
      setExport("", null);
      return;
    }
    setExport("centium-analytics-overview.csv", overviewCsv(cells, ins));
    return () => setExport("", null);
  }, [cells, ins, loading, revLoading, setExport]);

  const mins = updatedAt === null ? null : Math.floor((now.getTime() - updatedAt) / 60_000);
  const updated = mins === null ? "" : mins < 1 ? "Updated just now" : `Updated ${mins} min ago`;
  const can = (key: string) => (pushed ?? []).includes(key);

  return (
    <div
      data-an1-overview
      onTouchStart={(e) => pullStart(e.touches[0].clientY, e.target)}
      onTouchMove={(e) => pullMove(e.touches[0].clientY)}
      onTouchEnd={pullEnd}
      onTouchCancel={pullEnd}
    >
      {(pullY > 0 || pulling) && (
        <div data-pull style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", height: pulling ? 28 : pullY }}>
          <p style={{ fontSize: textPx(10), fontWeight: 600, color: c.faint, margin: 0 }}>
            {pulling ? "Refreshing…" : pullY >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
          </p>
        </div>
      )}
      {error && (
        <ErrorRow
          c={c}
          text={error}
          onRetry={() => {
            void load();
            reloadRev();
          }}
        />
      )}

      <Label c={c} text="Headline numbers" />
      <div
        data-headline
        style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 0, background: c.card, border: `1px solid ${c.keyLine}`, borderRadius: 22, boxShadow: c.hlShadow, overflow: "hidden", marginBottom: 24 }}
      >
        {(cells ?? Array.from({ length: 4 }, () => null)).map((k, i) => (
          <div
            key={k?.label ?? i}
            data-cell
            style={{
              position: "relative",
              minWidth: 0,
              minHeight: 128,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "18px 8px 16px",
              borderInlineStart: i % 2 ? `1px solid ${c.hair}` : "none",
              borderTop: i > 1 ? `1px solid ${c.hair}` : "none",
            }}
          >
            {k && !loading ? (
              <>
                <p data-cell-label style={{ fontSize: textPx(10), fontWeight: 700, lineHeight: linePx(13), letterSpacing: "0.12em", textTransform: "uppercase", color: c.faint, whiteSpace: textScale > 1 ? "normal" : "nowrap", margin: 0 }}>
                  {k.label}
                </p>
                <span aria-hidden style={{ display: "block", width: 0, height: 1.5, margin: "6px 0 6px" }} />
                <p
                  data-cell-value
                  style={{ fontSize: headlineSize(k.value), fontWeight: 700, lineHeight: 1, letterSpacing: "-0.045em", fontVariantNumeric: "tabular-nums lining-nums", color: k.value === "–" ? (dark ? "#9F9CAC" : "#A79E93") : c.hlNum, whiteSpace: "nowrap", margin: 0 }}
                >
                  {k.value}
                </p>
                {k.delta && (
                  <p
                    data-cell-delta
                    style={{ marginTop: 8, marginBottom: 0, fontSize: textPx(11), fontWeight: 700, lineHeight: linePx(14), letterSpacing: "0.01em", color: k.dir === "down" ? c.high : k.dir === "up" ? c.pDark : c.faint, whiteSpace: textScale > 1 ? "normal" : "nowrap" }}
                  >
                    {k.dir === "up" ? "↑ " : k.dir === "down" ? "↓ " : ""}
                    {k.delta}
                  </p>
                )}
              </>
            ) : (
              <>
                <span className="animate-skeleton-pulse" style={{ display: "block", width: 84, height: 10, borderRadius: 5, background: c.soft }} />
                <span className="animate-skeleton-pulse" style={{ display: "block", width: 56, height: 30, borderRadius: 8, background: c.soft, marginTop: 13.5 }} />
                <span className="animate-skeleton-pulse" style={{ display: "block", width: 72, height: 10, borderRadius: 5, background: c.soft, marginTop: 10 }} />
              </>
            )}
          </div>
        ))}
      </div>

      <LiveNowCard
        c={c}
        items={items}
        now={now}
        loading={loading}
        isStore={kind === "store"}
        isEmpty={isEmpty}
        emptyNext={(is24) => (raw && !items.length ? emptyNextLine(raw, is24) : "")}
        updated={updated}
        offline={!online}
        listed={!!raw?.business?.active}
        onListing={() => setListingOpen(true)}
        reducedMotion={rm}
        textScale={textScale}
      />

      <Label c={c} text="More insights" />
      <div data-insights style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
        <InsightCard
          c={c}
          Icon={Star}
          col={c.star}
          title="Reputation"
          data={loading ? null : (ins?.[0] ?? null)}
          onOpen={can("reputation") ? () => navigate("/app/business/analytics/reputation") : undefined}
        />
        <InsightCard
          c={c}
          Icon={Wallet}
          col={c.pDark}
          title="Revenue"
          data={revCard}
          onOpen={can("revenue") ? () => navigate("/app/business/analytics/revenue") : undefined}
        />
        {kind !== "store" && (
          <InsightCard
            c={c}
            Icon={HeartPulse}
            col={c.good}
            title="Client outcomes"
            full
            data={loading ? null : { value: "–", delta: "", sub: "Attending 80% or more of their bookings", up: false }}
            onOpen={can("outcomes") ? () => navigate("/app/business/analytics/outcomes") : undefined}
          />
        )}
      </div>

      {raw?.business && (
        <ListingSheet
          c={c}
          open={listingOpen}
          onClose={() => setListingOpen(false)}
          active={raw.business.active}
          onToggle={async (v) => {
            const r = await saveListingActive(raw.business!.id, v);
            if (!r.ok) return r.message ?? "Couldn't change your listing. Try again.";
            setRaw((cur) => (cur?.business ? { ...cur, business: { ...cur.business, active: v } } : cur));
            return null;
          }}
        />
      )}
    </div>
  );
}

function Label({ c, text }: { c: AnPalette; text: string }) {
  return (
    <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: c.faint, marginBottom: 10, marginTop: 0, lineHeight: 1.5 }}>{text}</p>
  );
}

function InsightCard({
  c,
  Icon,
  col,
  title,
  data,
  full,
  onOpen,
}: {
  c: AnPalette;
  Icon: LucideIcon;
  col: string;
  title: string;
  data: { value: string; delta: string; sub: string; up: boolean } | null;
  full?: boolean;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: 10, background: tint(col, c.dark ? 0.2 : 0.14), color: col, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={15} strokeWidth={2.2} aria-hidden />
        </span>
        <span style={{ flex: 1, fontSize: textPx(13), fontWeight: 800, lineHeight: linePx(17), color: c.ink, textAlign: "start" }}>{title}</span>
        {onOpen && <ChevronRight size={15} color={c.faint} aria-hidden />}
      </div>
      {data ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span data-insight-value style={{ fontSize: 26, fontWeight: 800, lineHeight: "28px", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: data.value === "–" ? c.tert : c.ink }}>
              {data.value}
            </span>
            {data.delta && <span style={{ fontSize: textPx(11), fontWeight: 700, color: data.up ? c.good : c.faint, whiteSpace: "nowrap" }}>{data.delta}</span>}
          </div>
          <p style={{ fontSize: textPx(10.5), lineHeight: linePx(14), color: c.faint, margin: 0, textAlign: "start" }}>{data.sub}</p>
        </>
      ) : (
        <>
          <span className="animate-skeleton-pulse" style={{ display: "block", width: 54, height: 26, borderRadius: 8, background: c.soft }} />
          <span className="animate-skeleton-pulse" style={{ display: "block", width: "80%", height: 10, borderRadius: 5, background: c.soft }} />
        </>
      )}
    </>
  );
  const style = {
    gridColumn: full ? "1 / -1" : undefined,
    background: c.card,
    borderRadius: 22,
    border: `1px solid ${c.cardBorder}`,
    boxShadow: c.entryShadow,
    padding: 14,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    minWidth: 0,
  };
  return onOpen ? (
    <button type="button" data-insight={title} onClick={onOpen} className="tap" style={{ ...style, cursor: "pointer", font: "inherit", textAlign: "start" }}>
      {body}
    </button>
  ) : (
    <div data-insight={title} style={style}>
      {body}
    </div>
  );
}
