import { partBSheetTone } from "../log/LogSheetParts";
import React, { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, FileText, Pencil, Trash2 } from "lucide-react";
import { SwipeActions } from "../../ui/SwipeActions";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { CalendarPickerSheet } from "../../dashboard/CalendarPickerSheet";
import { useApp } from "../../../context/AppContext";
import { deletePrivateFile, uploadPrivateFile } from "../../../services/storage";
import { updatePanel, type LabResult } from "../../../services/labs/results";
import { fileMetaOf } from "../../../services/storage/fileMeta";
import { OFFLINE_MESSAGE } from "../../../services/network-error";
import { browserOffline } from "../../../services/health-log/offlineQueue";
import { textPx, linePx } from "../../../theme/textSize";
import type { LabReport } from "../../../types";
import { UploadChoiceSheet } from "./UploadChoiceSheet";
import {
  useHealthMode,
  hairline,
  fieldStyle,
  fieldFill,
  fmtDate,
  fileKind,
  deepInk,
  ListCard,
  RowTile,
  RowText,
  Skel,
  RetryCard,
  EmptyCard,
  rowRule,
  plural,
  FieldLabel,
  HelpLine,
  ConfirmPopup,
  REPORT_NAME_DEFAULT,
  INK,
  INK_FAINT,
} from "./kit";

// HE1.9.a · Labs tab: the uploaded reports as rows (FileText tile, report
// name, "{date} · {n} markers · PDF|Photo", chevron) in one list card; tap
// opens the full-screen viewer (HE1.9.b.1); swipe Edit (OURS-lab-report-edit)
// and Delete (the repo's "Remove lab report?" body verbatim, its error kept
// inside the popup: K1). The name is blood_panels.name (B2, 1-60 in the
// app; an unnamed report reads the default "Blood panel").

export const LabsTab: React.FC<{
  reports: LabReport[];
  results: LabResult[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onView: (r: LabReport) => void;
  onEdit: (r: LabReport) => void;
  onDelete: (r: LabReport) => void;
  /**
   * Release 3 (W3): a professional viewing a client's shared reports. No
   * swipe Edit / Delete, and the empty and error lines speak about the
   * client. Omitted (the default) keeps the client's Labs tab as it was.
   */
  readOnly?: { emptyTitle: string; emptyBody: string };
}> = ({ reports, results, loading, error, onRetry, onView, onEdit, onDelete, readOnly }) => {
  const { dark, hc } = useHealthMode();
  if (loading && reports.length === 0) {
    return (
      <ListCard>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center" style={{ height: 60, padding: "9px 14px", gap: 11, borderTop: i ? rowRule(dark, hc) : undefined }}>
            <Skel w={32} h={32} r={10} />
            <span className="flex-1 flex flex-col" style={{ gap: 6 }}>
              <Skel w="45%" h={11} />
              <Skel w="65%" h={9} />
            </span>
          </div>
        ))}
      </ListCard>
    );
  }
  if (error && reports.length === 0) return <RetryCard message={readOnly ? "Couldn't load the reports." : "Couldn't load your reports."} onRetry={onRetry} />;
  if (reports.length === 0) return <EmptyCard icon={FileText} title={readOnly?.emptyTitle ?? "No lab reports yet."} body={readOnly?.emptyBody ?? "Upload a report and its results appear under Biomarkers."} />;
  return (
    <ListCard>
      {reports.map((r, i) => {
        const n = results.filter((x) => x.panelId === r.id).length;
        const meta = [fmtDate(r.date), plural(n, "marker"), fileKind(r.filePath)].join(" · ");
        const row = (
          <button type="button" onClick={() => onView(r)} className="tap w-full flex items-center text-start" style={{ minHeight: 60, padding: "9px 14px", gap: 11, background: "rgb(var(--c-cream-card))" }}>
            <RowTile icon={FileText} />
            <RowText title={r.name ?? REPORT_NAME_DEFAULT} meta={meta} />
            <ChevronRight size={16} style={{ color: INK_FAINT }} aria-hidden />
          </button>
        );
        if (readOnly) return <div key={r.id} style={{ borderTop: i ? rowRule(dark, hc) : undefined }}>{row}</div>;
        return (
          <div key={r.id} style={{ borderTop: i ? rowRule(dark, hc) : undefined }}>
            <SwipeActions
              radius={0}
              tileMax={45}
              tileRadius={12}
              edgeInset={8}
              keyboardLabel={`${r.name ?? REPORT_NAME_DEFAULT}, ${fmtDate(r.date)}`}
              actions={[
                { key: "edit", label: "Edit", icon: <Pencil size={16} />, onClick: () => onEdit(r) },
                { key: "delete", label: "Delete", icon: <Trash2 size={16} />, destructive: true, onClick: () => onDelete(r) },
              ]}
            >
              {row}
            </SwipeActions>
          </div>
        );
      })}
    </ListCard>
  );
};

