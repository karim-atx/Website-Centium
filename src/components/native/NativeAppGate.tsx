import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { Button } from "../ui/Button";
import { useIsDark } from "../../hooks/useIsDark";
import { currentAppConfig, onAppConfig, type AppConfig } from "../../platform/appConfig";
import { textPx } from "../../theme/textSize";
import { t } from "../../i18n/core";

/**
 * The phone app's version gate (mobile round Z, Z1.5; Database DB-Z1
 * app_config). Renders nothing on the web, where the config is never asked.
 *
 * - `mustUpdate` (below the minimum): a blocking "Update Centium" screen
 *   whose one way on is the store. It cannot be dismissed.
 * - `updateAvailable` (below the latest): a small bar with "Update" and
 *   "Not now"; "Not now" hides it for that latest version.
 *
 * Opening the store link navigates the WebView away from the app's origin,
 * which Capacitor hands to the phone (the Play Store / App Store app).
 */
const DISMISSED_KEY = "centium.updateDismissed";

function dismissedFor(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

export const NativeAppGate: React.FC = () => {
  const dark = useIsDark();
  const [config, setConfig] = useState<AppConfig>(currentAppConfig);
  const [dismissed, setDismissed] = useState<string | null>(dismissedFor);
  useEffect(() => onAppConfig(setConfig), []);

  const openStore = () => {
    if (config.storeUrl) window.location.href = config.storeUrl;
  };

  if (config.mustUpdate) {
    const title = t("Update Centium");
    return createPortal(
      <div className="fixed inset-0 z-[1001] flex items-center justify-center px-6 bg-cream">
        <div role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-[340px] text-center">
          <span
            className="mx-auto flex items-center justify-center"
            style={{ width: 56, height: 56, borderRadius: 16, background: "rgb(var(--th-a2c8c2) / .25)", color: dark ? "rgb(var(--thi-7fb3a9))" : "rgb(var(--thi-4f7f78))" }}
          >
            <Download size={24} />
          </span>
          <p style={{ margin: "16px 0 0", fontSize: textPx(20), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{title}</p>
          <p style={{ margin: "8px 0 0", fontSize: textPx(14), color: "rgb(var(--c-charcoal-muted))" }}>
            {t("This version of Centium is no longer supported. Update the app to keep using it.")}
          </p>
          <Button className="w-full" style={{ marginTop: 24 }} onClick={openStore} autoFocus>
            {t("Update")}
          </Button>
        </div>
      </div>,
      document.body
    );
  }

  const latest = config.latestVersion ?? "";
  if (!config.updateAvailable || dismissed === latest) return null;

  const notNow = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, latest);
    } catch {
      // Not remembered: the bar comes back on the next launch.
    }
    setDismissed(latest);
  };

  return createPortal(
    <div
      role="status"
      className="fixed inset-x-0 z-[900] flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
    >
      <div
        className="w-full max-w-[420px] bg-cream-card flex items-center"
        style={{ gap: 10, borderRadius: 16, padding: "10px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.16)" }}
      >
        <p style={{ margin: 0, flex: 1, fontSize: textPx(13), color: "rgb(var(--c-charcoal))" }}>
          {t("A new version of Centium is available.")}
        </p>
        <Button variant="ghost" size="sm" onClick={notNow}>
          {t("Not now")}
        </Button>
        <Button size="sm" onClick={openStore}>
          {t("Update")}
        </Button>
      </div>
    </div>,
    document.body
  );
};
