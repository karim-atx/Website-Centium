import React, { useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Camera, Check, FileText, Plus, X } from "lucide-react";
import { acceptFor, validateFileFor } from "../../services/storage";
import type { ExtractedBiomarker } from "../../types";
import { useApp } from "../../context/AppContext";

// Photograph a lab report, then TYPE THE VALUES OFF IT.
//
// WHAT THIS REPLACED, AND WHY IT HAD TO GO. This flow used to hand the image
// to services/ai/parseBiomarkerImage, which ignored its argument and returned
// the same six markers every time — HbA1c 5.6%, LDL 1.88 g/L, HDL 1.24 g/L,
// Triglycerides 1.05 g/L, Vitamin D 31 ng/mL, Fasting Glucose 94 mg/dL —
// under the words "Reading your results…" and "Identifying biomarkers, values
// and units." Everything downstream of it was real: the user ticked the ones
// they wanted and they were written to blood_panels/blood_markers as their
// own confirmed bloodwork, with their photo attached as the source document.
//
// So the one half that was fabricated was the half nobody could check. A
// person photographing a real report has no reason to doubt six plausible
// clinical numbers the app says it just read off it, and the numbers that
// landed in their health history were not theirs.
//
// NOW NOTHING PRODUCES A VALUE THE USER DID NOT TYPE. The file is still
// uploaded to lab-reports and still attached to the panel, which is what
// makes the typed values checkable later. The mock is deleted outright rather
// than switched off — there is no flag to turn back on, because what would
// replace it is a vision model that does not exist yet.

type Stage = "capture" | "entry" | "done";
type Source = "camera" | "pdf" | null;

/**
 * One row being typed.
 *
 * Strings, not numbers, because a half-typed "1." is a legitimate state of
 * this field and Number("1.") would commit 1 behind the user's back. The
 * conversion happens once, at save.
 */
interface MarkerDraft {
  name: string;
  value: string;
  unit: string;
}

const emptyMarker = (): MarkerDraft => ({ name: "", value: "", unit: "" });

/** Digits and at most one decimal point. Lab values are never negative. */
const numeric = (raw: string) => raw.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, "");

const fieldClass =
  "w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20";

