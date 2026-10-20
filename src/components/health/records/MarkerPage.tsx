import React, { useCallback, useMemo, useRef, useState } from "react";
import { Microscope, Pencil, Plus, Share2, Trash2, UserRoundCheck } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useBackCloses } from "../../../hooks/useBackCloses";
import { usePregnancyFlags } from "../../pregnancy/usePregnancyFlags";
import { useCheckFlags } from "../../health-checks/useCheckFlags";
import { CheckFlagNote } from "../../health-checks/CheckFlag";
import { FlagNote } from "../../ui/FlagNote";
import { HealthDisclaimer } from "../../ui/HealthDisclaimer";
import { PinnedCta } from "../../ui/PinnedCta";
import { SwipeActions } from "../../ui/SwipeActions";
import { BiomarkerLineChart, ChartTooltip, chartPointX } from "../BiomarkerLineChart";
import { RangeBar, reportLabel } from "../BiomarkerDetailSheet";
import { deleteLabResults, type LabResult } from "../../../services/labs/results";
import { statusFor } from "../../../services/labs";
import type { CatalogueMarker } from "../../../services/labs/catalogueLogic";
import type { BloodMarker } from "../../../types";
import { textPx, linePx } from "../../../theme/textSize";
import { RecordsHeader } from "./RecordsHeader";
import { ResultFormSheet } from "./ResultFormSheet";
import {
  useHealthMode,
  hairline,
  statusColor,
  StatusWord,
  fmtDate,
  rangeText,
  ListCard,
  RowTile,
  rowRule,
  SectionCaps,
  ConfirmPopup,
  PINNED_FILL,
  INK,
  INK_SOFT,
  INK_FAINT,
} from "./kit";

// HE1.9.1 · a marker's full page (from HE1.9.3 "View full history"): hero in
// the primary tint (value 46 in its status colour, Below range, latest date
// and report, the range bar 0 to 120% of the upper limit, reference range,
// the reviewed remark), the chart card (6M · 1Y · All, gridlines, labelled
// band, tap a point for the tooltip), the stats row (Average · Highest ·
// Change vs last), History with swipe Edit / Delete, pinned "+ Add result",
// and ⋮ Share · Delete marker (OURS-biomarkers-menu).
//
// KEPT (KEEP-SAFETY, K1-K3): pregnancy / health-check flag note under the
// hero; the catalogue remark verbatim; threshold markers show no range bar,
// no band and no status word, only the value and the remark.

type Span = "6M" | "1Y" | "All";

/** A box's content width as it lays out (ResizeObserver), for the drawings sized in px. */
function useBoxWidth(): [(el: HTMLElement | null) => void, number | null] {
  const [width, setWidth] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    const read = () => setWidth(el.clientWidth);
    read();
    if (typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver(read);
    observer.current.observe(el);
  }, []);
  return [ref, width];
}
const SPAN_DAYS: Record<Span, number | null> = { "6M": 183, "1Y": 365, All: null };

