// THE PHONE APP SHARES THIS SESSION (App-Centium ROUND_K.md §2, D-EL1).
//
// In the app, native code needs the account's session too: a widget's
// "+250 ml" or habit tick, and Health Connect syncing in the background, run
// with the app closed. It reads and writes the SAME session cookies this
// client does, in the WebView's cookie jar, so there is only ever one session
// and either side sees the other's refresh on its next read. Nothing is copied
// and no token crosses the bridge; native is only told two things:
//
// - which project and which cookie (configure), once at start-up;
// - after every write of the session, whether it outlives the app: "Remember
//   me" on and not a password recovery, the same decision the cookie adapter
//   makes for the cookie's lifetime (client.ts). Native leaves a session alone
//   that isn't (D-EL5), and writes the cookie jar to disk at once, so a rotated
//   token is never lost to a crash.
//
// ON THE iPHONE the WebView keeps no cookies (Website #122): the session lives
// in ./cookieJar's jar in localStorage, and native keeps a Keychain copy
// (App-Centium IPHONE_ROUND_1.md §4), so it outlives WebKit's storage being
// cleared and native work can use it. So there, a third thing: the persistent
// jar after each auth write (saveJar), or null once it's empty (signed out).
//
// Nothing happens in a browser.
import { Capacitor, registerPlugin } from '@capacitor/core'

interface CentiumSessionPlugin {
  configure(options: { url: string; anonKey: string; storageKey: string }): Promise<void>
  setPersistent(options: { on: boolean }): Promise<void>
  /** iPhone only: the persistent jar's JSON for the Keychain copy, or null when empty. */
  saveJar(options: { jar: string | null }): Promise<void>
}

const CentiumSession = registerPlugin<CentiumSessionPlugin>('CentiumSession')

const inApp = () => Capacitor.isNativePlatform()

/** At start-up, in the app: the Supabase project and the session cookie's name. */
export function describeSessionToNative(url: string, anonKey: string, storageKey: string): void {
  if (!inApp()) return
  CentiumSession.configure({ url, anonKey, storageKey }).catch(() => {
    // An app build without the plugin: native simply never acts.
  })
}

/** The session was just written: whether it outlives the app. Every write, so each is saved to disk. */
export function tellNativeSessionPersists(on: boolean): void {
  if (!inApp()) return
  CentiumSession.setPersistent({ on }).catch(() => {
    // An app build without the plugin: native simply never acts.
  })
}

let lastJar: string | null | undefined

/**
 * iPhone only: the persistent jar after an auth write, for native's Keychain
 * copy (null when the jar is empty: signed out, or "Remember me" off). Sent
 * only when it changed; best effort.
 */
export function tellNativeJar(jar: string | null): void {
  if (Capacitor.getPlatform() !== 'ios' || jar === lastJar) return
  lastJar = jar
  CentiumSession.saveJar({ jar }).catch(() => {
    // An app build without the plugin: there is no Keychain copy.
  })
}
