import { useCallback, useEffect, useState } from "react";
import { ensurePassSecret, forgetPassSecret, type PassSecret } from "../../services/venues/passDevice";
import { hexToBytes, passCode, passCounter, passQrValue, secondsLeft } from "../../services/venues/passCode";

/**
 * Round F2 · AB5: the pass's rotating QR value. Gets this device's secret
 * (stored, checked, or issued: services/venues/passDevice), then recomputes
 * the 6-digit code each 30-second window on the device's clock, offline too.
 * `value` is "pd:<device>:<code>", or null while there is no secret (the pass
 * then shows the static pass_token). `left` is the seconds to the next code,
 * for the ring.
 */
export function usePassCode({ userId, membershipId, online }: { userId: string | null; membershipId: string; online: boolean }) {
  const [secret, setSecret] = useState<{ key: string; value: PassSecret | null } | null>(null);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState<{ counter: number; deviceId: string; code: string } | null>(null);
  const key = `${userId ?? ""}|${membershipId}`;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void ensurePassSecret(userId, membershipId, online).then((s) => {
      if (!cancelled) setSecret({ key: `${userId}|${membershipId}`, value: s });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, membershipId, online, tick]);

  const current = secret && secret.key === key ? secret.value : null;

  // A one-second clock while there is a secret (the ring moves; the code turns over on the window).
  useEffect(() => {
    if (!current) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [current]);

  const counter = passCounter(now);
  useEffect(() => {
    if (!current) return;
    const bytes = hexToBytes(current.secret);
    if (!bytes) return;
    let cancelled = false;
    void passCode(bytes, counter)
      .then((c) => {
        if (!cancelled) setCode({ counter, deviceId: current.deviceId, code: c });
      })
      .catch(() => {
        /* no Web Crypto: the static code stays */
      });
    return () => {
      cancelled = true;
    };
  }, [current, counter]);

  /** After "Get a new pass code" (every secret revoked) or removing this device: drop it and get a new one. */
  const renew = useCallback(() => {
    if (userId) forgetPassSecret(userId, membershipId);
    setSecret(null);
    setCode(null);
    setTick((x) => x + 1);
  }, [userId, membershipId]);

  const fresh = current && code && code.deviceId === current.deviceId && code.counter >= counter - 1 ? code : null;
  return {
    value: fresh ? passQrValue(fresh.deviceId, fresh.code) : null,
    left: secondsLeft(now),
    deviceId: current?.deviceId ?? null,
    renew,
  };
}
