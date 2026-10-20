// The public site address every link a person shares is built from: invite
// links, profile and booking links, the share-card QR, shared cards, course
// and certificate links. One setting, VITE_PUBLIC_SITE_URL, with the live
// site as the fallback, so no shared link can point at a domain we don't
// serve (centium.app has no DNS record; links built on it led nowhere).
//
// Auth redirects deliberately do NOT use this: they must return to whichever
// environment the person signed in from (see services/auth).

export const DEFAULT_SITE_URL = "https://centium.atraxia.org";

/** An http(s) origin with no trailing slash, or the fallback when the value is missing or not a URL. */
export function normaliseSiteUrl(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  if (!value) return DEFAULT_SITE_URL;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return DEFAULT_SITE_URL;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

// import.meta.env is Vite's; under node:test it is undefined, so the fallback applies.
const env = (import.meta as { env?: Record<string, string | undefined> }).env;

/** e.g. "https://centium.atraxia.org". */
export const SITE_URL = normaliseSiteUrl(env?.VITE_PUBLIC_SITE_URL);

/** The address without its scheme, for links shown as text, e.g. "centium.atraxia.org". */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/** The full link to open or share, e.g. siteHref("/i/RAMI-R3COACH1"). */
export const siteHref = (path: string) => `${SITE_URL}${path}`;

/** The same link as shown in text, without the scheme. */
export const siteText = (path: string) => `${SITE_HOST}${path}`;
