import React, { useEffect, useMemo, useState } from "react";
import { FileText, Pin, Plus } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { BiomarkerLineChart } from "../../health/BiomarkerLineChart";
import { INK } from "../proInk";
import { fmtDay } from "./clientFormat";
import type { BiomarkerFlag } from "../../../services/pro/clientPage";
import type { BloodMarker } from "../../../types";

/**
 * Release 3 · BiomarkerChart, CL8 "Biomarker detail, reference range and
 * pin" (source gen/r8.js labDetail8), built on the client's v6
 * BiomarkerLineChart (each test on its true date over the lab range band,
 * the lower limit dashed, the latest point filled, the selected one larger)
 * rather than a second chart:
 * - value 24 / 700 with the unit 14 / 400 text.faint; "Range: {lo} to {hi}
 *   {unit}" 12 text.faint; the status word 12 / 700 on the right
 *   (client_biomarker_flags: out of range / borderline / in range, the
 *   lab's range else lab_marker_ranges by sex);
 * - the pin: tap a point; the dark tooltip (r12, pad 6 10) "{date}" 10 /
 *   800 caps and "{value} · {change} since {previous}" 12.5 / 800;
 * - the Reference range legend chip (26 high, r8, 1px 10% border);
 * - change and yearly rate (HANDOVER i: change = latest − previous; yearly
 *   rate = change ÷ years between tests; one test: hidden), and the "more
 *   than 50% between tests" change flag;
 * - its panel (lab_marker_category) when the marker is on the standard list;
 * - footer: Add a note (Notes) and, for Clinical overview, Add to care plan.
 */
export const BiomarkerChart: React.FC<{
  open: boolean;
  onClose: () => void;
  marker: BloodMarker | null;
  flag: BiomarkerFlag | null;
  panel: string | null;
  sharedNote?: string | null;
  firstName: string;
  onNote: () => void;
  onCarePlan?: () => void;
}> = ({ open, onClose, marker, flag, panel, sharedNote, firstName, onNote, onCarePlan }) => {
  const dark = useIsDark();
  const points = useMemo(() => (marker ? marker.history.map((h) => ({ date: h.date, value: h.value })) : []), [marker]);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => setSelected(points.length ? points.length - 1 : null), [points]);
  if (!marker) return <BottomSheet open={false} onClose={onClose} title="">{null}</BottomSheet>;

  const lo = flag?.rangeLow ?? marker.rangeLow ?? null;
  const hi = flag?.rangeHigh ?? marker.rangeHigh ?? null;
  const range = lo != null && hi != null ? `${lo} to ${hi}` : lo != null ? `over ${lo}` : hi != null ? `under ${hi}` : null;
  const statusWord =
    flag?.status === "out_of_range"
      ? hi != null && marker.value > hi
        ? "Above range"
        : "Below range"
      : flag?.status === "borderline"
        ? "Borderline"
        : flag?.status === "normal" || marker.status === "normal"
          ? "In range"
          : marker.status === "high"
            ? "Above range"
            : marker.status === "low"
              ? "Below range"
              : null;
  const statusInk = statusWord === "In range" ? INK.good : statusWord === "Borderline" ? INK.goldInk : statusWord ? INK.hi : INK.chF;
  const sel = selected != null ? points[selected] : null;
  const prev = selected != null && selected > 0 ? points[selected - 1] : null;
  const change = sel && prev ? Math.round((sel.value - prev.value) * 100) / 100 : null;
  const signed = (n: number) => `${n > 0 ? "+" : ""}${n}`;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={marker.name}
      footer={
        <div className="flex w-full" style={{ gap: 8 }}>
          <CtaButton className="flex-1" size="sheet" variant="secondary" icon={<FileText size={15} />} label="Add a note" onClick={onNote} />
          {onCarePlan && <CtaButton className="flex-1" size="sheet" icon={<Plus size={15} />} label="Add to care plan" onClick={onCarePlan} />}
        </div>
      }
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 14, gap: 12 }}>
        <div>
          <p style={{ fontSize: textPx(24), fontWeight: 700, color: INK.ch, lineHeight: 1 }}>
            {marker.value} <span style={{ fontSize: textPx(14), fontWeight: 400, color: INK.chF }}>{marker.unit}</span>
          </p>
          {range && <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 4 }}>{`Range: ${range} ${marker.unit}${flag?.rangeSource === "reference" ? " (reference)" : ""}`}</p>}
        </div>
        {statusWord && <span style={{ fontSize: textPx(12), fontWeight: 700, color: statusInk }}>{statusWord}</span>}
      </div>

      <div className="relative" style={{ paddingTop: sel ? 44 : 0 }}>
        {sel && (
          <div className="absolute" style={{ right: 0, top: 0, borderRadius: 12, background: dark ? "#F5F3FA" : "#241F1B", color: dark ? "#121317" : "#FFFFFF", padding: "6px 10px", whiteSpace: "nowrap" }}>
            <p className="flex items-center" style={{ gap: 4, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7 }}>
              <Pin size={10} strokeWidth={2.4} aria-hidden />
              {fmtDay(sel.date, true)}
            </p>
            <p style={{ fontSize: 12.5, fontWeight: 800 }}>{`${sel.value} ${marker.unit}${change != null && prev ? ` · ${signed(change)} since ${fmtDay(prev.date)}` : ""}`}</p>
          </div>
        )}
        <BiomarkerLineChart
          points={points}
          low={lo}
          high={hi}
          width={328}
          height={170}
          variant="full"
          selected={selected}
          onSelect={setSelected}
          label={`${marker.name}: ${points.length} result${points.length === 1 ? "" : "s"}, latest ${marker.value} ${marker.unit}${range ? `, range ${range}` : ""}.`}
        />
      </div>

      {range && (
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
          <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 5, height: 26, padding: "0 9px", borderRadius: 8, border: `1px solid ${INK.b10}`, fontSize: textPx(10.5), fontWeight: 700, color: INK.chS }}>
            <span aria-hidden style={{ width: 12, height: 8, borderRadius: 2, background: INK.tealPale, borderTop: `1.5px dashed ${INK.tealDark}` }} />
            Reference range
          </span>
        </div>
      )}

      <div style={{ marginTop: 14, borderTop: `1px solid ${INK.b06}`, paddingTop: 12 }} className="flex flex-col">
        {flag?.previousValue != null && flag.previousDate ? (
          <p style={{ fontSize: textPx(12.5), color: INK.ch }}>
            {`Change ${signed(Math.round((flag.latestValue - flag.previousValue) * 100) / 100)} ${marker.unit} since ${fmtDay(flag.previousDate, true)}`}
            {flag.yearlyRate != null && <span style={{ color: INK.chF }}>{` · ${signed(Math.round(flag.yearlyRate * 100) / 100)} a year`}</span>}
          </p>
        ) : (
          <p style={{ fontSize: textPx(12), color: INK.chF }}>One test so far, so no change yet.</p>
        )}
        {flag?.changeFlag && <p style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi, marginTop: 4 }}>Changed by more than half since the previous test.</p>}
        {panel && <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 4 }}>{`Panel: ${panel}`}</p>}
        {sharedNote && <p style={{ fontSize: textPx(12), color: INK.chS, marginTop: 8, lineHeight: 1.5 }}>{`${firstName}'s note: "${sharedNote}"`}</p>}
      </div>
    </BottomSheet>
  );
};