export const BiomarkerCaptureFlow: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { recordBiomarkers } = useApp();
  const [stage, setStage] = useState<Stage>("capture");
  const [source, setSource] = useState<Source>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [markers, setMarkers] = useState<MarkerDraft[]>([emptyMarker()]);
  // THE FILE ITSELF, kept alongside the preview. The data URL is only ever a
  // thumbnail now; the File is what gets uploaded. Sending the data URL to
  // Storage would upload a base64 string a third larger than the original for
  // no benefit.
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("capture");
    setSource(null);
    setPhoto(null);
    setMarkers([emptyMarker()]);
    setFile(null);
    setSaving(false);
    setSaveError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (picked: File, via: Source) => {
    // CHECKED BEFORE ANYTHING ELSE HAPPENS TO IT. The same check runs again
    // inside uploadPrivateFile, but running it only there meant a file with an
    // unusable type was read and reviewed before anyone mentioned it — the
    // rejection arrived after all the work rather than instead of it. Nothing
    // here advances the stage, so the sheet stays on capture and the message
    // appears beside the buttons.
    const check = validateFileFor("lab-reports", picked);
    if (!check.ok) {
      setSaveError(check.message ?? "That file can't be used.");
      return;
    }
    setSource(via);
    setFile(picked);
    setSaveError(null);

    // STRAIGHT TO THE FORM. There is nothing to wait for — the only reason
    // this step ever took 1600ms was a setTimeout pretending to think.
    setStage("entry");

    // The thumbnail, and only the thumbnail. A PDF gets a file chip instead,
    // so it is not read at all.
    if (via !== "camera") return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(picked);
  };

  const setMarker = (index: number, patch: Partial<MarkerDraft>) =>
    setMarkers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const addMarker = () => setMarkers((prev) => [...prev, emptyMarker()]);

  // Never below one row: an empty list would leave the sheet with nothing to
  // type into and no obvious way back to a field.
  const removeMarker = (index: number) =>
    setMarkers((prev) => (prev.length === 1 ? [emptyMarker()] : prev.filter((_, i) => i !== index)));

  /**
   * The rows that are actually a measurement.
   *
   * A name and a number. The unit is optional on purpose — most markers have
   * one and the field asks for it, but a ratio genuinely has none, and
   * demanding one would make somebody invent it. Blank rows are simply
   * ignored rather than flagged, since the spare row at the bottom is how you
   * add the next marker.
   */
  const usable = markers.filter((m) => m.name.trim() !== "" && Number.isFinite(Number(m.value)) && m.value.trim() !== "");

  /**
   * Saves the typed markers as ONE panel, with the report attached.
   *
   * A panel is one lab report, so every marker belongs to a single panel and
   * a single upload — not one panel per marker, which would scatter one
   * report's results across several and break the grouping the history view
   * depends on.
   */
  const save = async () => {
    if (usable.length === 0) return;
    setSaving(true);
    setSaveError(null);
    const entries: ExtractedBiomarker[] = usable.map((m) => ({
      name: m.name.trim(),
      value: Number(m.value),
      unit: m.unit.trim(),
      // Every row the user typed is a row they want. The flag is vestigial
      // here — recordBiomarkers reads name/value/unit and nothing else — but
      // the shared type still carries it.
      selected: true,
    }));
    const result = await recordBiomarkers(entries, file ?? undefined);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.message ?? "Couldn't save these results.");
      return;
    }
    setStage("done");
    setTimeout(handleClose, 900);
  };

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title="Add blood work"
      // Back to the picker, so a wrong file is one tap to replace rather than
      // a reason to close the sheet and start again.
      onBack={stage === "entry" ? reset : undefined}
    >
      <div className="min-h-[280px] flex flex-col animate-fade-slide-up">
        {stage === "capture" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <input
              ref={cameraInputRef}
              type="file"
              accept={acceptFor("lab-reports", true)}
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
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
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
                onClick={() => pdfInputRef.current?.click()}
                className="tap w-24 h-24 rounded-full bg-primary-pale flex items-center justify-center shadow-soft"
                aria-label="Attach a PDF"
              >
                <FileText size={26} className="text-primary-dark" />
              </button>
            </div>
            <p className="font-display text-xl font-semibold text-charcoal mb-2">
              Take a picture, or attach a PDF, of your results
            </p>
            <p className="text-sm text-charcoal-soft max-w-xs">
              Then add the values from your report. Your photo is saved with them for reference.
            </p>
            {saveError && (
              <p className="text-[11px] text-status-high mt-3 text-center max-w-xs">{saveError}</p>
            )}
          </div>
        )}

        {stage === "entry" && (
          <div>
            {/* The document, kept in view while its values are typed — which
                is the whole reason it is attached rather than decorative. */}
            <div className="flex items-center gap-3 bg-cream-soft rounded-2xl px-3.5 py-3 mb-4">
              {photo ? (
                <img src={photo} alt="Your lab report" className="w-12 h-12 object-cover rounded-xl shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-cream-card flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-charcoal-faint" />
                </div>
              )}
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-charcoal">
                  Add the values from your report
                </p>
                <p className="text-[11px] text-charcoal-faint">
                  Your {source === "pdf" ? "file" : "photo"} is saved with them for reference.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 mb-3">
              {markers.map((m, i) => (
                <div key={i} className="rounded-2xl bg-cream-card border border-charcoal/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={m.name}
                      onChange={(e) => setMarker(i, { name: e.target.value })}
                      placeholder="Marker, e.g. HbA1c"
                      aria-label={`Marker ${i + 1} name`}
                      className={fieldClass}
                    />
                    <button
                      onClick={() => removeMarker(i)}
                      aria-label={`Remove marker ${i + 1}`}
                      className="tap w-8 h-8 rounded-full flex items-center justify-center text-charcoal-faint shrink-0"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={m.value}
                      onChange={(e) => setMarker(i, { value: numeric(e.target.value) })}
                      placeholder="Value"
                      inputMode="decimal"
                      aria-label={`Marker ${i + 1} value`}
                      className={fieldClass}
                    />
                    <input
                      value={m.unit}
                      onChange={(e) => setMarker(i, { unit: e.target.value })}
                      placeholder="Unit (optional)"
                      aria-label={`Marker ${i + 1} unit`}
                      className={fieldClass}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addMarker}
              className="tap flex items-center gap-1.5 text-[12px] font-semibold text-primary-dark mb-5"
            >
              <Plus size={14} /> Add another marker
            </button>

            {saveError && <p className="text-[11px] text-status-high mb-2 text-center">{saveError}</p>}
            <Button fullWidth size="lg" onClick={() => void save()} disabled={usable.length === 0 || saving}>
              {saving
                ? "Saving…"
                : usable.length === 0
                  ? "Add a marker and its value"
                  : `Save ${usable.length} result${usable.length === 1 ? "" : "s"}`}
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
