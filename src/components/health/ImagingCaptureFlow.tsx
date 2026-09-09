import React, { useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Camera, Check, FileText, Sparkles } from "lucide-react";
import { parseImagingFile, type ExtractedImagingRecord } from "../../services/ai/parseImagingFile";
import { useApp } from "../../context/AppContext";

type Stage = "capture" | "analyzing" | "results" | "done";
type Source = "camera" | "pdf" | null;

// QA 13.0: "Similar to blood biomarkers, in imaging & tests you should be
// given the option to take a picture or attach files of medical
// imaging/tests whereby AI will read the result and give you the option to
// choose which one you want to add." Mirrors BiomarkerCaptureFlow's
// capture -> analyzing -> results -> done stages exactly, over
// ImagingRecord instead of ExtractedBiomarker.
export const ImagingCaptureFlow: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { addImagingRecord } = useApp();
  const [stage, setStage] = useState<Stage>("capture");
  const [source, setSource] = useState<Source>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [results, setResults] = useState<ExtractedImagingRecord[]>([]);
  // THE FILE ITSELF, kept alongside the preview. The data URL is for showing
  // a thumbnail and feeding the mock parser; the File is what actually gets
  // uploaded. Sending the data URL to Storage would upload a base64 string
  // roughly a third larger than the original for no reason.
  const [file, setFile] = useState<File | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("capture");
    setSource(null);
    setPhoto(null);
    setResults([]);
    setFile(null);
    setSaveError(null);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (picked: File, via: Source) => {
    setSource(via);
    setFile(picked);
    setSaveError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (via === "camera") setPhoto(reader.result as string);
      setStage("analyzing");
      parseImagingFile(reader.result as string).then((res) => {
        setResults(res);
        setStage("results");
      });
    };
    reader.readAsDataURL(picked);
  };

  const toggleResult = (idx: number) =>
    setResults((prev) => prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)));

  /**
   * Saves the selected findings, attaching the captured file to the FIRST of
   * them only.
   *
   * One upload, not one per finding. The file is a single scan or report that
   * happens to have produced several findings, so uploading it once per
   * selected row would put identical copies in the bucket and leave the client
   * deleting one record without freeing the storage the others still hold.
   * Attaching it to the first record keeps exactly one object per capture, and
   * one row owning it.
   *
   * Sequential rather than parallel: each insert reports its own failure, and
   * stopping at the first one avoids reporting a single error for a batch
   * that partly succeeded.
   */
  const addSelected = async () => {
    const selected = results.filter((r) => r.selected);
    if (selected.length === 0) return;
    setSaving(true);
    setSaveError(null);
    for (const [index, r] of selected.entries()) {
      const result = await addImagingRecord(
        { type: r.type, date: r.date, note: r.note },
        index === 0 ? file ?? undefined : undefined
      );
      if (!result.ok) {
        setSaving(false);
        setSaveError(result.message ?? "That couldn't be saved.");
        return;
      }
    }
    setSaving(false);
    setStage("done");
    setTimeout(handleClose, 900);
  };

  return (
    <BottomSheet open={open} onClose={handleClose} title="Scan Imaging or Test">
      <div className="min-h-[280px] flex flex-col animate-fade-slide-up">
        {stage === "capture" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "camera")}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf,image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "pdf")}
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
              Photograph a scan report or attach it as a file — Centium's AI will read it so you can
              confirm what to add.
            </p>
          </div>
        )}

        {stage === "analyzing" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            {photo ? (
              <img src={photo} alt="Captured imaging result" className="w-32 h-32 object-cover rounded-2xl mb-5 opacity-70" />
            ) : (
              source === "pdf" && (
                <div className="w-20 h-20 rounded-2xl bg-cream-soft flex items-center justify-center mb-5">
                  <FileText size={28} className="text-charcoal-faint" />
                </div>
              )
            )}
            <div className="w-14 h-14 rounded-full bg-primary-pale flex items-center justify-center mb-4 animate-pop">
              <Sparkles size={24} className="text-primary animate-pulse" />
            </div>
            <p className="font-display text-lg font-semibold text-charcoal mb-1">Reading your result…</p>
            <p className="text-sm text-charcoal-soft">Identifying study type, date and findings.</p>
          </div>
        )}

        {stage === "results" && (
          <div>
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              We found — select what to add
            </p>
            <div className="space-y-2 mb-5">
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${i}`}
                  onClick={() => toggleResult(i)}
                  className={`tap w-full flex items-center justify-between rounded-2xl px-4 py-3 border transition-colors ${
                    r.selected ? "bg-primary-pale border-primary" : "bg-cream-soft border-transparent"
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-charcoal">{r.type}</p>
                    <p className="text-xs text-charcoal-faint">{r.date}</p>
                    {r.note && <p className="text-xs text-charcoal-soft mt-0.5">{r.note}</p>}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 ${
                      r.selected ? "bg-primary border-primary" : "border-charcoal/20"
                    }`}
                  >
                    {r.selected && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                </button>
              ))}
            </div>
            {saveError && <p className="text-[11px] text-status-high mb-2 text-center">{saveError}</p>}
            <Button
              fullWidth
              size="lg"
              onClick={() => void addSelected()}
              disabled={!results.some((r) => r.selected) || saving}
            >
              {saving ? "Saving…" : "Add selected results"}
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
