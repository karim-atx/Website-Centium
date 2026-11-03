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

  /* ---------- sharing: an icon row with tooltips on desktop, one Share button on phones ---------- */
  var share = $('.sl-share');
  if (share && post && post.slug) {
    var url = location.href.split('#')[0], title = document.title;
    var HREF = {
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url),
      whatsapp: 'https://wa.me/?text=' + encodeURIComponent(title + ' ' + url),
      x: 'https://x.com/intent/post?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title),
      email: 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(url)
    };
    [].forEach.call(share.querySelectorAll('[data-share]'), function (a) { a.href = HREF[a.getAttribute('data-share')]; });
    var live = share.querySelector('.sl-share-live'), cb = share.querySelector('[data-share-copy]'), tm = 0;
    var copy = function (then) {
      var ok = function () { then(true); }, bad = function () {
        var ta = document.createElement('textarea'), r = false;
        ta.value = url; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        try { r = document.execCommand('copy'); } catch { r = false; }
        ta.remove(); then(r);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(ok, bad); else bad();
    };
    var said = function (good) { live.textContent = good ? 'Link copied' : 'Couldn’t copy the link.'; };
    cb.addEventListener('click', function () {
      copy(function (good) {
        said(good); clearTimeout(tm);
        if (good) { cb.classList.add('is-copied'); cb.setAttribute('data-tip', 'Link copied'); }
        tm = setTimeout(function () { cb.classList.remove('is-copied'); cb.setAttribute('data-tip', 'Copy link'); live.textContent = ''; }, 1800);
      });
    });
    /* phones: one Share button. The system share menu where the browser has one; otherwise a sheet */
    var btn = share.querySelector('.sl-share-btn'), sheet = null, last = null, st = 0;
    function build() {
      sheet = document.createElement('div'); sheet.className = 'sh-sheet'; sheet.hidden = true;
      sheet.innerHTML = '<div class="sh-scrim"></div><div class="sh-panel" role="dialog" aria-modal="true" aria-labelledby="sh-t"><span class="sh-handle" aria-hidden="true"></span><div class="sh-head"><strong id="sh-t">Share this post</strong><button type="button" class="sh-x" aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div><div class="sh-grid"><button type="button" class="sh-tile" data-sh="copy"><span class="sh-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg></span><span class="sh-n">Copy link</span></button><a class="sh-tile" data-sh="linkedin" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn (opens in a new tab)"><span class="sh-ic"><svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true" focusable="false"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.67 4.8 6.13V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21h-4V9Z"/></svg></span><span class="sh-n">LinkedIn</span></a><a class="sh-tile" data-sh="whatsapp" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp (opens in a new tab)"><span class="sh-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 21l1.6-4.6A8.6 8.6 0 1 1 7.9 19.7L3 21Z"/><path d="M9 8.6c0 3.6 2.8 6.4 6.4 6.4l1-1.6-2-1-1 1c-1.1-.5-2.3-1.7-2.8-2.8l1-1-1-2L9 8.6Z" stroke-width="1.5"/></svg></span><span class="sh-n">WhatsApp</span></a><a class="sh-tile" data-sh="x" target="_blank" rel="noopener noreferrer" aria-label="X (opens in a new tab)"><span class="sh-ic"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58l11.09 14.47Z"/></svg></span><span class="sh-n">X</span></a><a class="sh-tile" data-sh="email"><span class="sh-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg></span><span class="sh-n">Email</span></a></div><p class="sh-toast" role="status" aria-live="polite"></p></div>';
      document.body.appendChild(sheet);
      [].forEach.call(sheet.querySelectorAll('a[data-sh]'), function (a) { a.href = HREF[a.getAttribute('data-sh')]; a.addEventListener('click', function () { setTimeout(close, 150); }); });
      var toast = sheet.querySelector('.sh-toast'), tile = sheet.querySelector('[data-sh="copy"]');
      tile.addEventListener('click', function () {
        copy(function (good) {
          clearTimeout(st); toast.textContent = good ? 'Link copied' : 'Couldn’t copy the link.'; toast.classList.add('is-on'); tile.classList.toggle('is-copied', good);
          st = setTimeout(function () { toast.classList.remove('is-on'); tile.classList.remove('is-copied'); }, 1600);
        });
      });
      sheet.querySelector('.sh-scrim').addEventListener('click', close);
      sheet.querySelector('.sh-scrim').addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
      sheet.querySelector('.sh-x').addEventListener('click', close);
      sheet.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key !== 'Tab') return;
        var f = [].slice.call(sheet.querySelectorAll('button, a[href]')), i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      });
    }
    function open() {
      if (!sheet) build();
      last = document.activeElement; sheet.hidden = false; document.documentElement.classList.add('sh-on');
      requestAnimationFrame(function () { sheet.classList.add('is-open'); });
      btn.setAttribute('aria-expanded', 'true');
      setTimeout(function () { try { sheet.querySelector('.sh-tile').focus({ preventScroll: true }); } catch { /* ignore */ } }, 60);
    }
    function close() {
      if (!sheet || sheet.hidden) return;
      sheet.classList.remove('is-open'); document.documentElement.classList.remove('sh-on'); btn.setAttribute('aria-expanded', 'false');
      var rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(function () { sheet.hidden = true; }, rm ? 0 : 300);
      if (last) try { last.focus({ preventScroll: true }); } catch { /* ignore */ }
    }
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function (err) { if (!err || err.name !== 'AbortError') open(); });
      } else open();
    });
  }
})();
