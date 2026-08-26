// Cloudflare Worker: reverse-proxies atraxia.org/centium/* to this
// project's GitHub Pages deployment, so the Centium site can live at a
// subpath of atraxia.org without atraxia.org's DNS/hosting needing to
// point directly at GitHub Pages (which can't serve just a subpath of a
// domain that already serves something else at its root).
//
// This file is NOT deployed automatically — it's reference material.
// This repo has no Cloudflare credentials configured, so someone with
// access to the atraxia.org Cloudflare account needs to set it up:
//
//   1. Cloudflare dashboard -> Workers & Pages -> Create Worker.
//   2. Paste this file's contents as the Worker's code.
//   3. On the atraxia.org zone, add a Route: atraxia.org/centium*
//      bound to this Worker.
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

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith(PUBLIC_PREFIX)) {
      return fetch(request); // not our path — pass through untouched
    }

    const originPath = GH_PAGES_PATH + url.pathname.slice(PUBLIC_PREFIX.length);
    const originUrl = `https://${GH_PAGES_HOST}${originPath}${url.search}`;

    const originRequest = new Request(originUrl, request);
    const response = await fetch(originRequest);

    // Pass the origin's response straight through — status included, so
    // GitHub Pages' 404.html (which this repo ships as a copy of
    // index.html, for SPA client-side routing) surfaces correctly for any
    // deep link under /centium/*.
    return new Response(response.body, response);
  },
};
