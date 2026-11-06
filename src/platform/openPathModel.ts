// Which paths a widget, shortcut, notification or (later) an app link may
// open (App-Centium ROUND_J.md §1.2). Pure, so it is tested on its own.
//
// Only this website's own app pages: a path under /app, with its query and
// hash. Anything else (another origin, a scheme, //host, a marketing page,
// a backslash trick) opens nothing.

const BASE = "https://app.invalid";

/** The `/app...` path to navigate to, or null when `raw` isn't one. */
export function appPathFrom(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("\\")) return null;
  let u: URL;
  try {
    u = new URL(s, BASE);
  } catch {
    return null;
  }
  if (u.origin !== BASE) return null;
  if (u.pathname !== "/app" && !u.pathname.startsWith("/app/")) return null;
  return u.pathname + u.search + u.hash;
}

// Round J · J-2b: a path from a launch, widget, shortcut or notification is
// held until it can be opened (NativeOpenPath). Held while signed out or not
// onboarded (so it comes back after sign-in), and while onboarding is still
// finishing: Onboarding's finish() marks the account onboarded before it has
// redeemed a client code, sent a business to /app/business/setup or shown the
// trial offer, so those pages hold it too and it opens when they move on.
// Dropped when another account signs in, or when it has waited too long.

export type HeldPath = { path: string; heldAt: number; owner: string | null };

/** How long a held path waits before it is no longer worth opening. */
export const HELD_PATH_MAX_MS = 10 * 60_000;

/** Pages that are still finishing onboarding: a held path waits through them. */
export const HOLD_PATH_PAGES = ["/app/onboarding", "/app/business/setup"];

export type HeldPathDecision = "none" | "wait" | "open" | "drop";

export function decideHeldPath(
  held: HeldPath | null,
  now: { ready: boolean; pathname: string; userId: string | null; at: number }
): HeldPathDecision {
  if (!held) return "none";
  if (now.at - held.heldAt > HELD_PATH_MAX_MS) return "drop";
  // Held for one account, and a different one is now signed in.
  if (held.owner && now.userId && held.owner !== now.userId) return "drop";
  if (!now.ready) return "wait";
  if (HOLD_PATH_PAGES.some((p) => now.pathname === p || now.pathname.startsWith(p + "/"))) return "wait";
  return "open";
}
