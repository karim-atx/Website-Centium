// Cloudflare Worker for atraxia.org. Two jobs now:
//
//   1. atraxia.org (root) -> the "hub of apps" static page, plus the
//      root-level static files it references (favicon.svg, robots.txt,
//      sitemap.xml, legal.html, privacy.html, accessibility.html, and
//      everything under /atraxia/ and /icons/ — the logo assets, founder
//      photos and favicon/manifest set the hub loads by root-relative
//      path). These are straight reverse-proxies to this project's GitHub
//      Pages deployment, which now publishes the repo's hub/ directory and
//      nothing else (see .github/workflows/deploy.yml).
//   2. atraxia.org/centium/* (and www.atraxia.org/centium/*) -> a 301
//      redirect to centium.atraxia.org,
//      preserving the rest of the path and the query string. Centium used
//      to be proxied from a /centium subfolder of that same GitHub Pages
//      origin; it now builds and deploys on its own at centium.atraxia.org
//      (Cloudflare Pages), so all this Worker owes the old URLs is a
//      permanent redirect to where each page actually lives.
//
// The proxy in (1) exists so atraxia.org's DNS/hosting doesn't need to
// point directly at GitHub Pages. Anything else (any other path) gets
// Atraxia's own branded 404 — see the note above the catch-all branch
// below for why this doesn't risk shadowing other real content on the
// domain, and why the hub's own assets are proxied by an explicit
// allowlist rather than a blanket "proxy everything".
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
// renamed.

const GH_PAGES_HOST = "karim-atx.github.io";
const GH_PAGES_PATH = "/Website-Centium";

// Where Centium lives now, and the path prefix it used to live under on
// this domain. Kept as constants so the redirect below reads plainly.
const HUB_HOST = "atraxia.org";
// The Cloudflare zone binds Worker routes for both the apex and the www
// subdomain, so a /centium link has to redirect on either one. Derived from
// HUB_HOST rather than spelled out a second time, so changing the domain
// stays a one-line edit.
const HUB_HOSTS = new Set([HUB_HOST, `www.${HUB_HOST}`]);
const CENTIUM_ORIGIN = "https://centium.atraxia.org";
const CENTIUM_LEGACY_PREFIX = "/centium";

// Root-level files the hub ships alongside its index — referenced by
// root-relative path, so they need the same GitHub Pages proxy treatment as
// "/" itself. Update this if a new top-level file or folder is added under
// hub/ (other than hub/index.html, which is covered by the "/" case).
const HUB_ASSET_PATHS = new Set([
  "/favicon.svg",
  "/robots.txt",
  "/sitemap.xml",
  "/privacy.html",
  "/accessibility.html",
  "/legal.html",
  "/404.html",
]);
// "/icons/" added for the favicon/manifest set the hub has referenced by
// root-relative path since the "landing page enhancements" v7 handoff — this
// prefix was never added alongside it, so every one of those files (the
// sized favicons, the apple-touch-icon and the manifest) has been 404ing in
// production ever since, confirmed directly against atraxia.org. The v9
// handoff's inline data-URI primary favicon (see the hub's first rel="icon")
// is what will actually render meanwhile, since it needs no fetch at all —
// but the rest stay broken without this until this file is redeployed.
const HUB_ASSET_PREFIXES = ["/atraxia/", "/icons/"];

function isHubAsset(pathname) {
  return pathname === "/" || HUB_ASSET_PATHS.has(pathname) || HUB_ASSET_PREFIXES.some((p) => pathname.startsWith(p));
}

function isHubHost(hostname) {
  return HUB_HOSTS.has(hostname);
}

// Matches the old Centium paths on this domain, and only those: the bare
// "/centium" and anything genuinely beneath it. Deliberately not a plain
// startsWith on the prefix, which would also swallow a sibling path like
// "/centiumfoo" and redirect it to a mangled "foo" with no leading slash.
function isLegacyCentiumPath(pathname) {
  return pathname === CENTIUM_LEGACY_PREFIX || pathname.startsWith(`${CENTIUM_LEGACY_PREFIX}/`);
}

// /centium/pricing -> https://centium.atraxia.org/pricing, /centium ->
// https://centium.atraxia.org/. 301 rather than 302: the move is permanent,
// and this is the only thing that keeps existing links and search results
// working now that nothing serves Centium under this domain.
function redirectToCentium(url) {
  const rest = url.pathname.slice(CENTIUM_LEGACY_PREFIX.length) || "/";
  return Response.redirect(`${CENTIUM_ORIGIN}${rest}${url.search}`, 301);
}

async function proxy(originPath, search, request) {
  const originUrl = `https://${GH_PAGES_HOST}${originPath}${search}`;
  const originRequest = new Request(originUrl, request);
  const response = await fetch(originRequest);
  // Pass the origin's response straight through, status included.
  return new Response(response.body, response);
}

// Atraxia's own branded 404 (hub/404.html, published to the GitHub Pages
// root as /404.html — which is also the name GitHub Pages itself serves for
// any unmatched path, so the hub gets the same page whether it's reached
// through this Worker or directly).
async function proxyHub404() {
  const originUrl = `https://${GH_PAGES_HOST}${GH_PAGES_PATH}/404.html`;
  const response = await fetch(originUrl);
  return new Response(response.body, { status: 404, statusText: "Not Found", headers: response.headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Checked first, ahead of both the hub-asset proxy and the catch-all
    // below — otherwise every old /centium/* link would fall through to the
    // branded 404 instead of redirecting.
    if (isHubHost(url.hostname) && isLegacyCentiumPath(url.pathname)) {
      return redirectToCentium(url);
    }

    if (isHubAsset(url.pathname)) {
      return proxy(GH_PAGES_PATH + url.pathname, url.search, request);
    }

    // Not a known hub asset or a legacy Centium path. This used to try the
    // real origin first and only fall back to our branded 404 if that origin
    // genuinely returned one, in case atraxia.org's hosting served other
    // real content at some other path. In practice atraxia.org has no
    // origin configured outside the paths this Worker already handles
    // explicitly above, so that fetch just hung until Cloudflare gave up
    // and showed its own raw 522 timeout page — worse than either a real
    // 404 or no fallback at all. Serving the branded 404 directly avoids
    // that hang; if a real origin is ever added at some other path on
    // this domain, add it to HUB_ASSET_PATHS/PREFIXES above so it's
    // excluded from this catch-all.
    return proxyHub404();
  },
};
