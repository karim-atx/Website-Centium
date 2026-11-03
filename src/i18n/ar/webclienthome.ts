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
  "pages/mind/web/HabitsWeb.tsx",
  "pages/community/Community.web.tsx",
  "pages/community/web/CommunityFrameWeb.tsx",
  "pages/community/web/ForumWeb.tsx",
  "pages/community/web/ForumComposeWeb.tsx",
  "pages/community/web/ForumPostWeb.tsx",
  "pages/community/web/NicknameWeb.tsx",
  "pages/community/web/CoursesWeb.tsx",
  "pages/community/web/CourseWeb.tsx",
  "pages/community/web/MenuWeb.tsx",
];

const webclienthome: Catalogue = {
  // == WC-HO Home (pages/home/Home.web, components/dashboard/web) ==
  "Add Workout": "إضافة تمرين",

  // == WC-MI Mind hub (pages/mind/Mind.web) ==
  "Habits done today": "العادات المُنجزة اليوم",
  "Day streak": "الأيام المتتالية", // note: the caps label over the lead habit's streak card

  // == WC-MI.3 Achievements (pages/mind/web/AchievementsWeb) ==
  "Nothing unlocked yet. Log a meal or a workout to earn your first badge.": "لم يُفتح شيء بعد. سجّل وجبة أو تمرينًا لتنال أول شارة.",

  // == WC-MI.1 Habits (pages/mind/web/HabitsWeb) ==
  "{habit} colour: {colour}. Click to change": "لون {habit}: {colour}. انقر للتغيير",
  "best {n}": "الأفضل {n}", // note: a habit's longest streak in days, after its current one
  "Add a habit to start a streak.": "أضف عادة لتبدأ سلسلة.",
  "Auto streaks count from what you log across the app.": "تُحتسب السلاسل التلقائية مما تسجّله في التطبيق كله.",

  // == WC-CO Community (pages/community/Community.web, pages/community/web) ==
  "Post as {name}": "النشر باسم {name}", // note: the New post sheet's two buttons (nickname or first name), as "Post as" and "Reply as {name}"
  "PDF": "ملف PDF", // note: a course lesson's kind, before its length ("PDF"), as "{n} PDFs"
  "Check-in": "متابعة", // note: a course lesson's kind; "check-in" is «متابعة» in courses, as "{n} check-ins"
};

export default webclienthome;
