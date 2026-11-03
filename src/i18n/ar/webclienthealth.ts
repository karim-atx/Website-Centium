import type { Catalogue } from "../core";

// Website viewport v1, Arabic: Client · Health at 1024px and wider (area
// client-health: the Health overview, the metric pages, Records, health
// checks). Mobile copy is unchanged; the web-only copy says "Click" where the
// handover lists it (7.3), «انقر» as the workout area already says it. Health
// wording stays as the app has it: every web string reuses the existing
// health Arabic where one exists.

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "pages/health/web/HealthWebKit.tsx",
  "pages/health/web/Health.web.tsx",
  "components/health/metric/MetricKit.web.tsx",
  "components/health/records/BiomarkersTab.web.tsx",
  "pages/health/web/Records.web.tsx",
  "pages/health/web/HealthSources.web.tsx",
  "components/health/records/RecordsTabs.web.tsx",
];

const webclienthealth: Catalogue = {
  // == Health overview (pages/health/web/Health.web, WC-HE) ==
  "Click + to log a drink": "انقر + لتسجيل مشروب", // note: health wording (mobile «اضغط + لتسجيل مشروب», 7.3)
  "Click to add one": "انقر لإضافة قراءة", // note: health wording (mobile «اضغط لإضافة قراءة», 7.3)

  // == Biomarkers (components/health/records/BiomarkersTab.web, WC-HE.9) ==
  "View history": "عرض السجل", // note: health wording (View «عرض» + History «السجل», as the marker history is named)

  // == Labs (components/health/records/RecordsTabs.web, WC-HE.9.1) ==
  "{n} in range": "{n} ضمن النطاق", // note: health wording (In range «ضمن النطاق», as "{n} out of range" «{n} خارج النطاق»)
};

export default webclienthealth;
