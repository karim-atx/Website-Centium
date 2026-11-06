import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { CentiumNative } from "../../platform/native";
import { appPathFrom, decideHeldPath, type HeldPath } from "../../platform/openPathModel";
import { onPushOpen } from "../../platform/push";

/**
 * Opens the page a widget, app shortcut or notification asked for (App-Centium
 * ROUND_J.md §1.2). Native only; rendered inside the router.
 *
 * A cold start leaves the path with the native side until this asks for it;
 * a warm one arrives as an `openPath` event; a tapped push notification's
 * `url` comes from the push plugin (platform/push.ts). Either way only a path under
 * /app is followed (appPathFrom).
 *
 * Round J · J-2b (website PLAN.md §2.4): the path is held, and decideHeldPath
 * (openPathModel.ts) says when it opens: once the account is signed in, its
 * profile read and onboarded, and off the pages that are still finishing
 * onboarding (the trial offer, business setup). So a signed-out tap comes back
 * after sign-in. It is dropped if another account signs in, or after ten
 * minutes.
 *
 * KEPT OUTSIDE THE COMPONENT: AppContext remounts everything under it when
 * the language settles or changes (an Arabic account right after sign-in or
 * onboarding), and the native side hands a launch path over only once.
 */
const holder: { held: HeldPath | null } = { held: null };

export function NativeOpenPath() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { authUserId, profileReady, user } = useApp();
  const ready = !!authUserId && profileReady && user.onboarded;
  const now = useRef({ ready, pathname, userId: authUserId });

  const settle = useCallback(() => {
    const decision = decideHeldPath(holder.held, { ...now.current, at: Date.now() });
    if (decision === "drop") holder.held = null;
    if (decision !== "open" || !holder.held) return;
    const path = holder.held.path;
    holder.held = null;
    navigate(path);
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    const open = (raw: unknown) => {
      const path = appPathFrom(raw);
      if (!alive || !path) return;
      holder.held = { path, heldAt: Date.now(), owner: now.current.userId };
      settle();
    };
    CentiumNative.takeLaunchPath().then(
      ({ path }) => open(path),
      () => {
        // An app build from before Round J has no launch paths.
      },
    );
    const handle = CentiumNative.addListener("openPath", ({ path }) => open(path)).catch(() => null);
    const offPush = onPushOpen(open);
    return () => {
      alive = false;
      offPush();
      void handle.then((h) => h?.remove());
    };
  }, [settle]);

  useEffect(() => {
    now.current = { ready, pathname, userId: authUserId };
    settle();
  }, [ready, pathname, authUserId, settle]);

  return null;
}
