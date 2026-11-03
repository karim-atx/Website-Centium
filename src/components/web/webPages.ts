// Website viewport v1: the routes that render a web layout of their own (a web
// page component behind the 1024 breakpoint). Every other route shows its
// mobile screen in the web shell's centred column (WebLayout › MobileFrame).
// Grows as pages are adapted; see docs/web-viewport/PROGRESS.md.

const CLIENT_PAGES: RegExp[] = [];
const BUSINESS_PAGES: RegExp[] = [
  /^\/app\/?$/, // WB-HO · GY Dashboard (other types: the mobile dashboard in its own centred column)
  /^\/app\/business\/services\/?$/, // WB-ST-AP.3 Services and free slots
  /^\/app\/business\/classes\/rules\/?$/, // WB-CS-SC.8 Class rules
  /^\/app\/business\/classes\/?$/, // WB-CS-SC Schedule (List and Week)
  /^\/app\/business\/classes\/[^/]+\/?$/, // WB-CS-SC.3 Class page · Bookings
  /^\/app\/business\/orders\/?$/, // WB-ST-OR Orders tabs (list-detail)
  /^\/app\/business\/orders\/returns\/[^/]+\/?$/, // WB-ST-OR.2 Return detail
  /^\/app\/business\/orders\/(?!list\/|returns\/)[^/]+\/?$/, // WB-ST-OR.1 Order detail
  /^\/app\/business\/products\/?$/, // WB-ST-PR Products · Showcase, .3 category See all
];

export function webPageFor(pathname: string, isBusiness: boolean): boolean {
  return (isBusiness ? BUSINESS_PAGES : CLIENT_PAGES).some((re) => re.test(pathname));
}
