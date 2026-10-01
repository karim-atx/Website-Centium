import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HealthChecksCtx as Ctx, type CheckIn, type HealthChecksValue } from "./healthChecksStore";
import { useApp } from "./AppContext";
import { STORAGE_PREFIX, TAB_USER_ID, storageKeyFor, storageNamespace } from "../../lib/supabase/tabIdentity";
import { REVIEWED, type Phase } from "../services/health-checks/guidance";
import { todayLocal } from "../utils/date";
import { readSetting, turnOff as deleteSetting, turnOn as insertSetting, type TurnOnResult } from "../services/health-checks/setting";

/**
 * Advanced health monitoring, for the screens that show it.
 *
 * THE SETTING IS HELD IN MEMORY ONLY. It is read from the account when the
 * app starts, whenever the tab comes back into view, and whenever a screen
 * that shows the mode opens, and it is never written to the device. `on` is
 * null until the first read lands, which every screen treats as off.
 *
 * EVERYTHING ELSE IS DEVICE-ONLY, under this account's own namespace: the
 * phase, the date "stopped" was chosen and the check-in history. None of it is
 * sent anywhere. Turning the mode off erases it, so does reading the setting
 * as off (it can be withdrawn by the server without telling the app), and
 * signing out clears it with the rest of the account's device data.
 *
 * AVAILABLE only once the clinical content is marked reviewed, or in a dev
 * build with the local override set. Unavailable means no switch, no screen
 * and no flags, even for an account whose setting is on.
 */


/** Dev builds only: `localStorage["centium-dev:checks"] = "1"` shows the mode before review. */
function devOverride(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem("centium-dev:checks") === "1";
  } catch {
    return false;
  }
}

const KEYS = { phase: "checks.phase", stoppedOn: "checks.stoppedOn", checkIns: "checks.checkIns" } as const;

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKeyFor(key, TAB_USER_ID));
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(storageKeyFor(key, TAB_USER_ID), JSON.stringify(value));
  } catch {
    /* storage full or blocked: the value lives for this page only */
  }
}

/** Erases every device-only value of the mode for this account. */
function wipeLocal() {
  try {
    const prefix = `${STORAGE_PREFIX}:${storageNamespace(TAB_USER_ID)}:checks.`;
    for (const k of Object.keys(localStorage)) if (k.startsWith(prefix)) localStorage.removeItem(k);
  } catch {
    /* nothing stored */
  }
}

export const HealthChecksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authUserId } = useApp();
  const available = REVIEWED || devOverride();
  const [read, setRead] = useState<{ userId: string; on: boolean } | null>(null);
  const [phase, setPhaseState] = useState<Phase | null>(() => readLocal<Phase | null>(KEYS.phase, null));
  const [stoppedOn, setStoppedOn] = useState<string | null>(() => readLocal<string | null>(KEYS.stoppedOn, null));
  const [checkIns, setCheckIns] = useState<CheckIn[]>(() => readLocal<CheckIn[]>(KEYS.checkIns, []));
  const [tick, setTick] = useState(0);

  const clearDevice = useCallback(() => {
    wipeLocal();
    setPhaseState(null);
    setStoppedOn(null);
    setCheckIns([]);
  }, []);

  useEffect(() => {
    if (!authUserId || !available) return;
    let cancelled = false;
    const userId = authUserId;
    void readSetting().then((r) => {
      if (cancelled || !r.ok) return;
      setRead({ userId, on: r.on });
      if (!r.on) clearDevice();
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, available, tick, clearDevice]);

  // Read fresh whenever the tab comes back into view or the window regains focus.
  useEffect(() => {
    const reread = () => setTick((t) => t + 1);
    const onVisible = () => {
      if (document.visibilityState === "visible") reread();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", reread);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", reread);
    };
  }, []);

  const on = read && read.userId === authUserId ? read.on : null;
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const turnOn = useCallback(async (): Promise<TurnOnResult> => {
    if (!authUserId) return { ok: false, reason: "failed" };
    const result = await insertSetting(authUserId);
    if (result.ok) setRead({ userId: authUserId, on: true });
    return result;
  }, [authUserId]);

  const turnOff = useCallback(async (): Promise<boolean> => {
    if (!authUserId) return false;
    const ok = await deleteSetting(authUserId);
    if (ok) {
      setRead({ userId: authUserId, on: false });
      clearDevice();
    }
    return ok;
  }, [authUserId, clearDevice]);

  const setPhase = useCallback((p: Phase) => {
    setPhaseState(p);
    writeLocal(KEYS.phase, p);
    const stopped = p === "stopped" ? todayLocal() : null;
    setStoppedOn((prev) => {
      const next = p === "stopped" ? (prev ?? stopped) : null;
      writeLocal(KEYS.stoppedOn, next);
      return next;
    });
  }, []);

  const addCheckIn = useCallback((c: CheckIn) => {
    setCheckIns((prev) => {
      const next = [...prev.filter((x) => x.date !== c.date), c].sort((a, b) => a.date.localeCompare(b.date)).slice(-26);
      writeLocal(KEYS.checkIns, next);
      return next;
    });
  }, []);

  const value = useMemo<HealthChecksValue>(
    () => ({
      available,
      active: available && on === true,
      on,
      refresh,
      turnOn,
      turnOff,
      phase,
      setPhase,
      stoppedOn,
      checkIns,
      addCheckIn,
    }),
    [available, on, refresh, turnOn, turnOff, phase, setPhase, stoppedOn, checkIns, addCheckIn]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
