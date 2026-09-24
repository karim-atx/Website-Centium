import React, { useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Camera, Check, FileText } from "lucide-react";
import { acceptFor, validateFileFor } from "../../services/storage";
import { todayLocal } from "../../utils/date";
import { useApp } from "../../context/AppContext";
import { imagingTypes } from "./imagingTypes";

// Photograph an imaging or test result, then TYPE WHAT IT SAYS.
//
// WHAT THIS REPLACED, AND WHY IT HAD TO GO. This flow used to hand the file to
// services/ai/parseImagingFile, which ignored its argument and returned the
// same two findings every time — an "X-Ray" dated today noting "No acute
// findings noted on the report", and a "Follow-up recommended" suggesting a
// review in 6 weeks — under the words "Reading your result…" and "Identifying
// study type, date and findings." The first was pre-ticked.
//
// "No acute findings" is not a neutral placeholder. It is a reassuring
// clinical statement about a document the app had not read, offered to
// somebody who had just photographed a real one, and it was written into
// their medical history as their own record when they pressed Add.
//
// NOW NOTHING IS PREFILLED EXCEPT THE DATE, which is today and is editable,
// the way the manual add sheet in MedicalRecordsSection has always worked —
// and this form deliberately mirrors that one, down to sharing its type list.
// The file is still uploaded to medical-imaging and still attached, which is
// what makes the typed record checkable later.

type Stage = "capture" | "entry" | "done";
type Source = "camera" | "pdf" | null;

export const ImagingCaptureFlow: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { addImagingRecord } = useApp();
  const today = todayLocal();
  const [stage, setStage] = useState<Stage>("capture");
  const [source, setSource] = useState<Source>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [type, setType] = useState(imagingTypes[0]);
  // Today, and editable. A scan is usually added the day it is collected, so
  // this is the one prefill that saves a tap without asserting anything the
  // user did not know — and imaging_date is NOT NULL, so it cannot be blank.
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  // THE FILE ITSELF, kept alongside the preview. The data URL is only ever a
  // thumbnail; the File is what actually gets uploaded. Sending the data URL
  // to Storage would upload a base64 string roughly a third larger than the
  // original for no reason.
  const [file, setFile] = useState<File | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("capture");
    setSource(null);
    setPhoto(null);
    setType(imagingTypes[0]);
    setDate(today);
    setNote("");
    setFile(null);
    setSaveError(null);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (picked: File, via: Source) => {
    // CHECKED BEFORE ANYTHING ELSE HAPPENS TO IT — see the same guard in
    // BiomarkerCaptureFlow. Running the check only inside uploadPrivateFile
    // meant an unusable file was read and reviewed before the rejection
    // arrived. Nothing here advances the stage, so the sheet stays on capture
    // with the message beside the buttons.
    const check = validateFileFor("medical-imaging", picked);
    if (!check.ok) {
      setSaveError(check.message ?? "That file can't be used.");
      return;
    }
    setSource(via);
    setFile(picked);
    setSaveError(null);

    // STRAIGHT TO THE FORM. There is nothing to wait for.
    setStage("entry");

    if (via !== "camera") return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(picked);
  };

  /**
   * Saves ONE record with the file attached.
   *
   * One upload, one row. The old flow could produce several findings from a
   * single file and attached the object to the first of them only, so that
   * deleting that one record left the others pointing at storage nobody
   * owned. A capture is one document and is now one record, which removes
   * that whole class of problem rather than managing it.
   */
  const save = async () => {
    if (!date) return;
    setSaving(true);
    setSaveError(null);
    const result = await addImagingRecord(
      { type, date, note: note.trim() || undefined },
      file ?? undefined
    );
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.message ?? "That couldn't be saved.");
      return;
    }
    setStage("done");
    setTimeout(handleClose, 900);
  };

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title="Add imaging or test"
      onBack={stage === "entry" ? reset : undefined}
    >
      <div className="min-h-[280px] flex flex-col animate-fade-slide-up">
        {stage === "capture" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <input
              ref={cameraInputRef}
              type="file"
              accept={acceptFor("medical-imaging", true)}
              capture="environment"
              className="hidden"
              // Cleared after every pick so choosing the SAME file again still
              // fires onChange — otherwise a rejected file cannot be retried
              // without picking something else first.
              onChange={(e) => {
                const picked = e.target.files?.[0];
                e.target.value = "";
                if (picked) handleFile(picked, "camera");
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptFor("medical-imaging")}
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                e.target.value = "";
                if (picked) handleFile(picked, "pdf");
              }}
            />
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="tap w-24 h-24 rounded-full bg-charcoal flex items-center justify-center shadow-lift"
                aria-label="Take a photo"
              >
                <Camera size={30} className="text-cream" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="tap w-24 h-24 rounded-full bg-primary-pale flex items-center justify-center shadow-soft"
                aria-label="Attach a file"
              >
                <FileText size={26} className="text-primary-dark" />
              </button>
            </div>
            <p className="font-display text-xl font-semibold text-charcoal mb-2">
              Take a picture, or attach a file, of your imaging or test result
            </p>
            <p className="text-sm text-charcoal-soft max-w-xs">
              Then add what it says. Your file is saved with it for reference.
            </p>
            {saveError && (
              <p className="text-[11px] text-status-high mt-3 text-center max-w-xs">{saveError}</p>
            )}
          </div>
        )}

        {stage === "entry" && (
          <div className="space-y-4">
            {/* The document, kept in view while it is described. */}
            <div className="flex items-center gap-3 bg-cream-soft rounded-2xl px-3.5 py-3">
              {photo ? (
                <img src={photo} alt="Your imaging result" className="w-12 h-12 object-cover rounded-xl shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-cream-card flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-charcoal-faint" />
                </div>
              )}
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-charcoal">Add what your result says</p>
                <p className="text-[11px] text-charcoal-faint">
                  Your {source === "pdf" ? "file" : "photo"} is saved with it for reference.
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Type</span>
              <div className="flex flex-wrap gap-2">
                {imagingTypes.map((t) => (
                  <Chip key={t} active={type === t} onClick={() => setType(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Date</span>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {/* Required for the same reason the manual add sheet says so:
                  imaging_date is NOT NULL, so an undated record has nowhere to
                  be stored, and a placeholder date would be a false fact in a
                  medical record. */}
              <span className="text-[11px] text-charcoal-faint mt-1.5 block">
                Required. If you're not sure of the exact day, your best estimate is fine.
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
                Findings (optional)
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What the report says, in your own words"
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            {saveError && <p className="text-[11px] text-status-high text-center">{saveError}</p>}
            <Button fullWidth size="lg" onClick={() => void save()} disabled={!date || saving}>
              {saving ? "Saving…" : "Save result"}
            </Button>
          </div>
        )}

        {stage === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-4 animate-pop">
              <Check size={24} className="text-white" strokeWidth={3} />
            </div>
            <p className="font-display text-lg font-semibold text-charcoal">Added to your health history</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
