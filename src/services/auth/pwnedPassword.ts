/**
 * Round K (Karim, K-PW): a new password is checked against HaveIBeenPwned's
 * Pwned Passwords, as advice only. Nothing is ever blocked.
 *
 * k-anonymity: the password's SHA-1 is worked out on the device and only its
 * first 5 hex characters leave it, to the range API. The answer lists every
 * known suffix under that prefix (padded with count-0 lines, so its size says
 * nothing); the match is made here. The password and the full hash are never
 * sent anywhere.
 */

const RANGE_URL = "https://api.pwnedpasswords.com/range/";
/** The check gives up quietly after this, so a slow network never holds anyone up. */
export const PWNED_TIMEOUT_MS = 3000;

/** Upper-case hex SHA-1 of the text (UTF-8), as the range API lists it. */
export async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * How many breaches list `suffix` in a range answer ("SUFFIX:COUNT" per
 * line). Padding lines carry count 0 and count as not found.
 */
export function countInRange(body: string, suffix: string): number {
  const want = suffix.toUpperCase();
  for (const line of body.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    if (line.slice(0, i).trim().toUpperCase() !== want) continue;
    const n = Number.parseInt(line.slice(i + 1).trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  return 0;
}

/**
 * How many breaches list this password, or null when the check couldn't run
 * (offline, timed out, cancelled, an error answer): the caller then says nothing.
 */
export async function pwnedCount(
  password: string,
  opts: { signal?: AbortSignal; fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<number | null> {
  if (!password) return null;
  const doFetch = opts.fetchImpl ?? fetch;
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), opts.timeoutMs ?? PWNED_TIMEOUT_MS);
  const onAbort = () => timeout.abort();
  opts.signal?.addEventListener("abort", onAbort);
  try {
    const hash = await sha1Hex(password);
    if (timeout.signal.aborted) return null;
    const res = await doFetch(RANGE_URL + hash.slice(0, 5), {
      headers: { "Add-Padding": "true" },
      signal: timeout.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!res.ok) return null;
    return countInRange(await res.text(), hash.slice(5));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}
