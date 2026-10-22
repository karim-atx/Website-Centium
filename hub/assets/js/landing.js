/* Atraxia website: landing page only. Never loaded by Contact, Blog or Legal.

   The landing's page-level mechanics: near-instant nav jumps behind a dark
   veil (NA1 v4, Round 13), hash links on first load, Back and Forward between
   jumps, and footer pointer isolation. The pinned chapters (journey.js)
   register their jump targets through Atx.jumpTarget (the Round 13 PIN map:
   Philosophy and Leadership and What guides us at 100%, Portfolio at 62%);
   the chapter dock on phones (JN1) jumps through window.__atxJump. */
(function () {
  'use strict';
  var Atx = window.Atx;
  if (!Atx || window.__atxJump) return;

  /* chapters set this to return a scroll position for a pinned chapter id, or null */
  Atx.jumpTarget = Atx.jumpTarget || function () { return null; };

  function target(id) {
    if (id === 'top' || id === 'hero' || id === 'intro' || id === '' || id === 'main') return 0;
    var el = document.getElementById(id);
    if (!el) return null;
    var pinned = Atx.jumpTarget(id);
    if (typeof pinned === 'number') return pinned;
    var nav = document.querySelector('.nav'), nh = nav ? nav.getBoundingClientRect().height : 0;
    if (id === 'blog') return el.getBoundingClientRect().top + scrollY;
    return el.getBoundingClientRect().top + scrollY - Math.max(0, (innerHeight - el.offsetHeight) / 2, nh * 0.5);
  }

  var veil = null, busy = 0;
  function land(id, y) {
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
    window.dispatchEvent(new Event('scroll'));
    Atx.kick();
    var tg = id && document.getElementById(id), hh = tg && (tg.tagName === 'MAIN' ? tg : tg.querySelector('h2, h1'));
    if (hh) { if (hh !== tg) hh.setAttribute('tabindex', '-1'); try { hh.focus({ preventScroll: true }); } catch { /* ignore */ } }
  }
  /* A jump fades the veil in, sets the position instantly with the target
     state rendered in the same frame, then fades the veil out. */
  function jump(id, push) {
    id = (id || '').replace(/^#/, '');
    var y = target(id);
    if (y === null) return false;
    if (push) { try { history.pushState({ atx: id }, '', id ? '#' + id : location.pathname + location.search); } catch { /* ignore */ } }
    /* the skip link's target (#main) lands at once: focus on main, no veil */
    if (Atx.reduced() || !veil || id === 'main') { land(id, y); return true; }
    clearTimeout(busy);
    veil.classList.add('is-on');
    busy = setTimeout(function () { land(id, target(id) === null ? y : target(id)); setTimeout(function () { veil.classList.remove('is-on'); }, 40); }, 170);
    return true;
  }
  window.__atxJump = function (id) { return jump(id, true); };

  function init() {
    veil = document.createElement('div');
    veil.className = 'jr-jump';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.classList.contains('skip-link')) return;
      var h = a.getAttribute('href');
      if (h === '#' || h.length < 2 || !document.getElementById(h.slice(1))) return;
      e.preventDefault();
      jump(h, true);
    }, true);

    /* the footer never feeds pointer motion to the scene behind it */
    var ft = document.querySelector('.site-footer');
    if (ft) ['pointermove', 'pointerover', 'mousemove'].forEach(function (ev) { ft.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
  }

  addEventListener('popstate', function () { jump(location.hash, false); });
  /* hash links work on first load */
  if (location.hash && location.hash.length > 1) {
    addEventListener('load', function () {
      setTimeout(function () {
        var y = target(location.hash.slice(1));
        if (y !== null) { window.scrollTo({ top: y, behavior: 'instant' }); window.dispatchEvent(new Event('scroll')); }
      }, 150);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
