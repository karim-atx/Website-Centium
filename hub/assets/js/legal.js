/* Atraxia website: Legal page only (loads core.js and this file, nothing
   else). Ported from the reference legal page (source/legal.r26.html, "LE1
   v3: document panel with nested sections"):
   - one document shown at a time (#notice #privacy #cookies #security #ip
     #careers #vendor), chosen from the hash, the side tree or the phone sheet;
   - the open document's sections listed under it, with the section in view
     marked (scroll spy) and named in the phone bar;
   - on phones (900px and below) the tree is a bottom sheet behind a bar, with
     a scrim, a close button and Escape (focus returns to the bar);
   - a hash naming a section (#privacy-3) opens its document and lands on it.
   Changes from the reference, both from the decisions:
   - no "Draft · last touched" stamp anywhere (the reference printed today's
     date under every document and in the tree);
   - "Contact us about this" is one interface link outside the legal text,
     moved here to sit after the open document (the reference had a copy
     inside each article). */
(function () {
  'use strict';
  var de = document.documentElement;
  if (!window.Atx || !de.classList.contains('page-legal')) return;

  function init() {
    var content = document.querySelector('.lg-content');
    var panels = [].slice.call(document.querySelectorAll('.lg-content article[data-panel]'));
    var ids = panels.map(function (p) { return p.getAttribute('data-panel'); });
    var side = document.querySelector('.lg-side'), bar = side && side.querySelector('.lg-mbar');
    var tree = side && side.querySelector('.lg-tree'), ask = document.querySelector('.lg-ask');
    if (!content || !panels.length || !side || !bar || !tree) return;
    var barV = bar.querySelector('.lg-mbar-v');
    var docs = [].slice.call(tree.querySelectorAll('.lg-doc'));
    var mqS = matchMedia('(max-width: 900px)');
    var cur = '', heads = [], secLinks = [];

    function navH() { var n = document.querySelector('.nav'); return n ? n.getBoundingClientRect().height : 80; }
    function grid() { return document.querySelector('.lg-grid'); }
    /* what covers the top of the page: the nav, and on phones the sticky documents bar under it */
    function topCover() { return navH() + (mqS.matches ? bar.getBoundingClientRect().height + 8 : 0); }

    /* the open document's entry carries its section list */
    function build() {
      secLinks = []; heads = [];
      [].forEach.call(tree.querySelectorAll('.lg-secs'), function (ol) { ol.remove(); });
      docs.forEach(function (li) {
        var a = li.querySelector('.lg-doc-a'), id = a.getAttribute('data-tab'), on = id === cur;
        li.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
        if (!on) return;
        var p = panels[ids.indexOf(id)], ol = document.createElement('ol');
        ol.className = 'lg-secs';
        heads = [].slice.call(p.querySelectorAll('h3'));
        heads.forEach(function (h, i) {
          if (!h.id) h.id = id + '-' + (i + 1);
          var l2 = document.createElement('li'), a2 = document.createElement('a');
          a2.href = '#' + h.id; a2.textContent = h.textContent;
          l2.appendChild(a2); ol.appendChild(l2); secLinks.push(a2);
        });
        li.appendChild(ol);
      });
      spy();
    }

    function show(id, scroll) {
      if (ids.indexOf(id) < 0) id = ids[0];
      cur = id;
      panels.forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-panel') === id); });
      /* the interface link sits right after the open document, outside its text */
      if (ask) { var p = panels[ids.indexOf(id)]; if (p.nextElementSibling !== ask) p.after(ask); }
      build();
      if (scroll) window.scrollTo({ top: Math.max(0, grid().getBoundingClientRect().top + scrollY - navH() - 16), behavior: 'instant' });
    }

    /* the section in view: the last heading above a quarter of the screen */
    function spy() {
      var line = navH() + innerHeight * 0.25, k = -1;
      heads.forEach(function (h, i) { if (h.getBoundingClientRect().top < line) k = i; });
      secLinks.forEach(function (a, i) {
        var on = i === k;
        a.classList.toggle('is-current', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      var p = panels[ids.indexOf(cur)];
      if (barV) barV.textContent = (p ? p.querySelector('h2').textContent : '') + (k > -1 ? ' · ' + heads[k].textContent : '');
    }
    var rq = 0;
    addEventListener('scroll', function () { if (!rq) rq = requestAnimationFrame(function () { rq = 0; spy(); }); }, { passive: true });
    addEventListener('resize', spy, { passive: true });

    /* phones: the tree as a bottom sheet */
    function openSheet() {
      side.classList.add('is-open');
      bar.setAttribute('aria-expanded', 'true');
      var f = tree.querySelector('[aria-current="location"]') || tree.querySelector('[aria-current="page"]');
      if (f) { try { f.focus({ preventScroll: true }); } catch { /* ignore */ } }
    }
    function closeSheet(back) {
      if (!side.classList.contains('is-open')) return;
      side.classList.remove('is-open');
      bar.setAttribute('aria-expanded', 'false');
      if (back) { try { bar.focus({ preventScroll: true }); } catch { /* ignore */ } }
    }
    bar.addEventListener('click', function () { if (side.classList.contains('is-open')) closeSheet(true); else openSheet(); });
    side.querySelector('.lg-x').addEventListener('click', function () { closeSheet(true); });
    side.querySelector('.lg-scrim').addEventListener('click', function () { closeSheet(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && side.classList.contains('is-open')) closeSheet(true); });
    if (mqS.addEventListener) mqS.addEventListener('change', function () { closeSheet(false); });

    function focusQuietly(el) {
      el.setAttribute('tabindex', '-1');
      try { el.focus({ preventScroll: true }); } catch { /* ignore */ }
    }
    tree.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      var tab = a.getAttribute('data-tab');
      if (tab) {
        try { history.pushState(null, '', '#' + tab); } catch { /* ignore */ }
        show(tab, true);
        if (mqS.matches) closeSheet(false);
        focusQuietly(panels[ids.indexOf(tab)].querySelector('h2'));
        return;
      }
      var h = document.getElementById(a.getAttribute('href').slice(1));
      if (!h) return;
      try { history.replaceState(null, '', '#' + h.id); } catch { /* ignore */ }
      window.scrollTo({ top: h.getBoundingClientRect().top + scrollY - topCover() - 20, behavior: Atx.reduced() ? 'instant' : 'smooth' });
      focusQuietly(h);
      if (mqS.matches) closeSheet(false);
    });

    function fromHash() {
      var hs = '';
      try { hs = decodeURIComponent(location.hash.slice(1)); } catch { /* malformed hash: show the first document */ }
      if (ids.indexOf(hs) > -1) { show(hs, false); return; }
      /* a section hash (#privacy-3): its headings get ids from build(), so
         resolve the document from the id's prefix first */
      var pre = hs.replace(/-\d+$/, '');
      if (ids.indexOf(pre) > -1 && pre !== cur) show(pre, false);
      var el = hs && document.getElementById(hs), p = el && el.closest && el.closest('article[data-panel]');
      if (!p) { show(ids[0], false); return; }
      if (p.getAttribute('data-panel') !== cur) show(p.getAttribute('data-panel'), false);
      window.__atxKeepScroll = true;
      var land = function () { window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - topCover() - 20, behavior: 'instant' }); };
      setTimeout(land, 0);
      /* again once fonts and images have settled the layout (first load only) */
      if (document.readyState !== 'complete') addEventListener('load', function () { setTimeout(land, 0); }, { once: true });
    }
    addEventListener('popstate', fromHash);
    addEventListener('hashchange', fromHash);
    fromHash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
