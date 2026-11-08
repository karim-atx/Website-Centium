import React, { useState } from "react";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { PopupMenu } from "../../ui/PopupMenu";
import { HEALTH_DISCLAIMER } from "../../../services/legal/disclaimer";
import { useWebLayout } from "../../web/useWebLayout";
import { HeaderCta, HeaderMenuButton, HealthWebBody, HealthWebHeader } from "../../../pages/health/web/HealthWebKit";
import { usePremium } from "../../../services/premium/hooks";
import { useG3Available } from "../../premium/g3/useG3";
import { trendLocked } from "../../../services/premium/g3";
import type { LabResult } from "../../../services/labs/results";
import type { BloodMarker } from "../../../types";
import { reportLabel } from "../BiomarkerDetailSheet";
import { MarkerChartWeb } from "./MarkerChart.web";
import { TrendGate } from "./premium/TrendGate";
import { StatusWord, fmtDate, rangeText } from "./kit";
import { t, tx } from "../../../i18n/core";

// Website viewport v1 · WC-HE.9.5 Marker history (WC-HE Records Web v3,
// "marker" screens), from 1024px wide, as a page: the header (back, the
// marker's name, Add result as the 40 header button, ⋮ with Share · Share with
// a professional · Delete marker), then the list-detail split (8 fr : 4 fr,
// 1 : 1 at the rail, gap 24): on the left the hero and the History chart card,
// on the right Results. MarkerPage.tsx keeps the data, rules, sheets and
// popups; this file lays them out.
//
// Hero: r22 pad 22 24, gap 24, out of range #FBEDEC (otherwise the mobile
// hero's lavender, #AEA1DC@14%: the reference draws only the high and the
// empty states); the value 40/48 800 ls -1.2 in the status colour, the unit
// 17 600 #8C8378, the status word 15 700 (16 chevron) 6 after; the latest line
// 13/20 600 #8C8378 (m-top 4); the reference range 15/22 600 (m-top 12); the
// stats box 360 wide (260 at the rail), r16 pad 12 4 on #FFFFFF@60%, each
// value 20/26 800 over its label 13/18 600 #8C8378, 0.5px #E5E7EB between.
// Chart card: r18, 0.5px #241F1B@10%, pad 18 20 16, gap 16; "History" 17/24
// 700 and the 6M · 1Y · All tabs (40, pad 4, gap 4, r12 #F3F3FD; each pad 0
// 14 r9 15/24 600, #A79AD5 white when on, #5B5349 off). Results: the caps
// label 13/20 700 ls 1.9 #9A94B3 (m-bottom 10) over a card of rows min 72 pad
// 10 16 gap 12: the date 15/22 600 and the report 13/20 #8C8378, the value
// 17/24 800 and the status word 13 700 in the status colour, ⋮ Edit / Delete.
// The chart's height is not given by the reference (it fills the viewport):
// 400 (320 at the rail) here.

const OUT = "#C2453F";
const GOOD = "#357A4D";

type Span = "6M" | "1Y" | "All";

export interface MarkerWebStat {
  value: React.ReactNode;
  label: string;
  color: string;
}

