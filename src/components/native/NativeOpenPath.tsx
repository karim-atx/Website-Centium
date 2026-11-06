import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
 * /app is followed (appPathFrom). A signed-out visit lands where any signed-out
 * visit to that page does: the route guards take it to sign-in.
 */
export function NativeOpenPath() {
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    const open = (raw: unknown) => {
      const path = appPathFrom(raw);
      if (alive && path) navigate(path);
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
  return null;
}
