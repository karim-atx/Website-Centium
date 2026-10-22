/* Atraxia website: the article page (blog-post.html, and /blog/<slug> through
   the Worker). Runs synchronously right after the post templates, before the
   footer, so only the requested post ever paints (as the reference's inline
   script did). Ported from source/blog-post.r26.html: the post render, the
   BE2 render-error fallback, and "BG1 v2" (reading progress, sharing).

   The posts list is the inline JSON block #atx-posts in this page's <head>:
   the one source of the posts, also read by the Worker for per-post meta.
   Changes from the reference:
   - the title is "<Post> · Atraxia" (decision: "Page · Atraxia");
   - the read time is computed from the post body, ceil(words / 200), at least
     1 (decision), rather than trusted from the data;
   - the related heading stays "Related posts" (COPY.md); the reference
     renamed it to "More from Atraxia" at runtime;
   - Copy link only says "Copied" when the copy worked;
   - no "specimen" long-read flag. */
(function () {
  'use strict';
  var MAX_RELATED = 3;
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function minutes(node) {
    var words = (node.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }
  function show(sel) { var el = $(sel); if (el) el.hidden = false; }
  /* every photo has AVIF and WebP siblings next to the JPEG (same name and query) */
  function fmt(src, ext) { return String(src).replace(/\.(jpg|png)(\?|$)/, '.' + ext + '$2'); }
  function pic(src, alt, attrs) { return '<picture><source type="image/avif" srcset="' + esc(fmt(src, 'avif')) + '" /><source type="image/webp" srcset="' + esc(fmt(src, 'webp')) + '" /><img src="' + esc(src) + '" alt="' + esc(alt) + '"' + attrs + ' /></picture>'; }
  /* the post's own head tags, as the Worker writes them for bots (for
     crawlers that run the page) */
  function meta(sel, attr, val) { var el = document.head.querySelector(sel); if (el) el.setAttribute(attr, val); }

  var post = null;
  try {
    var POSTS = JSON.parse(document.getElementById('atx-posts').textContent);
    var pretty = location.pathname.match(/\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/); /* /blog/<slug>, served by the Worker */
    var slug = pretty ? pretty[1] : new URLSearchParams(location.search).get('slug');
    /* no slug: the listing, never a guessed post */
    if (!slug) { location.replace(pretty ? '../blog.html' : 'blog.html'); return; }
    post = POSTS.filter(function (p) { return p.slug === slug; })[0] || null;
    var body = $('[data-body]');
    var tpl = post && document.querySelector('template[data-post-body="' + post.slug + '"]');

    if (!post || !tpl) {
      /* an unknown slug: "Post not found". (The Worker answers /blog/<unknown>
         with the branded 404 and a 404 status before this page is served.) */
      $('.hero-h1').textContent = 'Post not found';
      document.title = 'Post not found · Atraxia';
      var robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex';
      document.head.appendChild(robots);
      body.innerHTML = '<p class="lead">That post doesn’t exist, or has moved. <a href="blog.html">Browse all posts</a>.</p>';
      post = { slug: '' };
    } else {
      body.appendChild(tpl.content.cloneNode(true));
      var read = minutes(body);
      [].forEach.call(document.querySelectorAll('[data-p]'), function (el) {
        var k = el.getAttribute('data-p');
        if (k === 'authorImg') el.src = post.authorImg;
        else if (k === 'authorAvif' || k === 'authorWebp') el.srcset = fmt(post.authorImg, k === 'authorAvif' ? 'avif' : 'webp');
        else if (k === 'imgAvif' || k === 'imgWebp') el.srcset = fmt(post.img, k === 'imgAvif' ? 'avif' : 'webp');
        else if (k === 'img') { el.src = post.img; el.alt = post.alt; }
        else if (k === 'read') el.textContent = read;
        else el.textContent = post[k];
      });
      var t = $('time[data-p]'); if (t) t.setAttribute('datetime', post.date);
      document.title = post.title + ' · Atraxia';
      var url = 'https://atraxia.org/blog/' + post.slug, image = 'https://atraxia.org/' + String(post.img).replace(/^\/+/, '');
      meta('meta[name="description"]', 'content', post.excerpt);
      meta('link[rel="canonical"]', 'href', url);
      meta('meta[property="og:type"]', 'content', 'article');
      meta('meta[property="og:title"]', 'content', document.title);
      meta('meta[property="og:description"]', 'content', post.excerpt);
      meta('meta[property="og:url"]', 'content', url);
      meta('meta[property="og:image"]', 'content', image);
      meta('meta[name="twitter:card"]', 'content', 'summary_large_image');
      meta('meta[name="twitter:title"]', 'content', document.title);
      meta('meta[name="twitter:description"]', 'content', post.excerpt);
      meta('meta[name="twitter:image"]', 'content', image);
      show('.post-meta'); show('.post-body figure'); show('.post-end'); show('.sl-share');
    }

    /* related: the other posts, most recent first */
    var others = POSTS.filter(function (p) { return p.slug !== post.slug; }).slice(0, MAX_RELATED);
    var rel = $('[data-related]');
    if (others.length > 2) rel.classList.remove('post-grid--two');
    rel.innerHTML = others.map(function (p) {
      var tb = document.querySelector('template[data-post-body="' + p.slug + '"]');
      var r = tb ? minutes(tb.content) : p.read;
      return '<a class="post-card" href="blog-post.html?slug=' + encodeURIComponent(p.slug) + '">' +
        '<div class="post-thumb">' + pic(p.img, p.alt, ' width="1280" height="800" loading="lazy" decoding="async"') + '</div><div class="body">' +
        '<h3>' + esc(p.title) + '</h3><p>' + esc(p.excerpt) + '</p>' +
        '<div class="post-byline"><span class="author">' + esc(p.authorName) + '</span><span class="sep"></span><time datetime="' + esc(p.date) + '">' + esc(p.dateLabel) + '</time><span class="sep"></span><span>' + r + ' min read</span></div>' +
        '</div></a>';
    }).join('');
    if (!others.length) $('.bl-related').hidden = true;
  } catch {
    /* BE2: if the post cannot be rendered, a calm message with a retry, never a raw error */
    try {
      var h = $('.hero-h1'); if (h) h.textContent = 'This post is taking a moment';
      ['.post-meta', '.post-body figure', '.post-end', '.sl-share', '.bl-related'].forEach(function (s) { var el = $(s); if (el) el.hidden = true; });
      var bd = $('[data-body]');
      if (bd) bd.innerHTML = '<p class="lead">We couldn’t load this post just now. Please try again, or browse all posts.</p><p class="bl-retry"><button type="button" class="btn btn--primary" data-retry>Try again</button><a class="btn btn--ghost" href="blog.html">All posts</a></p>';
      var rb = $('[data-retry]'); if (rb) rb.addEventListener('click', function () { location.reload(); });
    } catch { /* nothing more to do */ }
    return;
  }

  /* ---------- reading progress (a 2px line across the top) ---------- */
  var art = $('.post-body');
  if (art && post && post.slug) {
    var bar = document.createElement('div');
    bar.className = 'sl-progress'; bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var pq = 0;
    var prog = function () {
      pq = 0;
      var r = art.getBoundingClientRect(), tot = r.height - innerHeight * 0.6;
      bar.style.setProperty('--rp', Math.max(0, Math.min(1, -r.top / Math.max(1, tot))).toFixed(4));
    };
    var kick = function () { if (!pq) pq = requestAnimationFrame(prog); };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick, { passive: true });
    if (window.Atx) Atx.onKick(kick);
    prog();
  }

  /* ---------- sharing ---------- */
  var share = $('.sl-share');
  if (share && post && post.slug) {
    var url = location.href.split('#')[0], title = document.title;
    share.querySelector('[data-share="linkedin"]').href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);
    share.querySelector('[data-share="x"]').href = 'https://x.com/intent/post?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title);
    share.querySelector('[data-share="email"]').href = 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(url);
    var cb = share.querySelector('[data-share-copy]'), live = share.querySelector('.sl-share-live'), tm = 0;
    var done = function (good) {
      clearTimeout(tm);
      if (good) { cb.textContent = 'Copied'; cb.classList.add('is-copied'); live.textContent = 'Link copied'; }
      else live.textContent = 'Couldn’t copy the link.';
      tm = setTimeout(function () { cb.textContent = 'Copy link'; cb.classList.remove('is-copied'); live.textContent = ''; }, 1800);
    };
    var fallback = function () {
      var ta = document.createElement('textarea'), ok = false;
      ta.value = url; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove(); done(ok);
    };
    cb.addEventListener('click', function () {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(function () { done(true); }, fallback);
      else fallback();
    });
  }
})();
