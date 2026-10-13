import React from "react";
import { ChevronRight } from "lucide-react";
import { usePregnancyFlags } from "../pregnancy/usePregnancyFlags";
import { FlagNote } from "../ui/FlagNote";
import { CentredPopup } from "../ui/CentredPopup";
import { useLabCatalogue } from "./useLabCatalogue";
import { useCheckFlags } from "../health-checks/useCheckFlags";
import { CheckFlagNote } from "../health-checks/CheckFlag";
import { BiomarkerLineChart } from "./BiomarkerLineChart";
import { statusFor } from "../../services/labs";
import type { LabResult } from "../../services/labs/results";
import { textPx, linePx } from "../../theme/textSize";
import type { BloodMarker } from "../../types";
import { useHealthMode, hairline, statusColor, StatusWord, fmtDate, rangeText, deepInk, REPORT_NAME_DEFAULT, INK, INK_SOFT, INK_FAINT } from "./records/kit";

// HE1.9.3 · Biomarker popup (replaces the old bottom sheet, its trend colour
// and its legend "Blue = stable, red = decreasing, green = increasing": V6-11).
// Centred Part B popup (X-01: 350, r24, pad 20, no ×; outside, Esc or a swipe
// down closes): name 17/25.5 800 + status word; value 30/30 800 ls-1.2 in the
// status colour + unit 12/18 700; "Reference range …" 12/18 600; the range
// bar (0 to 120% of the upper limit, band #CDE5D4, dot 14); a small history
// chart (hidden with one result); the last three results; "View full history".
//
// KEPT (KEEP-SAFETY, K1): the threshold markers show no range bar and no
// status, only their reviewed remark; every linked marker's remark sits under
// the range; a pregnancy flag (first) or a health-check flag shows as a note.

/** Where a result's report came from, for the row text. */
export const reportLabel = (r: Pick<LabResult, "filePath" | "reportName" | "panelId">) =>
  r.reportName ?? (r.filePath ? REPORT_NAME_DEFAULT : r.panelId ? REPORT_NAME_DEFAULT : "Typed");

/** HE1.9.3 #46-#51 / HE1.9.1 #10-#15: the range bar. */
export const RangeBar: React.FC<{ value: number; low: number | null; high: number | null; status: BloodMarker["status"]; width: number; height: number; dot: number; border: number; labels: "ends" | "inrange"; trackFill?: string }> = ({
  value,
  low,
  high,
  status,
  width,
  height,
  dot,
  border,
  labels,
  trackFill,
}) => {
  const { dark } = useHealthMode();
  const top = (high ?? (low !== null ? low * 2 : value)) * 1.2 || 1;
  const px = (v: number) => Math.max(0, Math.min(width, (v / top) * width));
  const bandL = px(low ?? 0);
  const bandR = high !== null ? px(high) : width;
  const label: React.CSSProperties = { position: "absolute", fontSize: textPx(9.5), lineHeight: linePx(14.3), fontWeight: 600, color: INK_FAINT, transform: "translateX(-50%)", whiteSpace: "nowrap" };
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: width, height: height + 4 + 14.3 }}>
      <div style={{ position: "relative", height, borderRadius: 9999, background: trackFill ?? (dark ? "#303141" : "#EEECF4") }}>
        <span style={{ position: "absolute", top: 0, bottom: 0, left: bandL, width: Math.max(0, bandR - bandL), borderRadius: 9999, background: dark ? "rgba(53,122,77,0.3)" : "#CDE5D4" }} />
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: px(value),
            width: dot,
            height: dot,
            margin: `${-dot / 2}px 0 0 ${-dot / 2}px`,
            borderRadius: 9999,
            background: statusColor(status, dark),
            border: `${border}px solid ${dark ? "#1C1F28" : "#FFFFFF"}`,
          }}
        />
      </div>
      <div style={{ position: "relative", height: 14.3, marginTop: 4 }}>
        {labels === "ends" && <span style={{ ...label, left: 0, transform: "none" }}>0</span>}
        {low !== null && <span style={{ ...label, left: bandL }}>{low}</span>}
        {labels === "inrange" && (
          <span style={{ ...label, left: (bandL + bandR) / 2, color: dark ? "#7FC79C" : "#357A4D" }}>In range</span>
        )}
        {high !== null && <span style={{ ...label, left: bandR }}>{high}</span>}
      </div>
    </div>
  );
};

/** Results of one marker from the grouped history, when no per-result list is given. */
function fromHistory(marker: BloodMarker): LabResult[] {
  return marker.history.map((h, i) => ({
    id: `${marker.id}:${i}`,
    panelId: null,
    reportName: null,
    date: h.date,
    filePath: null,
    name: marker.name,
    markerKey: marker.markerKey ?? null,
    value: h.value,
    unit: marker.unit,
    rangeLow: marker.rangeLow ?? null,
    rangeHigh: marker.rangeHigh ?? null,
    status: i === marker.history.length - 1 ? marker.status : statusFor(h.value, marker.rangeLow ?? null, marker.rangeHigh ?? null),
  }));
}

