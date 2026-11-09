// Where the website's cookies live: document.cookie everywhere except the
// iPhone app, which keeps its own jar (./cookieJarModel).
//
// WHY THE iPHONE IS DIFFERENT. The iOS app's page is capacitor://localhost,
// and WKWebView keeps no cookies for that scheme: document.cookie drops every
// write, even on the same page. Measured on TestFlight 0.1.0 (3), iOS 27.2,
// 2026-11-09 (App-Centium scripts/diagnostics/cookie-check.js). So the
// @supabase/ssr session existed only in memory: sign-in bounced back to the
// sign-in screen as the page reloaded to bind its account, and REST calls went
// out signed out, which sent an onboarded account into onboarding and failed
// "Couldn't finish setting up your account".
//
// WHY NOT CAPACITOR'S COOKIE PATCH (CapacitorCookies). It turns every
// document.cookie read into a synchronous prompt() to native code, which also
// re-copies the whole native jar into WebKit on each read, and the auth client
// reads cookies on every request; and it stores them for the URL
// capacitor://localhost, which Foundation's cookie storage isn't built for.
// WebKit's localStorage does persist on that origin (the same check: the
// cookie check's own record survived every reload and relaunch), and reading
// it costs microseconds. A Keychain copy, which outlives WebKit's storage,
// is planned for iPhone Round 1 (App-Centium docs/mobile-round-z).
//
// Every reader and writer of the auth cookies goes through here: the Supabase
// client's cookie adapter, the tab's identity (tabIdentity), the stored-token
// check (services/auth) and the recovery check (./recovery).
import { Capacitor } from '@capacitor/core'
import { jarRead, jarWrite, type JarStores } from './cookieJarModel'

const IPHONE_APP = Capacitor.getPlatform() === 'ios'

// Through globalThis: lib/ is also compiled without the DOM types (as in ./tabIdentity).
const g = globalThis as {
  document?: { cookie: string }
  localStorage?: JarStores['persistent']
  sessionStorage?: JarStores['session']
}

function stores(): JarStores | null {
  try {
    return g.localStorage && g.sessionStorage ? { persistent: g.localStorage, session: g.sessionStorage } : null
  } catch {
    return null
  }
}

/** What document.cookie would read: the cookie header. */
export function readCookieHeader(): string {
  if (!g.document) return ''
  if (!IPHONE_APP) return g.document.cookie
  const s = stores()
  return s ? jarRead(s, Date.now()) : ''
}

/** `document.cookie = header`, wherever the cookies live. */
export function writeCookie(header: string): void {
  if (!g.document) return
  if (!IPHONE_APP) {
    g.document.cookie = header
    return
  }
  const s = stores()
  if (s) jarWrite(s, header, Date.now())
}
