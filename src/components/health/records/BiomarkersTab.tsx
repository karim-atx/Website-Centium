import React from "react";
import { CheckCircle2, Lock, Stethoscope } from "lucide-react";
import { usePregnancyFlags } from "../../pregnancy/usePregnancyFlags";
import { useCheckFlags } from "../../health-checks/useCheckFlags";
import { CheckFlagChip } from "../../health-checks/CheckFlag";
import { FlagChip } from "../../ui/FlagNote";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { textPx, linePx } from "../../../theme/textSize";
import type { BloodMarker } from "../../../types";
import { resultKey } from "../../../services/labs/results";
import {
  useHealthMode,
  hairline,
  statusColor,
  StatusWord,
  fmtDate,
  rangeText,
  deepInk,
  ListCard,
  Skel,
  RetryCard,
  EmptyCard,
  rowRule,
  plural,
  INK,
  INK_SOFT,
  INK_FAINT,
} from "./kit";

// HE1.9 · Biomarkers tab: the lavender info box (latest date and marker
// count, the lab-range note, the sharing line → Connected professionals), the
// table card (MARKER · RANGE · RESULT · STATUS, one-line rows 48 tall with the
// status icon + word in the range colours, V6-11) and the HE1.9.2.3
// confirmation line + new-row highlight after a save.
//
// KEPT (KEEP-SAFETY): the nine threshold markers show "–" in Range and no
// status word, their reviewed remark under the row (K1); a pregnancy flag
// (first) or a health-check flag chip under the status (K2). The empty-state
// copy is the repo's, verbatim (K4).

export interface SharingState {
  /** Names of the professionals holding lab_results; null while reading. */
  names: string[] | null;
  /**
   * Release 3 · W7: how many single results the client shares (result_shares).
   * With Lab results shared with nobody, the line must not say "Not shared"
   * while the CU17 "Shared with…" banner above lists single results.
   */
  singleShares?: number;
}

