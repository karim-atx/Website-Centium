import { useState } from "react";
import { CalendarDays, Download, Printer, Stethoscope } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Toast } from "../../../components/ui/Toast";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import { useApp } from "../../../context/AppContext";
import { G3Route, LockedRow } from "../../../components/premium/g3/parts";
import { askLocked } from "../../../components/premium/g3/useG3";
import { fetchDoctorSummary } from "../../../services/premium/g3Calls";
import {
  addDays,
  defaultSummaryPeriod,
  notADiagnosisLine,
  summaryFileName,
  summaryPeriodValid,
  summarySections,
  type DoctorSummary,
  type SummarySection,
} from "../../../services/premium/g3";
import type { Block } from "../../../services/premium/summaryLayout";
import { makeSummaryPdf, saveBlob } from "../../../services/premium/summaryPdf";
import { getLanguage, t } from "../../../i18n/core";
import { formatShortDate } from "../../../utils/date";

// undrawn (Round G, no handover)
// Round G3 · /app/health/doctor-summary, the printable doctor summary
// (my_doctor_summary(p_from, p_to): the member's own data only).
//
// - Pick the period: the last 90 days by default, up to two years.
// - A clean printable page (Print prints only the summary) and a PDF made
//   on the device (summaryPdf: canvas pages in a pdf-lib PDF, as the share
//   cards are drawn), so nothing is uploaded.
// - Sections: about you, medications, allergies, conditions, surgeries, blood
//   pressure (readings, average, latest), weight (left out when null, as in
//   recovery-sensitive mode), lab results (each marker's latest), cycle (when
//   tracking).
// - It always says "For your doctor. Not a diagnosis."
//
// note: health wording (decision G11): every label here and in
// services/premium/g3 summarySections is ours, for Karim's review.
// Premium (ATXQ1: the locked row and the prompt).

const day = (ymd: string) => formatShortDate(new Date(`${ymd}T12:00:00`), { day: "numeric", month: "short", year: "numeric" });

// Print only the summary: everything else on the page (and the app's shell) is hidden on paper.
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  [data-print-root], [data-print-root] * { visibility: visible !important; }
  [data-print-root] { position: absolute; inset-inline-start: 0; top: 0; width: 100%; padding: 0 12mm; background: #fff; color: #000; box-shadow: none !important; }
  [data-print-hide] { display: none !important; }
}`;

type Picked = "from" | "to" | null;

export default function DoctorSummaryPage() {
  return (
    <G3Route fallback="/app/health/records">
      <SummaryScreen />
    </G3Route>
  );
}

function SummaryScreen() {
  const { today } = useApp();
  const [period, setPeriod] = useState(() => defaultSummaryPeriod(today));
  const [picking, setPicking] = useState<Picked>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<DoctorSummary | null>(null);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const valid = summaryPeriodValid(period.from, period.to, today);

  const make = async () => {
    if (!valid) return setMessage(t("Choose a period of up to two years."));
    setBusy(true);
    setMessage(null);
    const r = await fetchDoctorSummary(period.from, period.to);
    setBusy(false);
    if (r.kind === "premium") {
      setLocked(true);
      askLocked("doctor_summary");
      return;
    }
    if (r.kind === "ready") return setSummary(r.value);
    if (r.kind === "error" || r.kind === "refused") setMessage(r.message);
  };

  const sections = summary ? summarySections(summary, day) : [];

  const pdf = async () => {
    if (!summary) return;
    setBusy(true);
    try {
      const blob = await makeSummaryPdf(pdfBlocks(summary, sections), notADiagnosisLine(), getLanguage() === "ar");
      saveBlob(blob, summaryFileName(today));
    } catch (e) {
      console.error("[doctor-summary] pdf:", e);
      setToast(t("Couldn't make the PDF. Try again."));
    }
    setBusy(false);
  };

  const quick = (days: number) => setPeriod({ from: addDays(today, -days), to: today });

  return (
    <div className="animate-fade-slide-up pb-10">
      <style>{PRINT_CSS}</style>
      <div data-print-hide>
        <PageHeader title={t("Summary for your doctor")} subtitle={t("Made on your device from what you've logged")} showBack />
        {locked ? (
          <LockedRow feature="doctor_summary" title={t("Summary for your doctor")} meta={t("Part of Centium Premium")} />
        ) : (
          <div className="rounded-2xl bg-cream-card shadow-soft px-4 py-4">
            <p className="text-[12.5px] font-bold text-charcoal">{t("Period")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { n: 90, label: t("Last 90 days") },
                { n: 182, label: t("Last 6 months") },
                { n: 365, label: t("Last year") },
                { n: 730, label: t("Last 2 years") },
              ].map(({ n, label }) => {
                const on = period.to === today && period.from === addDays(today, -n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => quick(n)}
                    aria-pressed={on}
                    className={`tap rounded-full px-3 py-1.5 text-[12px] font-semibold ${on ? "bg-primary-fill text-on-primary-fill" : "bg-cream-soft text-charcoal-soft border border-charcoal/[0.11]"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              {(["from", "to"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setPicking(k)} className="tap flex-1 flex items-center gap-2 rounded-xl bg-cream-soft border border-charcoal/10 px-3 h-11 text-start">
                  <CalendarDays size={15} aria-hidden className="text-charcoal-faint shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[10.5px] text-charcoal-faint">{k === "from" ? t("From") : t("To")}</span>
                    <span className="block text-[12.5px] font-semibold text-charcoal">{day(period[k])}</span>
                  </span>
                </button>
              ))}
            </div>
            <Button variant="primary" size="lg" fullWidth className="mt-4" disabled={busy || !valid} onClick={() => void make()}>
              {summary ? t("Make it again") : t("Make the summary")}
            </Button>
            {message && (
              <p role="alert" className="mt-2 text-[12px] font-semibold text-status-high">
                {message}
              </p>
            )}
          </div>
        )}
        {summary && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="md" fullWidth onClick={() => window.print()} className="flex items-center justify-center gap-2">
              <Printer size={15} aria-hidden /> {t("Print")}
            </Button>
            <Button variant="outline" size="md" fullWidth disabled={busy} onClick={() => void pdf()} className="flex items-center justify-center gap-2">
              <Download size={15} aria-hidden /> {t("Save as PDF")}
            </Button>
          </div>
        )}
      </div>

      {summary && <Printable summary={summary} sections={sections} />}

      <CalendarPickerSheet
        open={picking !== null}
        onClose={() => setPicking(null)}
        selectedDate={picking ? period[picking] : today}
        today={today}
        maxDate={today}
        minDate={picking === "to" ? period.from : addDays(today, -3650)}
        confirm
        title={picking === "to" ? t("To") : t("From")}
        onSelect={(d) => {
          if (picking) setPeriod((p) => ({ ...p, [picking]: d }));
          setPicking(null);
        }}
      />
      <Toast open={!!toast} message={toast ?? ""} tone="error" onExpire={() => setToast(null)} />
    </div>
  );
}