export const BiomarkerDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  marker: BloodMarker | null;
  /** Every result of this marker, oldest first (services/labs/results). */
  results?: LabResult[];
  /** HE1.9.3 S1: "View full history" → HE1.9.1. */
  onViewHistory?: () => void;
}> = ({ open, onClose, marker, results, onViewHistory }) => {
  const checkFlags = useCheckFlags();
  const pregnancyFlags = usePregnancyFlags();
  const labCatalogue = useLabCatalogue();
  const { dark, hc } = useHealthMode();
  if (!marker) return null;
  const list = results && results.length ? results : fromHistory(marker);
  const latest = list[list.length - 1];
  const threshold = labCatalogue.isThreshold(marker);
  const remark = labCatalogue.remarkFor(marker);
  const pFlag = pregnancyFlags.lab(marker);
  const flag = pFlag ? null : checkFlags.lab(marker);
  const status = threshold ? null : latest.status;
  const hasRange = !threshold && (latest.rangeLow !== null || latest.rangeHigh !== null);
  const last3 = [...list].reverse().slice(0, 3);
  const rule = `0.5px solid ${hairline(dark, hc)}`;

  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      title={marker.name}
      geometry="partB"
      align="start"
      swipeToClose
      titleClass="text-[17px] leading-[25.5px] tracking-[-0.3px] pr-[72px]"
      titleAside={status ? <StatusWord status={status} size={12} line={18} icon={14} /> : undefined}
    >
      <div style={{ marginTop: -10 }}>
        <p className="flex items-baseline" style={{ gap: 5 }}>
          <span style={{ fontSize: textPx(30), lineHeight: linePx(30), fontWeight: 800, letterSpacing: -1.2, color: threshold ? INK : statusColor(status, dark), fontVariantNumeric: "tabular-nums" }}>
            {latest.value}
          </span>
          <span style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: INK_FAINT }}>{latest.unit}</span>
        </p>
        {hasRange && (
          <p style={{ marginTop: 5, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: INK_SOFT }}>
            {`Reference range ${rangeText(latest.rangeLow, latest.rangeHigh)} ${latest.unit}`}
          </p>
        )}
        {remark && <p style={{ marginTop: 5, fontSize: textPx(11), lineHeight: linePx(16), color: INK_SOFT }}>{remark}</p>}
        {flag && <CheckFlagNote flag={flag} className="mt-3" />}
        {pFlag && (
          <FlagNote tone={pFlag.level} label={pFlag.label} className="mt-3">
            <p className="mt-0.5 text-[11.5px] leading-[1.45] text-charcoal-soft">{pFlag.text}</p>
          </FlagNote>
        )}
        {hasRange && (
          <div style={{ marginTop: 14 }}>
            <RangeBar value={latest.value} low={latest.rangeLow} high={latest.rangeHigh} status={status} width={310} height={8} dot={14} border={1.6} labels="ends" />
          </div>
        )}
        {list.length > 1 && (
          <>
            <p style={{ marginTop: 12, fontSize: textPx(11.5), lineHeight: linePx(17.3), fontWeight: 700, color: INK_SOFT }}>History</p>
            <div style={{ marginTop: 4 }}>
              <BiomarkerLineChart
                points={list.map((r) => ({ date: r.date, value: r.value }))}
                low={threshold ? null : latest.rangeLow}
                high={threshold ? null : latest.rangeHigh}
                width={310}
                height={96}
                label={`${marker.name}, ${list.length} results`}
              />
            </div>
          </>
        )}
        <p style={{ marginTop: 12, fontSize: textPx(11.5), lineHeight: linePx(17.3), fontWeight: 700, color: INK_SOFT }}>{list.length > 1 ? "Last 3 results" : "Last result"}</p>
        <div style={{ marginTop: 4 }}>
          {last3.map((r) => (
            <div key={r.id} className="flex items-center" style={{ minHeight: 40, gap: 10, borderTop: rule }}>
              <span className="shrink-0" style={{ width: 72 }}>
                <span style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 800, color: threshold ? INK : statusColor(r.status, dark) }}>{r.value}</span>{" "}
                <span style={{ fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 600, color: INK_FAINT }}>{r.unit}</span>
              </span>
              <span className="flex-1 min-w-0 truncate" style={{ fontSize: textPx(11.5), lineHeight: linePx(17.3), color: INK_SOFT }}>
                {`${fmtDate(r.date)} · ${reportLabel(r)}`}
              </span>
              {!threshold && <StatusWord status={r.status} />}
            </div>
          ))}
        </div>
        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="tap w-full flex items-center justify-center min-h-[44px]"
            style={{ marginTop: 4, gap: 3, fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: deepInk(dark) }}
          >
            View full history <ChevronRight size={15} aria-hidden />
          </button>
        )}
      </div>
    </CentredPopup>
  );
};