export const BiomarkersTab: React.FC<{
  markers: BloodMarker[];
  query: string;
  latestDate: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  isThreshold: (m: BloodMarker) => boolean;
  remarkFor: (m: BloodMarker) => string | null;
  matches: (m: BloodMarker, q: string) => boolean;
  sharing: SharingState;
  onChangeSharing: () => void;
  onOpen: (m: BloodMarker) => void;
  confirmation: { count: number; name: string } | null;
  highlight: Set<string>;
  /**
   * Release 3 (W3): a professional reading a client's shared results, read
   * only. The signed-in person's own pregnancy and health-check flags never
   * apply, and the empty state speaks about the client. Omitted (the default)
   * keeps the client's own Records exactly as before.
   */
  professional?: { emptyTitle: string; emptyBody: string };
}> = ({ markers, query, latestDate, loading, error, onRetry, isThreshold, remarkFor, matches, sharing, onChangeSharing, onOpen, confirmation, highlight, professional }) => {
  const { dark, hc } = useHealthMode();
  const reduced = useReducedMotion();
  const pregnancyFlags = usePregnancyFlags();
  const checkFlags = useCheckFlags();
  const q = query.trim();
  const rows = q ? markers.filter((m) => matches(m, q)) : markers;

  if (loading && markers.length === 0) {
    return (
      <div>
        <div style={{ margin: "2px 0 12px", borderRadius: 14, padding: "12px 14px", background: dark ? "rgb(var(--c-primary) / 0.12)" : "rgb(var(--th-9a8cd6) / 0.12)" }} className="flex flex-col gap-2">
          <Skel w="70%" h={12} />
          <Skel w="90%" h={10} />
          <Skel w="50%" h={10} />
        </div>
        <ListCard>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center justify-between" style={{ height: 44, padding: "0 14px", borderTop: i ? rowRule(dark, hc, 0.08) : undefined }}>
              <Skel w={96} h={11} />
              <Skel w={70} h={11} />
            </div>
          ))}
        </ListCard>
      </div>
    );
  }
  if (error && markers.length === 0) return <RetryCard message={professional ? "Couldn't load the results." : "Couldn't load your results."} onRetry={onRetry} />;
  if (markers.length === 0) {
    return (
      <div style={{ marginTop: 2 }}>
        {confirmation && <Confirmation {...confirmation} />}
        <EmptyCard icon={Stethoscope} title={professional?.emptyTitle ?? "No lab results yet."} body={professional?.emptyBody ?? "Add a result, or scan a report, and its markers appear here."} />
      </div>
    );
  }

  const sharedLine = (() => {
    if (sharing.names === null) return null;
    if (sharing.names.length === 0) {
      return (sharing.singleShares ?? 0) > 0
        ? "Lab results aren't shared as a whole. Single results you share are listed in the banner above."
        : "Not shared with professionals.";
    }
    if (sharing.names.length === 1) return `Shared with ${sharing.names[0]}.`;
    return `Shared with ${sharing.names.length} professionals.`;
  })();
  const capsStyle: React.CSSProperties = { fontSize: textPx(9), lineHeight: linePx(13.5), fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase", color: INK_FAINT };

  return (
    <div>
      {confirmation && <Confirmation {...confirmation} />}
      {(
        <div style={{ margin: "2px 0 12px", borderRadius: 14, padding: "12px 14px", background: dark ? "rgb(var(--c-primary) / 0.12)" : "rgb(var(--th-9a8cd6) / 0.12)" }}>
          <p style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: INK }}>{`Latest results from ${fmtDate(latestDate)} · ${plural(markers.length, "marker")}`}</p>
          <p style={{ marginTop: 5, fontSize: textPx(11), lineHeight: linePx(16), color: INK_SOFT }}>{professional ? "Reference ranges come from the lab report and can differ between labs." : "Reference ranges come from your lab report and can differ between labs."}</p>
          {sharedLine && (
            <p className="flex items-center flex-wrap" style={{ marginTop: 5, gap: 5, fontSize: textPx(11), lineHeight: linePx(16.5), color: INK_SOFT }}>
              <Lock size={11} aria-hidden />
              <span>{sharedLine}</span>
              <button type="button" onClick={onChangeSharing} className="tap relative before:absolute before:-inset-3 before:content-['']" style={{ fontWeight: 700, color: deepInk(dark) }}>
                Change
              </button>
            </p>
          )}
        </div>
      )}
      {rows.length === 0 ? (
        <p style={{ padding: "16px 2px", fontSize: textPx(12), lineHeight: linePx(18), color: INK_FAINT }}>{`No markers match '${q}'.`}</p>
      ) : (
        <ListCard>
          <div
            className="flex items-center"
            style={{ height: 30, padding: "0 14px", gap: 10, background: dark ? "#262932" : "#FAF9FD", borderBottom: `0.5px solid ${hc ? hairline(dark, hc) : dark ? "rgba(245,243,250,0.08)" : "#E5E7EB"}` }}
            aria-hidden
          >
            <span style={{ ...capsStyle, width: 103 }}>Marker</span>
            <span style={{ ...capsStyle, width: 62, textAlign: "right" }}>Range</span>
            <span style={{ ...capsStyle, width: 66, textAlign: "right" }}>Result</span>
            <span style={{ ...capsStyle, flex: 1, textAlign: "right" }}>Status</span>
          </div>
          <div role="list">
            {rows.map((m, i) => {
              const threshold = isThreshold(m);
              const remark = remarkFor(m);
              const pFlag = professional ? null : pregnancyFlags.lab(m);
              const cFlag = pFlag || professional ? null : checkFlags.lab(m);
              const lit = !reduced && highlight.has(resultKey(m));
              return (
                <div
                  key={m.id}
                  role="listitem"
                  style={{
                    borderTop: i ? rowRule(dark, hc, 0.08) : undefined,
                    background: lit ? (dark ? "#2B2C3A" : "#F7F5FD") : "rgb(var(--c-cream-card))",
                    transition: "background-color 600ms ease",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onOpen(m)}
                    className="tap w-full text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                    style={{ padding: "0 14px" }}
                    aria-label={`${m.name}, ${m.value} ${m.unit}${!threshold && m.status ? `, ${m.status === "normal" ? "in range" : m.status === "low" ? "below range" : "above range"}` : ""}`}
                  >
                    <span className="flex items-center" style={{ minHeight: 48, gap: 10 }}>
                      <span className="line-clamp-2" style={{ width: 103, fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 600, color: INK }}>
                        {m.name}
                      </span>
                      <span className="truncate" style={{ width: 62, textAlign: "right", fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 500, color: INK_FAINT }}>
                        {threshold ? "–" : rangeText(m.rangeLow, m.rangeHigh)}
                      </span>
                      <span className="truncate" style={{ width: 66, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <span style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 800, color: threshold ? INK : statusColor(m.status, dark) }}>{m.value}</span>{" "}
                        <span style={{ fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 600, color: INK_FAINT }}>{m.unit}</span>
                      </span>
                      <span className="flex-1 flex flex-col items-end">
                        {!threshold && <StatusWord status={m.status} />}
                        {pFlag ? (
                          <span className="mt-1">
                            <FlagChip tone={pFlag.level} label={pFlag.label} />
                          </span>
                        ) : cFlag ? (
                          <span className="mt-1">
                            <CheckFlagChip flag={cFlag} />
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {remark && <span className="block" style={{ marginTop: -6, paddingBottom: 10, fontSize: textPx(10.5), lineHeight: linePx(15.8), color: INK_SOFT }}>{remark}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </ListCard>
      )}
    </div>
  );
};

/** HE1.9.2.3 #11-#13: the teal confirmation line. */
const Confirmation: React.FC<{ count: number; name: string }> = ({ count, name }) => {
  const { dark } = useHealthMode();
  return (
    <div role="status" className="flex items-center" style={{ margin: "2px 0 10px", minHeight: 38.7, padding: "10px 12px", gap: 8, borderRadius: 12, background: dark ? "rgb(var(--th-293339))" : "rgb(var(--th-e7f2f0))" }}>
      <CheckCircle2 size={16} style={{ color: dark ? "rgb(var(--th-93c1b9))" : "rgb(var(--th-3c6b65))" }} aria-hidden />
      <span style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 700, color: dark ? "rgb(var(--th-93c1b9))" : "rgb(var(--th-3c6b65))" }}>
        {`${count} result${count === 1 ? "" : "s"} added from ${name}`}
      </span>
    </div>
  );
};
