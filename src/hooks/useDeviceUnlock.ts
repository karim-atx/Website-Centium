import { useCallback, useEffect, useState } from "react";
import { isNative } from "../platform/index";
import { biometrics, type BiometricKind } from "../platform/biometrics";
import { fetchDeviceKeys, type DeviceKey } from "../services/journal";
import { thisInstallId } from "../services/journal/deviceUnlock";
import { deviceUnlockStatus, type DeviceUnlockStatus } from "../services/journal/deviceUnlockModel";

export interface DeviceUnlock {
  status: DeviceUnlockStatus;
  kind?: BiometricKind;
  /** This install's id, to mark "This phone" in the list. */
  installId: string | null;
  /** The account's phones (null until read, or unreadable). */
  keys: DeviceKey[] | null;
  reload: () => void;
}

/**
 * Round K (DB-Z8): whether this phone can open locked folders with a
 * fingerprint or face. In a browser it is "off" at once and reads nothing.
 * The phone is asked fresh on every load and reload: a fingerprint can be
 * added or removed while the app is open.
 */
export function useDeviceUnlock(): DeviceUnlock {
  const native = isNative();
  const [state, setState] = useState<Omit<DeviceUnlock, "reload">>({ status: "off", installId: null, keys: null });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!native) return;
    let live = true;
    void (async () => {
      const avail = await biometrics.available();
      const [hasKey, installId, keys] = await Promise.all([biometrics.hasKey(), thisInstallId(), fetchDeviceKeys()]);
      const registered = !!installId && !!keys?.some((k) => k.deviceId === installId);
      if (live) setState({ status: deviceUnlockStatus(avail, hasKey, registered), kind: avail.kind, installId, keys });
    })();
    return () => {
      live = false;
    };
  }, [native, nonce]);

  return { ...state, reload };
}
