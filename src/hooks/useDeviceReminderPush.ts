import { useCallback, useEffect, useState } from "react";
import { enablePush, isThisDeviceRegistered, pushPermissionNow, pushSupported, readPushPermission } from "../services/push";
import { deviceReminderState, type DeviceReminderState } from "../services/push/deviceReminderState";

/**
 * FW (G13): whether THIS device can receive a reminder, read as permission
 * AND registration (services/push/deviceReminderState), and the one tap that
 * fixes it. Read again when the page comes back into view (from the browser's
 * or the phone's settings, or another tab). Used by the cycle and
 * contraception reminder switches.
 */
export function useDeviceReminderPush(ownerId: string | null): {
  state: DeviceReminderState;
  busy: boolean;
  error: string | null;
  /** Raises the OS prompt and registers this device. Call from a tap. Resolves to the new state. */
  turnOn: () => Promise<DeviceReminderState>;
} {
  const [supported] = useState(pushSupported);
  const [permission, setPermission] = useState<NotificationPermission>(() => (supported ? pushPermissionNow() : "denied"));
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const check = () => {
      void readPushPermission().then((p) => !cancelled && setPermission(p));
      void isThisDeviceRegistered().then((r) => !cancelled && setRegistered(r));
    };
    check();
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supported]);

  const turnOn = useCallback(async (): Promise<DeviceReminderState> => {
    setBusy(true);
    setError(null);
    const result = await enablePush(ownerId);
    if (result.status !== "ok") setError(result.message);
    const p = await readPushPermission();
    const r = await isThisDeviceRegistered();
    setPermission(p);
    setRegistered(r);
    setBusy(false);
    return deviceReminderState({ supported, permission: p, registered: r });
  }, [ownerId, supported]);

  return { state: deviceReminderState({ supported, permission, registered }), busy, error, turnOn };
}
