/* Atraxia website: shared core, loaded synchronously in <head> on every page.
   Ported from the reference build (source/index.r26.html and the secondary
   pages): RV3 frame race, RV2 scroll safety net, Round 14/15/16 press and
   page-switch handling, the NA1 header (pill, always-dark bar, menu), the
   legacy Centium cleanup, media queries and quality classes. Nothing here is
   landing-only. */
(function () {
  'use strict';
  if (window.Atx) return;
  var de = document.documentElement;

  /* ---------- RV3: no animation loop can stall ----------
     requestAnimationFrame is wrapped once, before any other script runs: each
     request is raced against a 100ms timer and whichever fires first runs the
     callback, exactly once. A frame requested while the page was hidden,
     throttled or offscreen otherwise never arrives and the loop freezes. */
  (function () {
    var nR = window.requestAnimationFrame.bind(window), nC = window.cancelAnimationFrame.bind(window), id = 0, live = {};
    window.requestAnimationFrame = function (fn) {
      var k = ++id, done = false;
      var go = function (t) { if (done || !live[k]) return; done = true; delete live[k]; fn(typeof t === 'number' ? t : performance.now()); };
      live[k] = [nR(go), setTimeout(function () { go(performance.now()); }, 100)];
      return k;
    };
    window.cancelAnimationFrame = function (k) { var e = live[k]; if (!e) return nC(k); delete live[k]; nC(e[0]); clearTimeout(e[1]); };
  })();

  /* ---------- legacy Centium cleanup (kept, HANDOVER i) ----------
     Centium once ran on this origin and left centium-* localStorage keys and
     a service worker behind. Every page clears them on every load. */
  (function () {
    try {
      var h = location.hostname;
      if (h !== 'atraxia.org' && h !== 'www.atraxia.org') return;
      try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('centium-') === 0) keys.push(k); }
        for (var j = 0; j < keys.length; j++) localStorage.removeItem(keys[j]);
        if (keys.length) console.info('[atraxia] Cleared ' + keys.length + ' legacy Centium key(s) from this origin.');
      } catch { /* storage blocked: nothing to clear */ }
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function (regs) { for (var r = 0; r < regs.length; r++) regs[r].unregister(); }).catch(function () {});
      }
    } catch { /* never let cleanup break the page */ }
  })();

  /* ---------- media queries and quality classes ---------- */
  var mqR = matchMedia('(prefers-reduced-motion: reduce)');
  var mqM = matchMedia('(max-width: 760px), (pointer: coarse)');
  var mqC = matchMedia('(pointer: coarse)');
  var QUALITY = ['low', 'medium', 'high'];
  /* HANDOVER g device classes. High: desktop, 8+ cores, fine pointer. Low:
     phones with fewer than 6 cores or under 4GB, or any device under 4GB.
     Medium otherwise. (Reference: journey autoQ.) */
  function autoQ() {
    var c = navigator.hardwareConcurrency || 4, m = navigator.deviceMemory || 4;
    if (m < 4) return 'low';
    return mqM.matches ? (c >= 6 && m >= 4 ? 'medium' : 'low') : (c >= 8 ? 'high' : 'medium');
  }
  var quality = autoQ(), qListeners = [];
  function paintClasses() {
    QUALITY.forEach(function (q) { de.classList.toggle('q-' + q, q === quality); });
    de.classList.toggle('is-reduced', mqR.matches);
    de.classList.toggle('is-mobile', mqM.matches);
    de.classList.toggle('is-coarse', mqC.matches);
  }
  paintClasses();
  [mqR, mqM, mqC].forEach(function (mq) { if (mq.addEventListener) mq.addEventListener('change', paintClasses); });

  /* every scene loop registers a kick; scrolls (real or synthesized), pageshow,
     focus and visibility changes kick them all, so nothing paused offscreen
     stays paused */
  var kicks = [];
  function kickAll() { for (var i = 0; i < kicks.length; i++) { try { kicks[i](); } catch { /* one loop failing must not stop the others */ } } }

  var Atx = window.Atx = {
    mqReduced: mqR,
    mqMobile: mqM,
    reduced: function () { return mqR.matches; },
    mobile: function () { return mqM.matches; },
    get quality() { return quality; },
    /* drops or sets the quality level (the frame-time governor, batch 5, calls this) */
    setQuality: function (q) { if (QUALITY.indexOf(q) < 0 || q === quality) return; quality = q; paintClasses(); qListeners.forEach(function (f) { f(q); }); },
    onQuality: function (f) { qListeners.push(f); },
    onKick: function (f) { kicks.push(f); },
    kick: kickAll,
    /* the landing intro (batch 2) sets this to the hero journey length in px */
    introLength: function () { return 0; }
  };

  /* ---------- page switching ---------- */
  de.classList.add('is-loading');
  window.__atxVT = !!(window.CSS && CSS.supports && CSS.supports('view-transition-name: none') && ('onpagereveal' in window));
  function tame(vt) {
    if (!vt) return;
    ['ready', 'finished', 'updateCallbackDone'].forEach(function (k) { try { if (vt[k] && vt[k].catch) vt[k].catch(function () {}); } catch { /* ignore */ } });
    if (window.top !== window) { try { vt.skipTransition(); } catch { /* ignore */ } }
  }
  addEventListener('pagereveal', function (e) { if (e.viewTransition) { de.classList.add('sl-vt'); tame(e.viewTransition); } });
  addEventListener('pageswap', function (e) { tame(e.viewTransition); });
  addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    if (r && (r.name === 'AbortError' || r.name === 'InvalidStateError') && /transition/i.test(String(r.message))) e.preventDefault();
  });

  /* pages open at the top; back/forward restores the stored position */
  try { history.scrollRestoration = 'manual'; } catch { /* ignore */ }
  var POS_KEY = 'atx-pos:' + location.pathname + location.search;
  var navType = '';
  try { var nv = performance.getEntriesByType('navigation')[0]; navType = nv ? nv.type : ''; } catch { /* ignore */ }
  if (navType === 'back_forward' && !location.hash) {
    var y0 = 0; try { y0 = +sessionStorage.getItem(POS_KEY) || 0; } catch { /* ignore */ }
    if (y0) {
      var restore = function () { if (Math.abs(scrollY - y0) > 2) window.scrollTo({ top: y0, behavior: 'instant' }); };
      addEventListener('load', function () { restore(); setTimeout(restore, 150); });
    }
  } else if (!location.hash) {
    window.scrollTo(0, 0);
    addEventListener('load', function () { if (!location.hash && scrollY > 0 && !window.__atxKeepScroll) window.scrollTo(0, 0); });
  }

  addEventListener('load', function () { requestAnimationFrame(function () { requestAnimationFrame(function () { de.classList.remove('is-loading'); }); }); });

  /* nothing lingers after a press, nothing carries over between pages */
  function clearPresses() {
    var ae = document.activeElement;
    if (ae && ae !== document.body && ae.blur) { try { ae.blur(); } catch { /* ignore */ } }
    [].forEach.call(document.querySelectorAll('.jr-jump.is-on'), function (v) { v.classList.remove('is-on'); });
    var ar = document.querySelector('.sl-arrive');
    if (ar) { ar.style.animation = 'none'; ar.style.opacity = '0'; ar.style.visibility = 'hidden'; }
    closeMenu(false);
  }
  document.addEventListener('pointerup', function (e) {
    if (e.pointerType === '') return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (a) setTimeout(function () { try { a.blur(); } catch { /* ignore */ } }, 0);
  }, true);
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented && !(e.target.closest && e.target.closest('a[href]'))) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var h = a.getAttribute('href');
    if (!h || h.charAt(0) === '#' || /^(mailto|tel|javascript):/.test(h)) return;
    try { var u = new URL(h, location.href); if (u.origin !== location.origin) return; if (u.pathname === location.pathname && u.search === location.search) return; } catch { return; }
    de.classList.add('is-leaving');
    try { a.blur(); } catch { /* ignore */ }
  }, true);
  addEventListener('pagehide', function () {
    clearPresses();
    try { sessionStorage.setItem(POS_KEY, String(Math.round(scrollY))); } catch { /* ignore */ }
  });
  addEventListener('pageshow', function (e) {
    de.classList.remove('is-leaving', 'is-loading');
    var ae = document.activeElement;
    if (ae && ae !== document.body && ae.closest && ae.closest('a[href]')) { try { ae.blur(); } catch { /* ignore */ } }
    if (!e.persisted) return;
    clearPresses();
    de.classList.add('is-restored');
    var off = function () { de.classList.remove('is-restored'); removeEventListener('pointermove', off, true); removeEventListener('keydown', off, true); };
    addEventListener('pointermove', off, true);
    addEventListener('keydown', off, true);
  });

  /* ---------- RV2: scroll safety net, RV3: kick every loop ---------- */
  (function () {
    var ly = -1;
    addEventListener('scroll', function () { ly = scrollY; }, { passive: true, capture: true });
    setInterval(function () { if (scrollY !== ly) { ly = scrollY; dispatchEvent(new Event('scroll')); } }, 150);
    addEventListener('pageshow', function () { ly = -1; });
    addEventListener('scroll', kickAll, { passive: true });
    addEventListener('pageshow', kickAll);
    addEventListener('focus', kickAll);
    document.addEventListener('visibilitychange', kickAll);
  })();

  /* ---------- header (NA1) ---------- */
  var nav = null, menu = null, toggle = null;
  function closeMenu(focusToggle) {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      if (focusToggle) { try { toggle.focus(); } catch { /* ignore */ } }
    }
  }

  function initHeader() {
    nav = document.querySelector('.nav');
    if (!nav) return;
    menu = nav.querySelector('.nav-menu');
    toggle = nav.querySelector('.nav-toggle');

    /* --navh: the bar's height, for anything that sits under it */
    function navH() { de.style.setProperty('--navh', nav.offsetHeight + 'px'); }

    /* the dark layer: 0 until 24px past the intro, 1 by 204px (Round 8) */
    function solid() {
      var L = Atx.reduced() ? 0 : (+Atx.introLength() || 0);
      var k = Math.max(0, Math.min(1, (scrollY - L - 24) / 180));
      nav.style.setProperty('--gx-solid', k.toFixed(3));
    }

    /* the tab pill follows hover/focus, else the current section or page */
    var tabs = nav.querySelector('.tabs'), pill = tabs && tabs.querySelector('.tab-pill');
    var links = tabs ? [].slice.call(tabs.querySelectorAll('a')) : [];
    var sectionIds = links.map(function (a) { var h = a.getAttribute('href') || ''; return h.charAt(0) === '#' ? h.slice(1) : null; });
    var pageIdx = -1;
    links.forEach(function (a, i) { if (a.getAttribute('aria-current') === 'page') pageIdx = i; });
    var current = pageIdx, hovered = -1, pinned = -1, pinTimer = 0, blurRaf = 0, activeRaf = 0, menuWant;

    function place(i) {
      if (!pill) return;
      if (i < 0) { pill.style.opacity = '0'; return; }
      var a = links[i];
      pill.style.opacity = '1';
      pill.style.width = a.offsetWidth + 'px';
      pill.style.transform = 'translate3d(' + (a.offsetLeft - tabs.clientLeft) + 'px,0,0)';
    }
    function paint() { place(hovered > -1 ? hovered : current); }
    function syncMenu() {
      if (!menu) return;
      var want = current > -1 ? links[current].getAttribute('href') : null;
      if (want === menuWant) return;
      menuWant = want;
      [].forEach.call(menu.querySelectorAll('a'), function (a) { a.classList.toggle('is-active', !!want && a.getAttribute('href') === want); });
    }
    function active() {
      activeRaf = 0;
      var found = pageIdx;
      if (sectionIds.some(function (s) { return s; })) {
        var mark = scrollY + innerHeight * 0.34;
        for (var i = 0; i < sectionIds.length; i++) {
          var el = sectionIds[i] && document.getElementById(sectionIds[i]);
          if (el && el.getBoundingClientRect().top + scrollY <= mark) found = i;
        }
      }
      if (found !== current) {
        current = found;
        links.forEach(function (a, i) { a.classList.toggle('is-active', i === current); });
        if (hovered < 0) paint();
      }
      syncMenu();
    }
    function clearBlur() { if (blurRaf) { cancelAnimationFrame(blurRaf); blurRaf = 0; } }
    links.forEach(function (a, i) {
      a.addEventListener('pointerenter', function () { clearBlur(); pinned = -1; hovered = i; paint(); });
      a.addEventListener('focus', function () { clearBlur(); hovered = i; paint(); });
      a.addEventListener('blur', function () {
        clearBlur();
        if (pinned > -1) return;
        blurRaf = requestAnimationFrame(function () { blurRaf = 0; if (pinned < 0) { hovered = -1; paint(); } });
      });
      /* a click pins the pill to the clicked tab briefly, so a stray blur or
         pointerleave cannot flash it back to the tab just left */
      a.addEventListener('click', function () {
        clearBlur(); clearTimeout(pinTimer);
        pinned = i; hovered = i; paint();
        pinTimer = setTimeout(function () { pinned = -1; }, 400);
      });
    });
    if (tabs) tabs.addEventListener('pointerleave', function () { if (pinned > -1) return; hovered = -1; paint(); });
    links.forEach(function (a, i) { a.classList.toggle('is-active', i === current); });

    /* mobile menu: toggle, tap outside, choose a link, or Escape to close */
    if (menu && toggle) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menu.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a');
        if (!a) return;
        [].forEach.call(menu.querySelectorAll('a'), function (x) { x.classList.toggle('is-active', x === a); });
        menuWant = undefined;
        setTimeout(function () { try { a.blur(); } catch { /* ignore */ } }, 0);
        closeMenu(false);
      });
      document.addEventListener('pointerdown', function (e) {
        if (!menu.classList.contains('is-open')) return;
        if (menu.contains(e.target) || toggle.contains(e.target)) return;
        closeMenu(false);
      }, true);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu(true); });
      if (mqM.addEventListener) mqM.addEventListener('change', function () { closeMenu(false); });
    }

    var solidRaf = 0;
    addEventListener('scroll', function () {
      if (!activeRaf) activeRaf = requestAnimationFrame(active);
      if (!solidRaf) solidRaf = requestAnimationFrame(function () { solidRaf = 0; solid(); });
    }, { passive: true });
    addEventListener('resize', function () { navH(); solid(); paint(); }, { passive: true });
    addEventListener('load', function () { navH(); solid(); active(); paint(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { navH(); paint(); });
    if (window.ResizeObserver) new ResizeObserver(navH).observe(nav);
    navH(); solid(); active(); paint();
    Atx.refreshHeader = function () { solid(); active(); paint(); };
  }

  /* (the secondary pages' arrival veil, .sl-arrive, is static markup, so it
     covers the very first paint; CSS skips it after a view transition) */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeader); else initHeader();
})();
