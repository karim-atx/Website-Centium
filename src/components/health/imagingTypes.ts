/**
 * The study types offered when adding an imaging or test record.
 *
 * SHARED BY BOTH WAYS IN, which is the reason this is its own module rather
 * than a const in either component: MedicalRecordsSection's "Add manually"
 * sheet and ImagingCaptureFlow's capture form now ask the same question, and
 * two lists would drift into offering different answers for the same column.
 *
 * imaging_records.imaging_type is free text, not an enum, so this is a set of
 * suggestions rather than a constraint — "Other" is what stops it being a
 * cage.
 */
export const imagingTypes = [
  "X-Ray",
  "MRI",
  "CT scan",
  "Ultrasound",
  "Urine analysis",
  "DEXA scan",
  "Other",
];
