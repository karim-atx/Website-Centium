import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE_URL } from "../config/site";

const SITE_NAME = "Centium";
const SITE_ORIGIN = SITE_URL;
const DEFAULT_DESCRIPTION =
  "Centium brings nutrition tracking, workout logging, health tracking, AI-powered guidance and community into one place.";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** The share title for a page (landing v29: no em dashes, "Centium: <title>",
 *  e.g. "Centium: Your health, all in one place"). */
export function shareTitle(title: string): string {
  return title ? `${SITE_NAME}: ${title}` : SITE_NAME;
}

/** Sets per-route document title + meta description/OG tags. CSR-only, so this only helps
 *  clients that execute JS (browsers, most modern crawlers) — see index.html for the static
 *  fallback tags used by crawlers that don't. `noindex` (the 404) adds
 *  <meta name="robots" content="noindex"> while the page is shown; Cloudflare
 *  serves unknown paths as dist/404.html, which carries the same tag statically. */
export function useSEO(title: string, description: string = DEFAULT_DESCRIPTION, options: { noindex?: boolean } = {}) {
  const { pathname } = useLocation();
  const noindex = !!options.noindex;
  useEffect(() => {
    const fullTitle = shareTitle(title);
    // Tab title is always just "Centium" — flat across every route, no
    // per-page name or separator. og:title/twitter:title below still use
    // the per-page fullTitle, unaffected by this — those describe how the
    // page appears when shared/searched, a separate concern from the tab.
    document.title = SITE_NAME;
    setMeta("description", description);
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    // index.html's static canonical/og:url describe the site root, which is the
    // wrong answer on every other route — rewrite both to the URL actually being
    // viewed. Path only (no query or hash), so anchored views like /legal#privacy
    // don't each claim to be a separate canonical page.
    const url = SITE_ORIGIN + pathname;
    setCanonical(url);
    setMeta("og:url", url, "property");
    setMeta("twitter:url", url);
  }, [title, description, pathname]);

  useEffect(() => {
    if (!noindex) return;
    const prev = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.getAttribute("content") ?? null;
    setMeta("robots", "noindex");
    return () => {
      const el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (!el) return;
      if (prev == null) el.remove();
      else el.setAttribute("content", prev);
    };
  }, [noindex]);
}
