import { useState } from "react";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { BottomSheet } from "../../../ui/BottomSheet";
import { Button } from "../../../ui/Button";
import { usePremium } from "../../../../services/premium/hooks";
import { askLocked, useG3Available } from "../../../premium/g3/useG3";
import { PremiumLabel } from "../../../premium/PremiumAskHost";
import { compareLabReports } from "../../../../services/premium/g3Calls";
import { comparePairReady, compareRowsView, statusWord, type CompareRowView, type MarkerStatus } from "../../../../services/premium/g3";
import type { LabPanel } from "../../../../services/labs/results";
import { formatShortDate } from "../../../../utils/date";
import { t, tx } from "../../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · comparing two lab reports (compare_my_lab_reports(a, b), the
// member's own reports only), on Health records › Labs. Pick two; per marker:
// both values, the change, and the change in % only when the Database gives
// it (the units match), with each report's status. ATX08: "Choose two of
// your own reports." Premium only (decision G5): a free member sees the
// label and the prompt. Nothing while the switch is off, or with fewer than
// two reports.
//
// note: health wording: the status words (below range / in range / above
// range) are ours, for Karim's review.

const day = (ymd: string) => formatShortDate(new Date(`${ymd}T12:00:00`), { day: "numeric", month: "short", year: "numeric" });
const panelLabel = (p: LabPanel) => `${p.name ?? t("Lab report")} · ${day(p.date)}`;

export function CompareReports({ panels, className = "" }: { panels: LabPanel[]; className?: string }) {
  const on = useG3Available();
  const { premium } = usePremium();
  const [open, setOpen] = useState(false);
  if (!on || panels.length < 2) return null;
  const locked = !premium?.premium;
  return (
    <>
      <button
        type="button"
        data-g3="report-comparison"
        onClick={() => (locked ? askLocked("report_comparison") : setOpen(true))}
        className={`tap w-full flex items-center gap-3 rounded-2xl bg-cream-card px-4 py-3 text-start shadow-soft ${className}`}
      >
        <ArrowLeftRight size={17} aria-hidden className="shrink-0 text-primary-deep-text" />
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-bold text-charcoal">{t("Compare two reports")}</span>
          <span className="block text-[11.5px] text-charcoal-faint">{t("Side by side, marker by marker")}</span>
        </span>
        {locked ? <PremiumLabel className="shrink-0" /> : <ChevronRight size={16} aria-hidden className="shrink-0 text-charcoal-faint" />}
      </button>
      {open && <CompareSheet panels={panels} onClose={() => setOpen(false)} />}
    </>
  );
}

function CompareSheet({ panels, onClose }: { panels: LabPanel[]; onClose: () => void }) {
  // Newest first; the older one is "A", the newer "B", so the change reads forward in time.
  const sorted = [...panels].sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
  const [a, setA] = useState<string | null>(sorted[1]?.id ?? null);
  const [b, setB] = useState<string | null>(sorted[0]?.id ?? null);
  const [rows, setRows] = useState<CompareRowView[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const compare = async () => {
    if (!comparePairReady(a, b)) return setMessage(t("Choose two different reports."));
    setBusy(true);
    setMessage(null);
    const r = await compareLabReports(a!, b!);
    setBusy(false);
    if (r.kind === "ready") return setRows(compareRowsView(r.value));
    if (r.kind === "premium") {
      onClose();
      askLocked("report_comparison");
      return;
    }
    if (r.kind === "error" || r.kind === "refused") setMessage(r.message);
  };

  const select = (label: string, value: string | null, set: (v: string) => void) => (
    <label className="block flex-1 min-w-0">
      <span className="block text-[11px] font-bold text-charcoal-faint mb-1">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => {
          set(e.target.value);
          setRows(null);
        }}
        className="w-full h-11 rounded-xl bg-cream-soft border border-charcoal/10 px-2.5 text-[12.5px] font-semibold text-charcoal"
      >
        {sorted.map((p) => (
          <option key={p.id} value={p.id}>
            {panelLabel(p)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <BottomSheet open onClose={onClose} title={t("Compare two reports")}>
      <div className="pb-4">
        <div className="flex gap-2">
          {select(t("Earlier report"), a, setA)}
          {select(t("Later report"), b, setB)}
        </div>
        <Button variant="primary" size="lg" fullWidth className="mt-3" disabled={busy || !comparePairReady(a, b)} onClick={() => void compare()}>
          {t("Compare")}
        </Button>
        {message && (
          <p role="alert" className="mt-2 text-[12px] font-semibold text-status-high">
            {message}
          </p>
        )}
        {rows && rows.length === 0 && <p className="mt-4 text-[12.5px] text-charcoal-faint">{t("These reports have no markers to compare.")}</p>}
        {rows && rows.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-charcoal-faint">
                  <th className="text-start font-bold py-1.5 pe-2">{t("Marker")}</th>
                  <th className="text-end font-bold py-1.5 px-2">{tx("Earlier", "lab report column")}</th>
                  <th className="text-end font-bold py-1.5 px-2">{tx("Later", "lab report column")}</th>
                  <th className="text-end font-bold py-1.5 ps-2">{t("Change")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-charcoal/10 align-top text-charcoal">
                    <td className="py-1.5 pe-2">
                      {/* The marker's name as the report or the member wrote it. */}
                      <span className="block font-semibold [overflow-wrap:anywhere]">{r.name}</span>
                      {r.unit && <span className="block text-[10.5px] text-charcoal-faint">{r.unit}</span>}
                    </td>
                    <td className="py-1.5 px-2 text-end tabular-nums">
                      {r.a}
                      <Status s={r.statusA} />
                    </td>
                    <td className="py-1.5 px-2 text-end tabular-nums">
                      {r.b}
                      <Status s={r.statusB} />
                    </td>
                    <td className="py-1.5 ps-2 text-end tabular-nums">
                      <span dir="ltr">{r.change ?? "–"}</span>
                      {r.changePct && (
                        <span className="block text-[10.5px] text-charcoal-faint" dir="ltr">
                          {r.changePct}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10.5px] leading-[15px] text-charcoal-faint">{t("A change is shown only when both reports use the same unit.")}</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function Status({ s }: { s: MarkerStatus }) {
  const w = statusWord(s);
  if (!w) return null;
  return <span className={`block text-[10.5px] ${s === "normal" ? "text-status-good" : "text-status-high"}`}>{w}</span>;
}
