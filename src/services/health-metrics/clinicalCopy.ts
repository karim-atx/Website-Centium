// NEW CLINICAL COPY FROM THE v6 HEALTH HANDOVER, held back until signed off
// (V6-03 / PB1 D-H12, the same route as services/health-checks/guidance.ts).
//
// REVIEWED gates every sentence below. While it is false, nothing here reaches
// a screen: the heart-rate alert card (HE1.5.a) and the alert settings screen
// stay hidden, and the Blood pressure page in a pregnancy shows the existing,
// already-approved PREGNANCY_FLAG_COPY and BP_DETAIL_FOOTER only (no
// "Pregnancy levels" range card). Flip to true only with an APPROVAL record,
// as guidance.ts does.

export const REVIEWED = false;

export const APPROVAL = null as null | { reviewer: string; approvedOn: string; note: string };

/** Heart-rate alerts (HE1.5.a + OURS-health-hr-alert-settings; V6-23 defaults). */
export const HR_ALERT_COPY = {
  highTitle: "High heart rate while resting",
  lowTitle: "Low heart rate while resting",
  /** Body completion of the board's truncated text (PB1 §5). {bpm}, {min}, {time} filled at render. */
  highBody: (bpm: number, min: number, time: string) =>
    `Your heart rate stayed above ${bpm} bpm for ${min} minutes at ${time} while you seemed inactive. Stress, caffeine, illness or some medicines can raise it. If it keeps happening, talk to your doctor.`,
  lowBody: (bpm: number, min: number, time: string) =>
    `Your heart rate stayed below ${bpm} bpm for ${min} minutes at ${time} while you seemed inactive. Some medicines and very high fitness can lower it. If it keeps happening, or you feel dizzy, talk to your doctor.`,
  emergency: "If you feel faint, have chest pain or trouble breathing, call emergency services.",
  settingsTitle: "Heart rate alerts",
  settingsIntro: "Get a notice when your heart rate stays high or low for 10 minutes while you seem to be resting.",
  quietHours: "Heart rate alerts can reach you during quiet hours.",
  disclaimer:
    "Centium describes what your device recorded. It can't diagnose a heart condition. If you feel faint, have chest pain or trouble breathing, call emergency services.",
  web: "Alerts need a connected device. Device sync is coming.",
} as const;

/** V6-23 defaults and ranges. */
export const HR_ALERT_DEFAULTS = { enabled: true, high: 120, low: 40, minutes: 10, highRange: [100, 150], lowRange: [30, 50], step: 5 } as const;

/** Blood pressure in a pregnancy: the "Pregnancy levels" reference card (OURS-health-bp-pregnancy-levels #4). */
export const PREGNANCY_BP_LEVELS = {
  title: "Pregnancy levels",
  rows: [
    { label: "Urgent", range: "160 or above, or 110 or above" },
    { label: "Same day", range: "140 to 159, or 90 to 109" },
    { label: "Not flagged", range: "Under 140 and under 90" },
  ],
  ownTargets: "Your maternity team may give you your own targets.",
} as const;
