// Cloudflare Worker for atraxia.org. Two jobs:
//
//   1. Serves a small static "hub of apps" page at the domain root ("/"),
//      inlined below as HUB_HTML — source of truth for that markup is
//      deploy/hub.html in this repo; keep the two in sync by hand.
//   2. Reverse-proxies atraxia.org/centium/* to this project's GitHub
//      Pages deployment, so the Centium site can live at a subpath of
//      atraxia.org without atraxia.org's DNS/hosting needing to point
//      directly at GitHub Pages (which can't serve just a subpath of a
//      domain that already serves something else at its root).
//
// Anything else (any other path) passes through untouched, in case
// atraxia.org's hosting already serves other real content there.
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

const HUB_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Atraxia</title>
    <meta name="theme-color" content="#AEA1DC" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0D0B1A" media="(prefers-color-scheme: dark)" />
    <style>
      :root {
        --cream: 255 255 255;
        --cream-soft: 245 245 246;
        --charcoal: 36 31 27;
        --charcoal-soft: 91 83 73;
        --primary: 174 161 220;
        --primary-dark: 125 107 181;
        --primary-pale: 240 237 249;
        --teal: 162 200 194;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --cream: 13 11 26;
          --cream-soft: 23 20 42;
          --charcoal: 245 243 250;
          --charcoal-soft: 184 179 199;
          --primary: 169 145 254;
          --primary-dark: 125 103 217;
          --primary-pale: 52 45 84;
          --teal: 162 200 194;
        }
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        min-height: 100%;
        background: rgb(var(--cream));
        color: rgb(var(--charcoal));
        font-family: Manrope, ui-sans-serif, system-ui, -apple-system, sans-serif;
      }
      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 2rem 1.25rem;
        text-align: center;
      }
      .brand {
        font-weight: 800;
        letter-spacing: 0.06em;
        font-size: 1.05rem;
        color: rgb(var(--charcoal-soft));
        margin-bottom: 0.5rem;
      }
      h1 {
        font-size: clamp(1.75rem, 4vw, 2.5rem);
        font-weight: 800;
        letter-spacing: -0.02em;
        margin: 0 0 2.5rem;
      }
      .grid {
        display: flex;
        flex-wrap: wrap;
        gap: 1.25rem;
        justify-content: center;
      }
      .tile {
        width: 220px;
        padding: 1.75rem 1.5rem;
        border-radius: 1.75rem;
        text-decoration: none;
        color: inherit;
        background: rgb(var(--cream-soft));
        box-shadow: 0 2px 10px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.85rem;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      a.tile:hover, a.tile:focus-visible {
        transform: translateY(-3px);
        box-shadow: 0 8px 30px rgb(0 0 0 / 0.10);
      }
      .icon {
        width: 64px;
        height: 64px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgb(var(--cream));
      }
      .tile .name {
        font-weight: 700;
        font-size: 1.05rem;
      }
      .tile .desc {
        font-size: 0.85rem;
        color: rgb(var(--charcoal-soft));
      }
      .tile--soon {
        opacity: 0.6;
      }
      .tile--soon .icon {
        border: 2px dashed rgb(var(--charcoal-soft) / 0.35);
        background: transparent;
      }
    </style>
  </head>
  <body>
    <div class="brand">ATRAXIA</div>
    <h1>Our apps, in one place.</h1>
    <div class="grid">
      <a class="tile" href="/centium">
        <span class="icon">
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M39.06 80.07A32 32 0 1 1 70.58 74.51" stroke="rgb(var(--primary-dark))" stroke-width="22" stroke-linecap="round" fill="none"/>
            <path d="M55.47 65.04 Q73.55 73.78 66.4 95.1 Q55.69 80.28 55.47 65.04 Z" fill="rgb(var(--teal))"/>
          </svg>
        </span>
        <span class="name">Centium</span>
        <span class="desc">Health &amp; wellness</span>
      </a>
      <div class="tile tile--soon">
        <span class="icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="rgb(var(--charcoal-soft))" stroke-width="1.6"/>
            <path d="M12 8v4l2.5 2.5" stroke="rgb(var(--charcoal-soft))" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="name">Coming soon</span>
        <span class="desc">More on the way</span>
      </div>
    </div>
  </body>
</html>
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(HUB_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
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
    const originPath = GH_PAGES_PATH + rest;
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
