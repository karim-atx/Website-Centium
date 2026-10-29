/**
 * Database reads fail at once while the browser is offline (Round D, D24).
 *
 * postgrest-js retries a failed GET three times, waiting 1, 2 and 4 seconds,
 * which is right for a dropped packet and wrong for a phone in airplane mode:
 * every read then takes seven seconds to report what the browser already
 * knows, and the app opened offline sat on "Loading…" that long before
 * showing the data it keeps on the device.
 *
 * The library does not retry an AbortError, so that is what is thrown, with
 * a message every engine's isOffline() check reads as a connection failure
 * ("Failed to fetch"). Only /rest/v1/ is short-circuited: auth and Edge
 * Function calls keep their own handling.
 */
export function offlineFastFetch(inner: typeof fetch = (...args) => fetch(...args)): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false && urlOf(input).includes('/rest/v1/')) {
      const err = new Error('Failed to fetch (offline)')
      err.name = 'AbortError'
      return Promise.reject(err)
    }
    return inner(input, init)
  }
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}
