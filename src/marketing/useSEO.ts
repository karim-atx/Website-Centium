import { useEffect } from "react";

const SITE_NAME = "Centium";
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

/** Sets per-route document title + meta description/OG tags. CSR-only, so this only helps
 *  clients that execute JS (browsers, most modern crawlers) — see index.html for the static
 *  fallback tags used by crawlers that don't. */
export function useSEO(title: string, description: string = DEFAULT_DESCRIPTION) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;
    setMeta("description", description);
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
  }, [title, description]);
}
