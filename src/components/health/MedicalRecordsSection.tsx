import { useState } from "react";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import { FileViewerSheet } from "./FileViewerSheet";
import type { PrivateBucket } from "../../services/storage";
import type { BloodMarker, ImagingRecord, LabReport, MedicationRoute } from "../../types";
import {
  Share2,
  Camera,
  Plus,
  X,
  Trash2,
  ScanLine,
  Pill,
  Bell,
  Clock,
  FileText,
} from "lucide-react";
import clsx from "clsx";

const statusColor: Record<string, string> = {
  low: "text-status-low bg-status-low-bg",
  normal: "text-status-good bg-status-good-bg",
  high: "text-status-high bg-status-high-bg",
};

const imagingTypes = ["X-Ray", "MRI", "CT scan", "Ultrasound", "Urine analysis", "DEXA scan", "Other"];
const commonComorbidities = [
  "Diabetes",
  "Hypertension",
  "Asthma",
  "Thyroid condition",
  "Heart condition",
  "PCOS",
  "Anxiety/Depression",
  "Arthritis",
];
const routeOptions: { value: MedicationRoute; label: string }[] = [
  { value: "oral", label: "Oral" },
  { value: "injectable", label: "Injectable" },
  { value: "topical", label: "Topical" },
  { value: "inhaled", label: "Inhaled" },
  { value: "other", label: "Other" },
];

type RecordsTab = "biomarkers" | "imaging" | "history" | "medications";

