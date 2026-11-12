// FX follow-up: the selection tick for every toggle switch, app-wide, from one
// watcher instead of a call in each switch (switchTicksModel.ts has the rule).
// Installed once in main.tsx, in the app only; haptics.ts's gates (the
// Vibration switch, the page visible, the phone's System Haptics / touch
// feedback / silent mode) decide whether it plays.
import { createSwitchTickTracker } from "./switchTicksModel";

/** A switch the person can turn: role="switch", not decorative, not disabled. */
const SWITCH = '[role="switch"]:not([aria-hidden="true"])';

function switchAt(target: EventTarget | null): Element | null {
  const el = target instanceof Element ? target.closest(SWITCH) : null;
  if (!el || el.getAttribute("aria-disabled") === "true" || (el as HTMLButtonElement).disabled) return null;
  return el;
}

let installed = false;

export function installSwitchTicks(tick: () => void): void {
  if (installed || typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  installed = true;
  const tracker = createSwitchTickTracker<Element>(() => Date.now());
  const note = (e: Event) => {
    if (!e.isTrusted) return;
    const el = switchAt(e.target);
    if (el) tracker.tapped(el, el.getAttribute("aria-checked"));
  };
  // Capture, so the state before the switch's own handler runs is the one kept.
  document.addEventListener("click", note, true);
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === " " || e.key === "Enter") note(e);
    },
    true
  );
  new MutationObserver((records) => {
    for (const r of records) {
      const el = r.target as Element;
      if (tracker.changed(el, el.getAttribute("aria-checked"))) tick();
    }
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["aria-checked"] });
}
