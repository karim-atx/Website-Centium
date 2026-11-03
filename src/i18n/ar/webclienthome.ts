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
  "pages/mind/web/MindSectionWeb.tsx",
  "pages/mind/web/ChipStrip.tsx",
  "pages/mind/web/AchievementsWeb.tsx",
];

const webclienthome: Catalogue = {
  // == WC-HO Home (pages/home/Home.web, components/dashboard/web) ==
  "Add Workout": "إضافة تمرين",

  // == WC-MI Mind hub (pages/mind/Mind.web) ==
  "Habits done today": "العادات المُنجزة اليوم",
  "Day streak": "الأيام المتتالية", // note: the caps label over the lead habit's streak card

  // == WC-MI.3 Achievements (pages/mind/web/AchievementsWeb) ==
  "Nothing unlocked yet. Log a meal or a workout to earn your first badge.": "لم يُفتح شيء بعد. سجّل وجبة أو تمرينًا لتنال أول شارة.",
};

export default webclienthome;
