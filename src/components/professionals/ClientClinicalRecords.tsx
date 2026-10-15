import React, { useState } from "react";
import type { ProfessionalClient } from "../../types";
import { formatDisplayDate } from "../../utils/date";
import { FileText, FlaskConical, Stethoscope } from "lucide-react";
import type { PrivateBucket } from "../../services/storage";
import { useApp } from "../../context/AppContext";

/** A file the professional asked to open, with the bucket it lives in. */
export interface ClinicalFileRequest {
  path: string;
  label: string;
  bucket: PrivateBucket;
}

// The client's own clinical records, as a professional sees them: medical
// history, blood work, and imaging.
//
// Release 3 W3: ClientDetailSheet is gone (the client page's Health records
// tab replaced it); HealthMetricsTab is the last reader, and this file goes
// with it when Insights / Practice insights replace that page (W5, W6).
//
// ONE COMPONENT, TWO SURFACES. ClientDetailSheet and HealthMetricsTab both
// showed this, and medical history was already duplicated across the two before
// labs and imaging existed. Adding two more domains that way would have meant
// three blocks maintained twice, drifting independently -- so the markup moved
// here rather than being copied a second time.
//
// THREE CATEGORIES, GATED SEPARATELY AND DELIBERATELY:
//
//   medical_history  medications, surgeries, comorbidities, AND imaging
//   lab_results      blood panels and their markers
//
// A client can grant either without the other. Nothing below reads one flag to
// decide whether to show the other, and nothing is inferred: each section
// renders only if its own grant is present, so a client sharing bloods but not
// their medication list gets exactly that.

/**
 * Q-14 / V6-25 (Database B2, 20261115*: imaging_shares): imaging is shared one
 * file at a time now. On the day it ships, a professional who could open every
 * scan under medical_history sees none until the client shares each one. The
 * database cannot tell them, so this one-time notice does, on the first client
 * record they open with the imaging section (dismissed once per professional on
 * this device). OURS: a primary-pale note in the section's own type.
 */
const IMAGING_NOTICE_KEY = "centium.imagingPerFileNotice";