function periodLine(s: DoctorSummary): string | null {
  return s.from && s.to ? t("{from} to {to}", { from: day(s.from), to: day(s.to) }) : null;
}

function Printable({ summary, sections }: { summary: DoctorSummary; sections: SummarySection[] }) {
  return (
    <article data-print-root className="mt-5 rounded-2xl bg-cream-card shadow-soft px-5 py-5">
      <p className="flex items-center gap-2 text-[17px] font-extrabold text-charcoal">
        <Stethoscope size={18} aria-hidden />
        {t("Summary for your doctor")}
      </p>
      {periodLine(summary) && <p className="mt-0.5 text-[12px] text-charcoal-faint">{periodLine(summary)}</p>}
      {/* note: health wording (decision G11) */}
      <p className="mt-3 rounded-xl bg-status-high-bg px-3 py-2 text-[12.5px] font-bold text-status-high">{notADiagnosisLine()}</p>
      {sections.map((s) => (
        <section key={s.key} className="mt-4" aria-label={s.title}>
          <h2 className="text-[13.5px] font-extrabold text-charcoal">{s.title}</h2>
          {s.lines.length ? (
            <ul className="mt-1 space-y-0.5">
              {/* The member's own entries (medicine names, conditions, markers) as they wrote them. */}
              {s.lines.map((l, i) => (
                <li key={i} className="text-[12.5px] leading-[18px] text-charcoal [overflow-wrap:anywhere]">
                  {l}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[12.5px] text-charcoal-faint">{s.empty}</p>
          )}
        </section>
      ))}
    </article>
  );
}

/** The PDF's blocks: the same title, period, line and sections as the page. */
function pdfBlocks(summary: DoctorSummary, sections: SummarySection[]): Block[] {
  const out: Block[] = [{ kind: "title", text: t("Summary for your doctor") }];
  const p = periodLine(summary);
  if (p) out.push({ kind: "subtitle", text: p });
  out.push({ kind: "notice", text: notADiagnosisLine() });
  for (const s of sections) {
    out.push({ kind: "heading", text: s.title });
    if (s.lines.length) for (const l of s.lines) out.push({ kind: "line", text: l });
    else if (s.empty) out.push({ kind: "empty", text: s.empty });
  }
  return out;
}