// QA 12.0: "I would like the biomarker widget to be inside a tab that not
// only has biomarkers but the ability to add imaging and/or other test...
// the client should be able to add comorbidities, past surgeries,
// medications... The medications tab specifically should be more detailed
// though as you should also be able to schedule medication dose and
// timing... toggle notification... select route like oral, injectable."
export const MedicalRecordsSection: React.FC<{
  bloodMarkers: BloodMarker[];
  onShareAll: () => void;
  onScan: () => void;
  onShareMarker: (m: BloodMarker) => void;
  onOpenMarker: (m: BloodMarker) => void;
  // QA 13.0: "Similar to blood biomarkers, in imaging & tests you should be
  // given the option to take a picture or attach files... similarly to
  // biomarkers you should be able to share the Imaging & tests."
  onScanImaging: () => void;
  onShareAllImaging: () => void;
  onShareImagingRecord: (r: ImagingRecord) => void;
  // QA 13.0: "Have records be a button you can press that leads to the
  // following tabs" — Health.tsx now opens this inside a BottomSheet that
  // already carries its own "Records" title, so the internal label is
  // redundant there.
  hideLabel?: boolean;
}> = ({
  bloodMarkers,
  onShareAll,
  onScan,
  onShareMarker,
  onOpenMarker,
  onScanImaging,
  onShareAllImaging,
  onShareImagingRecord,
  hideLabel,
}) => {
  const {
    imagingRecords,
    addImagingRecord,
    removeImagingRecord,
    comorbidities,
    setComorbidities,
    surgeries,
    addSurgery,
    removeSurgery,
    medications,
    addMedication,
    updateMedication,
    removeMedication,
    labReports,
    removeLabReport,
    today,
  } = useApp();
  // The file currently being viewed, if any. Signing happens inside the
  // viewer on open, never here -- see FileViewerSheet.
  const [viewing, setViewing] = useState<{ path: string; label: string; bucket: PrivateBucket } | null>(null);
  // Every write in this section now goes to Supabase and can fail. One slot
  // rather than one per control: only one write is ever in flight, and a
  // medical record that silently failed to save is the thing worth shouting
  // about, so it is shown wherever the user was working.
  const [recordError, setRecordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The report awaiting confirmation, if any. Holds the whole record rather
  // than an id so the sheet can name the date after the list behind it has
  // already been re-read.
  const [confirmRemoveReport, setConfirmRemoveReport] = useState<LabReport | null>(null);

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(true);
    setRecordError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) setRecordError(result.message ?? "That couldn't be saved.");
    return result.ok;
  };
  const [tab, setTab] = useState<RecordsTab>("biomarkers");
  const [addImagingOpen, setAddImagingOpen] = useState(false);
  const [imagingType, setImagingType] = useState(imagingTypes[0]);
  const [imagingDate, setImagingDate] = useState("");
  const [imagingNote, setImagingNote] = useState("");
  const [addSurgeryOpen, setAddSurgeryOpen] = useState(false);
  const [surgeryName, setSurgeryName] = useState("");
  const [surgeryDate, setSurgeryDate] = useState("");
  const [customComorbidity, setCustomComorbidity] = useState("");
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medRoute, setMedRoute] = useState<MedicationRoute>("oral");
  const [medTimes, setMedTimes] = useState<string[]>(["08:00"]);
  const [medNotify, setMedNotify] = useState(true);

  const toggleComorbidity = (label: string) =>
    void run(() =>
      setComorbidities(
        comorbidities.includes(label) ? comorbidities.filter((c) => c !== label) : [...comorbidities, label]
      )
    );

  const resetMedForm = () => {
    setMedName("");
    setMedDose("");
    setMedRoute("oral");
    setMedTimes(["08:00"]);
    setMedNotify(true);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2.5">
        {hideLabel ? <span /> : <p className="section-label text-charcoal-faint">Records</p>}
        {tab === "biomarkers" && (
          <div className="flex items-center gap-3">
            <button onClick={onShareAll} className="tap flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-dark">
              <Share2 size={13} /> Share all
            </button>
            <button onClick={onScan} className="tap flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-dark">
              <Camera size={13} /> Scan result
            </button>
          </div>
        )}
        {tab === "imaging" && imagingRecords.length > 0 && (
          <div className="flex items-center gap-3">
            <button onClick={onShareAllImaging} className="tap flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-dark">
              <Share2 size={13} /> Share all
            </button>
            <button onClick={onScanImaging} className="tap flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-dark">
              <Camera size={13} /> Scan result
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
        <Chip active={tab === "biomarkers"} onClick={() => setTab("biomarkers")}>
          Biomarkers
        </Chip>
        <Chip active={tab === "imaging"} onClick={() => setTab("imaging")}>
          Imaging & tests
        </Chip>
        <Chip active={tab === "history"} onClick={() => setTab("history")}>
          Medical history
        </Chip>
        <Chip active={tab === "medications"} onClick={() => setTab("medications")}>
          Medications
        </Chip>
      </div>

      {/* THE UPLOADED REPORTS THEMSELVES. blood_panels.source_image_url has
          been written since the capture flow existed and read by nothing --
          the biomarker list is grouped by marker name, so a panel's own
          identity had nowhere to appear. Without this the client could upload
          a lab report and never see it again. */}
      {tab === "biomarkers" && labReports.length > 0 && (
        <Card className="mb-3">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Lab reports
          </p>
          <div className="flex flex-wrap gap-1.5">
            {labReports.map((rep) => (
              <div
                key={rep.id}
                className="flex items-center gap-0.5 text-[11px] font-semibold text-primary-dark bg-primary-pale rounded-full pl-2.5 pr-1 py-1"
              >
                <button
                  onClick={() =>
                    setViewing({
                      path: rep.filePath,
                      label: `Lab report · ${rep.date}`,
                      bucket: "lab-reports",
                    })
                  }
                  className="tap flex items-center gap-1"
                >
                  <FileText size={11} /> {rep.date}
                </button>
                <button
                  onClick={() => {
                    // Cleared on open, not just by run(): recordError is shared
                    // across this whole section, so a message left over from an
                    // earlier action would otherwise greet the sheet as if this
                    // removal had already failed.
                    setRecordError(null);
                    setConfirmRemoveReport(rep);
                  }}
                  disabled={busy}
                  aria-label={`Remove lab report from ${rep.date}`}
                  className="tap w-5 h-5 rounded-full flex items-center justify-center text-primary-dark/55 disabled:opacity-40"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "biomarkers" && (
        <Card padded={false} className="mb-6 divide-y divide-charcoal/[0.04]">
          {bloodMarkers.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenMarker(m)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenMarker(m);
                }
              }}
              className="tap w-full flex items-center justify-between px-4 py-3.5 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
            >
              <div>
                <p className="text-[13.5px] font-bold text-charcoal">{m.name}</p>
                <p className="text-[11px] font-medium text-charcoal-faint">
                  Range: {m.range} {m.unit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-[15px] font-extrabold text-charcoal tabular-nums">
                    {m.value} <span className="text-[11px] font-semibold text-charcoal-tertiary">{m.unit}</span>
                  </p>
                  {/* Nothing at all when the status is unknown. Rendering the
                      pill with an undefined colour and no text left a bare
                      grey capsule that looked like a control, and a status
                      chip is a claim -- absent is the honest form of "we have
                      no reference range for this". */}
                  {m.status && (
                    <span className={clsx("text-[10px] font-bold uppercase rounded-full px-2 py-0.5", statusColor[m.status])}>
                      {m.status}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareMarker(m);
                  }}
                  className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint shrink-0"
                  aria-label={`Share ${m.name}`}
                >
                  <Share2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === "imaging" && (
        <div className="mb-6 space-y-2.5">
          {recordError && (
            <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{recordError}</p>
          )}
          {imagingRecords.length === 0 && (
            <Card className="text-center py-8">
              <ScanLine size={22} className="text-charcoal-faint mx-auto mb-2" />
              <p className="text-sm text-charcoal-faint">No imaging or other tests added yet.</p>
            </Card>
          )}
          {imagingRecords.map((r) => (
            <Card key={r.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-charcoal">{r.type}</p>
                <p className="text-xs text-charcoal-faint">{r.date}</p>
                {r.note && <p className="text-xs text-charcoal-soft mt-0.5">{r.note}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Only for records that actually carry a file. One typed by
                    hand has nothing to open, and a View control on it would
                    promise a document that does not exist. */}
                {r.filePath && (
                  <button
                    onClick={() =>
                      setViewing({ path: r.filePath!, label: r.type, bucket: "medical-imaging" })
                    }
                    aria-label={`View ${r.type}`}
                    className="tap text-[11px] font-semibold text-primary-dark"
                  >
                    View
                  </button>
                )}
                <button
                  onClick={() => onShareImagingRecord(r)}
                  aria-label={`Share ${r.type}`}
                  className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint"
                >
                  <Share2 size={12} />
                </button>
                <button
                  onClick={() => void run(() => removeImagingRecord(r.id))}
                  disabled={busy}
                  aria-label={`Remove ${r.type}`}
                  className="tap text-charcoal-faint disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
          {/* QA 13.0: "you should be given the option to take a picture or
              attach files of medical imaging/tests whereby AI will read the
              result" — Scan sits alongside the existing manual-entry add. */}
          <div className="flex gap-2.5">
            <button
              onClick={onScanImaging}
              className="tap flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-charcoal/[0.16] px-4 py-3 text-sm font-semibold text-primary-dark"
            >
              <Camera size={14} /> Scan
            </button>
            <button
              onClick={() => setAddImagingOpen(true)}
              className="tap flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-charcoal/[0.16] px-4 py-3 text-sm font-semibold text-primary-dark"
            >
              <Plus size={14} /> Add manually
            </button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="mb-6 space-y-5">
          {recordError && (
            <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{recordError}</p>
          )}
          <Card>
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">Comorbidities</p>
            <div className="flex flex-wrap gap-2">
              {commonComorbidities.map((c) => (
                <Chip key={c} active={comorbidities.includes(c)} onClick={() => toggleComorbidity(c)}>
                  {c}
                </Chip>
              ))}
              {comorbidities.filter((c) => !commonComorbidities.includes(c)).map((c) => (
                <Chip key={c} active onClick={() => toggleComorbidity(c)}>
                  {c}
                </Chip>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <input
                value={customComorbidity}
                onChange={(e) => setCustomComorbidity(e.target.value)}
                placeholder="Add another"
                className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => {
                  if (customComorbidity.trim()) {
                    toggleComorbidity(customComorbidity.trim());
                    setCustomComorbidity("");
                  }
                }}
                className="tap w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0"
                aria-label="Add comorbidity"
              >
                <Plus size={16} />
              </button>
            </div>
          </Card>

          <Card>
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">Past surgeries</p>
            {surgeries.length === 0 && <p className="text-sm text-charcoal-faint mb-2">None added.</p>}
            <div className="space-y-2 mb-3">
              {surgeries.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-cream-soft rounded-xl px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{s.name}</p>
                    <p className="text-xs text-charcoal-faint">{s.date}</p>
                  </div>
                  <button onClick={() => void run(() => removeSurgery(s.id))} disabled={busy} aria-label={`Remove ${s.name}`} className="tap text-charcoal-faint disabled:opacity-40">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setAddSurgeryOpen(true)}
              className="tap flex items-center gap-1.5 text-sm font-semibold text-primary-dark"
            >
              <Plus size={14} /> Add surgery
            </button>
          </Card>
        </div>
      )}

      {tab === "medications" && (
        <div className="mb-6 space-y-2.5">
          {medications.length === 0 && (
            <Card className="text-center py-8">
              <Pill size={22} className="text-charcoal-faint mx-auto mb-2" />
              <p className="text-sm text-charcoal-faint">No medications added yet.</p>
            </Card>
          )}
          {medications.map((m) => (
            <Card key={m.id}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-bold text-charcoal">
                  {m.name} <span className="text-xs font-medium text-charcoal-faint">· {m.dose}</span>
                </p>
                <button onClick={() => void run(() => removeMedication(m.id))} disabled={busy} aria-label={`Remove ${m.name}`} className="tap text-charcoal-faint disabled:opacity-40">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-charcoal-soft capitalize mb-2">{m.route}</p>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {m.times.map((t) => (
                  <span key={t} className="flex items-center gap-1 text-[11px] font-semibold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1">
                    <Clock size={10} /> {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-charcoal/[0.06]">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-soft">
                  <Bell size={12} /> Remind me to take this
                </span>
                <Toggle
                  checked={m.notifyEnabled}
                  onChange={(v) => void run(() => updateMedication(m.id, { notifyEnabled: v }))}
                  label={`Notifications for ${m.name}`}
                />
              </div>
            </Card>
          ))}
          <button
            onClick={() => setAddMedOpen(true)}
            className="tap w-full flex items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-charcoal/[0.16] px-4 py-3 text-sm font-semibold text-primary-dark"
          >
            <Plus size={14} /> Add medication
          </button>
        </div>
      )}

      {/* Add imaging/test */}
      <BottomSheet open={addImagingOpen} onClose={() => setAddImagingOpen(false)} title="Add imaging or test">
        <div className="space-y-4 animate-fade-slide-up">
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Type</span>
            <div className="flex flex-wrap gap-2">
              {imagingTypes.map((t) => (
                <Chip key={t} active={imagingType === t} onClick={() => setImagingType(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Date</span>
            <input
              type="date"
              value={imagingDate}
              max={today}
              onChange={(e) => setImagingDate(e.target.value)}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {/* Required for the same reason as a surgery date: imaging_date is
                NOT NULL, so an undated record has nowhere to be stored, and a
                placeholder date would be a false fact in a medical record. */}
            <span className="text-[11px] text-charcoal-faint mt-1.5 block">
              Required. If you're not sure of the exact day, your best estimate is fine.
            </span>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Note (optional)</span>
            <input
              value={imagingNote}
              onChange={(e) => setImagingNote(e.target.value)}
              placeholder="e.g. Right knee, follow-up in 6 weeks"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          {recordError && <p className="text-[11px] text-status-high">{recordError}</p>}
          <button
            onClick={async () => {
              if (!imagingDate) return;
              const ok = await run(() =>
                addImagingRecord({
                  type: imagingType,
                  date: imagingDate,
                  note: imagingNote || undefined,
                })
              );
              if (!ok) return;
              setImagingDate("");
              setImagingNote("");
              setAddImagingOpen(false);
            }}
            disabled={!imagingDate || busy}
            className="tap w-full rounded-2xl bg-primary text-white text-sm font-semibold py-3.5 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </BottomSheet>

      {/* Add surgery */}
      <BottomSheet open={addSurgeryOpen} onClose={() => setAddSurgeryOpen(false)} title="Add surgery">
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Procedure</span>
            <input
              value={surgeryName}
              onChange={(e) => setSurgeryName(e.target.value)}
              placeholder="e.g. ACL reconstruction"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Date</span>
            <input
              type="date"
              value={surgeryDate}
              max={today}
              onChange={(e) => setSurgeryDate(e.target.value)}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {/* The date is required because surgery_date is NOT NULL, so an
                undated entry has nowhere to be stored. Said plainly rather
                than left as a disabled button with no explanation — and an
                approximate date is better than a record that cannot save. */}
            <span className="text-[11px] text-charcoal-faint mt-1.5 block">
              Required. If you're not sure of the exact day, your best estimate is fine.
            </span>
          </label>
          {recordError && <p className="text-[11px] text-status-high">{recordError}</p>}
          <button
            onClick={async () => {
              if (!surgeryName.trim() || !surgeryDate) return;
              const ok = await run(() => addSurgery({ name: surgeryName.trim(), date: surgeryDate }));
              if (!ok) return;
              setSurgeryName("");
              setSurgeryDate("");
              setAddSurgeryOpen(false);
            }}
            disabled={!surgeryName.trim() || !surgeryDate || busy}
            className="tap w-full rounded-2xl bg-primary text-white text-sm font-semibold py-3.5 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </BottomSheet>

      {/* Add medication */}
      <BottomSheet
        open={addMedOpen}
        onClose={() => {
          setAddMedOpen(false);
          resetMedForm();
        }}
        title="Add medication"
      >
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Name</span>
            <input
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="e.g. Vitamin D3"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Dose</span>
            <input
              value={medDose}
              onChange={(e) => setMedDose(e.target.value)}
              placeholder="e.g. 2000 IU"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Route</span>
            <div className="flex flex-wrap gap-2">
              {routeOptions.map((r) => (
                <Chip key={r.value} active={medRoute === r.value} onClick={() => setMedRoute(r.value)}>
                  {r.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Time(s) per day</span>
            <div className="space-y-2">
              {medTimes.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) =>
                      setMedTimes((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))
                    }
                    className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {medTimes.length > 1 && (
                    <button
                      onClick={() => setMedTimes((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Remove time"
                      className="tap text-charcoal-faint"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setMedTimes((prev) => [...prev, "08:00"])}
                className="tap flex items-center gap-1.5 text-xs font-semibold text-primary-dark"
              >
                <Plus size={12} /> Add another time
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between bg-cream-soft rounded-xl px-3.5 py-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-charcoal">
              <Bell size={14} /> Remind me to take this
            </span>
            <Toggle checked={medNotify} onChange={setMedNotify} label="Medication reminder" />
          </div>
          {recordError && <p className="text-[11px] text-status-high">{recordError}</p>}
          <button
            onClick={async () => {
              if (!medName.trim() || !medDose.trim()) return;
              const ok = await run(() =>
                addMedication({
                  name: medName.trim(),
                  dose: medDose.trim(),
                  route: medRoute,
                  times: medTimes,
                  notifyEnabled: medNotify,
                })
              );
              if (!ok) return;
              resetMedForm();
              setAddMedOpen(false);
            }}
            disabled={!medName.trim() || !medDose.trim() || busy}
            className="tap w-full rounded-2xl bg-primary text-white text-sm font-semibold py-3.5 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </BottomSheet>

      {/* Sibling of the sheets, not nested inside one: BottomSheet portals
          to <body>, so nesting would tie the viewer to whichever sheet
          happened to be open. */}
      <FileViewerSheet
        open={viewing !== null}
        onClose={() => setViewing(null)}
        path={viewing?.path ?? null}
        bucket={viewing?.bucket ?? "medical-imaging"}
        label={viewing?.label ?? "File"}
      />

      {/* CONFIRMED IN A SHEET, not with the "tap again" pattern this app uses
          for its lighter deletes, because the consequence is not visible from
          the control. A lab report IS its panel, so removing it also removes
          every result that panel recorded — a marker measured only there
          disappears from the biomarker list entirely. Saying that in words
          beforehand is the difference between a decision and a surprise.

          The error renders HERE rather than through recordError's usual
          placement: that is printed on the imaging, history and medications
          tabs, and the biomarkers tab prints it nowhere, so a failed removal
          would otherwise be silent. The sheet also stays open on failure,
          which is what keeps the message on screen next to the control that
          produced it. */}
      <BottomSheet
        open={confirmRemoveReport !== null}
        onClose={() => setConfirmRemoveReport(null)}
        title="Remove lab report?"
      >
        <div className="space-y-4 animate-fade-slide-up">
          <p className="text-sm text-charcoal-soft">
            The report from {confirmRemoveReport?.date} will be deleted, along with the
            results it recorded — those readings will no longer appear in your biomarker
            history. This can&rsquo;t be undone.
          </p>
          {recordError && (
            <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
              {recordError}
            </p>
          )}
          <div className="flex gap-2.5">
            <Button variant="secondary" fullWidth onClick={() => setConfirmRemoveReport(null)}>
              Keep
            </Button>
            <Button
              variant="primary"
              fullWidth
              disabled={busy}
              onClick={() => {
                const report = confirmRemoveReport;
                if (!report) return;
                void run(() => removeLabReport(report.id)).then((ok) => {
                  if (ok) setConfirmRemoveReport(null);
                });
              }}
            >
              {busy ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
};
