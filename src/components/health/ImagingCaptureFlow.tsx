import { partBSheetTone } from "./log/LogSheetParts";
import React, { useEffect, useState } from "react";
import { CalendarDays, FileText } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { Toast } from "../ui/Toast";
import { CalendarPickerSheet } from "../dashboard/CalendarPickerSheet";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { updateImagingRecordRemote } from "../../services/imaging";
import { textPx, linePx } from "../../theme/textSize";
import type { ImagingRecord } from "../../types";
import { imagingTypes, imagingTypeLabel } from "./imagingTypes";
import { t, tn } from "../../i18n/core";
import { UploadChoiceSheet } from "./records/UploadChoiceSheet";
import { sizeLabel } from "../../services/storage/fileMeta";
import { useHealthMode, hairline, fieldStyle, fieldFill, fmtDate, fileKind, deepInk, FieldLabel, HelpLine, INK, INK_FAINT } from "./records/kit";

// HE1.9.b.3 · Edit imaging, and the same sheet empty as "Add imaging"
// (HE1.9.b S4). Lavender-header Part B sheet: Type as smooth-square options in
// one sideways row (MRI, X-ray, Ultrasound, CT scan, ECG, Other; DEXA scan
// kept, V6-133), Date (required, the repo help line verbatim; the standard
// calendar popup, future disabled, Monday start), Note (textarea, 300
// characters), File with Replace (camera or files), pinned Save.
//
// NOTHING IS READ FROM THE FILE: the type, date and note are typed. A new
// file is uploaded on Save, the row re-pointed, then the old object removed
// (services/imaging updateImagingRecordRemote). The file row shows the B2
// description (file_name, type, pages, size; written on upload with the
// page count read on the device).

