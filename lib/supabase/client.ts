import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { getSupabaseConfig } from './config'
import { getRememberMe } from './rememberMe'
import { isPkceVerifierCookie } from './recovery'
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
  cookies: {
    getAll() {
      return parseCookieHeader(document.cookie)
    },
    setAll(cookiesToSet) {
      const remember = getRememberMe()

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

        const finalOptions =
          remember || isRemoval || isVerifier
            ? options
            : { ...options, maxAge: undefined, expires: undefined }

        document.cookie = serializeCookieHeader(name, value, finalOptions)
      }
    },
  },
})

export type SupabaseClient = typeof supabase
