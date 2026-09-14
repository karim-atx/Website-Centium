import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { getSupabaseConfig } from './config'
import { getRememberMe } from './rememberMe'
import {
  getRecoveryPendingUserId,
  isPkceVerifierCookie,
  isRecoveryExchangeInFlight,
} from './recovery'
import { suspensionAwareFetch } from './suspension'
import type { Database } from './database.types'

// Single browser client for the whole app. createBrowserClient memoises
// internally, but keeping one module-level instance also keeps a single auth
// state listener and one realtime socket.
const { url, anonKey } = getSupabaseConfig()

// A custom cookie adapter, purely so "Remember me" can work.
//
// createBrowserClient offers no configuration for session lifetime. It ignores
// `auth.storage` outright (it warns and manages cookies regardless), and it
// ignores `cookieOptions.maxAge` too — cookies.js reapplies its own 400-day
// default *after* spreading whatever you pass:
//
//   const setCookieOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options?.cookieOptions,
//                              maxAge: DEFAULT_COOKIE_OPTIONS.maxAge };
//
// Supplying getAll/setAll is the supported way in: the library hands us each
// cookie and we do the writing, so we decide what lands in the header. Dropping
// Max-Age and Expires yields a browser-session cookie, which the browser
// discards on close. That is the whole feature.
//
// parseCookieHeader/serializeCookieHeader are @supabase/ssr's own exported
// helpers, used so this encodes cookies identically to the default path rather
// than hand-rolling a parser.
export const supabase = createBrowserClient<Database>(url, anonKey, {
  // A suspended account is only knowable from the HTTP response. auth-js
  // removes the session itself when a refresh fails and hands subscribers a
  // bare SIGNED_OUT with no error, so this wrapper is the last point at which
  // the reason still exists. It inspects nothing but failed /auth/v1/ calls.
  // See ./suspension.
  global: { fetch: suspensionAwareFetch() },
  cookies: {
    getAll() {
      return parseCookieHeader(document.cookie)
    },
    setAll(cookiesToSet) {
      const remember = getRememberMe()

      // A RECOVERY SESSION IS NEVER PERSISTED, whatever the preference says.
      //
      // getRememberMe() defaults to true when unset, and sessionStorage is
      // per-tab -- so a reset link opened from an email, which is always a new
      // tab, reads true and used to get the library's 400-day cookie. The
      // preference was never the user's answer there: they never saw the
      // checkbox on that visit.
      //
      // BOTH SIGNALS, because neither covers the whole window. The in-flight
      // check needs ?code= in the URL and so only catches the exchange itself;
      // once auth-js strips the code, an automatic token refresh -- or the
      // updateUser() call that ends the flow -- would write the cookie again
      // with remember still true and quietly restore the 400 days. The pending
      // flag covers exactly the rest: set when PASSWORD_RECOVERY arrives,
      // cleared only once the password has actually changed.
      //
      // Read per call rather than hoisted: setAll runs on refreshes minutes
      // apart, and the flag can be cleared between two of them.
      const recovering = isRecoveryExchangeInFlight() || getRecoveryPendingUserId() !== null

      for (const { name, value, options } of cookiesToSet) {
        // maxAge: 0 is a DELETION, not a persistence setting — it is how the
        // library expires a cookie on sign-out and when replacing stale
        // chunks. Stripping it would turn a delete into "write an empty
        // session cookie", leaving the old cookie alive until the browser
        // closed. Removals pass through untouched no matter the preference.
        const isRemoval = options?.maxAge === 0

        // PKCE verifiers are not session credentials, they are short-lived
        // technical tokens that must still exist when an emailed link is
        // opened later — possibly after the browser has been closed. Scoping
        // them to the session silently broke password-reset links for anyone
        // who had unticked "Remember me".
        const isVerifier = isPkceVerifierCookie(name)

        // Removals and verifiers win over everything: the first would become
        // a write rather than a delete, and the second has to outlive the
        // browser even here -- the exchange rewrites the verifier it is
        // consuming. Only then does persistence become a question, and it is
        // answered no if either the user said so or this is a recovery.
        const keepAsIs = isRemoval || isVerifier || (remember && !recovering)

        const finalOptions = keepAsIs
          ? options
          : { ...options, maxAge: undefined, expires: undefined }

        document.cookie = serializeCookieHeader(name, value, finalOptions)
      }
    },
  },
})

export type SupabaseClient = typeof supabase