function useImagingNotice(proId: string | null): [boolean, () => void] {
  const key = proId ? `${IMAGING_NOTICE_KEY}.${proId}` : null;
  const [seen, setSeen] = useState(() => {
    if (!key) return true;
    try {
      return window.localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  const dismiss = () => {
    setSeen(true);
    if (!key) return;
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      /* private mode: shown again next visit */
    }
  };
  return [!seen, dismiss];
}

const statusPill: Record<"low" | "normal" | "high", string> = {
  low: "text-status-low bg-status-low-bg",
  normal: "text-status-good bg-status-good-bg",
  high: "text-status-high bg-status-high-bg",
};

const SectionLabel: React.FC<{ icon: typeof FileText; children: React.ReactNode }> = ({
  icon: Icon,
  children,
}) => (
  <p className="section-label text-charcoal-faint mb-2 flex items-center gap-1.5">
    <Icon size={13} /> {children}
  </p>
);

export const ClientClinicalRecords: React.FC<{
  client: ProfessionalClient;
  /**
   * Called when the professional taps a record that has a file.
   *
   * Optional still: a surface that cannot open files renders no control at
   * all, rather than offering a button that does nothing. The bucket is part
   * of the request because lab reports and imaging live in different ones and
   * only this component knows which section a given file came from.
   */
  onOpenFile?: (file: ClinicalFileRequest) => void;
}> = ({ client, onOpenFile }) => {
  const { authUserId } = useApp();
  const [showImagingNotice, dismissImagingNotice] = useImagingNotice(authUserId);
  const firstName = client.name.split(" ")[0];
  const history = client.medicalHistory;
  const hasHistory =
    !!history &&
    (history.comorbidities.length > 0 ||
      history.surgeries.length > 0 ||
      history.medications.length > 0);

  const labs = client.labs;
  const imaging = client.imaging ?? [];

  return (
    <div className="space-y-4">
      {/* --- medical history ------------------------------------------- */}
      {client.access.medicalHistory && (
        <div>
          <SectionLabel icon={Stethoscope}>Synced from client's Health tab</SectionLabel>
          {hasHistory ? (
            <div className="space-y-2.5">
              {history!.comorbidities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {history!.comorbidities.map((cm) => (
                    <span
                      key={cm}
                      className="text-[11px] font-semibold rounded-full px-2.5 py-1 bg-teal-pale text-charcoal-soft dark:text-teal-deep-text"
                    >
                      {cm}
                    </span>
                  ))}
                </div>
              )}
              {history!.surgeries.map((s) => (
                <div key={s.id} className="rounded-xl px-3 py-2 bg-berry/10 text-berry">
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Surgery</p>
                  <p className="text-sm font-medium">
                    {s.name}{" "}
                    <span className="text-xs font-normal opacity-80">· {formatDisplayDate(s.date)}</span>
                  </p>
                </div>
              ))}
              {history!.medications.map((m) => (
                <div key={m.id} className="rounded-xl px-3 py-2 bg-primary-pale text-primary-dark">
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Medication</p>
                  <p className="text-sm font-medium">
                    {m.name}{" "}
                    <span className="text-xs font-normal opacity-80">
                      · {m.dose} · {m.route}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-charcoal-faint">Nothing recorded in the client's Health tab yet.</p>
          )}
        </div>
      )}

      {/* --- blood work -------------------------------------------------
          Its own grant. Rendered whether or not medical history is shared,
          and never mentioned when it is not. */}
      {client.access.labResults && (
        <div>
          <SectionLabel icon={FlaskConical}>Blood work</SectionLabel>
          {labs ? (
            <div className="space-y-2">
              <p className="text-[11px] text-charcoal-faint">
                {labs.panelCount > 0 && `${labs.panelCount} ${labs.panelCount === 1 ? "panel" : "panels"} · `}
                {(labs.standaloneCount ?? 0) > 0 &&
                  `${labs.standaloneCount} single ${labs.standaloneCount === 1 ? "result" : "results"} · `}
                latest {formatDisplayDate(labs.latestPanelDate)}
              </p>
              {/* The uploaded reports themselves. Only panels carrying a file
                  appear, and only when something can open them. */}
              {labs.reports.length > 0 && onOpenFile && (
                <div className="flex flex-wrap gap-1.5">
                  {labs.reports.map((rep) => (
                    <button
                      key={rep.id}
                      onClick={() =>
                        onOpenFile({
                          path: rep.filePath,
                          label: `Lab report · ${formatDisplayDate(rep.date)}`,
                          bucket: "lab-reports",
                        })
                      }
                      className="tap flex items-center gap-1 text-[11px] font-semibold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1"
                    >
                      <FileText size={11} /> Report · {formatDisplayDate(rep.date)}
                    </button>
                  ))}
                </div>
              )}
              <div className="rounded-xl overflow-hidden divide-y divide-charcoal/[0.05] bg-cream-soft">
                {labs.markers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-charcoal truncate">{m.name}</p>
                      <p className="text-[10.5px] text-charcoal-faint">
                        Range: {m.range} {m.unit}
                        {m.history.length > 1 && ` · ${m.history.length} readings`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-[13px] font-bold text-charcoal tabular-nums">
                        {m.value}{" "}
                        <span className="text-[10px] font-semibold text-charcoal-tertiary">{m.unit}</span>
                      </p>
                      {/* Nothing at all when there is no reference range to
                          judge against — the same rule the client's own view
                          follows. A status chip is a claim. */}
                      {m.status && (
                        <span
                          className={`text-[9.5px] font-bold uppercase rounded-full px-2 py-0.5 ${statusPill[m.status]}`}
                        >
                          {m.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-charcoal-faint">No blood work recorded yet.</p>
          )}
        </div>
      )}

      {/* --- imaging ----------------------------------------------------
          Shares medical_history's grant with medications and surgeries. */}
      {client.access.medicalHistory && (
        <div>
          <SectionLabel icon={FileText}>Imaging & tests</SectionLabel>
          {showImagingNotice && (
            <div role="status" className="rounded-xl px-3 py-2.5 mb-2 bg-primary-pale">
              <p className="text-[12px] font-bold text-primary-dark">Scans are now shared one at a time</p>
              <p className="text-[11.5px] leading-[17px] text-charcoal-soft mt-0.5">
                You see a scan or test file only once your client shares that file with you. Files you could open before
                stay hidden until they share each one again.
              </p>
              <button
                type="button"
                onClick={dismissImagingNotice}
                className="tap min-h-11 -mb-2 text-[12px] font-bold text-primary-dark"
              >
                Got it
              </button>
            </div>
          )}
          {imaging.length > 0 ? (
            <div className="space-y-2">
              {imaging.map((r) => (
                <div key={r.id} className="rounded-xl px-3 py-2 bg-cream-soft flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal">
                      {r.type}{" "}
                      <span className="text-xs font-normal text-charcoal-faint">
                        · {formatDisplayDate(r.date)}
                      </span>
                    </p>
                    {r.note && <p className="text-[11px] text-charcoal-soft mt-0.5">{r.note}</p>}
                  </div>
                  {/* Only offered when there is a file AND something able to
                      open it. Showing "View" for a record typed by hand would
                      promise a document that does not exist. */}
                  {r.filePath && onOpenFile && (
                    <button
                      onClick={() =>
                        onOpenFile({
                          path: r.filePath!,
                          label: r.type,
                          bucket: "medical-imaging",
                        })
                      }
                      className="tap text-[11px] font-semibold text-primary-dark shrink-0"
                    >
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // B2: an empty list means nothing has been SHARED with this
            // professional; whether the client has scans is not theirs to know.
            <p className="text-xs text-charcoal-faint">{firstName} hasn't shared any scans or test files with you yet.</p>
          )}
        </div>
      )}

      {/* Neither category shared: say so once rather than twice, and say what
          it means. Absence of a grant is the client's decision, not a gap. */}
      {!client.access.medicalHistory && !client.access.labResults && (
        <p className="text-xs text-charcoal-faint">
          {firstName} isn't sharing clinical records.
        </p>
      )}
    </div>
  );
};
