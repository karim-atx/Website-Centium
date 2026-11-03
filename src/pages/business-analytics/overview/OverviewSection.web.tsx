import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, HeartPulse, Star, Wallet, type LucideIcon } from "lucide-react";
import { supabase } from "../../../../lib/supabase/client";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { usePoll } from "../../../hooks/usePoll";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { ErrorRow } from "../../../components/business-dashboard/parts";
import { WebListingPopup } from "../../../components/business-dashboard/DashboardParts.web";
import { dashPalette } from "../../../components/business-dashboard/palette";
import { saveListingActive } from "../../../services/business-market";
import { useAnalytics } from "../analyticsContext";
import { useRevenueData } from "../revenue/useRevenueData";
import { useRecordedRevenue } from "../revenue/useRecordedRevenue";
import { loadOverview } from "./overviewData";
import { dayItems, emptyNextLine, headline, insights, isoDay, overviewCsv, type OvRaw } from "./overviewModel";
import { anPalette } from "./palette";
import { LiveNowCard } from "./LiveNowCard";
import { WebCapsLabel } from "../AnalyticsParts.web";
import { t, tn } from "../../../i18n/core";

// Website viewport v1 · WB-AN.1 Overview (WB-AN Analytics Web v5, `isOverview`):
// Headline numbers (the 2 × 2 panel: cells min 156 / 124 on the rail, padding
// 24 / 12 × 24, label 13/20 700 0.12em, value 40/48 700, the delta 13/20 700)
// and More insights (three cards on a shared subgrid: tile 32 / 24, title
// 17/24 / 15/20, value 28/36 / 24/32 800, the delta pill, the line 13/20) in
// 7 columns, Live now in 5 (300 on the rail). Live now is the mobile card (its
// dial, AM / PM, 12 / 24 and the event panel), scaled to the web type
// (17 / 13) at 1440 and at its own size on the rail, where the dial is the
// design's 268. "Your listing" opens the 480 popup (WB-AN.1.1 = WB-HO.2).
// Reading, the 2-minute poll, the business_activity re-read, the revenue card
// and Export CSV are the mobile OverviewSection's (copied here so the mobile
// section stays untouched); pull-to-refresh is a touch gesture and is not on
// the web.

const POLL_MS = 2 * 60 * 1000;
const LIVE_DEBOUNCE_MS = 1500;

const tint = (col: string, a: number) =>
  col.startsWith("#") ? `rgba(${parseInt(col.slice(1, 3), 16)},${parseInt(col.slice(3, 5), 16)},${parseInt(col.slice(5, 7), 16)},${a})` : col.replace(/^rgb\(var\((--[\w-]+)\)\)$/, `rgb(var($1) / ${a})`);

