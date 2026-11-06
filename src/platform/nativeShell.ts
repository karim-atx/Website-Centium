// The two moments the phone's own side has to hear about from the website
// (App-Centium ROUND_J.md §1.3, §1.4). Native only, best effort: neither may
// ever hold up a language change or a sign-out.
import { isNative } from "./index";
import { CentiumNative } from "./native";
import { refreshNativePushLocale } from "./push";

let mirrored: "en" | "ar" | null = null;

/**
 * The app's language, for what Android (and later iOS) draws itself: the
 * notification channel names, widget labels and app shortcuts. Called with the
 * active language whenever it settles or changes.
 */
export function mirrorLanguage(language: "en" | "ar"): void {
  if (!isNative() || mirrored === language) return;
  mirrored = language;
  CentiumNative.setLanguage({ language }).catch(() => {
    mirrored = null;
  });
  // The push row's locale: the Database writes notification text in it.
  refreshNativePushLocale();
}

const SIGN_OUT_WAIT_MS = 2000;

/**
 * Sign-out on the phone's side: clears the widgets' snapshot and the
 * shortcuts, and stops a running session. Waits at most two seconds, then
 * lets the sign-out carry on regardless.
 */
export async function nativeSignedOut(): Promise<void> {
  if (!isNative()) return;
  await Promise.race([
    CentiumNative.signedOut().catch((e: unknown) => {
      console.error("[native] Sign-out on the phone's side failed:", e);
    }),
    new Promise<void>((resolve) => setTimeout(resolve, SIGN_OUT_WAIT_MS)),
  ]);
}
