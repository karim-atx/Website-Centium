import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "Centium";
const SITE_ORIGIN = "https://centium.atraxia.org";
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

/** Sets per-route document title + meta description/OG tags. CSR-only, so this only helps
 *  clients that execute JS (browsers, most modern crawlers) — see index.html for the static
 *  fallback tags used by crawlers that don't. */
export function useSEO(title: string, description: string = DEFAULT_DESCRIPTION) {
  const { pathname } = useLocation();
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
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
}
