// Cloudflare Worker for atraxia.org. Two jobs now:
//
//   1. atraxia.org (root) -> the "hub of apps" static page, plus the
//      root-level static files it references (favicon.svg, robots.txt,
//      sitemap.xml, legal.html, and everything under /atraxia/ and
//      /icons/ — the logo assets, founder photos and favicon/manifest set
//      the hub loads by root-relative path). These are straight
//      reverse-proxies to this project's GitHub Pages deployment, which
//      now publishes the repo's hub/ directory and nothing else (see
//      .github/workflows/deploy.yml). privacy.html and accessibility.html
//      are gone — folded into legal.html's tabs — and deliberately not
//      redirected: neither URL was ever linked externally or indexed, so
//      they now 404 like any other removed path.
//      The Explorations blog rides on the same proxy: /blog serves
//      blog.html, and /blog/<slug> serves blog-post.html with that post's
//      title/description/image written into its <head> (see
//      renderBlogPost below), so search engines and link-preview bots that
//      never run the page's script still see the right post.
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
// 2026-10 Atraxia redesign (design-handover/atraxia/WORKER_STEPS.md has the
// exact manual deploy steps):
//   - /assets/ (the site's shared CSS and JS) is proxied like /atraxia/.
//   - The Contact page lives at /contact. /contact.html and /contact/ 301 to
//     it, keeping the query string, like every other redirect here.
//   - The Content-Security-Policy moved here from per-page meta tags (the
//     pages no longer carry one). It allows the shared submit-contact
//     function's origin and Cloudflare Turnstile's script and frame.
//   - The posts list for /blog/<slug> is still read from blog-post.html
//     itself, now from its inline <script type="application/json"
//     id="atx-posts"> block (the old inline `var POSTS = [...]` is still
//     understood, so deploy order does not matter).
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
  "/legal.html",
  "/404.html",
  // The Explorations blog. index.html is listed explicitly because the blog
  // pages link back to the hub's sections as "index.html#about" etc. (the
  // hub's own nav uses bare "#about", so nothing needed it before).
  "/index.html",
  "/blog.html",
  "/blog-post.html",
]);
// "/icons/" added for the favicon/manifest set the hub has referenced by
// root-relative path since the "landing page enhancements" v7 handoff — this
// prefix was never added alongside it, so every one of those files (the
// sized favicons, the apple-touch-icon and the manifest) has been 404ing in
// production ever since, confirmed directly against atraxia.org. The v9
// handoff's inline data-URI primary favicon (see the hub's first rel="icon")
// is what will actually render meanwhile, since it needs no fetch at all —
// but the rest stay broken without this until this file is redeployed.
// The blog's featured images live under /atraxia/blog/, which "/atraxia/"
// already covers — no separate entry, so there's one rule per folder.
// "/assets/" holds the redesigned site's shared stylesheet and per-page
// scripts (hub/assets/css, hub/assets/js). Without it every page on
// atraxia.org loses its CSS and JS, so it must ship with the new pages.
const HUB_ASSET_PREFIXES = ["/atraxia/", "/icons/", "/assets/"];

// The Contact page. Served at the pretty path only; the file name and a
// trailing slash redirect there (301, query string kept).
const CONTACT_PATH = "/contact";
const CONTACT_FILE = "/contact.html";

function isContactAlias(pathname) {
  return pathname === CONTACT_FILE || pathname === `${CONTACT_PATH}/`;
}

// ---------------------------------------------------------------------------
// Content-Security-Policy. Moved here from the pages' meta tags, which are
// gone: two policies intersect, so a stale meta tag would still block. The
// redesigned pages have no inline scripts (every script is a same-origin
// file; the posts list is a non-executed JSON block), so script-src is
// 'self' plus Turnstile, without 'unsafe-inline'. Styles keep
// 'unsafe-inline' for the one-line background rule at the top of each page's
// <head> and style attributes set by script.
//
// connect-src: the shared submit-contact Supabase function's origin
// (production project). frame-src and script-src: Cloudflare Turnstile.
const SUPABASE_FUNCTIONS_ORIGIN = "https://mwnkhhyrheprugeornjl.supabase.co";
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

