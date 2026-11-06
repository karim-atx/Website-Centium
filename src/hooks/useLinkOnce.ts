import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { withoutParam } from "./linkOnceModel";

/**
 * Round J · J-2b (website PLAN.md §2.4): a widget or shortcut opened this page
 * with `?name=value` (log=1, start=today, start=1, pass=1). Once `ready`,
 * `open` runs once and the parameter is taken off the address (replacing the
 * history entry), so Back and a reload don't open it again.
 *
 * `open` returning "navigated" means it left the page itself; the parameter is
 * then left alone, since clearing it would navigate back here.
 */
export function useLinkOnce(name: string, value: string, open: () => void | "navigated", ready = true): void {
  const [params, setParams] = useSearchParams();
  const asked = params.get(name) === value;
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  useEffect(() => {
    if (!asked || !ready) return;
    if (openRef.current() === "navigated") return;
    setParams((p) => withoutParam(p, name), { replace: true });
  }, [asked, ready, name, setParams]);
}
