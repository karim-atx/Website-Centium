import type { ImagingRecord } from "../../types";

export interface ExtractedImagingRecord extends Omit<ImagingRecord, "id"> {
  selected: boolean;
}

/**
 * Mock "AI reads a scan/imaging document" step, mirroring
 * `parseBiomarkerImage`. Real architecture this stands in for:
 * Photo/PDF -> vision model -> study type/date/finding extraction ->
 * user confirmation -> ImagingRecord history.
 */
export function parseImagingFile(_fileDataUrl: string): Promise<ExtractedImagingRecord[]> {
  const today = new Date().toISOString().slice(0, 10);
  const found: ExtractedImagingRecord[] = [
    { type: "X-Ray", date: today, note: "No acute findings noted on the report.", selected: true },
    { type: "Follow-up recommended", date: today, note: "Report suggests a follow-up review in 6 weeks.", selected: false },
  ];
  return new Promise((resolve) => setTimeout(() => resolve(found), 1600));
}
