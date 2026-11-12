import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsRow } from "../ui/SettingsRows";
import { DEVICE_PLACEHOLDER_ICON } from "./DevicePlaceholders";
import { useApp } from "../../context/AppContext";
import { isNative } from "../../platform";
import { health } from "../../platform/health";
import type { HealthAvailability } from "../../platform/contracts";
import { healthCopy, healthView, rowLine, type HealthStatus } from "../../services/health-connect/model";
import { syncedWhen } from "../../services/health-connect/when";
import { t } from "../../i18n/core";

/**
 * Round J · J-2e, website PLAN.md §2.1: Settings › Connected devices in the
 * app. Where Health Connect is offered (or only needs installing or
 * updating), the pretend switch becomes a real row showing the state ("Not
 * connected", "Connected · synced {time}", "Access is off", "Couldn't sync")
 * and opens /app/settings/devices/health. Anywhere else, `fallback` (the row
 * as a browser shows it).
 */
export function HealthConnectRow({ fallback }: { fallback: ReactNode }) {
  const navigate = useNavigate();
  const { today } = useApp();
  const [avail, setAvail] = useState<HealthAvailability | null>(null);
  const [status, setStatus] = useState<HealthStatus | null>(null);

  useEffect(() => {
    if (!isNative()) return;
    let live = true;
    const read = () =>
      void health
        .available()
        .then(async (a) => {
          if (!live) return;
          setAvail(a);
          if (a.ok) {
            const s = await health.status();
            if (live) setStatus(s);
          }
        })
        .catch(() => live && setAvail({ ok: false }));
    read();
    const onVisible = () => document.visibilityState === "visible" && read();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const provider = health.provider();
  const view = healthView(avail, status, provider);
  if (!isNative() || !view || view.kind === "unavailable") return <>{fallback}</>;
  const line = rowLine(view);
  return (
    <SettingsRow
      // Batch C item 36: Apple Health on iPhone, Health Connect on Android.
      icon={DEVICE_PLACEHOLDER_ICON[provider === "apple_health" ? "apple-health" : "health-connect"]}
      title={healthCopy(provider).name}
      subtitle={line ? <span data-hc-row={view.kind}>{t(line.key, line.time ? { time: syncedWhen(line.time, today) } : undefined)}</span> : undefined}
      onClick={() => navigate("/app/settings/devices/health")}
    />
  );
}