function buildCsp(scriptSrc) {
  return [
    "default-src 'none'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "manifest-src 'self'",
    `connect-src ${SUPABASE_FUNCTIONS_ORIGIN}`,
    `frame-src ${TURNSTILE_ORIGIN}`,
    "form-action 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const CSP = buildCsp(`'self' ${TURNSTILE_ORIGIN}`);
// hub/404.html is kept unchanged from before the redesign and still carries
// its own inline scripts (legacy cleanup, star field) and its own meta CSP
// with 'unsafe-inline'; the header policy for that one page must allow them
// too, or the intersection blocks them.
const CSP_404 = buildCsp(`'self' 'unsafe-inline'`);

// Adds the policy to an HTML response (other types pass through untouched).
function withCsp(response, policy = CSP) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  const out = new Response(response.body, response);
  out.headers.set("Content-Security-Policy", policy);
  return out;
}

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

// The blog's pretty routes. "/blog" is the listing; "/blog/<slug>" is one
// post. A slug is lowercase words joined by single hyphens and nothing else,
// so it can never contain a "/" or "." and can't collide with a hub asset.
const BLOG_INDEX_PATH = "/blog";
const BLOG_PREFIX = "/blog/";
const BLOG_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isBlogPath(pathname) {
  return pathname === BLOG_INDEX_PATH || pathname.startsWith(BLOG_PREFIX);
}

// blog-post.html renders a post client-side, so its static <head> carries
// only neutral blog-level tags. Bots don't run that script; this writes the
// requested post's own tags into the HTML before it leaves the Worker. The
// post data is read from the page's own inline POSTS array rather than kept
// in a second copy here, so adding a post to blog-post.html is all it takes.
// The redesigned page keeps the list as JSON in a non-executed
// <script type="application/json" id="atx-posts"> block; the pre-redesign
// page had `var POSTS = [...];` in an inline script. Both are read, so this
// Worker works whichever page GitHub Pages is serving.
const POSTS_JSON_BLOCK = /<script\s+type="application\/json"\s+id="atx-posts"\s*>([\s\S]*?)<\/script>/;
const POSTS_LEGACY_VAR = /var POSTS = (\[[\s\S]*?\]);/;

function findBlogPost(html, slug) {
  const match = html.match(POSTS_JSON_BLOCK) || html.match(POSTS_LEGACY_VAR);
  if (!match) return null;
  try {
    const posts = JSON.parse(match[1]);
    return (Array.isArray(posts) && posts.find((post) => post.slug === slug)) || null;
  } catch {
    return null;
  }
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function injectBlogPostMeta(html, post) {
  const title = escapeAttr(`${post.title} · Atraxia`);
  const description = escapeAttr(post.excerpt);
  const pageUrl = escapeAttr(`https://${HUB_HOST}${BLOG_PREFIX}${post.slug}`);
  const imageUrl = escapeAttr(`https://${HUB_HOST}/${post.img.replace(/^\/+/, "")}`);
  const tags = [
    [/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`],
    [/<meta\s+name="description"[^>]*>/, `<meta name="description" content="${description}" />`],
    [/<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${pageUrl}" />`],
    [/<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="article" />`],
    [/<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`],
    [/<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${description}" />`],
    [/<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${pageUrl}" />`],
    [/<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${imageUrl}" />`],
    [/<meta\s+name="twitter:card"[^>]*>/, `<meta name="twitter:card" content="summary_large_image" />`],
    [/<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${title}" />`],
    [/<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${description}" />`],
    [/<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${imageUrl}" />`],
  ];
  // Replace each tag where the page already has it; add it before </head>
  // where it doesn't, so a template edit can't silently drop a tag.
  return tags.reduce(
    (out, [pattern, tag]) => (pattern.test(out) ? out.replace(pattern, () => tag) : out.replace("</head>", () => `    ${tag}\n  </head>`)),
    html,
  );
}

// Fetched without forwarding the visitor's request (unlike proxy()), so a
// conditional request can't come back as a bodiless 304 — the whole page is
// needed to read POSTS and rewrite the <head>. An unknown slug on the pretty
// route gets the branded 404 with a real 404 status; on the legacy
// blog-post.html?slug= URL the page is passed through untouched and shows its
// own "Post not found" state, exactly as before.
async function renderBlogPost(slug, { notFoundIfUnknown }) {
  const originUrl = `https://${GH_PAGES_HOST}${GH_PAGES_PATH}/blog-post.html`;
  const response = await fetch(originUrl);
  if (!response.ok) return withCsp(new Response(response.body, response));
  const html = await response.text();
  const post = findBlogPost(html, slug);
  if (!post) {
    return notFoundIfUnknown ? proxyHub404() : withCsp(new Response(html, { status: response.status, headers: response.headers }));
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("Content-Security-Policy", CSP);
  return new Response(injectBlogPostMeta(html, post), { status: 200, headers });
}

// Everything under /blog. The hub's pages use relative URLs (they're also
// served from the github.io subpath, where root-relative ones would break),
// so on /blog/<slug> the browser resolves "atraxia/…", "favicon.svg",
// "blog.html" etc. one level down, as /blog/atraxia/… and so on. Those are
// mapped back onto the hub asset they name: pages by redirect, so the URL bar
// and every further relative link stay correct; everything else (images,
// icons) by proxy, to save a round trip per asset.
async function routeBlog(url, request) {
  const { pathname, search } = url;
  if (pathname === BLOG_INDEX_PATH) {
    return proxy(`${GH_PAGES_PATH}/blog.html`, search, request);
  }
  // One canonical form per page: no trailing slashes.
  if (pathname === BLOG_PREFIX || (pathname.endsWith("/") && BLOG_SLUG.test(pathname.slice(BLOG_PREFIX.length, -1)))) {
    return Response.redirect(`https://${url.host}${pathname.slice(0, -1)}${search}`, 301);
  }
  const rest = pathname.slice(BLOG_PREFIX.length);
  // The pages link to Contact as the relative "contact", which from
  // /blog/<slug> resolves to /blog/contact. That is a page, not a post: it is
  // checked before the slug test (a slug can't otherwise be told apart).
  if (rest === "contact" || rest === "contact.html") {
    return Response.redirect(`https://${url.host}${CONTACT_PATH}${search}`, 301);
  }
  if (BLOG_SLUG.test(rest)) {
    return renderBlogPost(rest, { notFoundIfUnknown: true });
  }
  const assetPath = `/${rest}`;
  if (isHubAsset(assetPath) && !assertNeverProxied(assetPath)) {
    return assetPath.endsWith(".html")
      ? Response.redirect(`https://${url.host}${assetPath}${search}`, 301)
      : proxy(GH_PAGES_PATH + assetPath, search, request);
  }
  return proxyHub404();
}

async function proxy(originPath, search, request) {
  const originUrl = `https://${GH_PAGES_HOST}${originPath}${search}`;
  const originRequest = new Request(originUrl, request);
  const response = await fetch(originRequest);
  // Pass the origin's response straight through, status included; HTML
  // gets the site's CSP (the kept 404 page its own variant).
  return withCsp(new Response(response.body, response), originPath.endsWith("/404.html") ? CSP_404 : CSP);
}

// Atraxia's own branded 404 (hub/404.html, published to the GitHub Pages
// root as /404.html — which is also the name GitHub Pages itself serves for
// any unmatched path, so the hub gets the same page whether it's reached
// through this Worker or directly).
async function proxyHub404() {
  const originUrl = `https://${GH_PAGES_HOST}${GH_PAGES_PATH}/404.html`;
  const response = await fetch(originUrl);
  return withCsp(new Response(response.body, { status: 404, statusText: "Not Found", headers: response.headers }), CSP_404);
}

// THE INVARIANT THIS FILE EXISTS TO HOLD, and it is not stylistic.
//
// Until 2026-09-07 this Worker REVERSE-PROXIED atraxia.org/centium/* to the
// Centium build on GitHub Pages. That made the app run under the atraxia.org
// origin, so it wrote its `centium-state:*` localStorage keys there —
// including health data. Real browsers were later found still holding those
// keys on this origin. The data outlived the proxy by months because
// localStorage never expires.
//
// So: NOTHING UNDER /centium MAY EVER BE PROXIED FROM THIS DOMAIN AGAIN. A
// redirect moves the browser to centium.atraxia.org and the app writes to its
// own origin; a proxy keeps the URL bar on atraxia.org and the app writes
// here. That single difference is what put health data on the wrong origin.
//
// The guard below is deliberately redundant with the routing that follows it:
// the allowlist already excludes /centium, and the legacy branch already
// redirects. It is here so that adding "/centium/" to HUB_ASSET_PREFIXES —
// the one edit that would silently recreate the bug — fails closed instead.
function assertNeverProxied(pathname) {
  return isLegacyCentiumPath(pathname);
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

    // A /centium path on a non-hub hostname bound to this Worker. It cannot
    // be proxied — see the invariant above — so it gets the 404 rather than
    // falling through to any asset branch.
    if (assertNeverProxied(url.pathname)) {
      return proxyHub404();
    }

    if (isBlogPath(url.pathname)) {
      return routeBlog(url, request);
    }

    // Contact: /contact serves contact.html; /contact.html and /contact/
    // redirect to it with the query string kept.
    if (url.pathname === CONTACT_PATH) {
      return proxy(GH_PAGES_PATH + CONTACT_FILE, url.search, request);
    }
    if (isContactAlias(url.pathname)) {
      return Response.redirect(`https://${url.host}${CONTACT_PATH}${url.search}`, 301);
    }

    // The pre-pretty-route post URL. Still linked from the listing's cards, so
    // it gets the same per-post <head> as /blog/<slug> when it names a post.
    if (url.pathname === "/blog-post.html" && url.searchParams.has("slug")) {
      return renderBlogPost(url.searchParams.get("slug"), { notFoundIfUnknown: false });
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
