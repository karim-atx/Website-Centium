import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { isSevere } from "../../services/blood-pressure/classify";
import { SEVERE_READING_MESSAGE } from "../../services/blood-pressure/guidance";
import { PREGNANCY_FLAG_COPY } from "../../services/pregnancy/checks";
import type { PregnancyFlag } from "../../services/pregnancy/checks";
import type { BloodPressureInput } from "../../services/blood-pressure/reading";
import { clock12 } from "../../utils/time12";
import { HealthPopup } from "./metric/HealthPopup";
import { BpHowToMeasureSheet } from "./BpHowToMeasureSheet";

// HE1.6.a "Blood pressure · very high reading": the popup the log sheet
// (HE1.6.1, Health B) opens after saving a very high reading, and the same
// popup the Blood pressure page opens after "Measure again" saves.
//
// SAFETY (KEEP-SAFETY K0, OURS-health-bp-pregnancy-levels #8):
// - adult: only when isSevere() (strictly above 180 and/or above 120), text
//   SEVERE_READING_MESSAGE word for word, never truncated;
// - pregnancy: only the Urgent level opens it, heading and text
//   PREGNANCY_FLAG_COPY verbatim; the adult message never shows in a
//   pregnancy. Same day opens nothing (the page card shows it).

/** Whether a just-saved reading opens this popup. `pregnancyFlag` = usePregnancyFlags().bp(reading) (null outside a pregnancy). */
export function shouldOpenBpVeryHigh(
  reading: { systolic: number; diastolic: number },
  pregnancy: { replacesBpBands: boolean; bp: (r: { systolic: number; diastolic: number }) => PregnancyFlag | null }
): boolean {
  if (pregnancy.replacesBpBands) return pregnancy.bp(reading)?.level === "urgent";
  return isSevere(reading.systolic, reading.diastolic);
}

const ARM = { left: "left arm", right: "right arm" } as const;

/** "186/124 mmHg · just now · left arm, sitting" (HE1.6.a #55). */
function metaLine(r: BloodPressureInput & { recordedAt?: string }): string {
  const when = !r.recordedAt || Date.now() - new Date(r.recordedAt).getTime() < 5 * 60000 ? "just now" : clock12(r.recordedAt);
  const where = [r.arm ? ARM[r.arm] : null, r.position ?? null].filter(Boolean).join(", ");
  return [`${r.systolic}/${r.diastolic} mmHg`, when, where || null].filter(Boolean).join(" · ");
}

export const BpVeryHighPopup: React.FC<{
  open: boolean;
  reading: (BloodPressureInput & { recordedAt?: string }) | null;
  /** True while a pregnancy replaces the adult bands (usePregnancyFlags().replacesBpBands). */
  pregnancy: boolean;
  onClose: () => void;
  /** "Measure again" → HE1.6.1 for a new reading. */
  onMeasureAgain: () => void;
}> = ({ open, reading, pregnancy, onClose, onMeasureAgain }) => {
  const [howOpen, setHowOpen] = useState(false);
  if (!reading) return null;
  return (
    <>
      <HealthPopup
        open={open && !howOpen}
        onClose={onClose}
        dismissOnBackdrop={false}
        role="alertdialog"
        tile={{ background: "#FCEDEC", darkBackground: "#3C2A30", icon: <AlertCircle size={19} className="text-[#A4231C] dark:text-[#FF6B5E]" /> }}
        title={pregnancy ? PREGNANCY_FLAG_COPY.bpUrgentLabel : "Very high reading"}
        meta={metaLine(reading)}
        body={<p>{pregnancy ? PREGNANCY_FLAG_COPY.bpUrgent : SEVERE_READING_MESSAGE}</p>}
        link={{ label: "How to measure", onClick: () => setHowOpen(true) }}
        secondary={{ label: "Close", onClick: onClose }}
        primary={{ label: "Measure again", onClick: onMeasureAgain }}
      />
      <BpHowToMeasureSheet open={open && howOpen} onClose={() => setHowOpen(false)} />
    </>
  );
};
