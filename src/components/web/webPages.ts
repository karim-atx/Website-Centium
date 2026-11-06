// Website viewport v1: the routes that render a web layout of their own (a web
// page component behind the 1024 breakpoint). Every other route shows its
// mobile screen in the web shell's centred column (WebLayout › MobileFrame).
// Grows as pages are adapted; see docs/web-viewport/PROGRESS.md.

const CLIENT_PAGES: RegExp[] = [
  /^\/app\/?$/, // WC-HO Home
  /^\/app\/mind\/?$/, // WC-MI Mind hub (the sections keep their mobile layout)
  /^\/app\/food\/?$/, // WC-FO Food (Diary, Goals & Macros, Custom)
  /^\/app\/food\/nutrient-summary\/?$/, // WC-FO.4 Nutrient Summary
  /^\/app\/health\/?$/, // WC-HE Health overview
  /^\/app\/health\/(water|steps|sleep|calories|heart-rate|blood-pressure|weight)\/?$/, // WC-HE.1-.7 metric pages
  /^\/app\/health\/records\/?$/, // WC-HE.9 Biomarkers & imaging
  /^\/app\/health\/sources\/?$/, // WC-HE.G Sources and guidelines
  /^\/app\/more\/?$/, // the client More column (decision 4)
  /^\/app\/workout\/?$/, // WC-WO Workout (Routines, Library, History, Metrics)
  /^\/app\/profile\/?$/, // WC-MO.1 My Profile
  /^\/app\/subscription\/?$/, // WC-MO.6 Centium Premium
  /^\/app\/mind\/?$/, // WC-MI Mind hub
  /^\/app\/mind\/achievements\/?$/, // WC-MI.3 Achievements
  /^\/app\/mind\/habits\/?$/, // WC-MI.1 Habits
  /^\/app\/mind\/journal\/?$/, // WC-MI.2 Journal
  /^\/app\/mind\/meditation\/?$/, // WC-MI.4 Meditation
  /^\/app\/professionals\/?$/, // WC-PR Professionals (the list; ?view=map is WC-PR.2 Map)
  /^\/app\/professionals\/(?!(?:verification|calendar|templates|meal-plans|health-metrics)\/?$)[^/]+\/?$/, // WC-PR / WC-PR.1 Professionals with the selected profile
  /^\/app\/professionals\/[^/]+\/reviews\/?$/, // WC-PR.3 Reviews
  /^\/app\/forum\/?$/, // WC-CO Community (the Forum and Courses tabs)
  /^\/app\/forum\/new\/?$/, // WC-CO.2 New post (the side sheet over the forum)
  /^\/app\/forum\/nickname\/?$/, // WC-CO.3 Choose a nickname (changing it)
  /^\/app\/forum\/post\/[^/]+\/?$/, // WC-CO.1 Post
  /^\/app\/forum\/courses\/(?!(?:mine|certificates)\/?$)[^/]+\/?$/, // WC-CO.4 a course (not My courses; lessons and certificates stay mobile)
  /^\/app\/health\/checks\/?$/, // WC-HE.8 Your health checks (general plan; the other plans in a centred column)
  /^\/app\/messages\/?$/, // WC-MO.4 Messages (list and chat)
  /^\/app\/calendar\/?$/, // WC-MO.3 Calendar (month and day list)
];
const BUSINESS_PAGES: RegExp[] = [
  /^\/app\/?$/, // WB-HO · GY, · CS and · ST Dashboards
  /^\/app\/business\/services\/?$/, // WB-ST-AP.3 Services and free slots
  /^\/app\/business\/classes\/rules\/?$/, // WB-CS-SC.8 Class rules
  /^\/app\/business\/classes\/?$/, // WB-CS-SC Schedule (List and Week)
  /^\/app\/business\/classes\/[^/]+\/?$/, // WB-CS-SC.3 Class page · Bookings
  /^\/app\/business\/orders\/?$/, // WB-ST-OR Orders tabs (list-detail)
  /^\/app\/business\/orders\/returns\/[^/]+\/?$/, // WB-ST-OR.2 Return detail
  /^\/app\/business\/orders\/(?!list\/|returns\/)[^/]+\/?$/, // WB-ST-OR.1 Order detail
  /^\/app\/business\/products\/?$/, // WB-ST-PR Products · Showcase, .3 category See all
  /^\/app\/business\/appointments\/?$/, // WB-ST-AP Appointments (list-detail)
  /^\/app\/business\/appointments\/(?!day\/?$)[^/]+\/?$/, // WB-ST-AP.1 Appointment detail
  /^\/app\/business\/operations\/?$/, // WB-FD Front desk (gym; other types: their mobile tab in its own centred column)
  /^\/app\/business\/marketplace\/?$/, // WB-MA Marketplace tabs (photos, preview, See all and the offer editor keep the centred column)
  /^\/app\/business\/analytics(\/.*)?$/, // WB-AN Analytics (sections without a web design: their mobile view in a centred column)
  /^\/app\/business\/orders\/list\/[^/]+\/?$/, // WB-ST-OR.3 See all lists
  /^\/app\/business\/appointments\/day\/?$/, // WB-ST-AP.4 Day list
];

/** Professional pages with a web layout of their own (Professional handover v1, section 5). */
export const PRO_PAGES: RegExp[] = [
  /^\/app\/pro\/?$/, // WP-HO · FC / · NU / · CO Home (header bar, trend card 7 + lane card 5)
  /^\/app\/pro\/calendar\/availability\/?$/, // WP-CA.5 Availability (Working hours + Time off | Session types + Booking)
  /^\/app\/pro\/calendar\/?$/, // WP-CA.1-.4 Calendar (Month 7 + 5, the Week time grid, Day 7 + 5, Year 6 across)
  /^\/app\/pro\/library(\/(programmes|meal-plans))?\/?$/, // WP-LI.1 / .2 Library lists (inner screens: the centred column inside the page)
  /^\/app\/pro\/meal-plans(\/(plans|journals|recipes|targets))?\/?$/, // WP-NU-MP.1 Plans home (the other areas: the centred column inside the page)
  /^\/app\/pro\/insights(\/(activity|nutrition|vitals|biomarkers))?\/?$/, // WP-CO-IN.1-.4 Insights
  /^\/app\/pro\/clients\/?$/, // WP-CL Clients (list-detail)
  /^\/app\/pro\/clients\/[^/]+(\/(overview|plan|progress|sessions|notes|files|care-plan|health-records|trends|appointments))?\/?$/, // WP-CL.1 / · NU / WP-CO-CL.1 client and patient page (Client insights keeps its column)
];

export function webPageFor(pathname: string, isBusiness: boolean, isPro = false): boolean {
  return (isBusiness ? BUSINESS_PAGES : isPro ? PRO_PAGES : CLIENT_PAGES).some((re) => re.test(pathname));
}
