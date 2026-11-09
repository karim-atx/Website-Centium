// The cookie jar the iPhone app keeps itself, as pure functions over two
// key-value stores (lib/supabase/cookieJar.ts wires them to localStorage and
// sessionStorage). Tested in src/services/auth/cookieJar.test.ts.
//
// It stores exactly what serializeCookieHeader writes and answers exactly what
// document.cookie would read ("a=1; b=2"), so parseCookieHeader and every other
// reader see the same thing on the iPhone as in a browser. Only what a browser
// does with the attributes is reproduced:
//   - Max-Age=0, a negative Max-Age or a past Expires deletes the cookie;
//   - Max-Age or Expires in the future keeps it until then, across launches
//     (the persistent store);
//   - neither makes a browser-session cookie, gone when the app is closed
//     (the session store): "Remember me" off.
// Path, Domain, SameSite and Secure don't change anything here: the app has
// one origin and every auth cookie is written for "/".

export interface JarStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface JarStores {
  persistent: JarStore
  session: JarStore
}

type Entry = { v: string; e?: number }
type Jar = Record<string, Entry>

export const JAR_KEY = 'centium.cookieJar'

function load(store: JarStore): Jar {
  try {
    const parsed = JSON.parse(store.getItem(JAR_KEY) ?? '{}') as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Jar) : {}
  } catch {
    return {}
  }
}

function save(store: JarStore, jar: Jar): void {
  if (Object.keys(jar).length === 0) store.removeItem(JAR_KEY)
  else store.setItem(JAR_KEY, JSON.stringify(jar))
}

/** The cookie header document.cookie would give: unexpired cookies, session ones first as written. */
export function jarRead(stores: JarStores, now: number): string {
  const persistent = load(stores.persistent)
  const session = load(stores.session)
  const parts: string[] = []
  for (const [name, entry] of Object.entries(session)) {
    if (!(name in persistent)) parts.push(`${name}=${entry.v}`)
  }
  for (const [name, entry] of Object.entries(persistent)) {
    if (entry.e === undefined || entry.e > now) parts.push(`${name}=${entry.v}`)
  }
  return parts.join('; ')
}

/** One `document.cookie = header` write, as a browser would apply it. */
export function jarWrite(stores: JarStores, header: string, now: number): void {
  const [pair, ...attributes] = header.split(';')
  const eq = pair.indexOf('=')
  if (eq < 1) return
  const name = pair.slice(0, eq).trim()
  const value = pair.slice(eq + 1).trim()

  let expiresAt: number | undefined
  for (const attribute of attributes) {
    const i = attribute.indexOf('=')
    const key = (i < 0 ? attribute : attribute.slice(0, i)).trim().toLowerCase()
    const raw = i < 0 ? '' : attribute.slice(i + 1).trim()
    if (key === 'max-age') {
      const seconds = Number(raw)
      // Max-Age wins over Expires, as in a browser.
      if (Number.isFinite(seconds)) expiresAt = now + seconds * 1000
    } else if (key === 'expires' && !attributes.some((a) => a.trim().toLowerCase().startsWith('max-age='))) {
      const at = Date.parse(raw)
      if (Number.isFinite(at)) expiresAt = at
    }
  }

  const persistent = load(stores.persistent)
  const session = load(stores.session)
  delete persistent[name]
  delete session[name]
  if (expiresAt === undefined) session[name] = { v: value }
  else if (expiresAt > now) persistent[name] = { v: value, e: expiresAt }
  // Otherwise it was a deletion: gone from both.

  // Expired entries go whenever the jar is written.
  for (const [n, entry] of Object.entries(persistent)) if (entry.e !== undefined && entry.e <= now) delete persistent[n]
  save(stores.persistent, persistent)
  save(stores.session, session)
}
