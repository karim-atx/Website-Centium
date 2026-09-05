// Cloudflare Worker for atraxia.org. Two jobs, both reverse-proxying to
// this project's GitHub Pages deployment:
//
//   1. atraxia.org (root) -> the "hub of apps" static page, plus the
//      root-level static files it references (favicon.svg, icons.svg,
//      robots.txt, sitemap.xml, legal.html, and everything under /atraxia/
//      and /icons/ — the logo assets, founder photos and favicon/manifest
//      set hub.html loads by root-relative path). The build (see
//      .github/workflows/deploy.yml) moves the Centium app to a /centium
//      subfolder and puts the hub (public/hub.html) and its sibling
//      public/ files at the site's own root, so these are all straight
//      proxies to that GitHub Pages root.
//   2. atraxia.org/centium/* -> the Centium app itself, at that same
//      /centium subfolder.
//
// Both exist so atraxia.org's DNS/hosting doesn't need to point directly
// at GitHub Pages (which can't serve just a subpath of a domain that
// already serves something else at its root). Anything else (any other
// path) gets Atraxia's own branded 404 (public/atraxia-404.html) — see the
// note above the catch-all branch below for why this doesn't risk
// shadowing other real content on the domain, and why the hub's own
// assets are still proxied by an explicit allowlist rather than "anything
// not under /centium".
//
// This file is NOT deployed automatically — it's reference material.
// This repo has no Cloudflare credentials configured, so someone with
// access to the atraxia.org Cloudflare account needs to set it up:
//
//   1. Cloudflare dashboard -> Workers & Pages -> Create Worker.
//   2. Paste this file's contents as the Worker's code.
//   3. On the atraxia.org zone, add a Route: atraxia.org/*
//      bound to this Worker (not just /centium* — the Worker itself
//      narrows which paths it actually handles, per above).
//   4. No DNS record changes needed — Workers routes run in front of
//      whatever already serves atraxia.org's DNS/hosting.
//
// GH_PAGES_PATH must match the GitHub repo name exactly, since that's the
// path segment GitHub Pages project sites are served under by default
// (https://<user>.github.io/<repo>/). Update it here if the repo is ever
// renamed, and update PUBLIC_PREFIX if the desired public path ever
// changes from /centium.

const GH_PAGES_HOST = "karim-atx.github.io";
const GH_PAGES_PATH = "/Website-Centium";
const PUBLIC_PREFIX = "/centium";

// Root-level files public/ ships alongside hub.html — referenced by
// hub.html via root-relative paths, so they need the same GitHub Pages
// proxy treatment as "/" itself. Update this if a new top-level file or
// folder is added under public/ (other than hub.html, which the build
// renames to index.html and is covered by the "/" case).
const HUB_ASSET_PATHS = new Set([
  "/favicon.svg",
  "/icons.svg",
  "/robots.txt",
  "/sitemap.xml",
  "/privacy.html",
  "/accessibility.html",
  "/legal.html",
  "/atraxia-404.html",
]);
// "/icons/" added for the favicon/manifest set hub.html has referenced by
// root-relative path since the "landing page enhancements" v7 handoff — this
// prefix was never added alongside it, so every one of those files (the
// sized favicons, the apple-touch-icon and the manifest) has been 404ing in
// production ever since, confirmed directly against atraxia.org. The v9
// handoff's inline data-URI primary favicon (see hub.html's first rel="icon")
// is what will actually render meanwhile, since it needs no fetch at all —
// but the rest stay broken without this until this file is redeployed.
const HUB_ASSET_PREFIXES = ["/atraxia/", "/icons/"];

function isHubAsset(pathname) {
  return pathname === "/" || HUB_ASSET_PATHS.has(pathname) || HUB_ASSET_PREFIXES.some((p) => pathname.startsWith(p));
}

async function proxy(originPath, search, request) {
  const originUrl = `https://${GH_PAGES_HOST}${originPath}${search}`;
  const originRequest = new Request(originUrl, request);
  const response = await fetch(originRequest);
  // Pass the origin's response straight through — status included, so
  // GitHub Pages' 404.html (which this repo ships as a copy of the
  // Centium app's index.html, for SPA client-side routing) surfaces
  // correctly for any deep link under /centium/*.
  return new Response(response.body, response);
}

// Atraxia's own branded 404 (public/atraxia-404.html) — distinct from
// dist/404.html, which stays dedicated to the Centium SPA's deep-link
// fallback (see that file's own header comment).
async function proxyHub404() {
  const originUrl = `https://${GH_PAGES_HOST}${GH_PAGES_PATH}/atraxia-404.html`;
  const response = await fetch(originUrl);
  return new Response(response.body, { status: 404, statusText: "Not Found", headers: response.headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (isHubAsset(url.pathname)) {
      return proxy(GH_PAGES_PATH + url.pathname, url.search, request);
    }

    if (!url.pathname.startsWith(PUBLIC_PREFIX)) {
      // Not a known hub asset or /centium path. This used to try the real
      // origin first and only fall back to our branded 404 if that origin
      // genuinely returned one, in case atraxia.org's hosting served other
      // real content at some other path. In practice atraxia.org has no
      // origin configured outside the paths this Worker already handles
      // explicitly above, so that fetch just hung until Cloudflare gave up
      // and showed its own raw 522 timeout page — worse than either a real
      // 404 or no fallback at all. Serving the branded 404 directly avoids
      // that hang; if a real origin is ever added at some other path on
      // this domain, add it to HUB_ASSET_PATHS/PREFIXES (or PUBLIC_PREFIX)
      // above so it's excluded from this catch-all.
      return proxyHub404();
    }

    // GitHub Pages 301s a directory path with no trailing slash to the
    // same path with one added — and since the exact rest-of-path is
    // empty for a bare "/centium" request, that would otherwise leak a
    // redirect straight to the raw github.io URL. Treat an empty
    // remainder as "/" so we always ask GitHub Pages for the
    // trailing-slash form directly and never trigger that redirect.
    const rest = url.pathname.slice(PUBLIC_PREFIX.length) || "/";
    return proxy(GH_PAGES_PATH + PUBLIC_PREFIX + rest, url.search, request);
  },
};
