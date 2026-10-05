// Small platform checks shared by Settings and its Notifications page.

/**
 * Whether the app is running installed rather than in a browser tab.
 *
 * Two checks because they cover different engines: the display-mode media
 * query is the standard, and `navigator.standalone` is Safari's own
 * non-standard predecessor, which is still what iOS reports.
 */
export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Whether this is iOS or iPadOS.
 *
 * USED ONLY TO PICK A MESSAGE, NEVER TO GATE ANYTHING. `pushSupported()`
 * decides what a row can do; this decides which sentence explains a `false`,
 * because "add it to your Home Screen" is actionable on iOS and misleading
 * everywhere else. If this is ever wrong, the cost is showing the wrong
 * explanation, not blocking a browser that works.
 *
 * The second clause is iPadOS 13+, which reports itself as a Mac. A real Mac
 * has no touch points, so maxTouchPoints separates them.
 */
export function isIosLike(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Why push is unavailable here, said as something the user can act on. */
export function pushUnavailableReason(): string {
  return isIosLike() && !isInstalled()
    ? // On iOS the APIs appear once the app is installed to the Home Screen,
      // so this is a step the user can take, not a dead end.
      "Add Centium to your Home Screen to receive call notifications when the app is closed"
    : "Not available in this browser";
}

export type PermissionName3 = "camera" | "microphone" | "geolocation";
/** granted / denied / prompt, or null where the browser can't say without asking. */
export type PermissionReading = "granted" | "denied" | "prompt" | null;

/**
 * Reads a permission WITHOUT prompting, where the browser supports it
 * (Chrome and Edge for all three; Safari and Firefox only for some), and
 * calls back when it changes. Null means "unknown until asked".
 */
export async function watchPermission(
  name: PermissionName3,
  onChange: (state: PermissionReading) => void
): Promise<() => void> {
  try {
    if (!navigator.permissions?.query) {
      onChange(null);
      return () => {};
    }
    const status = await navigator.permissions.query({ name: name as PermissionName });
    const read = () => onChange(status.state as PermissionReading);
    read();
    status.addEventListener("change", read);
    return () => status.removeEventListener("change", read);
  } catch {
    onChange(null);
    return () => {};
  }
}
