import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  CONSOLE_ACCESS_CHANGED,
  loadConsoleAccess,
  seatCan,
  seatMeets,
  type ConsoleAccess,
  type ConsoleNeed,
  type ConsolePermission,
} from "../services/business-console";

export interface UseConsoleAccess extends ConsoleAccess {
  /** False until the first read settles. */
  ready: boolean;
  /** The last read failed (offline); `retry` reads again. */
  failed: boolean;
  retry: () => void;
  /** The console's business (owner's own, or the chosen staff seat). */
  businessId: string | null;
  isOwner: boolean;
  /** Staff: an employee seat, not the owner. */
  isStaff: boolean;
  can: (p: ConsolePermission) => boolean;
  meets: (need: ConsoleNeed) => boolean;
}

/** The signed-in account's console seats and what the current one may do (B7). */
export function useConsoleAccess(): UseConsoleAccess {
  const { authUserId, profileReady } = useApp();
  const [state, setState] = useState<{ uid: string; access: ConsoleAccess } | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const bump = () => setEpoch((e) => e + 1);
    window.addEventListener(CONSOLE_ACCESS_CHANGED, bump);
    return () => window.removeEventListener(CONSOLE_ACCESS_CHANGED, bump);
  }, []);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let alive = true;
    void loadConsoleAccess(authUserId).then((r) => {
      if (!alive) return;
      setFailed(!r.ok);
      if (r.ok) setState({ uid: authUserId, access: r.value });
    });
    return () => {
      alive = false;
    };
  }, [authUserId, profileReady, epoch]);

  const access = state && state.uid === authUserId ? state.access : null;
  const current = access?.current ?? null;
  const can = useCallback((p: ConsolePermission) => seatCan(current, p), [current]);
  const meets = useCallback((need: ConsoleNeed) => seatMeets(current, need), [current]);
  const retry = useCallback(() => setEpoch((e) => e + 1), []);
  return {
    current,
    seats: access?.seats ?? [],
    ready: !!access,
    failed: failed && !access,
    retry,
    businessId: current?.businessId ?? null,
    isOwner: !!current?.isOwner,
    isStaff: !!current && !current.isOwner,
    can,
    meets,
  };
}
