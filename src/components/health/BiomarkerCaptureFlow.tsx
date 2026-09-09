import React, { useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Camera, Check, FileText, Sparkles } from "lucide-react";
import { parseBiomarkerImage } from "../../services/ai/parseBiomarkerImage";
import type { ExtractedBiomarker } from "../../types";
import { useApp } from "../../context/AppContext";

type Stage = "capture" | "analyzing" | "results" | "done";
type Source = "camera" | "pdf" | null;

export const BiomarkerCaptureFlow: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { recordBiomarkers } = useApp();
  const [stage, setStage] = useState<Stage>("capture");
  const [source, setSource] = useState<Source>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [results, setResults] = useState<ExtractedBiomarker[]>([]);
  // THE FILE ITSELF, kept alongside the preview. The data URL feeds the mock
  // parser and the thumbnail; the File is what gets uploaded. Sending the data
  // URL to Storage would upload a base64 string a third larger than the
  // original for no benefit.
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("capture");
    setSource(null);
    setPhoto(null);
    setResults([]);
    setFile(null);
    setSaving(false);
    setSaveError(null);
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
      // PDFs aren't rendered to a preview thumbnail here — the mock "AI"
      // parse step reads it the same way either way (prototype-level).
      if (via === "camera") setPhoto(reader.result as string);
      setStage("analyzing");
      parseBiomarkerImage(reader.result as string).then((res) => {
        setResults(res);
        setStage("results");
      });
    };
    reader.readAsDataURL(picked);
  };

  const toggleResult = (name: string) =>
    setResults((prev) => prev.map((r) => (r.name === name ? { ...r, selected: !r.selected } : r)));

  /**
   * Saves the confirmed results as ONE panel, with the report attached.
   *
   * A panel is one lab report, so every selected marker belongs to a single
   * panel and a single upload — not one panel per marker, which would scatter
   * one report's results across several and break the grouping the history
   * view depends on.
   *
   * These values are CONFIRMED, not raw machine output: the user has just
   * ticked each one. That is what makes panels/ the right prefix and keeps
   * extracted_biomarkers out of this entirely.
   */
  const addSelected = async () => {
    const selected = results.filter((r) => r.selected);
    if (selected.length === 0) return;
    setSaving(true);
    setSaveError(null);
    const result = await recordBiomarkers(selected, file ?? undefined);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.message ?? "Couldn't save these results.");
      return;
    }
    setStage("done");
    setTimeout(handleClose, 900);
  };

  return (
    <BottomSheet open={open} onClose={handleClose} title="Scan Blood Work">
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
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
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
              Photograph a lab report or attach it as a PDF — Centium's AI will read the biomarkers
              so you can confirm which ones to add.
            </p>
          </div>
        )}

        {stage === "analyzing" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            {photo ? (
              <img src={photo} alt="Captured lab report" className="w-32 h-32 object-cover rounded-2xl mb-5 opacity-70" />
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
            <p className="font-display text-lg font-semibold text-charcoal mb-1">
              Reading your results…
            </p>
            <p className="text-sm text-charcoal-soft">Identifying biomarkers, values and units.</p>
          </div>
        )}

        {stage === "results" && (
          <div>
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              We found — select what to add
            </p>
            <div className="space-y-2 mb-5">
              {results.map((r) => (
                <button
                  key={r.name}
                  onClick={() => toggleResult(r.name)}
                  className={`tap w-full flex items-center justify-between rounded-2xl px-4 py-3 border transition-colors ${
                    r.selected ? "bg-primary-pale border-primary" : "bg-cream-soft border-transparent"
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-charcoal">{r.name}</p>
                    <p className="text-xs text-charcoal-faint">
                      {r.value} {r.unit}
                    </p>
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
