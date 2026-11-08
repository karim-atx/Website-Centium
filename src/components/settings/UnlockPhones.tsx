import { useCallback, useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { SettingsRow, SettingsSection } from "../ui/SettingsRows";
import { ConfirmCard } from "../ui/ConfirmCard";
import { fetchDeviceKeys, revokeDeviceKey, type DeviceKey } from "../../services/journal";
import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";

// Round K (DB-Z8): the phones whose fingerprint or face can open this
// account's locked journal folders. Adding one happens on the phone (the
// App's part); removing one works from anywhere, so a lost phone can be cut
// off from the website too. revoke_device_key needs no re-authentication.
// Hidden while there are none (or before DB-Z8 ships: my_device_keys reads
// as an empty list then).

const day = (iso: string) => new Date(iso).toLocaleDateString(appLocale(), { day: "numeric", month: "short", year: "numeric" });

/** "Added 3 Nov 2026 · Last used 7 Nov 2026", or "· Not used yet". */
function unlockPhoneLine(key: Pick<DeviceKey, "registeredAt" | "lastUsedAt">): string {
  const added = t("Added {date}", { date: day(key.registeredAt) });
  const used = key.lastUsedAt ? t("Last used {date}", { date: day(key.lastUsedAt) }) : t("Not used yet");
  return `${added} · ${used}`;
}

export function UnlockPhones() {
  const [keys, setKeys] = useState<DeviceKey[] | null>(null);
  const [removing, setRemoving] = useState<DeviceKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setKeys(await fetchDeviceKeys());
  }, []);

  useEffect(() => {
    let live = true;
    void fetchDeviceKeys().then((k) => {
      if (live) setKeys(k);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!keys || keys.length === 0) return null;

  const confirmRemove = async () => {
    if (!removing || busy) return;
    setBusy(true);
    setError(null);
    const ok = await revokeDeviceKey(removing.deviceId);
    setBusy(false);
    if (!ok) {
      setError(t("Couldn't remove it. Check your connection and try again."));
      return;
    }
    setRemoving(null);
    await load();
  };

  return (
    <>
      <SettingsSection label={t("Phones that can unlock locked folders")} className="mt-8">
        {keys.map((k) => (
          <SettingsRow
            key={k.deviceId}
            icon={Smartphone}
            title={k.label}
            subtitle={unlockPhoneLine(k)}
            value={t("Remove")}
            onClick={() => {
              setError(null);
              setRemoving(k);
            }}
          />
        ))}
      </SettingsSection>
      {error && !removing && (
        <p role="alert" className="text-[11.5px] text-status-high mt-2">
          {error}
        </p>
      )}
      <ConfirmCard
        open={!!removing}
        tone="destructive"
        title={t("Remove {phone}?", { phone: removing?.label ?? "" })}
        subtitle={error ?? t("It won't be able to unlock your locked folders with a fingerprint or face. You can add it again from that phone.")}
        confirmLabel={t("Remove")}
        busy={busy}
        onCancel={() => {
          if (!busy) setRemoving(null);
        }}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}
