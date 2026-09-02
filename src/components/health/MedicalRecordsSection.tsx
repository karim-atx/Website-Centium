import { useState } from "react";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import type { BloodMarker, ImagingRecord, MedicationRoute } from "../../types";
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
  } = useApp();
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
    setComorbidities(
      comorbidities.includes(label) ? comorbidities.filter((c) => c !== label) : [...comorbidities, label]
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
                  <span className={clsx("text-[10px] font-bold uppercase rounded-full px-2 py-0.5", statusColor[m.status])}>
                    {m.status}
                  </span>
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
                <button
                  onClick={() => onShareImagingRecord(r)}
                  aria-label={`Share ${r.type}`}
                  className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint"
                >
                  <Share2 size={12} />
                </button>
                <button
                  onClick={() => removeImagingRecord(r.id)}
                  aria-label={`Remove ${r.type}`}
                  className="tap text-charcoal-faint"
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
                  <button onClick={() => removeSurgery(s.id)} aria-label={`Remove ${s.name}`} className="tap text-charcoal-faint">
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
                <button onClick={() => removeMedication(m.id)} aria-label={`Remove ${m.name}`} className="tap text-charcoal-faint">
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
                  onChange={(v) => updateMedication(m.id, { notifyEnabled: v })}
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
              onChange={(e) => setImagingDate(e.target.value)}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
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
          <button
            onClick={() => {
              addImagingRecord({ type: imagingType, date: imagingDate || "Not dated", note: imagingNote || undefined });
              setImagingDate("");
              setImagingNote("");
              setAddImagingOpen(false);
            }}
            className="tap w-full rounded-2xl bg-primary text-white text-sm font-semibold py-3.5"
          >
            Save
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
              onChange={(e) => setSurgeryDate(e.target.value)}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <button
            onClick={() => {
              if (!surgeryName.trim()) return;
              addSurgery({ name: surgeryName.trim(), date: surgeryDate || "Not dated" });
              setSurgeryName("");
              setSurgeryDate("");
              setAddSurgeryOpen(false);
            }}
            disabled={!surgeryName.trim()}
            className="tap w-full rounded-2xl bg-primary text-white text-sm font-semibold py-3.5 disabled:opacity-50"
          >
            Save
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
          <button
            onClick={() => {
              if (!medName.trim() || !medDose.trim()) return;
              addMedication({
                name: medName.trim(),
                dose: medDose.trim(),
                route: medRoute,
                times: medTimes,
                notifyEnabled: medNotify,
              });
              resetMedForm();
              setAddMedOpen(false);
            }}
            disabled={!medName.trim() || !medDose.trim()}
            className="tap w-full rounded-2xl bg-primary text-white text-sm font-semibold py-3.5 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
