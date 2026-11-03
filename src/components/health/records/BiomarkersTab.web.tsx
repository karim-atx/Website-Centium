import React from "react";
import { Lock } from "lucide-react";
import type { BloodMarker } from "../../../types";
import { useWebLayout } from "../../web/useWebLayout";
import { StatusWord, fmtDate, rangeText, statusColor } from "./kit";
import { t, tn, tx } from "../../../i18n/core";

// Website viewport v1 · WC-HE.9 Biomarkers (WC-HE Records Web v3, screens
// "biomarkers", "biomarkers-saved"): the table on the left (8 fr; 1 : 1 at the
// rail), the side panel on the right: the lavender box (latest date and
// count, the lab-range note, the sharing line with Change) and the card of the
// marker that most needs a look (the first one out of range, else the first)
// with its value, status, range and View history. Rows, words, flags,
// remarks and the saved highlight are the mobile tab's (BiomarkersTab.tsx).

const COLS = "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)";

export const BiomarkersWeb: React.FC<{
  markers: BloodMarker[];
  rows: BloodMarker[];
  query: string;
  latestDate: string | null;
  sharedLine: string | null;
  onChangeSharing: () => void;
  onOpen: (m: BloodMarker) => void;
  isThreshold: (m: BloodMarker) => boolean;
  remarkFor: (m: BloodMarker) => string | null;
  flagFor: (m: BloodMarker) => React.ReactNode;
  lit: (m: BloodMarker) => boolean;
  confirmation: React.ReactNode;
  professional: boolean;
}> = ({ markers, rows, query, latestDate, sharedLine, onChangeSharing, onOpen, isThreshold, remarkFor, flagFor, lit, confirmation, professional }) => {
  const { rail } = useWebLayout();
  const focus = markers.find((m) => !isThreshold(m) && m.status && m.status !== "normal") ?? markers[0] ?? null;
  const caps: React.CSSProperties = { fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "1.3px", textTransform: "uppercase", color: "#8C8378" };
  return (
    <div className="grid items-start" style={{ gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24 }} data-web-biomarkers>
      <div className="min-w-0 flex flex-col" style={{ gap: 12 }}>
        {confirmation}
        {rows.length === 0 ? (
          <p style={{ margin: 0, padding: "16px 2px", fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("No markers match '{query}'.", { query })}</p>
        ) : (
          <div className="overflow-hidden" style={{ borderRadius: 18, border: "0.5px solid rgba(36,31,27,0.1)" }}>
            <div aria-hidden className="grid items-center" style={{ gridTemplateColumns: COLS, gap: 12, height: 36, padding: "0 18px", background: "#FAF9FD", borderBottom: "0.5px solid #E5E7EB" }}>
              <span style={caps}>{t("Marker")}</span>
              <span style={{ ...caps, textAlign: "end" }}>{tx("Range", "reference range")}</span>
              <span style={{ ...caps, textAlign: "end" }}>{t("Result")}</span>
              <span style={{ ...caps, textAlign: "end" }}>{t("Status")}</span>
            </div>
            <div role="list">
              {rows.map((m, i) => {
                const threshold = isThreshold(m);
                const remark = remarkFor(m);
                const flag = flagFor(m);
                return (
                  <div key={m.id} role="listitem" style={{ borderTop: i ? "0.5px solid rgba(36,31,27,0.08)" : undefined, background: lit(m) ? "#F7F5FD" : "transparent", transition: "background-color 600ms ease" }}>
                    <button
                      type="button"
                      onClick={() => onOpen(m)}
                      className="w-full text-start block hover:bg-[#FAF9FD] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#AEA1DC]"
                      style={{ padding: "0 18px" }}
                      aria-label={
                        !threshold && m.status
                          ? m.status === "normal"
                            ? t("{marker}, {value} {unit}, in range", { marker: m.name, value: m.value, unit: m.unit })
                            : m.status === "low"
                              ? t("{marker}, {value} {unit}, below range", { marker: m.name, value: m.value, unit: m.unit })
                              : t("{marker}, {value} {unit}, above range", { marker: m.name, value: m.value, unit: m.unit })
                          : `${m.name}, ${m.value} ${m.unit}`
                      }
                    >
                      <span className="grid items-center" style={{ gridTemplateColumns: COLS, gap: 12, minHeight: 48 }}>
                        <span className="truncate" title={m.name} style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B" }}>
                          {m.name}
                        </span>
                        <span className="truncate" style={{ textAlign: "end", fontSize: 13, fontWeight: 500, color: "#8C8378" }}>
                          {threshold ? "–" : rangeText(m.rangeLow, m.rangeHigh)}
                        </span>
                        <span className="truncate" style={{ textAlign: "end", fontVariantNumeric: "tabular-nums" }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: threshold ? "#241F1B" : statusColor(m.status, false) }}>{m.value}</span>{" "}
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#8C8378" }}>{m.unit}</span>
                        </span>
                        <span className="flex flex-col items-end" style={{ gap: 4 }}>
                          {!threshold && <StatusWord status={m.status} size={13} line={20} icon={14} />}
                          {flag}
                        </span>
                      </span>
                      {remark && <span className="block" style={{ marginTop: -6, paddingBottom: 10, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{remark}</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <aside className="min-w-0 flex flex-col" style={{ gap: 12 }}>
        <div style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(154,140,214,0.12)" }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#241F1B" }}>{`${t("Latest results from {date}", { date: fmtDate(latestDate) })} · ${tn(markers.length, "{n} marker", "{n} markers")}`}</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
            {professional ? t("Reference ranges come from the lab report and can differ between labs.") : t("Reference ranges come from your lab report and can differ between labs.")}
          </p>
          {sharedLine && (
            <p className="flex items-center flex-wrap" style={{ margin: "6px 0 0", gap: 6, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
              <Lock size={12} aria-hidden />
              <span>{sharedLine}</span>
              <button type="button" onClick={onChangeSharing} className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ fontWeight: 700, color: "#5F5093" }}>
                {t("Change")}
              </button>
            </p>
          )}
        </div>
        {focus && (
          <div className="flex flex-col" style={{ borderRadius: 18, border: "0.5px solid rgba(36,31,27,0.1)", padding: 18, gap: 12 }} data-web-focus-marker>
            <div className="flex items-center justify-between" style={{ gap: 8 }}>
              <span className="truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
                {focus.name}
              </span>
              {!isThreshold(focus) && <StatusWord status={focus.status} size={13} line={20} icon={14} />}
            </div>
            <p className="flex items-baseline" style={{ margin: 0, gap: 6 }}>
              <span style={{ fontSize: 40, lineHeight: "48px", fontWeight: 800, letterSpacing: "-1.2px", color: isThreshold(focus) ? "#241F1B" : statusColor(focus.status, false) }}>{focus.value}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#8C8378" }}>{focus.unit}</span>
            </p>
            <p style={{ margin: "-8px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378" }}>{t("Latest results from {date}", { date: fmtDate(latestDate) })}</p>
            {!isThreshold(focus) && rangeText(focus.rangeLow, focus.rangeHigh) !== "–" && (
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#241F1B" }}>{t("Reference range {range} {unit}", { range: rangeText(focus.rangeLow, focus.rangeHigh), unit: focus.unit })}</p>
            )}
            <button
              type="button"
              onClick={() => onOpen(focus)}
              className="whitespace-nowrap hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ height: 40, borderRadius: 12, border: "1px solid #E0D5FC", background: "#FFFFFF", color: "#5F5093", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
            >
              {t("View history")}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
