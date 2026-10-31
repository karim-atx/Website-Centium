import { useCallback, useEffect, useRef, useState } from "react";
import {
  APP_DEFAULT,
  changedColumns,
  fetchPresentation,
  presentationToRow,
  samePresentation,
  savePresentation,
  type Presentation,
} from "../services/presentation";
import { afterFailure, afterOnline, canSave, RETRY_START, type RetryState } from "../services/presentation/retry";
import { t } from "../i18n/core";

// Keeps this device's presentation settings (light / dark / auto, colour
// theme, the four accessibility switches) in step with this account's 'web'
// row of public.device_presentation_settings (Stage A1).
//
// THE DEVICE COPY PAINTS FIRST. AppContext keeps every value in its per-account
// local cache, so the right theme is on screen before the network answers and
// with no network at all. On sign-in the row is read once:
//   - a row, nothing unsaved here: the row wins and is applied;
//   - a row, an unsaved change here (pending): this device's choice is written;
//   - no row: this device's choice is inserted, unless it is still the app
//     default (then nothing is written until something changes).
// After that every change writes only the columns that changed.
//
// THE DEVICE COPY IS SHARED, THE ROW IS NOT. The local values are device keys
// (one set per browser, whoever signs in), so `deviceOwner` records which
// account they belong to. Only that account's row ever receives them: a
// pending change or a "no row yet" insert is written only when the device copy
// is this account's own (or predates the marker, the one-time upgrade path).
// Another account's copy is never saved here; with no row of its own the
// account starts from the app default instead.
//
// A FAILED SAVE KEEPS THE CHOICE. The setting stays applied on this device,
// `pending` is kept (persisted, so it survives a reload), the error is shown
// under the setting, and the save is retried on the next change, on
// reconnecting and on the next sign-in, BOUNDED (services/presentation/retry):
// a backoff between failures (its timer saves the latest choice when it ends),
// no retry after a permission refusal (until the next sign-in), and none after
// five failures in a row (until reconnecting or the next sign-in). A save whose row comes back without
// the values written counts as failed (services/presentation/save.ts), so
// flush's loop below never goes round on an answer that is not the write.

const keyOf = (p: Presentation) => JSON.stringify(presentationToRow(p));

// The failure and what it means for the choice, as one sentence in the chosen
// language (built as it is shown).
const kept = (message: string) => t("{message} Your choice is kept on this device until it saves.", { message: t(message) });

