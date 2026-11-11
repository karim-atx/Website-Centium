// What the phone's own side has to hear about from the website: the
// language and sign-out (App-Centium ROUND_J.md §1.3, §1.4), reduced motion
// and the text size (ROUND_K.md §1.3, §1.4). Native only, best effort: none
// may ever hold up a setting change or a sign-out.
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

let mirroredMotion: boolean | null = null;

/** The Reduce motion setting, for what the phone draws itself (ROUND_K.md §1.4). */
export function mirrorReducedMotion(on: boolean): void {
  if (!isNative() || mirroredMotion === on) return;
  mirroredMotion = on;
  CentiumNative.setReducedMotion({ on }).catch(() => {
    mirroredMotion = null;
  });
}

/**
 * The WebView's text size from the phone's font size, in percent, and the
 * most the total may reach (ROUND_K.md D-ET1); 100 of 200 in a browser or
 * when the phone can't say. "Larger text" uses it to stay within the total.
 */
export async function nativeTextZoom(): Promise<{ percent: number; max: number }> {
  const plain = { percent: 100, max: 200 };
  if (!isNative()) return plain;
  try {
    const z = await CentiumNative.textZoom();
    return Number.isFinite(z.percent) && Number.isFinite(z.max) ? z : plain;
  } catch {
    return plain;
  }
}

/**
 * Whether a haptic may play now (FX; App #31's CentiumNative.hapticsAllowed).
 * Not allowed in a browser, and not allowed when the build has no such method
 * or no plugin, so app builds before #31 stay silent.
 */
export async function nativeHapticsAllowed(): Promise<{ allowed: boolean; reduced: boolean }> {
  const no = { allowed: false, reduced: false };
  if (!isNative()) return no;
  try {
    const r = await CentiumNative.hapticsAllowed();
    return { allowed: r?.allowed === true, reduced: r?.reduced === true };
  } catch {
    return no;
  }
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
