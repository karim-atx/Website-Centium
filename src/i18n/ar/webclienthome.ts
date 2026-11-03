import type { Catalogue } from "../core";

// Website viewport v1, Arabic: the client area "client-home" (Home, Mind,
// Community, Explore, Professionals) at 1024px and wider. Mobile copy is
// unchanged; labels the mobile screens already use keep their Arabic from the
// existing areas.

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "pages/home/Home.web.tsx",
  "components/dashboard/web/WidgetBoardWeb.tsx",
  "components/dashboard/web/QuickActionsStack.tsx",
  "pages/mind/Mind.web.tsx",
];

const webclienthome: Catalogue = {
  // == WC-HO Home (pages/home/Home.web, components/dashboard/web) ==
  "Add Workout": "إضافة تمرين",

  // == WC-MI Mind hub (pages/mind/Mind.web) ==
  "Habits done today": "العادات المُنجزة اليوم",
  "Day streak": "الأيام المتتالية", // note: the caps label over the lead habit's streak card
};

export default webclienthome;
