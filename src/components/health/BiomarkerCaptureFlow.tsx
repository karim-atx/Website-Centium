import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, Maximize2, Plus, Trash2 } from "lucide-react";
import type { LabPhase } from "../../services/labs/catalogueLogic";
import { deletePrivateFile, uploadPrivateFile } from "../../services/storage";
import { saveLabReport } from "../../services/labs/results";
import { fileMetaOf } from "../../services/storage/fileMeta";
import { useApp } from "../../context/AppContext";
import { useBackCloses } from "../../hooks/useBackCloses";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useOnline } from "../../hooks/useOnline";
import { textPx, linePx } from "../../theme/textSize";
import { CtaButton } from "../ui/PinnedCta";
import { Toast } from "../ui/Toast";
import { ConfirmationMark, CONFIRMATION_MS } from "../ui/ConfirmationMark";
import { CalendarPickerSheet } from "../dashboard/CalendarPickerSheet";
import { FileViewerScreen } from "./FileViewerSheet";
import { MarkerEntryRow, draftFromMarker } from "./MarkerEntryRow";
import { MarkerPickerSheet } from "./records/MarkerPickerSheet";
import { useLabCatalogue } from "./useLabCatalogue";
import { draftRange, draftUsable, emptyMarker, type MarkerDraft } from "./markerDraft";
import {
  useHealthMode,
  hairline,
  fieldFill,
  fmtDate,
  deepInk,
  fieldStyle,
  FieldLabel,
  HelpLine,
  ConfirmPopup,
  REPORT_NAME_DEFAULT,
  PINNED_FILL,
  INK,
  INK_FAINT,
} from "./records/kit";

// HE1.9.2 → HE1.9.2.1 → HE1.9.2.1a → HE1.9.2.2 → HE1.9.2.3: Scan a report.
//
// NOTHING READS THE PHOTO. Every value is typed by the user (the earlier mock
// parser that invented six markers is gone for good, see the git history of
// this file); the report is kept with the results so they can be checked.
//
// WEB MAPPING (HE1.9.2 is NATIVE): there is no live viewfinder. The page's
// "Scan a report" opens the upload choice (Take a photo through the OS camera
// input, Choose a file, Type it in), and a picked file comes straight here.
//
// UPLOAD FIRST, RECORD ON SAVE (HE1.9.2.1 K1). The file is uploaded before the
// results are typed; Save writes the panel pointing at it and the ticked
// results. Cancel, back, Discard or closing removes the uploaded object, so a
// report whose results were never saved does not stay in the bucket. Byte
// progress and abort need an upload path with progress (BACKEND B2,
// PB-HB-20): until then the bar runs without a percentage and Cancel removes
// the object once the request returns.
//
// No navbar for the whole flow (V6-130): a full-screen layer over the shell.

type Stage = "uploading" | "uploaded" | "entry";

export interface ScanSaved {
  count: number;
  name: string;
  /** Group keys of the saved results (for the HE1.9.2.3 highlight). */
  keys: string[];
}

export const BiomarkerCaptureFlow: React.FC<{
  open: boolean;
  onClose: () => void;
  /** A picked report: uploaded first (HE1.9.2.1). None: type the results in. */
  file?: File | null;
  /** HE1.9.2.3: back on the page with the confirmation line. */
  onSaved?: (s: ScanSaved) => void;
}> = ({ open, onClose, file = null, onSaved }) => {
  if (!open) return null;
  return <ScanFlow key={file ? `${file.name}:${file.size}:${file.lastModified}` : "typed"} file={file} onClose={onClose} onSaved={onSaved} />;
};

