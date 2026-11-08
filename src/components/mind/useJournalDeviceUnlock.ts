import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useDeviceUnlock } from "../../hooks/useDeviceUnlock";
import { deviceButtonLabel } from "../../services/journal/deviceUnlockModel";
import type { DeviceUnlockOption, PasswordPurpose } from "./JournalLock";

/**
 * Round K (DB-Z8): the lock prompt's "Unlock with fingerprint", offered while
 * a folder is being asked for and this phone is set up for it (the app only;
 * undefined in a browser). `finish` runs once the folder is open, the same as
 * after the password. A key the phone lost is revoked by the unlock itself,
 * so the phone's status is read again.
 */
export function useJournalDeviceUnlock(
  asking: { purpose: PasswordPurpose; folder: { id: string; name: string } } | null,
  finish: () => void
): DeviceUnlockOption | undefined {
  const device = useDeviceUnlock();
  const { unlockJournalFolderWithDevice } = useApp();
  const navigate = useNavigate();
  if (device.status !== "ready" || !asking) return undefined;
  return {
    label: deviceButtonLabel(device.kind, asking.purpose),
    onUse: async () => {
      const result = await unlockJournalFolderWithDevice(asking.folder.id, asking.purpose, asking.folder.name);
      if (result.ok) {
        finish();
        return null;
      }
      if (result.revoke) device.reload();
      return result;
    },
    onSetup: () => navigate("/app/settings/privacy"),
  };
}