export const MarkerPage: React.FC<{
  marker: BloodMarker;
  results: LabResult[];
  allResults: LabResult[];
  catalogue: CatalogueMarker[] | null;
  isThreshold: boolean;
  remark: string | null;
  onBack: () => void;
  onShare: () => void;
  onToast: (message: string) => void;
  /** Release 3 CU18: "Share with a professional" in the ⋮ menu (result_shares). Omitted: the menu is as before. */
  onShareWithProfessional?: () => void;
}> = ({ marker, results, allResults, catalogue, isThreshold, remark, onBack, onShare, onToast, onShareWithProfessional }) => {
  const { dark, hc } = useHealthMode();
  const { today, reloadHealthRecords } = useApp();
  const pregnancyFlags = usePregnancyFlags();
  const checkFlags = useCheckFlags();
  useBackCloses(true, onBack);
  const [span, setSpan] = useState<Span>("All");
  const [selected, setSelected] = useState<number | null>(null);
  const [form, setForm] = useState<{ result: LabResult | null } | null>(null);
  const [deleting, setDeleting] = useState<LabResult | "marker" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // W9: the drawings keep their HE1.9.1 widths (chart 330, range bar 326) and
  // narrow only when the card is narrower (360px), so nothing leaves the screen.
  const [chartBox, chartBoxWidth] = useBoxWidth();
  const [barBox, barBoxWidth] = useBoxWidth();

  const latest = results[results.length - 1];
  const status = isThreshold ? null : latest?.status ?? null;
  const pFlag = pregnancyFlags.lab(marker);
  const flag = pFlag ? null : checkFlags.lab(marker);
  const entry = catalogue?.find((c) => c.key === marker.markerKey) ?? null;

  const shown = useMemo(() => {
    const days = SPAN_DAYS[span];
    if (days === null) return results;
    const from = new Date(`${today}T00:00:00Z`).getTime() - days * 86400000;
    return results.filter((r) => new Date(`${r.date}T00:00:00Z`).getTime() >= from);
  }, [results, span, today]);
  const sameUnit = shown.filter((r) => r.unit === latest?.unit);
  const avg = sameUnit.length ? Math.round((sameUnit.reduce((s, r) => s + r.value, 0) / sameUnit.length) * 100) / 100 : null;
  const highest = sameUnit.length ? sameUnit.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const prev = results.length > 1 ? results[results.length - 2] : null;
  const change = prev && latest && prev.unit === latest.unit ? Math.round((latest.value - prev.value) * 100) / 100 : null;
  const statOf = (v: number) => (isThreshold || !latest ? null : statusFor(v, latest.rangeLow, latest.rangeHigh));

  if (!latest) return null;
  const hasRange = !isThreshold && (latest.rangeLow !== null || latest.rangeHigh !== null);
  const firstYear = results[0]?.date.slice(0, 4);
  const chartW = Math.min(330, chartBoxWidth ?? 330);
  const barW = Math.min(326, barBoxWidth ?? 326);

  const doDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    const r = await deleteLabResults(deleting === "marker" ? results : [deleting], allResults);
    if (r.ok) await reloadHealthRecords();
    setBusy(false);
    if (!r.ok) return setError("Couldn't delete. Try again.");
    const wasMarker = deleting === "marker";
    setDeleting(null);
    onToast(wasMarker ? "Marker deleted." : "Result deleted.");
    if (wasMarker || results.length === 1) onBack();
  };

  const spanBtn = (s: Span) => {
    const on = span === s;
    return (
      <button
        key={s}
        type="button"
        role="tab"
        aria-selected={on}
        onClick={() => {
          setSpan(s);
          setSelected(null);
        }}
        className="tap"
        style={{
          width: 44.7,
          height: 28,
          borderRadius: 9,
          background: on ? "rgb(var(--c-seg-active))" : dark ? "rgb(var(--th-303141))" : "rgb(var(--th-f5f4fe))",
          color: on ? "rgb(var(--c-on-primary-fill))" : INK_SOFT,
          fontSize: textPx(12.5),
          lineHeight: linePx(18.8),
          fontWeight: 700,
        }}
      >
        {s}
      </button>
    );
  };

  const stat = (value: React.ReactNode, label: string, color: string, first?: boolean) => (
    <div className="flex-1 text-center" style={{ padding: "2px 4px", borderLeft: first ? undefined : `0.5px solid ${hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.08)" : "#E5E7EB"}` }}>
      <p style={{ fontSize: textPx(16), lineHeight: linePx(24), fontWeight: 700, letterSpacing: -0.3, fontVariantNumeric: "tabular-nums", color }}>{value}</p>
      <p style={{ marginTop: 1, fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 600, color: INK_FAINT }}>{label}</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: 176 }}>
      <RecordsHeader
        title={marker.name}
        onBack={onBack}
        menuWidth={onShareWithProfessional ? 220 : undefined}
        menu={[
          { key: "share", label: "Share", icon: <Share2 size={15} />, onSelect: onShare },
          ...(onShareWithProfessional
            ? [{ key: "share-pro", label: "Share with a professional", icon: <UserRoundCheck size={15} />, onSelect: onShareWithProfessional }]
            : []),
          { key: "delete", label: "Delete marker", icon: <Trash2 size={15} />, destructive: true, onSelect: () => setDeleting("marker") },
        ]}
      />
      {/* Hero */}
      <section style={{ borderRadius: 20, padding: "18px 16px 16px", background: dark ? "rgb(var(--c-primary) / 0.14)" : "rgb(var(--th-aea1dc) / 0.14)" }}>
        <div className="flex items-start justify-between" style={{ gap: 6 }}>
          <p className="flex items-baseline" style={{ gap: 6 }}>
            <span style={{ fontSize: textPx(46), lineHeight: linePx(46), fontWeight: 700, letterSpacing: -2.1, fontVariantNumeric: "tabular-nums", color: isThreshold ? INK : statusColor(status, dark) }}>
              {latest.value}
            </span>
            <span style={{ fontSize: textPx(15), lineHeight: linePx(22.5), fontWeight: 600, color: INK_SOFT }}>{latest.unit}</span>
          </p>
          {status && (
            <span style={{ marginTop: 17 }}>
              <StatusWord status={status} size={12.5} line={18.8} icon={14} long />
            </span>
          )}
        </div>
        <p style={{ marginTop: 4, fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 600, color: INK_FAINT }}>{`Latest · ${fmtDate(latest.date)} · ${reportLabel(latest)}`}</p>
        {hasRange && (
          <div ref={barBox} style={{ marginTop: 18 }}>
            <RangeBar value={latest.value} low={latest.rangeLow} high={latest.rangeHigh} status={status} width={barW} height={6} dot={14} border={2.2} labels="inrange" trackFill={dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"} />
          </div>
        )}
        {hasRange && (
          <p style={{ marginTop: 12, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: INK }}>{`Reference range ${rangeText(latest.rangeLow, latest.rangeHigh)} ${latest.unit}`}</p>
        )}
        {remark && <p style={{ marginTop: hasRange ? 3 : 12, fontSize: textPx(11), lineHeight: linePx(16), color: INK_SOFT }}>{remark}</p>}
      </section>
      {flag && <CheckFlagNote flag={flag} className="mt-3" />}
      {pFlag && (
        <FlagNote tone={pFlag.level} label={pFlag.label} className="mt-3">
          <p className="mt-0.5 text-[11.5px] leading-[1.45] text-charcoal-soft">{pFlag.text}</p>
        </FlagNote>
      )}

      {/* Chart card */}
      <ListCard style={{ marginTop: 12, padding: 14, overflow: "visible" }}>
        <div className="flex items-center justify-between">
          <p style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: INK }}>All results</p>
          <div role="tablist" aria-label="Period" className="flex" style={{ width: 150, height: 36, padding: 4, gap: 4, borderRadius: 12, background: dark ? "rgb(var(--th-303141))" : "rgb(var(--th-f3f3fd))" }}>
            {(["6M", "1Y", "All"] as Span[]).map(spanBtn)}
          </div>
        </div>
        {shown.length === 0 ? (
          <p style={{ padding: "40px 0", textAlign: "center", fontSize: textPx(12), lineHeight: linePx(18), color: INK_FAINT }}>
            {span === "6M" ? "No results in the last 6 months." : "No results in the last year."}
          </p>
        ) : (
          <div ref={chartBox} className="relative" style={{ marginTop: 14 }}>
            <BiomarkerLineChart
              points={shown.map((r) => ({ date: r.date, value: r.value }))}
              low={isThreshold ? null : latest.rangeLow}
              high={isThreshold ? null : latest.rangeHigh}
              width={chartW}
              height={196}
              variant="full"
              selected={selected}
              onSelect={setSelected}
              label={`${marker.name}, ${shown.length} results`}
              noIconScale
            />
            {selected !== null && shown[selected] && (
              <ChartTooltip
                value={`${shown[selected].value} ${shown[selected].unit}`}
                date={fmtDate(shown[selected].date)}
                report={reportLabel(shown[selected])}
                left={Math.max(0, Math.min(chartW - 124, chartPointX(shown.map((r) => ({ date: r.date, value: r.value })), selected, chartW, true) - 62))}
                top={0}
                dark={dark}
                hairline={hairline(dark, hc)}
              />
            )}
          </div>
        )}
        <div className="flex items-center" style={{ marginTop: 6, gap: "6px 14px" }}>
          <span className="flex items-center" style={{ gap: 6, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: INK_SOFT }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 9999, border: `1.6px solid ${dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))"}` }} />
            Result
          </span>
          {!isThreshold && (
            <span className="flex items-center" style={{ gap: 6, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: INK_SOFT }}>
              <span aria-hidden style={{ width: 14, height: 10, borderRadius: 2, background: "rgb(var(--c-teal) / 0.22)" }} />
              Reference range
            </span>
          )}
        </div>
        <p style={{ marginTop: 6, fontSize: textPx(10.5), lineHeight: linePx(15.8), color: INK_FAINT }}>
          {`${latest.unit} · tap a point for details · ${results.length} result${results.length === 1 ? "" : "s"} since ${firstYear}`}
        </p>
      </ListCard>

      {/* Stats */}
      <div className="flex" style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${hairline(dark, hc)}` }}>
        {stat(avg ?? "–", "Average", statusColor(avg === null ? null : statOf(avg), dark), true)}
        {stat(highest?.value ?? "–", "Highest", statusColor(highest ? statOf(highest.value) : null, dark))}
        {stat(change === null ? "–" : change === 0 ? "0" : `${change < 0 ? "↓" : "↑"} ${Math.abs(change)}`, "Change vs last", INK)}
      </div>

      <SectionCaps>History</SectionCaps>
      <ListCard>
        {[...results].reverse().map((r, i) => (
          <div key={r.id} style={{ borderTop: i ? rowRule(dark, hc) : undefined }}>
            <SwipeActions
              radius={0}
              tileMax={45}
              tileRadius={12}
              edgeInset={8}
              keyboardLabel={`${r.value} ${r.unit}, ${fmtDate(r.date)}`}
              actions={[
                { key: "edit", label: "Edit", icon: <Pencil size={16} />, onClick: () => setForm({ result: r }) },
                { key: "delete", label: "Delete", icon: <Trash2 size={16} />, destructive: true, onClick: () => setDeleting(r) },
              ]}
            >
              <div className="flex items-center" style={{ minHeight: 60, padding: "9px 14px", gap: 11, background: "rgb(var(--c-cream-card))" }}>
                <RowTile icon={Microscope} />
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ fontSize: textPx(13.5), lineHeight: linePx(18), fontWeight: 600, color: INK }}>
                    <span style={{ color: isThreshold ? INK : statusColor(r.status, dark) }}>{r.value}</span> {r.unit}
                  </span>
                  <span className="block truncate" style={{ marginTop: 2, fontSize: textPx(11), lineHeight: linePx(15), color: INK_FAINT }}>{`${fmtDate(r.date)} · ${reportLabel(r)}`}</span>
                </span>
                {!isThreshold && <StatusWord status={r.status} size={11.5} line={17.3} icon={13} />}
              </div>
            </SwipeActions>
          </div>
        ))}
      </ListCard>

      <HealthDisclaimer className="mt-[18px]" />

      <PinnedCta primary={{ label: "Add result", icon: <Plus size={16} />, onClick: () => setForm({ result: null }), style: PINNED_FILL }} />

      <ResultFormSheet
        open={form !== null}
        onClose={() => setForm(null)}
        result={form?.result ?? null}
        allResults={allResults}
        fixed={form && !form.result ? { marker: entry, name: marker.name, unit: latest.unit } : null}
        catalogue={catalogue}
        onSaved={onToast}
      />
      <ConfirmPopup
        open={deleting !== null}
        geometry="ours"
        busy={busy}
        error={error}
        title={deleting === "marker" ? `Delete ${marker.name}?` : "Delete this result?"}
        body={
          deleting === "marker"
            ? `All ${results.length} result${results.length === 1 ? "" : "s"} for ${marker.name} are removed from every report. This can't be undone.`
            : deleting
              ? `${deleting.value} ${deleting.unit} from ${fmtDate(deleting.date)}. This can't be undone.`
              : ""
        }
        confirmLabel="Delete"
        onCancel={() => {
          setDeleting(null);
          setError(null);
        }}
        onConfirm={() => void doDelete()}
      />
    </div>
  );
};