export const MarkerPageWeb: React.FC<{
  marker: BloodMarker;
  results: LabResult[];
  shown: LabResult[];
  latest: LabResult;
  status: BloodMarker["status"];
  isThreshold: boolean;
  remark: string | null;
  flags: React.ReactNode;
  stats: MarkerWebStat[];
  span: Span;
  spanDays: number | null;
  spans: { key: Span; label: string }[];
  onSpan: (s: Span) => void;
  today: string;
  menu: { key: string; label: string; icon: React.ReactNode; destructive?: boolean; onSelect: () => void }[];
  onAdd: () => void;
  onEdit: (r: LabResult) => void;
  onDelete: (r: LabResult) => void;
  overlays: React.ReactNode;
}> = ({ marker, results, shown, latest, status, isThreshold, remark, flags, stats, span, spanDays, spans, onSpan, today, menu, onAdd, onEdit, onDelete, overlays }) => {
  const { rail } = useWebLayout();
  const { premium } = usePremium();
  const g3 = useG3Available();
  const locked = g3 && trendLocked(premium, results.length);
  const [menuBtn, setMenuBtn] = useState<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ r: LabResult; el: HTMLElement } | null>(null);
  const colour = (s: BloodMarker["status"]) => (isThreshold || s === null ? "#241F1B" : s === "normal" ? GOOD : OUT);
  const out = !isThreshold && (status === "high" || status === "low");
  const hasRange = !isThreshold && (latest.rangeLow !== null || latest.rangeHigh !== null);
  return (
    <div className="flex flex-col bg-white" style={{ minHeight: "100dvh" }} data-web-page="marker">
      <HealthWebHeader
        title={marker.name}
        back
        records
        actions={
          <>
            <HeaderCta label={t("Add result")} icon={<Plus size={18} />} onClick={onAdd} />
            <HeaderMenuButton ref={setMenuBtn} open={menuOpen} onClick={() => setMenuOpen(true)} />
          </>
        }
      />
      <HealthWebBody gap={24}>
        <div className="grid items-start" style={{ gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24 }}>
          <div className="min-w-0 flex flex-col" style={{ gap: 20 }}>
            <section className="flex flex-wrap items-center" style={{ borderRadius: 22, padding: "22px 24px", gap: 24, background: out ? "#FBEDEC" : "rgba(174,161,220,0.14)" }} data-web-marker-hero>
              <div className="min-w-0" style={{ flex: "1 1 240px" }}>
                <p className="flex items-baseline flex-wrap" style={{ margin: 0, columnGap: 8 }}>
                  <span style={{ fontSize: 40, lineHeight: "48px", fontWeight: 800, letterSpacing: "-1.2px", fontVariantNumeric: "tabular-nums", color: colour(status) }}>{latest.value}</span>
                  <span style={{ fontSize: 17, fontWeight: 600, color: "#71685E" }}>{latest.unit}</span>
                  {!isThreshold && status && (
                    <span style={{ marginInlineStart: 6 }}>
                      <StatusWord status={status} size={15} line={22} icon={16} long />
                    </span>
                  )}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#71685E" }}>{`${t("Latest")} · ${fmtDate(latest.date)} · ${reportLabel(latest)}`}</p>
                {hasRange && (
                  <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B" }}>
                    {t("Reference range {range} {unit}", { range: rangeText(latest.rangeLow, latest.rangeHigh), unit: latest.unit })}
                  </p>
                )}
                {remark && <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{remark}</p>}
              </div>
              {!locked && (
                <div className="flex shrink-0" style={{ width: rail ? 260 : 360, maxWidth: "100%", borderRadius: 16, padding: "12px 4px", background: "rgba(255,255,255,0.6)", boxSizing: "border-box" }} data-web-marker-stats>
                  {stats.map((s, i) => (
                    <div key={s.label} className="flex-1 min-w-0 text-center" style={{ padding: "2px 8px", borderInlineStart: i ? "0.5px solid #E5E7EB" : undefined }}>
                      <span className="block" style={{ fontSize: 20, lineHeight: "26px", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: s.color }}>
                        {s.value}
                      </span>
                      <span className="block whitespace-nowrap" style={{ fontSize: 13, lineHeight: "18px", fontWeight: 600, color: "#71685E" }}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
            {flags}
            <TrendGate results={results.length}>
              <section className="flex flex-col" style={{ borderRadius: 18, border: "0.5px solid rgba(36,31,27,0.1)", padding: "18px 20px 16px", gap: 16 }} data-web-marker-chart-card>
                <div className="flex items-center justify-between" style={{ gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{t("History")}</h2>
                  <div role="tablist" aria-label={tx("Period", "time span")} className="flex" style={{ height: 40, padding: 4, gap: 4, borderRadius: 12, background: "#F3F3FD", boxSizing: "border-box" }}>
                    {spans.map((s) => {
                      const on = s.key === span;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          role="tab"
                          aria-selected={on}
                          onClick={() => onSpan(s.key)}
                          className="flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                          style={{ padding: "0 14px", borderRadius: 9, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A79AD5" : "transparent", color: on ? "#FFFFFF" : "#5B5349" }}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <MarkerChartWeb
                  points={shown.map((r) => ({ key: r.id, date: r.date, value: r.value, status: isThreshold ? null : r.status, source: reportLabel(r) }))}
                  low={latest.rangeLow}
                  high={latest.rangeHigh}
                  unit={latest.unit}
                  threshold={isThreshold}
                  spanDays={spanDays}
                  today={today}
                  height={rail ? 320 : 400}
                  label={marker.name}
                  dateLabel={fmtDate}
                  emptyText={span === "6M" ? t("No results in the last 6 months.") : t("No results in the last year.")}
                />
              </section>
            </TrendGate>
          </div>
          <aside className="min-w-0 flex flex-col" data-web-marker-results>
            <h2 className="uppercase" style={{ margin: "0 0 10px", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "1.9px", color: "#9A94B3" }}>
              {t("Results")}
            </h2>
            <div className="overflow-hidden" style={{ borderRadius: 18, border: "0.5px solid rgba(36,31,27,0.1)" }}>
              {[...results].reverse().map((r, i) => (
                <div key={r.id} className="flex items-center" style={{ minHeight: 72, padding: "10px 16px", gap: 12, borderTop: i ? "0.5px solid rgba(36,31,27,0.08)" : undefined }}>
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B" }}>
                      {fmtDate(r.date)}
                    </span>
                    <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                      {reportLabel(r)}
                    </span>
                  </span>
                  <span className="shrink-0 flex flex-col items-end text-end whitespace-nowrap">
                    <span style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: colour(r.status) }}>{`${r.value} ${r.unit}`}</span>
                    {!isThreshold && <StatusWord status={r.status} size={13} line={18} icon={13} />}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => setRowMenu({ r, el: e.currentTarget })}
                    aria-label={t("More options")}
                    aria-haspopup="menu"
                    className="shrink-0 grid place-items-center rounded-full hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                    style={{ width: 32, height: 32, marginInlineEnd: -6 }}
                  >
                    <MoreVertical size={18} style={{ color: "#71685E" }} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
        <p className="text-center" style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
          {t(HEALTH_DISCLAIMER)}
        </p>
      </HealthWebBody>
      <PopupMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={menuBtn}
        options={menu.map((m) => ({ value: m.key, label: m.label, icon: m.icon, destructive: m.destructive }))}
        onSelect={(v) => {
          setMenuOpen(false);
          menu.find((m) => m.key === v)?.onSelect();
        }}
        width={menu.length > 2 ? 232 : 200}
        align="right"
        variant="health"
      />
      <PopupMenu
        open={rowMenu !== null}
        onClose={() => setRowMenu(null)}
        anchor={rowMenu?.el ?? null}
        options={[
          { value: "edit", label: t("Edit"), icon: <Pencil size={16} /> },
          { value: "delete", label: t("Delete"), icon: <Trash2 size={16} />, destructive: true },
        ]}
        onSelect={(v) => {
          const r = rowMenu?.r;
          setRowMenu(null);
          if (!r) return;
          if (v === "edit") onEdit(r);
          else onDelete(r);
        }}
        width={160}
        align="right"
        variant="health"
      />
      {overlays}
    </div>
  );
};
