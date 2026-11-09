import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { desktop } from "../../platform/desktop";
import { appPathFrom } from "../../platform/openPathModel";

/**
 * The desktop app: a click on a notification opens its page inside the app
 * that is already open, rather than the shell reloading the window, so
 * whatever is on screen (a ringing call, a half-written message) survives.
 * Only /app paths, by the same rule as the phone app (openPathModel).
 */
export function DesktopOpenPath() {
  const navigate = useNavigate();
  // useNavigate's identity changes with the pathname; registered once.
  const navRef = useRef(navigate);
  useEffect(() => {
    navRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    const app = desktop();
    if (!app) return;
    app.onOpen((raw) => {
      const path = appPathFrom(raw);
      if (path) navRef.current(path);
    });
    return () => app.onOpen(null);
  }, []);

  return null;
}
