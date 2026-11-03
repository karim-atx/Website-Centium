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
  "pages/mind/web/JournalWeb.tsx",
  "pages/mind/web/MeditationWeb.tsx",
  "components/mind/usePoseSequence.ts",
  "pages/professionals/Professionals.web.tsx",
  "pages/professionals/web/PrFrameWeb.tsx",
  "pages/professionals/web/DirectoryListWeb.tsx",
  "pages/professionals/web/ProfilePaneWeb.tsx",
  "pages/professionals/web/DataSharingWeb.tsx",
  "pages/professionals/web/MapViewWeb.tsx",
  "pages/professionals/web/ReviewsWeb.tsx",
  "pages/professionals/web/WebParts.tsx",
  "pages/professionals/web/prWebStyles.ts",
  "pages/professionals/web/useDirectoryWeb.ts",
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

  // == WC-MI.2 Journal (pages/mind/web/JournalWeb) ==
  Folders: "المجلدات", // note: the caps label over the journal folder list
  "Click where {folder} should go": "انقر حيث تريد نقل {folder}", // note: web form of "Tap where {folder} should go" (moving a folder in the list)

  // == WC-PR Professionals (pages/professionals/Professionals.web, pages/professionals/web) ==
  "Trainers, dietitians, physiotherapists & doctors": "مدرّبون وأخصائيو تغذية علاجية وأخصائيو علاج طبيعي وأطباء", // note: the page header's line
  "List or map": "قائمة أو خريطة", // note: the List / Map switch, read aloud
  "Nearest first, measured on this device.": "الأقرب أولًا، والمسافة تُقاس على هذا الجهاز.", // note: the web form of "…on this phone."
  "Already work with someone?": "هل تعمل مع مختص بالفعل؟",
  "Ask them for their client code and enter it in Profile to connect and choose what they can see.": "اطلب منه رمز العميل وأدخله في «الملف الشخصي» للتواصل واختيار ما يمكنه رؤيته.",
  "Reviews: {rating}": "التقييمات: {rating}", // note: the profile's rating chip, read aloud; it opens the Reviews page
  "Click again to withdraw your review": "انقر مرة أخرى لسحب تقييمك",
  "Nearest first · {place}": "الأقرب أولًا · {place}",
  "Share your location once, or pick an area.": "شارك موقعك مرة واحدة، أو اختر منطقة.",
  "Your location stays on this device: Centium only uses a rough area (about 10 km) to find who's nearby, and never saves it.": "يبقى موقعك على هذا الجهاز: لا يستخدم Centium إلا منطقة تقريبية (نحو 10 كم) لإيجاد من هم بالقرب منك، ولا يحفظها أبدًا.",
  // == WC-CO Community (pages/community/Community.web, pages/community/web) ==
  "Post as {name}": "النشر باسم {name}", // note: the New post sheet's two buttons (nickname or first name), as "Post as" and "Reply as {name}"
  "PDF": "ملف PDF", // note: a course lesson's kind, before its length ("PDF"), as "{n} PDFs"
  "Check-in": "متابعة", // note: a course lesson's kind; "check-in" is «متابعة» in courses, as "{n} check-ins"
};

export default webclienthome;
