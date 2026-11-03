import type { Catalogue } from "../core";

// Website viewport v1, Arabic, area "gym": the Business web pages for the
// Front desk (WB-FD), Analytics (WB-AN), the Marketplace tabs (WB-MA) and the
// Dashboard's See all activity (WB-HO.6), at 1024px and wider. Mobile copy is
// unchanged; labels the mobile screens already use keep their Arabic from the
// existing areas, so only the web-only lines are here.

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "pages/business-ops/frontdesk/FrontDeskParts.web.tsx",
  "pages/business-ops/frontdesk/deskWebTokens.ts",
  "pages/business-ops/frontdesk/FrontDeskPage.web.tsx",
  "pages/business-ops/plans/MembershipsTab.web.tsx",
  "pages/business-ops/plans/coverRows.ts",
  "pages/marketplace/BusinessOperationsTab.web.tsx",
  "pages/business-analytics/AnalyticsShell.web.tsx",
  "pages/business-analytics/AnalyticsParts.web.tsx",
  "pages/business-analytics/overview/OverviewSection.web.tsx",
  "pages/business-analytics/members/MembersSection.web.tsx",
  "pages/business-market/MarketplacePage.web.tsx",
  "pages/business-market/Overview.web.tsx",
];

const webgym: Catalogue = {
  // == Front desk › Memberships (pages/business-ops/plans/MembershipsTab.web, WB-FD.3) ==
  // note: the figures card over the plan list, and the plan page figures.
  "Active plans": "الخطط النشطة",
  "Members on plans": "الأعضاء على الخطط",
  "Add your first plan to start selling memberships.": "أضف خطتك الأولى لتبدأ ببيع العضويات.",
  "{plan} is the most popular plan: {n} of {total} members.": "{plan} هي الخطة الأكثر شيوعًا: {n} من {total} عضوًا.",
  "Members show here once someone buys a plan.": "يظهر الأعضاء هنا عندما يشتري أحدهم خطة.",
  "{n} plans": { zero: "لا خطط", one: "خطة واحدة", two: "خطتان", few: "{n} خطط", many: "{n} خطة", other: "{n} خطة" },
  "Day passes and drop-ins": "التذاكر اليومية والحضور المنفرد",
  "Sold this month": "المبيع هذا الشهر",
  "Sold today": "المبيع اليوم",
  "New this month": "الجدد هذا الشهر",

  // == Analytics (pages/business-analytics/AnalyticsShell.web, WB-AN) ==
  "Analytics sections": "أقسام التحليلات", // note: the accessible name of the section tabs
};

export default webgym;
