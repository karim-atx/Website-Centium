import type { Catalogue } from "../core";

// Website viewport v1, Arabic, area "cs" (Business · Schedule, the Classes and
// Store dashboards, Orders, Products and Appointments at 1024px and wider).
// Mobile copy is unchanged; web-only copy says "Click" where the handover
// lists it (7.3). Strings the mobile screens already use keep their Arabic
// from the existing areas.

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "pages/business-ops/classes/SchedulePage.web.tsx",
  "pages/business-ops/classes/SessionPage.web.tsx",
];

const webcs: Catalogue = {
  // == Schedule (pages/business-ops/classes/SchedulePage.web, WB-CS-SC) ==
  "Click Add class to schedule one.": "انقر «إضافة حصة» لجدولة واحدة.", // note: web copy of «Tap Add class…» (7.3); «انقر» as in workout
  // == Class page (pages/business-ops/classes/SessionPage.web, WB-CS-SC.3) ==
  "Showing {shown} of {total}": "يُعرض {shown} من {total}", // note: under the two-column roster, before "See all {n}"
  "Click to choose who teaches it": "انقر لاختيار من يدرّسها", // note: web copy of «Tap to choose…» (7.3)
};

export default webcs;
