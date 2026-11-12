// FX follow-up: WHEN a toggle switch was turned on or off by the person, so
// the selection tick plays (hapticsModel's tick). Pure, so it is tested
// without a page; switchTicks.ts feeds it the page's taps and changes.
//
// A switch is anything with role="switch" (Toggle, SelectableBox's switch
// rows, and every hand-made switch in the app). Two things have to happen:
//   1. the person taps (or presses Space / Enter on) the switch, and
//   2. that switch's aria-checked then actually changes, within WINDOW_MS.
// So a switch that refuses (a permission the phone denies, an upsell on a
// locked switch) stays silent, a switch that waits for the server ticks when
// it flips, and switches moved by loading data or by another switch (a master
// switching its children) never tick. One tap is one tick.

/** How long after the tap the switch may take to flip (a save before it shows). */
export const WINDOW_MS = 1_500;

export interface SwitchTickTracker<T> {
  /** The person tapped this switch, which showed `checked` (aria-checked). */
  tapped(target: T, checked: string | null): void;
  /** A switch's aria-checked became `checked`; true when that is the tapped switch turning. */
  changed(target: T, checked: string | null): boolean;
}

export function createSwitchTickTracker<T>(now: () => number): SwitchTickTracker<T> {
  let pending: { target: T; before: string | null; at: number } | null = null;
  return {
    tapped(target, checked) {
      pending = { target, before: checked, at: now() };
    },
    changed(target, checked) {
      const p = pending;
      if (!p || p.target !== target) return false;
      if (now() - p.at > WINDOW_MS) {
        pending = null;
        return false;
      }
      if (checked === p.before) return false;
      pending = null;
      return true;
    },
  };
}
