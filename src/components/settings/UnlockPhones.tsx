import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Fingerprint, Smartphone } from "lucide-react";
import { SettingsRow, SettingsSection } from "../ui/SettingsRows";
import { ConfirmCard } from "../ui/ConfirmCard";
import { JournalPasswordPopup } from "../mind/JournalLock";
import { fetchDeviceKeys, folderLockAuth, revokeDeviceKey, type DeviceKey, type FolderLockAuth } from "../../services/journal";
import { registerThisPhone, removeThisPhone, type DeviceReauth } from "../../services/journal/deviceUnlock";
import { enrolFirstLine, signFailure, turnOnLabel } from "../../services/journal/deviceUnlockModel";
import { biometrics } from "../../platform/biometrics";
import { useDeviceUnlock } from "../../hooks/useDeviceUnlock";
import { useApp } from "../../context/AppContext";
import { setTurnOn, subscribeTurnOn, turnOnFor, turnOnSnapshot } from "./turnOnStore";
import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";

// Round K (DB-Z8): the phones whose fingerprint or face can open this
// account's locked journal folders. Removing one works from anywhere, so a
// lost phone can be cut off from the website too (revoke_device_key needs no
// re-authentication). In the app, on a phone that can, the first row turns it
// on for this phone: the key is made on the phone (one fingerprint sheet),
// then registered, with the password or an emailed code when the session
// isn't fresh (ATXB1). In a browser the section is hidden while the account
// has no phones (or before DB-Z8 ships: my_device_keys reads as empty then).

const day = (iso: string) => new Date(iso).toLocaleDateString(appLocale(), { day: "numeric", month: "short", year: "numeric" });

/** "Added 3 Nov 2026 · Last used 7 Nov 2026", or "· Not used yet"; "This phone · …" for this one. */
function unlockPhoneLine(key: Pick<DeviceKey, "registeredAt" | "lastUsedAt">, mine: boolean): string {
  const added = t("Added {date}", { date: day(key.registeredAt) });
  const used = key.lastUsedAt ? t("Last used {date}", { date: day(key.lastUsedAt) }) : t("Not used yet");
  return mine ? `${t("This phone")} · ${added} · ${used}` : `${added} · ${used}`;
}

