import type { ExtractedBiomarker } from "../../types";

/**
 * Mock "AI reads a lab report photo" step. Real architecture this stands in
 * for: Photo -> OCR/vision model -> biomarker name/value/unit extraction ->
 * user confirmation -> BloodMarker history.
 */
export function parseBiomarkerImage(_imageDataUrl: string): Promise<ExtractedBiomarker[]> {
  const found: ExtractedBiomarker[] = [
    { name: "HbA1c", value: 5.6, unit: "%", selected: true },
    { name: "LDL", value: 1.88, unit: "g/L", selected: true },
    { name: "HDL", value: 1.24, unit: "g/L", selected: true },
    { name: "Triglycerides", value: 1.05, unit: "g/L", selected: false },
    { name: "Vitamin D", value: 31, unit: "ng/mL", selected: true },
    { name: "Fasting Glucose", value: 94, unit: "mg/dL", selected: false },
  ];
  return new Promise((resolve) => setTimeout(() => resolve(found), 1600));
}
