/**
 * Round K · ET: Tab and Shift+Tab stay inside an open dialog (a sheet or a
 * popup), so nothing behind it takes focus from the keyboard. Only the top
 * dialog traps: one on top of it handles its own Tab first.
 */
const FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

export function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest("[inert]") && !el.closest('[aria-hidden="true"]') && el.getClientRects().length > 0);
}

/** True when it moved focus (the caller has nothing more to do). */
export function trapTab(root: HTMLElement | null, e: KeyboardEvent): boolean {
  if (!root || e.key !== "Tab" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return false;
  const list = focusablesIn(root);
  const active = document.activeElement as HTMLElement | null;
  if (list.length === 0) {
    e.preventDefault();
    root.focus({ preventScroll: true });
    return true;
  }
  const first = list[0];
  const last = list[list.length - 1];
  const inside = !!active && root.contains(active);
  if (!inside) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
    return true;
  }
  if (e.shiftKey && (active === first || active === root)) {
    e.preventDefault();
    last.focus();
    return true;
  }
  if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
    return true;
  }
  return false;
}