export function UnlockPhones() {
  const device = useDeviceUnlock();
  const { reload: reloadDevice } = device;
  const [keys, setKeys] = useState<DeviceKey[] | null>(null);
  const [removing, setRemoving] = useState<DeviceKey | null>(null);
  // busy, error, the pending re-authentication and the "added" line live in
  // turnOnStore, so a remount while the fingerprint sheet or
  // register_device_key is open keeps them.
  const { authUserId } = useApp();
  const owner = authUserId ?? null;
  const { busy, error, pending, notice, done, added } = turnOnFor(useSyncExternalStore(subscribeTurnOn, turnOnSnapshot), owner);
  const setBusy = (b: boolean) => setTurnOn(owner, { busy: b });
  const setError = (e: string | null) => setTurnOn(owner, { error: e });
  const setPending = (p: { publicKey: string; auth: FolderLockAuth } | null) => setTurnOn(owner, { pending: p });
  const setNotice = (n: string | undefined) => setTurnOn(owner, { notice: n });
  const setDone = (d: string | null) => setTurnOn(owner, { done: d });

  // A fresh visit starts without the last visit's lines; a turn-on still in
  // flight (busy, or waiting for "Confirm it's you") keeps everything.
  useEffect(() => {
    const now = turnOnFor(turnOnSnapshot(), owner);
    if (!now.busy && !now.pending) setTurnOn(owner, { error: null, done: null });
  }, [owner]);

  const load = useCallback(async () => {
    setKeys(await fetchDeviceKeys());
    reloadDevice();
  }, [reloadDevice]);

  useEffect(() => {
    let live = true;
    void fetchDeviceKeys().then((k) => {
      if (live) setKeys(k);
    });
    if (added > 0) reloadDevice();
    return () => {
      live = false;
    };
  }, [added, reloadDevice]);

  const canTurnOn = device.status === "setup" || device.status === "enrol";
  // A turn-on in progress keeps the section (and its sheet or error) on screen
  // while the phone's status and the list are read again after a remount.
  const turningOn = busy || !!pending || !!error;
  if (!turningOn && (!keys || (keys.length === 0 && !canTurnOn))) return null;

  const isMine = (k: DeviceKey) => !!device.installId && k.deviceId === device.installId;

  const confirmRemove = async () => {
    if (!removing || busy) return;
    setBusy(true);
    setError(null);
    const ok = isMine(removing) ? await removeThisPhone(removing.deviceId) : await revokeDeviceKey(removing.deviceId);
    setBusy(false);
    if (!ok) {
      setError(t("Couldn't remove it. Check your connection and try again."));
      return;
    }
    setRemoving(null);
    await load();
  };

  // register_device_key, after the key was made: with no re-authentication a
  // fresh session is enough; ATXB1 asks for the password or the code, and the
  // same public key goes again with it.
  const finishRegister = async (publicKey: string, reauth?: DeviceReauth): Promise<string | null> => {
    const result = await registerThisPhone(publicKey, reauth);
    if (result.ok) {
      // One update, read by whichever UnlockPhones is mounted now: its list and
      // the phone's status are read again through `added`.
      setTurnOn(owner, { pending: null, notice: undefined, done: result.message, added: turnOnSnapshot().added + 1 });
      return null;
    }
    if (result.reauth) {
      const auth = await folderLockAuth().catch((e: unknown) => {
        console.error("[journal] folderLockAuth failed after ATXB1:", e);
        return null;
      });
      if (!auth) {
        console.error("[journal] No way to confirm it's you after ATXB1");
        return t("Couldn't add this phone. Try again.");
      }
      setPending({ publicKey, auth });
      return null;
    }
    // ATXB2: the account has a password after all; ask for it instead of a code.
    if (result.code === "ATXB2" && pending) {
      setNotice(result.line);
      setPending({ ...pending, auth: { ...pending.auth, method: "password" } });
      return null;
    }
    return result.line;
  };

  const turnOn = async () => {
    if (busy || device.status !== "setup") return;
    setBusy(true);
    setError(null);
    setDone(null);
    const made = await biometrics.createKey({ title: turnOnLabel(device.kind), cancel: t("Cancel") });
    if ("error" in made) {
      setBusy(false);
      const failure = signFailure(made.error);
      if (failure.line) setError(failure.line);
      return;
    }
    const failed = await finishRegister(made.publicKey);
    setBusy(false);
    if (failed) setError(failed);
  };

  return (
    <>
      <SettingsSection label={t("Phones that can unlock locked folders")} className="mt-8">
        {device.status === "setup" && <SettingsRow icon={Fingerprint} title={turnOnLabel(device.kind)} onClick={() => void turnOn()} />}
        {device.status === "enrol" && <SettingsRow icon={Fingerprint} title={turnOnLabel(device.kind)} subtitle={enrolFirstLine(device.kind)} dimmed />}
        {(keys ?? []).map((k) => (
          <SettingsRow
            key={k.deviceId}
            icon={Smartphone}
            title={k.label}
            subtitle={unlockPhoneLine(k, isMine(k))}
            value={t("Remove")}
            onClick={() => {
              setError(null);
              setDone(null);
              setRemoving(k);
            }}
          />
        ))}
      </SettingsSection>
      <div aria-live="polite">{done && !error && <p className="text-[11.5px] text-charcoal-soft mt-2">{done}</p>}</div>
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
      {pending && (
        <JournalPasswordPopup
          key={pending.auth.method}
          purpose="unlock"
          folderName=""
          method={pending.auth.method}
          email={pending.auth.email}
          notice={notice}
          copy={{
            title: t("Confirm it's you"),
            body: t("Confirm it's you to let this phone unlock your locked folders."),
            cta: t("Add this phone"),
          }}
          onClose={() => {
            setPending(null);
            setNotice(undefined);
          }}
          onSubmit={(secret) => finishRegister(pending.publicKey, pending.auth.method === "code" ? { code: secret } : { password: secret })}
        />
      )}
    </>
  );
}
