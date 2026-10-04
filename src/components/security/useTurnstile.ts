import { useCallback, useEffect, useRef, useState } from "react";
import { loadTurnstile, TURNSTILE_SITEKEY } from "./turnstile";

export type TurnstileStatus = "off" | "loading" | "ready" | "failed";

/**
 * One Turnstile widget, rendered into whatever element `container` is
 * attached to. A callback ref rather than a ref object, so a screen that swaps
 * one form for another (sign-in, forgot password, check your email) can put
 * the same widget's container in each and it follows: the old widget is
 * removed as its element leaves and a fresh one renders into the new one.
 *
 * TOKENS ARE SINGLE-USE. Supabase (and the contact function) redeem one per
 * request and Cloudflare refuses the same token twice, so callers reset after
 * EVERY attempt, success or failure (`reset`).
 *
 * `status` is "off" without a site key: no widget and no token, and callers
 * do not wait for one (see TURNSTILE_SITEKEY).
 */
export function useTurnstile(theme: "light" | "dark", size: "normal" | "flexible" = "flexible") {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<TurnstileStatus>(TURNSTILE_SITEKEY ? "loading" : "off");
  const [element, setElement] = useState<HTMLElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const container = useCallback((el: HTMLElement | null) => setElement(el), []);

  useEffect(() => {
    if (!TURNSTILE_SITEKEY || !element) return;
    const sitekey = TURNSTILE_SITEKEY;
    let cancelled = false;
    void loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(element, {
          sitekey,
          theme,
          // "flexible" fills the column on a phone (300px minimum) rather
          // than a fixed 300px box; the contact form keeps its fixed one.
          size,
          callback: (t) => setToken(t),
          // A token lasts a few minutes. Clearing it on expiry is what stops a
          // button offering to send something the server would then refuse.
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null),
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* Already gone with its container. */
        }
      }
      widgetIdRef.current = null;
      setToken(null);
    };
  }, [element, theme, size]);

  const reset = useCallback(() => {
    setToken(null);
    const id = widgetIdRef.current;
    if (id && window.turnstile) {
      try {
        window.turnstile.reset(id);
      } catch {
        /* The widget went away; the missing token already holds the button. */
      }
    }
  }, []);

  return {
    /** The token to send, or null. Always null when status is "off". */
    token,
    status,
    /** Attach to the element the widget renders into. */
    container,
    reset,
    /** Whether a request must wait for a token: a site key is configured. */
    required: status !== "off",
  };
}