export const OverviewWeb: React.FC<{ rail: boolean }> = ({ rail }) => {
  const { range, kind, setExport, pushed } = useAnalytics();
  const { authUserId, profileReady, accessibility } = useApp();
  const navigate = useNavigate();
  const dark = useIsDark();
  const c = useMemo(() => anPalette(dark, !!accessibility.highContrast), [dark, accessibility.highContrast]);
  const dc = useMemo(() => dashPalette(dark, !!accessibility.highContrast), [dark, accessibility.highContrast]);
  const rm = useReducedMotion();
  const online = useOnline();

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
  const rev = useRevenueData();
  const revRecords = rev.data?.records ?? null;
  const recorded = useRecordedRevenue(range, revRecords, { plans: false, series: false });
  const reloadRev = rev.reload;
  const reloadRecorded = recorded.reload;
  const refreshAll = useCallback(() => {
    void load();
    reloadRev();
    reloadRecorded();
  }, [load, reloadRev, reloadRecorded]);
  usePoll(refreshAll, POLL_MS, !!raw && online);

  const bizId = raw?.business?.id ?? null;
  const refreshRef = useRef(refreshAll);
  useEffect(() => {
    refreshRef.current = refreshAll;
  });
  useEffect(() => {
    if (!bizId || !online) return;
    let timer: number | null = null;
    const channel = supabase
      .channel(`analytics-overview-web:${bizId}`)
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

  const loading = !raw || loadedFor !== rangeKey;
  const cells = useMemo(() => (raw ? headline(kind, raw, range) : null), [raw, kind, range]);
  const revFigures = recorded.figures;
  const ins = useMemo(() => (raw ? insights(raw, revFigures ? { records: revRecords, range, today, figures: revFigures } : null) : null), [raw, revRecords, revFigures, range, today]);
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
  const updated = mins === null ? "" : mins < 1 ? t("Updated just now") : tn(mins, "Updated {n} min ago", "Updated {n} min ago");
  const can = (key: string) => (pushed ?? []).includes(key);

  const insight = (key: string, Icon: LucideIcon, col: string, title: string, data: { value: string; delta: string; sub: string; up: boolean } | null, open?: () => void) => (
    <InsightCard key={key} rail={rail} Icon={Icon} col={col} title={title} data={data} onOpen={open} />
  );

  return (
    <div data-an-overview style={{ marginTop: 24, display: "grid", gridTemplateColumns: rail ? "minmax(0,1fr) 300px" : "minmax(0,7fr) minmax(0,5fr)", gap: 24, alignItems: "stretch" }}>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        {error && (
          <div style={{ marginBottom: 12 }}>
            <ErrorRow c={dc} text={error} onRetry={refreshAll} />
          </div>
        )}
        <WebCapsLabel style={{ marginBottom: rail ? 8 : 10 }}>{t("Headline numbers")}</WebCapsLabel>
        <div
          data-an="headline"
          style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gridAutoRows: "1fr", background: "#FFFFFF", border: "1px solid rgba(125,107,181,0.26)", borderRadius: 22, boxShadow: "0 10px 24px -18px rgba(95,80,147,0.28)", overflow: "hidden" }}
        >
          {(cells ?? Array.from({ length: 4 }, () => null)).map((k, i) => (
            <div
              key={k?.label ?? i}
              data-an="cell"
              style={{ minWidth: 0, minHeight: rail ? 124 : 156, boxSizing: "border-box", display: "grid", gridTemplateRows: "auto minmax(0,1fr) auto", justifyItems: "center", alignItems: "center", rowGap: rail ? 4 : 8, textAlign: "center", padding: rail ? "12px 24px" : 24, borderInlineStart: i % 2 ? "1px solid rgba(36,31,27,0.09)" : "none", borderTop: i > 1 ? "1px solid rgba(36,31,27,0.09)" : "none" }}
            >
              {k && !loading ? (
                <>
                  <p className="rtl:tracking-normal" style={{ margin: 0, alignSelf: "start", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8C8378", whiteSpace: "nowrap" }}>
                    {k.label}
                  </p>
                  <p data-cell-value style={{ margin: 0, fontSize: 40, lineHeight: "48px", fontWeight: 700, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums lining-nums", color: k.value === "–" ? "#A79E93" : "#3F3272", whiteSpace: "nowrap" }}>
                    {k.value}
                  </p>
                  <p style={{ margin: 0, alignSelf: "end", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.01em", color: k.dir === "down" ? "#C0392B" : k.dir === "up" ? "#7D6BB5" : "#8C8378", whiteSpace: "nowrap", minHeight: 20 }}>
                    {k.delta ? `${k.dir === "up" ? "↑ " : k.dir === "down" ? "↓ " : ""}${k.delta}` : ""}
                  </p>
                </>
              ) : (
                <>
                  <span className="animate-skeleton-pulse" style={{ alignSelf: "start", width: 110, height: 12, borderRadius: 6, background: "#F1F0F5" }} />
                  <span className="animate-skeleton-pulse" style={{ width: 72, height: 36, borderRadius: 8, background: "#F1F0F5" }} />
                  <span className="animate-skeleton-pulse" style={{ alignSelf: "end", width: 96, height: 12, borderRadius: 6, background: "#F1F0F5" }} />
                </>
              )}
            </div>
          ))}
        </div>

        <WebCapsLabel style={{ margin: rail ? "20px 0 8px" : "24px 0 10px" }}>{t("More insights")}</WebCapsLabel>
        <div data-an="insights" style={{ display: "grid", gridTemplateColumns: kind === "store" ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gridTemplateRows: "auto auto auto minmax(0,1fr) auto", columnGap: 24 }}>
          {insight("rep", Star, c.star, t("Reputation"), loading ? null : (ins?.[0] ?? null), can("reputation") ? () => navigate("/app/business/analytics/reputation") : undefined)}
          {insight("rev", Wallet, c.pDark, t("Revenue"), revCard, can("revenue") ? () => navigate("/app/business/analytics/revenue") : undefined)}
          {kind !== "store" &&
            insight("out", HeartPulse, c.good, t("Client outcomes"), loading ? null : { value: "–", delta: "", sub: t("Attending 80% or more of their bookings"), up: false }, can("outcomes") ? () => navigate("/app/business/analytics/outcomes") : undefined)}
        </div>
      </div>

      <div data-an="live" style={{ minWidth: 0, minHeight: 0 }}>
          <LiveNowCard
            web={{ rail }}
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
            textScale={1}
          />
      </div>

      {raw?.business && (
        <WebListingPopup
          c={dc}
          open={listingOpen}
          onClose={() => setListingOpen(false)}
          active={raw.business.active}
          onToggle={async (v) => {
            const r = await saveListingActive(raw.business!.id, v);
            if (!r.ok) return r.message ?? t("Couldn't change your listing. Try again.");
            setRaw((cur) => (cur?.business ? { ...cur, business: { ...cur.business, active: v } } : cur));
            return null;
          }}
        />
      )}
    </div>
  );
};

/** One More insights card on the shared 5-row subgrid (tile, title, value, spacer, line). */
function InsightCard({ rail, Icon, col, title, data, onOpen }: { rail: boolean; Icon: LucideIcon; col: string; title: string; data: { value: string; delta: string; sub: string; up: boolean } | null; onOpen?: () => void }) {
  const body = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span aria-hidden style={{ width: rail ? 24 : 32, height: rail ? 24 : 32, borderRadius: 10, background: tint(col, 0.14), color: col, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon size={rail ? 16 : 18} strokeWidth={2.2} />
        </span>
        {onOpen && <ChevronRight size={rail ? 14 : 16} aria-hidden style={{ color: "#8C8378", flex: "none" }} />}
      </div>
      <span style={{ marginTop: rail ? 6 : 8, fontSize: rail ? 15 : 17, lineHeight: rail ? "20px" : "24px", fontWeight: 700, whiteSpace: "nowrap", color: "#241F1B", textAlign: "start" }}>{title}</span>
      {data ? (
        <>
          <div style={{ marginTop: rail ? 6 : 10, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span data-insight-value style={{ fontSize: rail ? 24 : 28, lineHeight: rail ? "32px" : "36px", fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: data.value === "–" ? "#A79E93" : "#241F1B", whiteSpace: "nowrap" }}>{data.value}</span>
            {data.delta && (
              <span style={{ borderRadius: 999, padding: "2px 8px", background: data.up ? "rgba(63,145,101,0.14)" : "#F5F5F6", fontSize: 12, lineHeight: "16px", fontWeight: 700, color: data.up ? "#3F9165" : "#8C8378", whiteSpace: "nowrap" }}>{data.delta}</span>
            )}
          </div>
          <span />
          <p style={{ margin: `${rail ? 6 : 10}px 0 0`, alignSelf: "start", fontSize: 13, lineHeight: "20px", color: "#8C8378", textAlign: "start", textWrap: "pretty" } as React.CSSProperties}>{data.sub}</p>
        </>
      ) : (
        <>
          <span className="animate-skeleton-pulse" style={{ marginTop: 10, width: 72, height: 30, borderRadius: 8, background: "#F1F0F5" }} />
          <span />
          <span className="animate-skeleton-pulse" style={{ marginTop: 10, width: "80%", height: 12, borderRadius: 6, background: "#F1F0F5" }} />
        </>
      )}
    </>
  );
  const style: React.CSSProperties = {
    gridRow: "span 5",
    minWidth: 0,
    boxSizing: "border-box",
    background: "#FFFFFF",
    borderRadius: 22,
    border: "1px solid rgba(36,31,27,0.11)",
    boxShadow: "0 6px 18px -12px rgba(95,80,147,0.35)",
    padding: rail ? "12px 14px" : 18,
    display: "grid",
    gridTemplateRows: "subgrid",
    textAlign: "start",
  };
  return onOpen ? (
    <button type="button" data-an="insight" onClick={onOpen} className="hover:!bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ ...style, cursor: "pointer", font: "inherit" }}>
      {body}
    </button>
  ) : (
    <div data-an="insight" style={style}>
      {body}
    </div>
  );
}