export function usePresentationSync({
  ownerId,
  current,
  apply,
  pending,
  setPending,
  deviceOwner,
  setDeviceOwner,
}: {
  ownerId: string | null;
  current: Presentation;
  /** Puts the server's settings on this device (no write back). */
  apply: (p: Presentation) => void;
  pending: boolean;
  setPending: (pending: boolean) => void;
  /** The account the device copy belongs to; null before the marker existed. */
  deviceOwner: string | null;
  setDeviceOwner: (ownerId: string) => void;
}): { saveError: string | null } {
  // Tagged with the account it belongs to, so a different sign-in starts clean.
  const [saveError, setSaveError] = useState<{ owner: string; message: string } | null>(null);

  // What the server holds: undefined = not read yet, null = no row.
  const server = useRef<Presentation | null | undefined>(undefined);
  const owner = useRef<string | null>(ownerId);
  const latest = useRef(current);
  const pendingRef = useRef(pending);
  const applyRef = useRef(apply);
  const deviceOwnerRef = useRef(deviceOwner);
  const saving = useRef(false);
  const loading = useRef(false);
  const lastKey = useRef(keyOf(current));

  // The latest props, for the async work below (first effect, so it runs
  // before the ones that read them).
  useEffect(() => {
    latest.current = current;
    pendingRef.current = pending;
    applyRef.current = apply;
    deviceOwnerRef.current = deviceOwner;
  });

  /** Puts `p` on this device without it counting as a change to save. */
  const applyQuietly = useCallback((p: Presentation) => {
    if (samePresentation(p, latest.current)) return;
    lastKey.current = keyOf(p);
    applyRef.current(p);
  }, []);

  /** The device copy now belongs to `id`. */
  const claim = useCallback(
    (id: string) => {
      deviceOwnerRef.current = id;
      setDeviceOwner(id);
    },
    [setDeviceOwner]
  );

  // Failed saves in a row for this sign-in, and the backoff timer (retry.ts).
  const retry = useRef<RetryState>(RETRY_START);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRef = useRef<() => Promise<void>>(async () => {});
  const clearRetryTimer = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
  };

  const flush = useCallback(async () => {
    const id = owner.current;
    if (!id || saving.current || server.current === undefined) return;
    // Waiting out a backoff (the timer saves the latest choice when it ends),
    // or stopped until the next sign-in.
    if (canSave(retry.current, Date.now()) !== "now") return;
    saving.current = true;
    try {
      // A loop, so a change made while a save is in flight is written next.
      for (;;) {
        const want = latest.current;
        const base = server.current;
        if (base === null && !pendingRef.current && samePresentation(want, APP_DEFAULT)) break;
        if (base && samePresentation(base, want)) break;
        const result = await savePresentation(id, base ? changedColumns(base, want) : {}, presentationToRow(want));
        if (owner.current !== id) return;
        if (result.status === "error") {
          setPending(true);
          setSaveError({ owner: id, message: result.message });
          retry.current = afterFailure(retry.current, result.permission, Date.now());
          clearRetryTimer();
          if (!retry.current.blocked) {
            retryTimer.current = setTimeout(() => {
              retryTimer.current = null;
              if (owner.current === id && pendingRef.current) void syncRef.current();
            }, retry.current.notBefore - Date.now());
          }
          return;
        }
        retry.current = RETRY_START;
        server.current = result.settings;
      }
      setPending(false);
      setSaveError(null);
    } finally {
      saving.current = false;
    }
  }, [setPending]);

  const sync = useCallback(async () => {
    const id = owner.current;
    if (!id) return;
    if (server.current === undefined) {
      if (loading.current) return;
      loading.current = true;
      const read = await fetchPresentation();
      loading.current = false;
      if (owner.current !== id) return;
      if (read.status === "error") {
        // Nothing is lost: the device copy stays applied. Say so only when a
        // change of this device's is waiting to be saved.
        if (pendingRef.current) setSaveError({ owner: id, message: read.message });
        return;
      }
      server.current = read.settings;
      // The device copy is this account's own (or predates the marker).
      const mine = deviceOwnerRef.current === null || deviceOwnerRef.current === id;
      if (read.settings && !(pendingRef.current && mine)) {
        applyQuietly(read.settings);
        claim(id);
        if (pendingRef.current) setPending(false);
        return;
      }
      if (!read.settings && !mine) {
        // Another account's choices: never saved here. Start from the default.
        applyQuietly(APP_DEFAULT);
        claim(id);
        if (pendingRef.current) setPending(false);
        return;
      }
      claim(id);
    }
    await flush();
  }, [flush, applyQuietly, claim, setPending]);

  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  // Sign-in (or a different account): read the row once, with a fresh retry
  // count.
  useEffect(() => {
    owner.current = ownerId;
    server.current = undefined;
    loading.current = false;
    retry.current = RETRY_START;
    clearRetryTimer();
    if (ownerId) void sync();
    return clearRetryTimer;
  }, [ownerId, sync]);

  // A change on this device: write it (or, before the row is read, remember
  // that there is one so the read does not overwrite it).
  const key = keyOf(current);
  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (!owner.current) return;
    claim(owner.current);
    if (server.current === undefined) {
      setPending(true);
      pendingRef.current = true;
    }
    void sync();
  }, [key, sync, setPending, claim]);

  // Back online with something unsaved. Round D O13: the failure count and
  // backoff start fresh (failures while offline said nothing about the
  // server), so five saves lost to a dead connection no longer stop the sync
  // until the next sign-in. A permission refusal stays stopped.
  useEffect(() => {
    const onOnline = () => {
      const was = retry.current;
      retry.current = afterOnline(was);
      if (retry.current !== was) clearRetryTimer();
      if (pendingRef.current) void sync();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sync]);

  // Translated as it is shown, so a message set before the language loaded follows it.
  return { saveError: saveError && saveError.owner === ownerId ? kept(saveError.message) : null };
}
