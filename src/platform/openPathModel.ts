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
