// Cloudflare Worker for atraxia.org. Two jobs, both reverse-proxying to
// this project's GitHub Pages deployment:
//
//   1. atraxia.org (root) -> the "hub of apps" static page, built from
//      public/hub.html by the same Vite/GitHub Actions pipeline as the
//      rest of the site (reachable at .../hub.html in the built output).
//   2. atraxia.org/centium/* -> the Centium app itself.
//
// Both exist so atraxia.org's DNS/hosting doesn't need to point directly
// at GitHub Pages (which can't serve just a subpath of a domain that
// already serves something else at its root). Anything else (any other
// path) passes through untouched, in case atraxia.org's hosting already
// serves other real content there.
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
const HUB_ORIGIN_PATH = GH_PAGES_PATH + "/hub.html";

async function proxy(originPath, search, request) {
  const originUrl = `https://${GH_PAGES_HOST}${originPath}${search}`;
  const originRequest = new Request(originUrl, request);
  const response = await fetch(originRequest);
  // Pass the origin's response straight through — status included, so
  // GitHub Pages' 404.html (which this repo ships as a copy of index.html,
  // for SPA client-side routing) surfaces correctly for any deep link
  // under /centium/*.
  return new Response(response.body, response);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return proxy(HUB_ORIGIN_PATH, url.search, request);
    }

    if (!url.pathname.startsWith(PUBLIC_PREFIX)) {
      return fetch(request); // not our path — pass through untouched
    }

    // GitHub Pages 301s a directory path with no trailing slash (e.g.
    // "/Website-Centium") to the same path with one added — and since the
    // exact rest-of-path is empty for a bare "/centium" request, that would
    // otherwise leak a redirect straight to the raw github.io URL. Treat an
    // empty remainder as "/" so we always ask GitHub Pages for the
    // trailing-slash form directly and never trigger that redirect.
    const rest = url.pathname.slice(PUBLIC_PREFIX.length) || "/";
    return proxy(GH_PAGES_PATH + rest, url.search, request);
  },
};
