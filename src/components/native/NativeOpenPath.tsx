import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { CentiumNative } from "../../platform/native";
import { appPathFrom } from "../../platform/openPathModel";
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
 * Round J · J-2b (website PLAN.md §2.4): the path is held until the account
 * is signed in, its profile read and onboarded, then opened once. So a
 * signed-out tap goes through sign-in and comes back to it, and a cold start
 * doesn't open it before the session has settled.
 */
export function NativeOpenPath() {
  const navigate = useNavigate();
  const { authUserId, profileReady, user } = useApp();
  const ready = !!authUserId && profileReady && user.onboarded;
  const held = useRef<string | null>(null);
  const readyRef = useRef(ready);

  useEffect(() => {
    let alive = true;
    const open = (raw: unknown) => {
      const path = appPathFrom(raw);
      if (!alive || !path) return;
      if (readyRef.current) navigate(path);
      else held.current = path;
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
  }, [navigate]);

  useEffect(() => {
    readyRef.current = ready;
    if (!ready || !held.current) return;
    const path = held.current;
    held.current = null;
    navigate(path);
  }, [ready, navigate]);

  return null;
}
