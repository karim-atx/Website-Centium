// AN ERROR THAT CAME BACK IN THE REDIRECT URL, read once and removed.
//
// A refused Google sign-in (the burner-email hook, a suspended account, the
// user cancelling at Google) does not reach the app as a response it can
// read: GoTrue redirects back with `error`, `error_code` and
// `error_description`, in the query (PKCE) or the fragment (implicit). Nothing
// read them, so the user landed back on sign-in with no word of why.
//
// Captured at module load, before the Supabase client initialises, and taken
// out of the address bar straight away so a reload or a shared link never
// shows it again. Only on the pages a sign-in returns to: /app/onboarding
// (authRedirectUrl) and / (GoTrue's fallback when it cannot use redirect_to).
// The password-reset page reads its own link and is left alone.

export interface ReturnedAuthError {
  error: string;
  code: string | null;
  description: string | null;
}

const RETURN_PATHS = new Set(["/", "/app/onboarding"]);
const KEYS = ["error", "error_code", "error_description"];

/** Pure: the error carried by a return URL's query or fragment, if any. */
export function readReturnedAuthError(search: string, hash: string): ReturnedAuthError | null {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const source = query.has("error") || query.has("error_description")
    ? query
    : fragment.has("error") || fragment.has("error_description")
      ? fragment
      : null;
  if (!source) return null;
  return {
    error: source.get("error") ?? "",
    code: source.get("error_code"),
    description: source.get("error_description"),
  };
}

/** Pure: the same URL with the error parameters removed, everything else kept. */
export function withoutAuthError(pathname: string, search: string, hash: string): string {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  for (const k of KEYS) {
    query.delete(k);
    fragment.delete(k);
  }
  const q = query.toString();
  const f = fragment.toString();
  return `${pathname}${q ? `?${q}` : ""}${f ? `#${f}` : ""}`;
}

let pending: ReturnedAuthError | null = null;

// Through globalThis so this module also loads outside a browser (tests).
const page = (globalThis as {
  location?: { pathname: string; search: string; hash: string };
  history?: { state: unknown; replaceState(data: unknown, unused: string, url: string): void };
});
if (page.location && page.history && RETURN_PATHS.has(page.location.pathname)) {
  const { pathname, search, hash } = page.location;
  pending = readReturnedAuthError(search, hash);
  if (pending) page.history.replaceState(page.history.state, "", withoutAuthError(pathname, search, hash));
}

export function hasReturnedAuthError(): boolean {
  return pending !== null;
}

/** Hands the error over once; later calls get null. */
export function consumeReturnedAuthError(): ReturnedAuthError | null {
  const out = pending;
  pending = null;
  return out;
}
