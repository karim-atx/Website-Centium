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

export function webPageFor(pathname: string, isBusiness: boolean): boolean {
  return (isBusiness ? BUSINESS_PAGES : CLIENT_PAGES).some((re) => re.test(pathname));
}
