import type { Catalogue } from "../core";

// Website viewport v1, Arabic: the web shell (sidebars, the More and Settings
// columns) and the web pages at 1024px and wider. Mobile copy is unchanged; the
// web-only copy says "Click" where the handover lists it (7.3). Labels the
// mobile screens already use (Home, Settings, More, Roles and permissions…)
// keep their Arabic from the existing areas.
//
// note (whole file): "Main navigation" is the sidebar's accessible name
// «التنقل الرئيسي»; "Explore and connect" names its lower list.

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "components/web/SidebarParts.tsx",
  "components/web/WebClientSidebar.tsx",
  "components/web/WebBusinessSidebar.tsx",
  "components/web/WebLayout.tsx",
  "components/web/WebSecondaryLayout.tsx",
  "components/web/WebPageHeader.tsx",
  "pages/business-ops/appointments/ServicesPage.web.tsx",
  "pages/business-ops/classes/ClassRulesPage.web.tsx",
  "pages/marketplace/BusinessDashboard.web.tsx",
  "components/business-dashboard/DashboardParts.web.tsx",
];

const web: Catalogue = {
  // == The sidebars (components/web/WebClientSidebar, WebBusinessSidebar) ==
  "Main navigation": "التنقل الرئيسي",
  "Explore and connect": "استكشف وتواصل",

  // == More and Settings columns (components/web/WebSecondaryLayout) ==
  "{title} sections": "أقسام {title}",

  // == Services and free slots (pages/business-ops/appointments/ServicesPage.web, WB-ST-AP.3) ==
  Visibility: "الظهور", // note: the Services table column (Visible / Hidden)

  // == Class rules (pages/business-ops/classes/ClassRulesPage.web, WB-CS-SC.8) ==
  "Turn the waitlist on to set a size": "شغّل قائمة الانتظار لتحديد حجمها",
  "Create your first class and members can book it on Explore. Until then, every class type uses the rules below.":
    "أنشئ حصتك الأولى ليتمكن الأعضاء من حجزها في «استكشف». حتى ذلك الحين، تتبع كل أنواع الحصص القواعد أدناه.",
  "Create your first class and clients can book it on Explore. Until then, every class type uses the rules below.":
    "أنشئ حصتك الأولى ليتمكن العملاء من حجزها في «استكشف». حتى ذلك الحين، تتبع كل أنواع الحصص القواعد أدناه.",
  "Cancelling later than the late-cancel time loses the booking. Members see these rules when they book.":
    "الإلغاء بعد موعد الإلغاء المتأخر يُفقد الحجز. يرى الأعضاء هذه القواعد عند الحجز.",
  "Cancelling later than the late-cancel time loses the booking. Clients see these rules when they book.":
    "الإلغاء بعد موعد الإلغاء المتأخر يُفقد الحجز. يرى العملاء هذه القواعد عند الحجز.",
  // == WB-HO Dashboard (pages/marketplace/BusinessDashboard.web, components/business-dashboard/DashboardParts.web) ==
  "Change venue": "تغيير المكان",
};

export default web;
