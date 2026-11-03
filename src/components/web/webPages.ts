// Website viewport v1: the routes that render a web layout of their own (a web
// page component behind the 1024 breakpoint). Every other route shows its
// mobile screen in the web shell's centred column (WebLayout › MobileFrame).
// Grows as pages are adapted; see docs/web-viewport/PROGRESS.md.

const CLIENT_PAGES: RegExp[] = [
  /^\/app\/workout\/?$/, // WC-WO Workout (Routines, Library, History, Metrics)
];
const BUSINESS_PAGES: RegExp[] = [
  /^\/app\/?$/, // WB-HO · GY Dashboard (other types: the mobile dashboard in its own centred column)
  /^\/app\/business\/services\/?$/, // WB-ST-AP.3 Services and free slots
  /^\/app\/business\/classes\/rules\/?$/, // WB-CS-SC.8 Class rules
];

export function webPageFor(pathname: string, isBusiness: boolean): boolean {
  return (isBusiness ? BUSINESS_PAGES : CLIENT_PAGES).some((re) => re.test(pathname));
}
