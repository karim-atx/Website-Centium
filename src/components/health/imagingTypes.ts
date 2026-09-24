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
 *
 * "Urine analysis" IS NOT OFFERED HERE ANY MORE. It is lab work: a sample
 * sent to a laboratory that comes back as named analytes with reference
 * ranges, which is exactly what blood_markers holds and exactly what the
 * Biomarkers tab draws. Filed as an imaging record it became an
 * imaging_records row instead — so the same clinical result was shared under
 * `medical_history` rather than `lab_results`, and a client who had granted
 * their doctor lab results but not medical history would not have been
 * sharing it at all. That is a consent divergence, not untidiness.
 *
 * DEXA STAYS, because a DEXA scan is an imaging study: it is performed on a
 * machine, produces images, and reports densities rather than analytes.
 */
export const imagingTypes = [
  "X-Ray",
  "MRI",
  "CT scan",
  "Ultrasound",
  "DEXA scan",
  "Other",
];
