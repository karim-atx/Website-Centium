import { useEffect, useRef } from "react";

// Batch E (E5): THE PHONE'S BACK CLOSES WHAT IS OPEN FIRST.
//
// A sheet, popup or open Messages thread is component state on the same URL,
// so the browser / phone back used to leave the page and take the sheet with
// it. Now each one, while open, adds one history entry for itself (same URL,
// marked with its id); back pops that entry and closes the topmost open one.
// Closed by the app instead (×, a tap outside, a save), it removes its own
// entry again, but only while that entry is still the current one: if the
// close came with a navigation (a button that closes the sheet and opens a
// page), the entry is left alone rather than undoing the navigation.

type Entry = { id: number; close: () => void };
const stack: Entry[] = [];
let seq = 0;
let ignorePops = 0;
let listening = false;

function onPop() {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  stack.pop()?.close();
}

const currentMark = (): number | undefined =>
  (window.history.state as { __sheet?: number } | null)?.__sheet;

/** While `open`, the browser / phone back calls `onClose` instead of leaving the page. */
export function useBackCloses(open: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    if (!listening) {
      window.addEventListener("popstate", onPop);
      listening = true;
    }
    const entry: Entry = { id: ++seq, close: () => closeRef.current() };
    stack.push(entry);
    // Keep React Router's own fields (key, idx, usr) so it sees the same page.
    window.history.pushState({ ...(window.history.state ?? {}), __sheet: entry.id }, "");
    return () => {
      const i = stack.indexOf(entry);
      if (i < 0) return; // closed by back: its entry is already gone
      stack.splice(i, 1);
      if (currentMark() === entry.id) {
        ignorePops++;
        window.history.back();
      }
    };
  }, [open]);
}
