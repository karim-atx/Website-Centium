import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Camera, Check, FileText, Plus } from "lucide-react";
import { acceptFor, validateFileFor } from "../../services/storage";
import type { ExtractedBiomarker } from "../../types";
import { useApp } from "../../context/AppContext";
import { fetchLabCatalogue } from "../../services/labs/catalogue";
import type { CatalogueMarker } from "../../services/labs/catalogueLogic";
import { MarkerEntryRow } from "./MarkerEntryRow";
import { draftRange, draftUsable, emptyMarker, type MarkerDraft } from "./markerDraft";

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

// THE REPORT IS OPTIONAL NOW. Results can be typed straight in; attaching a
// photo or PDF of the report stays available on the same screen, and is still
// saved with the panel when given. There is no separate capture step.
type Stage = "entry" | "done";
type Source = "camera" | "pdf" | null;

export const BiomarkerCaptureFlow: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { recordBiomarkers, user } = useApp();
  // The standard lab marker list (Database 20261011000000). Null until read,
  // or if it could not be: rows then fall back to free text ("Other").
  const [catalogue, setCatalogue] = useState<CatalogueMarker[] | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchLabCatalogue().then((c) => {
      if (!cancelled) setCatalogue(c);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);
  const [stage, setStage] = useState<Stage>("entry");
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
    setStage("entry");
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
    // here changes the file, so the message appears beside the attach buttons.
    const check = validateFileFor("lab-reports", picked);
    if (!check.ok) {
      setSaveError(check.message ?? "That file can't be used.");
      return;
    }
    setSource(via);
    setFile(picked);
    setPhoto(null);
    setSaveError(null);

    // The thumbnail, and only the thumbnail. A PDF gets a file chip instead,
    // so it is not read at all.
    if (via !== "camera") return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(picked);
  };

  const removeFile = () => {
    setSource(null);
    setFile(null);
    setPhoto(null);
  };

  const setMarker = (index: number, patch: Partial<MarkerDraft>) =>
    setMarkers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const addMarker = () => setMarkers((prev) => [...prev, emptyMarker()]);

  // Never below one row: an empty list would leave the sheet with nothing to
  // type into and no obvious way back to a field.
  const removeMarker = (index: number) =>
    setMarkers((prev) => (prev.length === 1 ? [emptyMarker()] : prev.filter((_, i) => i !== index)));

  /**
   * The rows that are actually a measurement: a name, a number, and a range
   * whose low end is not above its high end. The unit is optional for
   * "Other" (a ratio genuinely has none). Blank rows are ignored, since the
   * spare row at the bottom is how you add the next marker.
   */
  const usable = markers.filter(draftUsable);

  /**
   * Saves the typed markers as ONE panel, with the report attached if one was.
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
    const entries: ExtractedBiomarker[] = usable.map((m) => {
      const range = draftRange(m);
      return {
        name: m.name.trim(),
        value: Number(m.value),
        unit: m.unit.trim(),
        markerKey: m.markerKey,
        rangeLow: range.low,
        rangeHigh: range.high,
        // Vestigial on this path; the shared type still carries it.
        selected: true,
      };
    });
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
    >
      <div className="min-h-[280px] flex flex-col animate-fade-slide-up">
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

        {stage === "entry" && (
          <div>
            {/* The report, optional. Attached, it stays in view while its
                values are typed and is saved with them for reference. */}
            {file ? (
              <div className="flex items-center gap-3 bg-cream-soft rounded-2xl px-3.5 py-3 mb-4">
                {photo ? (
                  <img src={photo} alt="Your lab report" className="w-12 h-12 object-cover rounded-xl shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-cream-card flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-charcoal-faint" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-charcoal">Report attached</p>
                  <p className="text-[11px] text-charcoal-faint">
                    Your {source === "pdf" ? "file" : "photo"} is saved with these results for reference.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="tap text-xs font-semibold text-charcoal-soft shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="bg-cream-soft rounded-2xl px-3.5 py-3 mb-4">
                <p className="text-sm font-semibold text-charcoal">Type in your results</p>
                <p className="text-[11px] text-charcoal-faint mb-2.5">
                  You can also attach your report (optional), to keep it with these results.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="tap flex items-center gap-1.5 rounded-full bg-cream-card px-3 py-2 text-xs font-semibold text-charcoal"
                  >
                    <Camera size={14} /> Take a photo
                  </button>
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="tap flex items-center gap-1.5 rounded-full bg-cream-card px-3 py-2 text-xs font-semibold text-charcoal"
                  >
                    <FileText size={14} /> Attach a PDF
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5 mb-3">
              {markers.map((m, i) => (
                <MarkerEntryRow
                  key={i}
                  index={i}
                  draft={m}
                  catalogue={catalogue}
                  sex={user.sex}
                  onChange={(patch) => setMarker(i, patch)}
                  onRemove={() => removeMarker(i)}
                />
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
