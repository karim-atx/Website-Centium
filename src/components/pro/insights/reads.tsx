import React, { useCallback, useEffect, useRef, useState } from "react";
import { ProCardSkeleton, ProError } from "../states";
import type { Read } from "../../../services/pro/clients";

export interface ReadState<T> {
  data: T | undefined;
  loading: boolean;
  error: boolean;
  offline: boolean;
  retry: () => void;
}

/**
 * One read for a screen: loading until the first answer, the last answer
 * kept on a failed refresh (offline line), and an inline retry. `enabled`
 * false means not fetched (hidden or not shared).
 */
export function useRead<T>(enabled: boolean, load: () => Promise<Read<T>>, deps: unknown[]): ReadState<T> {
  const [state, setState] = useState<{ data: T | undefined; error: boolean; offline: boolean; done: boolean }>({ data: undefined, error: false, offline: false, done: false });
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setState((s) => ({ ...s, done: false }));
    void loadRef.current().then((r) => {
      if (!live) return;
      setState((s) => (r.ok ? { data: r.data, error: false, offline: false, done: true } : { data: s.data, error: true, offline: r.offline, done: true }));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { data: state.data, loading: enabled && !state.done && state.data === undefined, error: state.error && state.data === undefined, offline: state.offline && state.data !== undefined, retry };
}

/** Loading skeleton or inline error for a read that has no data yet; null when there is data. */
export function readGate<T>(r: ReadState<T>, lines = 3): React.ReactNode | null {
  if (r.data !== undefined) return null;
  if (r.error) return <ProError onRetry={r.retry} />;
  return (
    <div style={{ marginBottom: 12 }}>
      <ProCardSkeleton lines={lines} height={160} />
    </div>
  );
}

