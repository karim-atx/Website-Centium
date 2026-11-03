import { useEffect, useRef } from "react";

/**
 * Website viewport v1 (section 3, keyboard): the shared ConfirmCard's "row"
 * layout has no Escape of its own, so the Mind web pages add it: while `open`,
 * Escape cancels (unless something on top handled it first), and focus goes
 * back to where it was when the confirmation opened (or to `returnTo`, e.g.
 * the ⋮ whose menu opened it, when that menu had already taken the focus).
 */
export function useEscCancel(open: boolean, onCancel: () => void, returnTo?: () => HTMLElement | null): void {
  const returnRef = useRef(returnTo);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
    returnRef.current = returnTo;
  });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      cancelRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const now = document.activeElement;
      const lost = !now || now === document.body || !now.isConnected;
      if (!lost) return;
      const back = returnRef.current?.() ?? null;
      const to = back?.isConnected ? back : prev;
      if (to && to !== document.body && to.isConnected) to.focus({ preventScroll: true });
    };
  }, [open]);
}