const ScanFlow: React.FC<{ file: File | null; onClose: () => void; onSaved?: (s: ScanSaved) => void }> = ({ file, onClose, onSaved }) => {
  const { authUserId, user, cycleSettings, cyclePrediction, today, reloadHealthRecords } = useApp();
  const { dark, hc } = useHealthMode();
  const reduced = useReducedMotion();
  const online = useOnline();
  const lab = useLabCatalogue();
  const [stage, setStage] = useState<Stage>(file ? "uploading" : "entry");
  const [path, setPath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hasFile, setHasFile] = useState(!!file);
  const [markers, setMarkers] = useState<MarkerDraft[]>([emptyMarker()]);
  const [date, setDate] = useState(today);
  // B2 blood_panels.name: 1-60 characters, default "Blood panel".
  const [reportName, setReportName] = useState(REPORT_NAME_DEFAULT);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const cancelled = useRef(false);
  const pathRef = useRef<string | null>(null);
  const saved = useRef(false);

  const isPdf = file?.type === "application/pdf";
  // Created and revoked in one effect (a dev StrictMode re-run must not
  // leave a revoked URL behind).
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // The phase today, offered for a woman's LH, FSH or estradiol when the
  // tracker is on (kept: HE1.9.2.2 K3).
  const suggestedPhase: LabPhase | null =
    cycleSettings?.trackerEnabled && cyclePrediction
      ? cyclePrediction.phase === "menstrual" || cyclePrediction.phase === "follicular"
        ? "follicular"
        : cyclePrediction.phase === "ovulatory"
          ? "mid_cycle"
          : cyclePrediction.phase === "luteal"
            ? "luteal"
            : null
      : null;

  // HE1.9.2.1: upload.
  useEffect(() => {
    if (!file || stage !== "uploading" || !authUserId) return;
    let live = true;
    setUploadError(null);
    void uploadPrivateFile({ bucket: "lab-reports", userId: authUserId, file }).then(async (r) => {
      if (!live || cancelled.current) {
        if (r.ok && r.path) await deletePrivateFile("lab-reports", r.path);
        return;
      }
      if (!r.ok || !r.path) {
        setUploadError("Upload didn't finish. Try again");
        return;
      }
      pathRef.current = r.path;
      setPath(r.path);
      setStage("uploaded");
    });
    return () => {
      live = false;
    };
  }, [file, stage, authUserId, attempt]);

  // HE1.9.2.1a: Enter results opens 600 ms after the animation ends.
  useEffect(() => {
    if (stage !== "uploaded") return;
    const id = window.setTimeout(() => setStage("entry"), (reduced ? 900 : CONFIRMATION_MS) + 600);
    return () => window.clearTimeout(id);
  }, [stage, reduced]);

  // Anything uploaded but never saved goes when the flow goes.
  useEffect(
    () => {
      cancelled.current = false;
      return () => {
        cancelled.current = true;
        if (!saved.current && pathRef.current) void deletePrivateFile("lab-reports", pathRef.current);
      };
    },
    []
  );

  const typed = markers.some((m) => m.name.trim() || m.value.trim());
  const leave = () => onClose();
  const back = () => {
    if (stage === "entry" && (typed || hasFile)) setDiscardOpen(true);
    else leave();
  };
  useBackCloses(true, back);

  const setMarker = (i: number, patch: Partial<MarkerDraft>) => setMarkers((prev) => prev.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const removeMarker = (i: number) => setMarkers((prev) => (prev.length === 1 ? [emptyMarker()] : prev.filter((_, j) => j !== i)));
  const ticked = markers.filter((m) => m.ticked);
  const nameOk = reportName.trim().length >= 1 && reportName.trim().length <= 60;
  const ready = ticked.length > 0 && ticked.every(draftUsable) && nameOk;

  const save = async () => {
    if (!ready) {
      setShowErrors(true);
      return;
    }
    if (!authUserId) return;
    if (!online) {
      setToast("You're offline. Try again when you're connected.");
      return;
    }
    setSaving(true);
    // One transaction (B2 save_lab_report): the report and every ticked result.
    const withFile = hasFile && !!path && !!file;
    const result = await saveLabReport({
      name: reportName.trim(),
      date,
      filePath: withFile ? path : null,
      meta: withFile ? await fileMetaOf(file!) : null,
      results: ticked.map((m) => {
        const r = draftRange(m);
        return { name: m.name, value: Number(m.value), unit: m.unit, markerKey: m.markerKey, rangeLow: r.low, rangeHigh: r.high };
      }),
    });
    setSaving(false);
    if (!result.ok) {
      setToast("Couldn't save. Try again.");
      return;
    }
    saved.current = true;
    await reloadHealthRecords();
    onSaved?.({
      count: ticked.length,
      name: reportName.trim(),
      keys: ticked.map((m) => (m.markerKey ? `key:${m.markerKey}` : m.name.trim().toLowerCase())),
    });
    onClose();
  };

  const removeFile = async () => {
    setViewerOpen(false);
    if (pathRef.current) await deletePrivateFile("lab-reports", pathRef.current);
    pathRef.current = null;
    setPath(null);
    setHasFile(false);
  };

  const header = (title: string) => (
    <div style={{ padding: "calc(env(safe-area-inset-top) + 24px) 16px 14px", background: "rgb(var(--c-cream-card))" }} className="sticky top-0 z-10">
      <div className="flex items-center" style={{ gap: 6, height: 30, marginLeft: -8 }}>
        <button
          type="button"
          onClick={stage === "uploading" ? () => leave() : back}
          aria-label="Back"
          className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
          style={{ width: 36, height: 36 }}
        >
          <ChevronLeft size={20} style={{ color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
        </button>
        <h1 style={{ fontSize: textPx(24), lineHeight: linePx(30), fontWeight: 700, letterSpacing: -0.5, color: INK }}>{title}</h1>
      </div>
    </div>
  );

  // The report thumbnail: the real image cover-fit, or the paper placeholder
  // (PDF / no preview): one line @28% and eleven @10%, gap 14.
  const paper = (w: number, h: number, pad: number, lineW: [number, number], lineH: number, gap: number, lines: number) => (
    <div
      className="overflow-hidden shrink-0"
      style={{
        width: w,
        height: h,
        padding: preview && !isPdf ? 0 : pad,
        borderRadius: 10,
        background: "#FBFAF8",
        border: `0.5px solid ${dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.08)"}`,
        boxShadow: dark ? "none" : "0 4px 14px rgba(36,31,27,0.08)",
      }}
    >
      {preview && !isPdf ? (
        <img src={preview} alt="Your lab report" className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col" style={{ gap }}>
          {Array.from({ length: lines }, (_, i) => (
            <span key={i} style={{ width: i ? lineW[1] : lineW[0], height: lineH, borderRadius: 3, background: i ? "rgba(36,31,27,0.10)" : "rgba(36,31,27,0.28)" }} />
          ))}
        </div>
      )}
    </div>
  );

  const bar = (full?: boolean) => (
    <div className="relative overflow-hidden" style={{ width: 286, height: 6, borderRadius: 9999, background: dark ? "#303141" : "#EEECF4" }}>
      <span
        className={full || reduced ? "" : "records-upload-indeterminate"}
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: full ? "100%" : reduced ? "62%" : "40%", borderRadius: 9999, background: "rgb(var(--c-fill-pinned))" }}
      />
    </div>
  );

  const content =
    stage === "uploading" ? (
      <>
        {header("Scan a report")}
        <div className="flex flex-col items-center" style={{ paddingTop: 12 }}>
          {paper(286, 380, 26, [139.7, 209.6], 5, 14, 12)}
          <div style={{ width: 286, marginTop: 26 }}>
            {bar()}
            <div className="flex justify-between items-baseline" style={{ marginTop: 10 }}>
              <p style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 700, color: INK }}>{uploadError ? uploadError : "Uploading your report"}</p>
            </div>
            {!uploadError && (
              <p style={{ marginTop: 4, fontSize: textPx(12), lineHeight: linePx(18), color: INK_FAINT }}>Keep the app open. This takes a few seconds.</p>
            )}
            <div className="flex" style={{ gap: 18, marginTop: 8 }}>
              {uploadError && (
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className="tap min-h-[44px]" style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: deepInk(dark) }}>
                  Retry
                </button>
              )}
              <button type="button" onClick={leave} className="tap min-h-[44px]" style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: deepInk(dark) }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    ) : stage === "uploaded" ? (
      <>
        {header("Scan a report")}
        <div className="flex flex-col items-center" style={{ paddingTop: 12 }}>
          {paper(286, 300, 26, [139.7, 209.6], 5, 14, 12)}
          <div style={{ width: 286, marginTop: 22 }}>
            {bar(true)}
            <div className="flex justify-between" style={{ marginTop: 10 }}>
              <p style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 700, color: INK }}>Upload complete</p>
              <p style={{ fontSize: textPx(12), lineHeight: linePx(21), fontWeight: 600, color: INK_FAINT }}>100%</p>
            </div>
          </div>
          <ConfirmationMark size={96} dark={dark} className="mt-[18px]" />
          <p role="status" style={{ marginTop: 6, fontSize: textPx(16), lineHeight: linePx(24), fontWeight: 800, letterSpacing: -0.3, color: INK }}>
            Report uploaded
          </p>
          <p style={{ marginTop: 3, fontSize: textPx(12), lineHeight: linePx(18), color: INK_FAINT }}>Opening Enter results</p>
        </div>
      </>
    ) : (
      <>
        {header("Enter results")}
        <div style={{ padding: "0 16px 120px" }}>
          {hasFile && (
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              className="tap w-full flex items-center text-left"
              style={{ minHeight: 92, padding: 10, gap: 12, borderRadius: 14, background: fieldFill(dark) }}
            >
              {paper(54, 72, 5, [25.7, 38.6], 3, 4, 6)}
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 600, color: INK }}>
                  {isPdf ? "Report file" : "Report photo"}
                </span>
                <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(17.3), color: INK_FAINT }}>
                  Tap to view full size
                </span>
              </span>
              <Maximize2 size={16} style={{ color: INK_FAINT }} aria-hidden />
            </button>
          )}
          {/* Report name (B2 blood_panels.name), 1-60 characters. */}
          <div style={{ marginTop: 14 }}>
            <FieldLabel htmlFor="report-name">Report name</FieldLabel>
            <input
              id="report-name"
              value={reportName}
              maxLength={60}
              onChange={(e) => setReportName(e.target.value)}
              className="outline-none"
              style={fieldStyle(dark, hc, 600)}
            />
            {!nameOk && <HelpLine error>Give the report a name.</HelpLine>}
          </div>
          <div style={{ marginTop: 14 }}>
            <FieldLabel htmlFor="report-date">Date on the report</FieldLabel>
            <button id="report-date" type="button" onClick={() => setCalendarOpen(true)} className="tap flex items-center text-left" style={{ ...fieldStyle(dark, hc), gap: 8 }}>
              <CalendarDays size={15} style={{ color: INK_FAINT }} aria-hidden />
              {fmtDate(date)}
            </button>
          </div>
          <p style={{ marginTop: 20, fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 700, color: INK }}>Results</p>
          <p style={{ margin: "2px 0 8px", fontSize: textPx(11.5), lineHeight: linePx(17.3), color: INK_FAINT }}>
            Use the range printed on your report. Pre-filled from Centium&apos;s standard list.
          </p>
          <div className="overflow-hidden" style={{ borderRadius: 14, border: `0.5px solid ${hairline(dark, hc)}` }}>
            {markers.map((m, i) => (
              <MarkerEntryRow
                key={i}
                index={i}
                first={i === 0}
                draft={m}
                catalogue={lab.catalogue}
                sex={user.sex}
                suggestedPhase={suggestedPhase}
                showErrors={showErrors}
                onChange={(patch) => setMarker(i, patch)}
                onRemove={() => removeMarker(i)}
                onChooseMarker={() => setPickerFor(i)}
              />
            ))}
          </div>
          <p style={{ marginTop: 8, fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>Untick a result to leave it out. Tap a marker name to change it.</p>
          <button
            type="button"
            onClick={() => setMarkers((prev) => [...prev, emptyMarker()])}
            className="tap flex items-center min-h-[44px]"
            style={{ marginTop: 2, gap: 6, fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: deepInk(dark) }}
          >
            <Plus size={15} aria-hidden /> Add marker
          </button>
        </div>
        <div className="fixed left-0 right-0 mx-auto max-w-[430px] z-10" style={{ bottom: "calc(env(safe-area-inset-bottom) + 24px)", padding: "0 16px" }}>
          <CtaButton
            size="page"
            label={`Save ${ticked.length} result${ticked.length === 1 ? "" : "s"}`}
            onClick={() => void save()}
            loading={saving}
            disabled={ticked.length === 0}
            style={PINNED_FILL}
          />
        </div>
      </>
    );

  return createPortal(
    <div className="fixed inset-0 z-[45] flex justify-center bg-cream" role="dialog" aria-modal="true" aria-label="Scan a report">
      <style>{`@keyframes records-upload-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } } .records-upload-indeterminate { animation: records-upload-slide 1.2s ease-in-out infinite; }`}</style>
      <div className="w-full max-w-[430px] h-full overflow-y-auto overscroll-contain">{content}</div>
      <CalendarPickerSheet variant="partB"
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={date}
        today={today}
        maxDate={today}
        onSelect={(d) => {
          setDate(d);
          setCalendarOpen(false);
        }}
      />
      <MarkerPickerSheet
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        catalogue={lab.catalogue}
        sex={user.sex}
        onPick={(mk) => pickerFor !== null && setMarker(pickerFor, draftFromMarker(mk, user.sex, suggestedPhase))}
        onOther={(name) =>
          pickerFor !== null &&
          setMarker(pickerFor, { markerKey: null, other: true, name, unit: "", low: "", high: "", rangeFrom: null, phase: null, phaseSuggested: false })
        }
      />
      <ConfirmPopup
        open={discardOpen}
        geometry="ours"
        title="Discard this report?"
        body="The photo and the results you typed are not saved."
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          leave();
        }}
      />
      <FileViewerScreen
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        local={preview ? { url: preview, kind: isPdf ? "pdf" : "image" } : null}
        title={isPdf ? "Report file" : "Report photo"}
        subtitle={fmtDate(date)}
        menu={[{ key: "remove", label: "Remove file", icon: <Trash2 size={15} />, destructive: true, onSelect: () => void removeFile() }]}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>,
    document.body
  );
};