const sameType = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const ImagingCaptureFlow: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Edit this record; none = add. */
  record?: ImagingRecord | null;
  /** Add with a file picked on the upload choice. */
  file?: File | null;
  onSaved?: (message: string) => void;
}> = ({ open, onClose, record = null, file = null, onSaved }) => {
  const { addImagingRecord, authUserId, today, reloadHealthRecords } = useApp();
  const { dark, hc } = useHealthMode();
  const online = useOnline();
  const editing = !!record;
  const [type, setType] = useState<string>("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const match = record ? imagingTypes.find((x) => sameType(x, record.type)) : undefined;
    setType(record ? match ?? record.type : "");
    setDate(record?.date ?? "");
    setNote(record?.note ?? "");
    setNewFile(file);
    setTouched(false);
  }, [open, record, file]);

  const save = async () => {
    setTouched(true);
    if (!type || !date) return;
    if (!online) {
      setToast(t("You're offline. Try again when you're connected."));
      return;
    }
    setSaving(true);
    let ok: boolean;
    if (record) {
      if (!authUserId) return;
      const r = await updateImagingRecordRemote(authUserId, record.id, { type, date, note }, newFile ? { file: newFile, oldPath: record.filePath } : undefined);
      ok = r.ok;
      if (ok) await reloadHealthRecords();
    } else {
      const r = await addImagingRecord({ type, date, note: note.trim() || undefined }, newFile ?? undefined);
      ok = r.ok;
    }
    setSaving(false);
    if (!ok) {
      setToast(t("Couldn't save. Try again."));
      return;
    }
    onSaved?.(editing ? t("Changes saved.") : t("Imaging added."));
    onClose();
  };

  const kind = newFile ? (newFile.type === "application/pdf" ? "PDF" : "Photo") : fileKind(record?.filePath);
  const options = record && !imagingTypes.some((x) => sameType(x, record.type)) ? [record.type, ...imagingTypes] : imagingTypes;
  const kindLabel = kind === "Photo" ? t("Photo") : kind;

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={editing ? t("Edit imaging") : t("Add imaging")}
        chrome="partB" tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={<CtaButton label={editing ? t("Save changes") : t("Save")} onClick={() => void save()} loading={saving} disabled={!type || !date} />}
      >
        <FieldLabel>{t("Type")}</FieldLabel>
        <div role="radiogroup" aria-label={t("Type")} className="flex overflow-x-auto no-scrollbar -mx-5 px-5" style={{ gap: 6 }}>
          {options.map((opt) => {
            const on = type === opt;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setType(opt)}
                className="tap shrink-0 whitespace-nowrap"
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 11,
                  background: on ? "rgb(var(--c-seg-active))" : dark ? "rgb(var(--th-303141))" : "rgb(var(--th-f5f4fe))",
                  color: on ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--c-charcoal-soft))",
                  fontSize: textPx(12.5),
                  lineHeight: linePx(18.8),
                  fontWeight: 700,
                }}
              >
                {imagingTypeLabel(opt)}
              </button>
            );
          })}
        </div>
        <FieldLabel style={{ marginTop: 16 }}>{t("Date")}</FieldLabel>
        <button type="button" onClick={() => setCalendarOpen(true)} className="tap flex items-center text-start" style={{ ...fieldStyle(dark, hc), gap: 8, color: date ? INK : INK_FAINT }}>
          <CalendarDays size={15} style={{ color: INK_FAINT }} aria-hidden />
          {date ? fmtDate(date) : t("Choose a date")}
        </button>
        {/* Required for the same reason as a surgery date: imaging_date is
            NOT NULL, so an undated record has nowhere to be stored, and a
            placeholder date would be a false fact in a medical record. */}
        <HelpLine error={touched && !date}>{t("Required. If you're not sure of the exact day, your best estimate is fine.")}</HelpLine>
        <FieldLabel htmlFor="imaging-note" style={{ marginTop: 16 }}>
          {t("Note")}
        </FieldLabel>
        <textarea
          id="imaging-note"
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("e.g. Right knee, follow-up in 6 weeks")}
          className="block resize-none outline-none placeholder:text-charcoal-faint"
          style={{ ...fieldStyle(dark, hc), height: 84, padding: 12 }}
        />
        <FieldLabel style={{ marginTop: 16 }}>{t("File")}</FieldLabel>
        <div className="flex items-center" style={{ minHeight: 57.8, padding: "10px 12px", gap: 12, borderRadius: 12, background: fieldFill(dark), border: `0.5px solid ${hairline(dark, hc, 0.1)}` }}>
          <FileText size={20} style={{ color: deepInk(dark) }} aria-hidden />
          <span className="flex-1 min-w-0">
            <span className="block truncate" style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 600, color: kind ? INK : INK_FAINT }}>
              {newFile ? newFile.name : record?.fileName ? record.fileName : kind ? (kind === "PDF" ? t("PDF file") : t("Photo")) : t("No file")}
            </span>
            {kind && (
              <span className="block" style={{ fontSize: textPx(11), lineHeight: linePx(16.5), color: INK_FAINT }}>
                {newFile
                  ? `${kindLabel} · ${sizeLabel(newFile.size)}`
                  : [kindLabel, record?.filePages ? tn(record.filePages, "{n} page", "{n} pages") : null, record?.fileBytes ? sizeLabel(record.fileBytes) : null].filter(Boolean).join(" · ")}
              </span>
            )}
          </span>
          <button type="button" onClick={() => setChoiceOpen(true)} className="tap min-h-[44px] shrink-0" style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: deepInk(dark) }}>
            {kind ? t("Replace") : t("Add a file")}
          </button>
        </div>
      </BottomSheet>
      <CalendarPickerSheet variant="partB"
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={date || today}
        today={today}
        maxDate={today}
        onSelect={(d) => {
          setDate(d);
          setCalendarOpen(false);
        }}
      />
      <UploadChoiceSheet
        open={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        title={kind ? t("Replace file") : t("Add imaging")}
        bucket="medical-imaging"
        onFile={(f) => {
          setNewFile(f);
          setChoiceOpen(false);
        }}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );
};