/** OURS-lab-report-edit: rename (pending) / change date / replace the file. */
export const LabReportEditSheet: React.FC<{ report: LabReport | null; onClose: () => void; onSaved: (m: string) => void }> = ({ report, onClose, onSaved }) => {
  const { authUserId, today, reloadHealthRecords } = useApp();
  const { dark, hc } = useHealthMode();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!report) return;
    setDate(report.date);
    setName(report.name ?? REPORT_NAME_DEFAULT);
    setFile(null);
    setError(null);
  }, [report]);
  if (!report) return null;

  const save = async () => {
    if (!authUserId) return;
    setSaving(true);
    setError(null);
    let ok = true;
    const trimmed = name.trim();
    if (date !== report.date || trimmed !== (report.name ?? REPORT_NAME_DEFAULT)) ok = (await updatePanel(report.id, { panel_date: date, name: trimmed })).ok;
    if (ok && file) {
      const up = await uploadPrivateFile({ bucket: "lab-reports", userId: authUserId, file });
      ok = up.ok && !!up.path;
      if (ok && up.path) {
        const r = await updatePanel(report.id, { source_image_url: up.path, ...(await fileMetaOf(file)) });
        ok = r.ok;
        if (ok) await deletePrivateFile("lab-reports", report.filePath);
        else await deletePrivateFile("lab-reports", up.path);
      }
    }
    if (ok) await reloadHealthRecords();
    setSaving(false);
    // Round D O12: offline, say it needs a connection.
    if (!ok) return setError(browserOffline() ? OFFLINE_MESSAGE : "Couldn't save. Try again.");
    onSaved("Changes saved.");
    onClose();
  };
  const kind = file ? (file.type === "application/pdf" ? "PDF" : "Photo") : fileKind(report.filePath);

  return (
    <>
      <BottomSheet open onClose={onClose} title="Edit report" chrome="partB" tone={partBSheetTone(dark)} footerBottom={30} footer={<CtaButton label="Save changes" onClick={() => void save()} loading={saving} disabled={name.trim().length < 1 || name.trim().length > 60} />}>
        <FieldLabel htmlFor="report-name-edit">Report name</FieldLabel>
        <input id="report-name-edit" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="outline-none" style={fieldStyle(dark, hc, 600)} />
        {(name.trim().length < 1 || name.trim().length > 60) && <HelpLine error>Give the report a name.</HelpLine>}
        <FieldLabel style={{ marginTop: 16 }}>Date on the report</FieldLabel>
        <button type="button" onClick={() => setCalendarOpen(true)} className="tap flex items-center text-start" style={{ ...fieldStyle(dark, hc), gap: 8 }}>
          <CalendarDays size={15} style={{ color: INK_FAINT }} aria-hidden />
          {fmtDate(date)}
        </button>
        <FieldLabel style={{ marginTop: 16 }}>File</FieldLabel>
        <div className="flex items-center" style={{ minHeight: 57.8, padding: "10px 12px", gap: 12, borderRadius: 12, background: fieldFill(dark), border: `0.5px solid ${hairline(dark, hc, 0.1)}` }}>
          <FileText size={20} style={{ color: deepInk(dark) }} aria-hidden />
          <span className="flex-1 min-w-0 truncate" style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 600, color: INK }}>
            {file ? file.name : kind === "PDF" ? "PDF file" : "Photo"}
          </span>
          <button type="button" onClick={() => setChoiceOpen(true)} className="tap min-h-[44px] shrink-0" style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: deepInk(dark) }}>
            Replace
          </button>
        </div>
        {error && <HelpLine error>{error}</HelpLine>}
      </BottomSheet>
      <CalendarPickerSheet variant="partB" open={calendarOpen} onClose={() => setCalendarOpen(false)} selectedDate={date} today={today} maxDate={today} onSelect={(d) => { setDate(d); setCalendarOpen(false); }} />
      <UploadChoiceSheet open={choiceOpen} onClose={() => setChoiceOpen(false)} title="Replace file" bucket="lab-reports" onFile={(f) => { setFile(f); setChoiceOpen(false); }} />
    </>
  );
};

/** "Remove lab report?" with the repo body, verbatim (OURS-lab-report-edit #6). */
export const RemoveReportPopup: React.FC<{ report: LabReport | null; onClose: () => void; onRemoved: () => void }> = ({ report, onClose, onRemoved }) => {
  const { removeLabReport } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <ConfirmPopup
      open={report !== null}
      geometry="ours"
      title="Remove lab report?"
      body={`The report from ${report ? fmtDate(report.date) : ""} will be deleted, along with the results it recorded. Those readings will no longer appear in your biomarker history. This can't be undone.`}
      confirmLabel={busy ? "Removing…" : "Remove"}
      busy={busy}
      error={error}
      onCancel={() => {
        setError(null);
        onClose();
      }}
      onConfirm={() => {
        if (!report) return;
        setBusy(true);
        setError(null);
        void removeLabReport(report.id).then((r) => {
          setBusy(false);
          if (!r.ok) return setError(browserOffline() ? OFFLINE_MESSAGE : r.message ?? "That lab report couldn't be removed.");
          onRemoved();
          onClose();
        });
      }}
    />
  );
};
