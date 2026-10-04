// Cloudflare Turnstile, shared by the contact form and every Supabase auth
// call that can carry a captcha token (sign-in, sign-up, password reset,
// resend confirmation, and the change-password check).
//
// Moved here from marketing/pages/Contact.tsx unchanged in behaviour; the
// notes on the loader are the ones written there.

/**
 * The site key is baked in at build time. Without one there is no widget,
 * and callers decide what that means: the contact form shows its unavailable
 * state; the auth screens send no token (so they keep working while the
 * project's auth captcha is off, and get a clear refusal if it is on).
 */
export const TURNSTILE_SITEKEY: string | undefined = import.meta.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || undefined;

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "auto" | "light" | "dark";
      size?: "normal" | "flexible" | "compact";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Loads Cloudflare's script once per page, however many widgets mount.
 *
 * MODULE SCOPE ON PURPOSE. A screen that remounts would otherwise append a
 * second <script>, re-running Turnstile's bootstrap against widgets the first
 * copy already owns. The promise is the lock.
 *
 * NOT LOADED GLOBALLY. Only a screen that shows a widget asks for it, so the
 * signed-in product never talks to challenges.cloudflare.com.
 *
 * A FAILED LOAD IS NOT CACHED: a blocked request or a dropped connection
 * would otherwise leave the page without a widget for the rest of the
 * session, even after the network came back.
 */
let turnstileScript: Promise<void> | null = null;

export function loadTurnstile(): Promise<void> {
  if (turnstileScript) return turnstileScript;

  const pending = new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile script failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("turnstile script failed")));
    document.head.appendChild(script);
  });

  turnstileScript = pending.catch((e) => {
    turnstileScript = null;
    throw e;
  });
  return turnstileScript;
}
