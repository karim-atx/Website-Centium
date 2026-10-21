/* Atraxia website: the landing chapters (batch 3). Landing page only.

   Ported from the reference build (source/index.r26.html):
   - "Round 4: the journey": one shared WebGL particle field behind Philosophy,
     Portfolio, Leadership, What guides us and Explorations, blending into
     Reach out and the footer. Every particle has a position in each of nine
     formations (scene.js); scroll position decides which two are blended.
     The DOM reveals, the sky colours, the planets, the founders' frames and
     the constellation are all scrubbed from the same scroll state, so every
     chapter reverses exactly (SC1). The only time-based terms are ambient.
   - AB1 v9 to v13: the comet on the swish path (2D canvas in Philosophy).
   - VA1 v7 (star halos), VA1 v9 (each value holds, then clears) and VA1 v11
     (the value graphics are the stars).
   - Round 8 and 13: the tappable planets and their cards (PO1), the planet
     labels ("Click to explore" / "Tap to explore").
   - JN1: the chapter dock on phones.
   - SP1: on phones the planet box sits 40px under the Portfolio title block,
     measured from layout.
   - The nav jump targets of the pinned chapters (Round 13 PIN map), through
     Atx.jumpTarget; landing.js does the jump itself.

   Not carried (prototype-only or dead in r26): the ?q=, ?nogl, ?jr=, ?page=,
   ?pf-demo and ?blog-empty flags with the venture slots and the empty
   Explorations state they showed, the board's setReduced override and
   __atxPf.closing/hint/hover hooks, the comet's particle emitter (r26 cleared
   it every frame and its presimulation returned at once), the unused 3D arc
   and smoothed swish of the comet, the Round 12 departure veil (it matched
   only r13 file names) and Reach out console guard, the v11 trust-card hover
   animations and the mission wash script (their elements are not on the
   page). */
(function () {
  'use strict';
  var Atx = window.Atx, AtxScene = window.AtxScene;
  var root = document.documentElement, J = document.getElementById('journey');
  if (!Atx || !J || Atx.journey) return;
  root.classList.add('jr-js');
  var cv = J.querySelector('.jr-gl');
  var mqR = Atx.mqReduced, mqM = Atx.mqMobile;
  function reduced() { return mqR.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function win(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function eoc(t) { return 1 - Math.pow(1 - t, 3); }
  function eio(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function eis(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  function sst(a, b, x) { var q = clamp((x - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); }
  var IDS = ['about', 'portfolio', 'founders', 'values', 'blog'];
  var S = {}; IDS.forEach(function (id) { var el = document.getElementById(id); S[id] = { el: el, stage: el && el.querySelector('.jr-stage') }; });

  /* ---------- SP1: on phones the planet box sits 40px under the title block ---------- */
  var spKey = '';
  function spTop(el, st) { var y = 0; while (el && el !== st) { y += el.offsetTop; el = el.offsetParent; } return y; }
  function spFit() {
    var sec = S.portfolio.el; if (!sec) return false;
    var st = S.portfolio.stage || sec, vis = sec.querySelector('.jr-vis'), hd = sec.querySelector('.pf-head');
    if (!vis || !hd) return false;
    if (!mqM.matches) { vis.style.top = vis.style.bottom = vis.style.height = ''; var was = spKey; spKey = ''; return was !== ''; }
    var hb = Math.max.apply(null, [].slice.call(hd.querySelectorAll('*')).filter(function (e) { return e.offsetHeight; }).map(function (e) { return spTop(e, st) + e.offsetHeight; }));
    var t = Math.round(hb + 40);
    vis.style.top = t + 'px'; vis.style.bottom = '16px'; vis.style.height = 'auto';
    var key = t + ':'; if (key === spKey) return false; spKey = key; return true;
  }
  spFit();

  /* ---------- DOM reveal driver ---------- */
  var R = [].slice.call(J.querySelectorAll('[data-r]')).map(function (el) {
    var a = el.getAttribute('data-r').split(' '), m = (el.getAttribute('data-rm') || '').split(' ');
    var sec = el.closest('[data-jr]');
    return { pre: el.hasAttribute('data-pre'), ref: el.getAttribute('data-ref') ? J.querySelector(el.getAttribute('data-ref')) : null, el: el, a: +a[0], b: +a[1], kind: a[2] || 'rise', am: m[0] ? +m[0] : null, bm: m[1] ? +m[1] : null, sec: sec ? sec.getAttribute('data-jr') : null, self: el.hasAttribute('data-self'), selfM: el.hasAttribute('data-self-m'), fd: !!el.closest('.fd-person figcaption'),
      lines: [].slice.call(el.querySelectorAll('.ln')), paths: [].slice.call(el.querySelectorAll('[data-draw]')), dg: el.querySelector('.dg'), n: +(el.getAttribute('data-count') || 0) };
  });
  function clr(el) { el.style.opacity = ''; el.style.transform = ''; el.style.filter = ''; el.style.letterSpacing = ''; el.style.clipPath = ''; el.style.webkitClipPath = ''; el.style.textShadow = ''; el.style.color = ''; }
  function reveal(r, k) {
    /* nothing to write when the element has not moved since the last frame */
    if (r.lk === k) return; r.lk = k;
    var el = r.el, g = 1 - k, done = k >= 1;
    if (r.kind === 'rise') { el.__ty = done ? 0 : g * 22; if (done) return clr(el); el.style.opacity = k.toFixed(3); el.style.transform = 'translateY(' + (g * 22).toFixed(2) + 'px)'; el.style.filter = 'blur(' + (g * 6).toFixed(2) + 'px)'; }
    else if (r.kind === 'track') { if (done) return clr(el); el.style.opacity = k.toFixed(3); el.style.letterSpacing = lerp(.62, .24, k).toFixed(3) + 'em'; el.style.filter = 'blur(' + (g * 4).toFixed(2) + 'px)'; }
    else if (r.kind === 'mask') {
      var n = r.lines.length || 1;
      r.lines.forEach(function (ln, i) { var kk = eoc(clamp(k * (1 + .35 * (n - 1)) - i * .35, 0, 1)); ln.style.transform = kk >= 1 ? '' : 'translateY(' + ((1 - kk) * 108).toFixed(2) + '%)'; ln.style.opacity = kk >= 1 ? '' : (.2 + .8 * kk).toFixed(3); });
    }
    else if (r.kind === 'draw') { r.paths.forEach(function (p) { p.style.strokeDashoffset = (1 - k).toFixed(4); }); el.style.opacity = k > 0 ? '' : '0'; }
    else if (r.kind === 'count') { if (r.dg) r.dg.style.transform = 'translateY(' + (-eio(k) * r.n * 100 / (r.n + 1)).toFixed(3) + '%)'; el.style.opacity = (.25 + .75 * Math.min(1, k * 3)).toFixed(3); }
    else if (r.kind === 'glow') { el.style.color = done ? '' : 'rgb(' + Math.round(lerp(244, 175, k)) + ' ' + Math.round(lerp(250, 233, k)) + ' ' + Math.round(lerp(252, 242, k)) + ')'; el.style.textShadow = '0 0 ' + (8 + 30 * k).toFixed(1) + 'px rgb(143 216 232 / ' + (.75 * k).toFixed(3) + ')'; }
  }

  /* ---------- chapter progress, from layout (offsets, not transforms) ---------- */
  var G = { vw: 1, vh: 1 };
  function secState(id) {
    var s = S[id]; if (!s.el) return { inP: 0, pin: 0, out: 0, pinned: false, top: 1e5, h: 1, travel: 1 };
    /* Philosophy: the TR2 handoff runs over its first HO px (its stage is
       already pinned under the hero), its own sequence after that */
    if (id === 'about') { var hd = document.querySelector('.ix-hand'), HO = hd ? hd.offsetHeight : 0;
      if (HO > 0) { var r0 = s.el.getBoundingClientRect(), span0 = r0.height - G.vh, tr0 = Math.max(1, span0 - HO), pinned0 = !!s.stage && getComputedStyle(s.stage).position === 'sticky' && span0 > 20;
        return { top: r0.top, h: r0.height, inP: clamp(-r0.top / HO, 0, 1), pin: clamp((-r0.top - HO) / tr0, 0, 1), out: clamp((-r0.top - span0) / G.vh, 0, 1), pinned: pinned0, travel: tr0, raw: (-r0.top - HO) / tr0, pre: -r0.top / HO - 1, HO: HO }; } }
    var r = s.el.getBoundingClientRect(), vh = G.vh, h = r.height, span = h - vh, pinned = !!s.stage && getComputedStyle(s.stage).position === 'sticky' && span > 20;
    var travel = pinned ? span : Math.max(1, h * .6);
    return { top: r.top, h: h, inP: clamp((vh - r.top) / vh, 0, 1), pin: clamp(-r.top / travel, 0, 1), out: clamp((-r.top - (pinned ? span : h - vh * .4)) / vh, 0, 1), pinned: pinned, travel: travel, raw: -r.top / travel };
  }
  /* an element's own progress through the viewport, from its layout position:
     the reveal rise of it and its ancestors and the cards' ambient float are
     taken out (HANDOVER f: layout, not animated transforms), so a reveal never
     feeds back into itself and scrolling up retraces scrolling down exactly */
  function selfP(el) { var top = el.getBoundingClientRect().top; for (var n = el; n && n !== J; n = n.parentElement) top -= (n.__ty || 0) + (n.__fy || 0); return clamp((G.vh * .92 - top) / (G.vh * .5), 0, 1); }

  /* ---------- the WebGL scene (scene.js, all nine formations) ---------- */
  var scene = (AtxScene && cv) ? AtxScene.create(cv) : null;
  root.classList.add(scene ? 'jr-gl-on' : 'jr-still');
  if (scene) scene.onLost = function () { root.classList.remove('jr-gl-on'); root.classList.add('jr-still'); };
  var qName = AtxScene && AtxScene.QUAL[Atx.quality] ? Atx.quality : 'medium';

  /* a chapter's .jr-vis box in scene units (r26 box()) */
  function box(sel, id) {
    var st = S[id].stage, el = st && st.querySelector(sel); if (!el) return { x: 0, y: 0, w: .6, h: .6 };
    var r = el.getBoundingClientRect(), s = st.getBoundingClientRect(), asp = G.vw / G.vh;
    return { x: ((r.left + r.width / 2) / G.vw * 2 - 1) * asp, y: 1 - 2 * ((r.top - s.top + r.height / 2) / G.vh), w: r.width / G.vh, h: r.height / G.vh };
  }
  var LAY = {};
  function build() {
    var mob = mqM.matches, asp = G.vw / G.vh;
    LAY = { B1: box('.jr-vis', 'about'), B3: box('.jr-vis', 'portfolio'), B5: box('.jr-vis', 'values'), B6: box('.jr-vis', 'blog'), asp: asp, mob: mob };
    if (scene && !scene.lost) scene.build(qName, LAY);
  }

  /* ---------- per-frame scene state ---------- */
  function rotM(el, az) { var ce = Math.cos(el), se = Math.sin(el), ca = Math.cos(az), sa = Math.sin(az);
    return [ca, se * sa, -ce * sa, 0, ce, se, sa, -se * ca, ce * ca]; }
  function mv(m, v) { return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]]; }
  var D = 3;
  function toPx(v) { var s = D / Math.max(D - v[2], .2), asp = G.vw / G.vh; return [(v[0] * s / asp * .5 + .5) * G.vw, (.5 - v[1] * s * .5) * G.vh]; }
  function unitOf(el, stage) { var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(), asp = G.vw / G.vh; return [((r.left + r.width / 2) / G.vw * 2 - 1) * asp, 1 - 2 * ((r.top - s.top + r.height / 2) / G.vh), r.width / G.vh, r.height / G.vh]; }
  var ptr = { x: 0, y: 0, tx: 0, ty: 0, hover: 0, th: 0 }, t0 = performance.now();

  /* swipe rows on phones (JN1): page dots, 44px targets; the founder and value
     rows take focus and scroll with the arrow keys (HANDOVER h) */
  var SWP = {};
  [].slice.call(J.querySelectorAll('.jr-swipe')).forEach(function (el) {
    var id = el.getAttribute('data-swipe'), n = el.children.length, dots = document.createElement('div');
    dots.className = 'jr-dots'; dots.setAttribute('role', 'group'); dots.setAttribute('aria-label', 'Choose a card');
    for (var i = 0; i < n; i++) (function (i) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Show card ' + (i + 1) + ' of ' + n); b.innerHTML = '<span></span>'; b.addEventListener('click', function () { var c = el.children[i]; el.scrollTo({ left: c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2, behavior: reduced() ? 'auto' : 'smooth' }); }); dots.appendChild(b); })(i);
    el.parentNode.insertBefore(dots, el.nextSibling);
    el.addEventListener('scroll', function () { kick(); }, { passive: true });
    SWP[id] = { el: el, dots: dots, focusable: id === 'founders' || id === 'values' };
    /* the Portfolio dots belong to the card dock: out of reach until a card is open */
    if (id === 'portfolio') dots.inert = true;
  });
  function swFocus() { Object.keys(SWP).forEach(function (id) { var e = SWP[id]; if (!e.focusable) return; if (mqM.matches) e.el.setAttribute('tabindex', '0'); else e.el.removeAttribute('tabindex'); }); }
  swFocus();
  function swIdx(id) { var e = SWP[id]; if (!e || !mqM.matches || e.el.scrollWidth <= e.el.clientWidth + 4) return null; var c = e.el.children, step = c.length > 1 ? (c[1].offsetLeft - c[0].offsetLeft) : e.el.clientWidth; return clamp(e.el.scrollLeft / (step || 1), 0, c.length - 1); }

  /* the sky's colours per formation: base, nebula a (rgb, alpha, x%, y%), nebula b, density */
  var PAL = [
    [[2, 6, 12], [36, 134, 158, .16, 66, 40], [104, 84, 178, .10, 20, 82], 1],
    [[3, 9, 12], [64, 168, 160, .20, 70, 44], [36, 120, 140, .10, 18, 70], .92],
    [[3, 10, 13], [79, 176, 168, .22, 68, 48], [54, 130, 148, .10, 24, 76], .95],
    [[2, 6, 18], [36, 82, 172, .22, 66, 56], [40, 118, 166, .12, 16, 28], 1],
    [[4, 9, 18], [120, 152, 204, .15, 50, 34], [79, 163, 176, .08, 82, 76], .72],
    [[3, 8, 16], [54, 112, 164, .15, 58, 40], [96, 84, 178, .11, 18, 74], .88],
    [[3, 5, 14], [92, 78, 182, .16, 50, 48], [36, 112, 150, .09, 84, 22], 1.05],
    [[3, 7, 13], [79, 176, 190, .1, 50, 46], [92, 78, 182, .04, 74, 24], .95],
    [[2, 6, 11], [36, 112, 140, .06, 50, 30], [70, 60, 140, .03, 30, 70], .78]
  ];
  var sky = J.querySelector('.jr-sky');
  var PF = { open: '', hov: '', h1: 0, h2: 0, k: 0, clickC: false, clickP: false };
  var pfCard = J.querySelector('.pf-card'), pfProto = J.querySelector('.pf-proto');
  var hitC = J.querySelector('.pf-hit--c'), hitP = J.querySelector('.pf-hit--p'), pfHint = J.querySelector('.pf-hint');
  var fdPh = [].slice.call(J.querySelectorAll('.fd-photo')), vlStars = [].slice.call(J.querySelectorAll('.vl-star'));
  var vlBlocks = [].slice.call(J.querySelectorAll('.vl-item')), cards = [].slice.call(J.querySelectorAll('.ex-card'));
  var cEl = document.getElementById('contact'), fEl = document.querySelector('.site-footer'), cCard = document.querySelector('.cxt-card'), cBtn = document.querySelector('.cxt-btn');
  var VG = null; /* the value graphics on the stars (VA1 v11) */

  var api = { pf: PF, n: 0, section: 'hero', progress: 0, sky: null, fdPhoto: 0, fdFrame: 0, vlC: 0, swipe: {}, _vis: false, _lt: 0, _fS: undefined };

  function frame(now) {
    raf = 0;
    try { frameInner(now); } catch (e) { api.err = String(e && e.stack || e); }
    if (!reduced() && api._vis) sched(document.hidden ? 400 : 0);
  }
  /* One frame. Every layout read happens first (chapter progress, reveal
     positions, the founders' frames, the stars, the swipe rows, the Reach out
     card), then every write: the reference interleaved them, which forced a
     style and layout pass per element on low-end phones. The state computed
     is the same. */
  function frameInner(now) {
    api.n++;
    var red = reduced(), t = red ? 8 : (now - t0) / 1000;
    G.vw = root.clientWidth; G.vh = window.innerHeight;
    var mob = mqM.matches;
    ptr.x += (ptr.tx - ptr.x) * .06; ptr.y += (ptr.ty - ptr.y) * .06; ptr.hover += (ptr.th - ptr.hover) * .1;
    var tH1 = (PF.open === 'centium' || PF.hov === 'centium' || ptr.th) ? 1 : 0, tH2 = (PF.open === 'soon' || PF.hov === 'soon') ? 1 : 0;
    PF.h1 += (tH1 - PF.h1) * (red ? 1 : .12); PF.h2 += (tH2 - PF.h2) * (red ? 1 : .12);
    if (!VG) { VG = vlStars.map(function (st0, i) { var src = J.querySelector('.vl-item--' + (i + 1) + ' .vl-glyph'); if (!src) return null; var c = src.cloneNode(true); c.removeAttribute('data-r'); c.setAttribute('class', 'vl-glyph vl-glyph--star'); st0.parentNode.appendChild(c); src.style.visibility = 'hidden'; return { el: c, st: st0, paths: [].slice.call(c.querySelectorAll('path')), dots: [].slice.call(c.querySelectorAll('circle')) }; }); }

    /* ---------- reads ---------- */
    var st = {}; IDS.forEach(function (id) { st[id] = secState(id); });
    var jr = J.getBoundingClientRect(), vis = jr.top < G.vh * 2.2;
    var ab = st.about, pf = st.portfolio, fd = st.founders, vl = st.values, bl = st.blog;
    var SW = {}; Object.keys(SWP).forEach(function (id) { SW[id] = swIdx(id); });
    var cR = cEl ? cEl.getBoundingClientRect() : { top: 1e5 }, fR = fEl ? fEl.getBoundingClientRect() : { top: 1e5, height: 1 };
    var sy = window.scrollY, maxS = root.scrollHeight - G.vh;
    /* Leadership: light gathers into a binary, then into the two frames */
    var fp = red ? 1 : (fd.pinned ? fd.pin : selfP(S.founders.stage.querySelector('.fd-head') || S.founders.el));
    var binT = red ? 1 : eio(win(fp, .28, .6)), PL = [0, 0], PR = [0, 0], PS = [.2, .2];
    if (fdPh.length === 2) { var u1 = unitOf(fdPh[0], S.founders.stage), u2 = unitOf(fdPh[1], S.founders.stage); PL = [u1[0], u1[1]]; PR = [u2[0], u2[1]]; PS = [u1[2] / 2, u1[3] / 2]; if (!fd.pinned) { var fr = S.founders.stage.getBoundingClientRect(); var dy = 2 * fr.top / G.vh; PL[1] -= dy; PR[1] -= dy; } }
    var bin = [(PL[0] + PR[0]) / 2, Math.max(PL[1], PR[1]) + PS[1] * (mob ? 0.2 : 0.4)];
    if (mob && fdPh.length === 2) { bin = [PL[0], PL[1] + PS[1] * 1.25]; binT = red ? 1 : eio(win(selfP(fdPh[1]), .1, .9)); }
    var fsw = SW.founders; if (fsw !== null && fsw !== undefined && fdPh.length === 2) { bin = [lerp(PL[0], PR[0], fsw), PL[1] + PS[1] * 1.2]; binT = red ? 1 : eio(win(selfP(fdPh[0]), .05, .7)); }
    /* DOM reveal progress for every element */
    var PR2 = R.map(function (r) {
      var s = st[r.sec];
      /* FT1 (Round 25): on phones each founder's name, role, quote and
         statement follow the photo's own frame and finish as it settles */
      if (red) return 1;
      if (mob && r.fd) return win(binT, .86, 1);
      return r.pre && s.pinned ? (s.pin > 0 ? s.pin : (s.pre !== undefined ? s.pre : s.inP - 1)) : (r.self || (mob && r.selfM) || !s.pinned) ? selfP(r.ref || r.el) : s.pin;
    });
    /* What guides us: the stars, in the stage's units */
    var vp = red ? 1 : (vl.pinned ? vl.pin : 0), stars = [0, 0, 0], line = 0, SU = [[0, 0], [0, 0], [0, 0]];
    vlStars.forEach(function (s, i) { var u = unitOf(s, S.values.stage); SU[i] = [u[0], u[1]]; if (!vl.pinned) { var vs = s.getBoundingClientRect(); SU[i][1] = 1 - 2 * ((vs.top + vs.height / 2) / G.vh); } });
    if (red) { stars = [1, 1, 1]; line = 1; }
    else if (vl.pinned) { stars = [eoc(win(vp, .08, .25)), eoc(win(vp, .3, .47)), eoc(win(vp, .52, .69))]; line = win(vp, .72, .9); }
    else { var vsw = SW.values;
      if (vsw !== null && vsw !== undefined) { var vEn = eoc(win(selfP(S.values.stage.querySelector('.vl-list')), .05, .55)); stars = [0, 1, 2].map(function (i) { return vEn * clamp(1.15 - Math.max(0, i - vsw), .12, 1); }); line = vEn * win(vsw, 1.4, 2); }
      else { stars = vlBlocks.map(function (b) { return eoc(win(selfP(b), .2, .7)); }); line = vlBlocks.length ? win(selfP(vlBlocks[2]), .7, 1) : 0; } }
    var VGP = VG.map(function (o) { return o ? [o.st.offsetLeft + o.st.offsetWidth / 2, o.st.offsetTop + o.st.offsetHeight / 2] : null; });
    var pfOn = !!(pfCard && pf.top < G.vh && pf.top + pf.h > 0), cw = 290, chh = 220;
    if (pfOn && !mob) { cw = pfCard.offsetWidth || 290; chh = pfCard.offsetHeight || 220; }
    var r7 = cCard && cBtn ? cCard.getBoundingClientRect() : null, b7 = r7 ? cBtn.getBoundingClientRect() : null;

    /* ---------- state ---------- */
    /* formation weights: two neighbouring formations blend at a time */
    var w = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var ctIn = clamp((G.vh - cR.top) / (G.vh * .45), 0, 1);
    var start = Math.min(fR.top + sy - G.vh, maxS - G.vh * 1.25), fIn = clamp((sy - start) / Math.max(1, maxS - start), 0, 1);
    /* RV4: the footer blend is smoothed with real elapsed time and snaps to
       its target within 0.002, so it always returns to exactly 0. A jump
       (nav, chapter dock, Home/End) lands in its own state in the same frame
       (HANDOVER f): the blend is not smoothed across a move of more than a
       screen, so leaving the footer by a jump never shows its formation */
    var dtS = api._lt ? Math.min(.6, Math.max(0, (now - api._lt) / 1000)) : 1; api._lt = now;
    if (api._ly !== undefined && Math.abs(sy - api._ly) > G.vh) api._fS = undefined; api._ly = sy;
    api._fS = (api._fS === undefined || Math.abs(fIn - api._fS) > .5) ? fIn : api._fS + (fIn - api._fS) * (1 - Math.exp(-dtS * 5));
    if (Math.abs(fIn - api._fS) < .002) api._fS = fIn;
    fIn = api._fS < .002 ? 0 : api._fS;
    var trI = 0, trK = 0;
    function mix(i, j, k) { w[i] = 1 - k; w[j] = k; trI = i; trK = k; }
    if (red) { var near = IDS.reduce(function (best, id) { var c = Math.abs(st[id].top + st[id].h / 2 - G.vh / 2); return c < best[0] ? [c, id] : best; }, [1e9, 'about'])[1]; w[{ about: 2, portfolio: 3, founders: 4, values: 5, blog: 6 }[near]] = 1; if (fIn > .5) { w = [0, 0, 0, 0, 0, 0, 0, 0, 1]; } else if (ctIn > .5) { w = [0, 0, 0, 0, 0, 0, 0, 1, 0]; } }
    else if (fIn > .002) mix(7, 8, .62 * eis(fIn));
    else if (ctIn > 0) mix(6, 7, eio(ctIn));
    else if (bl.inP > 0) mix(5, 6, eio(bl.inP));
    else if (vl.inP > 0) mix(4, 5, eio(vl.inP));
    else if (fd.inP > 0) mix(3, 4, eio(fd.inP));
    else if (pf.inP > 0) mix(2, 3, eio(pf.inP));
    else if (ab.pin > 0) mix(1, 2, eio(win(ab.pin, .08, .8)));
    else mix(0, 1, eio(ab.inP));
    PF.k = red ? 1 : w[3];
    /* camera move between chapters, and the evolving sky */
    var TV = [[.16, -.08], [0, 0], [-.3, .1], [.24, -.12], [-.2, -.1], [.12, .15], [-.1, .12], [0, .06]], tb = Math.sin(Math.PI * trK);
    var camT = red ? [0, 0] : [TV[trI][0] * tb, TV[trI][1] * tb], dolly = red || trI === 1 ? 0 : tb * (mob ? .55 : .85);
    if (!red && trI === 0) { var dk0 = eis(trK); dolly = (mob ? .55 : .85) * (Math.sin(Math.PI * dk0) * .7); camT = [TV[0][0] * Math.sin(Math.PI * dk0), TV[0][1] * Math.sin(Math.PI * dk0)]; }
    var ft = cEl ? clamp((G.vh - cR.top) / (G.vh * 1.1), 0, 1) : 0; ft = eio(ft);
    var mixc = function (sel) { var o = [], n0 = sel(PAL[8]).length; for (var q = 0; q < 9; q++) if (w[q]) { var v = sel(PAL[q]); for (var c = 0; c < v.length; c++) o[c] = (o[c] || 0) + v[c] * w[q]; } for (var c2 = 0; c2 < n0; c2++) o[c2] = o[c2] || 0; return o; };
    var cb = mixc(function (p) { return p[0]; }), ca = mixc(function (p) { return p[1]; }), cn = mixc(function (p) { return p[2]; }), dens = mixc(function (p) { return [p[3]]; })[0];
    api.sky = { base: cb.map(Math.round), dens: +dens.toFixed(2), chapter: trI, k: +trK.toFixed(2), foot: +ft.toFixed(2) };
    /* Portfolio: the camera and the two worlds */
    var pp = red ? 1 : (pf.pinned ? pf.pin : clamp(pf.inP, 0, 1)), S3 = LAY.B3 ? LAY.B3.h : .6, C3 = LAY.B3 ? [LAY.B3.x, LAY.B3.y, 0] : [0, 0, 0];
    var el = lerp(1.2, .42, eio(win(pp, 0, .5))) + .08 * eio(win(pp, .8, 1)) + ptr.y * .05, az = lerp(-.25, .85, eio(win(pp, .15, .85))) + ptr.x * .06;
    var pfs = SW.portfolio; if (pfs !== null && pfs !== undefined) az += eio(clamp(pfs, 0, 1)) * 1.15;
    var Rm = rotM(el, az), a2 = lerp(2.3, .5, eio(win(pp, .05, .5))), a3 = lerp(-2.4, -.95, eio(win(pp, .4, .8)));
    var W2 = mv(Rm, [Math.cos(a2) * .75 * S3, 0, Math.sin(a2) * .75 * S3]), W3 = mv(Rm, [Math.cos(a3) * 1.05 * S3, 0, Math.sin(a3) * 1.05 * S3]);
    W2 = [W2[0] + C3[0], W2[1] + C3[1], W2[2]]; W3 = [W3[0] + C3[0], W3[1] + C3[1], W3[2]];
    /* FO1 v8: each photo is unmasked inside its frame only after the frame
       has settled (the last 8% of its move) */
    var phK = red ? 1 : eoc(win(binT, .92, 1));
    api.fdPhoto = +phK.toFixed(3); api.fdFrame = +binT.toFixed(3);
    /* VA1 v11: each graphic sits on its star; while its value is shown it is
       the focal point, then rests at 45%; when the connection begins it
       condenses into its dot, the dot lights, and only then the lines draw */
    var vlC = 0, vlG = [0, 0, 0];
    if (red) { vlC = 1; } else if (vl.pinned) { vlC = sst(.72, .8, vp); line = win(vp, .8, .94); vlG = stars.map(function (s0, i) { return s0 * (1 - .55 * sst([.3, .52, .74][i], [.37, .59, .81][i], vp)); }); }
    else { vlC = clamp(line / .35, 0, 1); line = clamp((line - .35) / .65, 0, 1); vlG = stars.slice(); }
    var starsLit = stars.map(function (s0) { return s0 * (.18 + .82 * sst(.4, 1, vlC)); }); api.vlC = +vlC.toFixed(3);
    var alpha = dens * (1 - .1 * ft);
    if (!red && trI === 0) alpha *= eis(clamp((ab.inP - .04) / .6, 0, 1));
    api.section = IDS.reduce(function (best, id) { return st[id].top <= G.vh * .5 ? id : best; }, 'hero');
    api.progress = st[api.section] ? st[api.section].pin : 0;

    /* ---------- writes ---------- */
    R.forEach(function (r, i) { var a = mob && r.am !== null ? r.am : r.a, b = mob && r.bm !== null ? r.bm : r.b, pr = PR2[i]; reveal(r, r.kind === 'count' || r.kind === 'draw' ? win(pr, a, b) : eoc(win(pr, a, b))); });
    var skyK = cb.map(Math.round).join(' ') + '|' + ca.map(function (v) { return v.toFixed(3); }).join(' ') + '|' + cn.map(function (v) { return v.toFixed(3); }).join(' ');
    if (sky && skyK !== api._skyK) { api._skyK = skyK; sky.style.setProperty('--base', 'rgb(' + cb.map(Math.round).join(' ') + ')'); sky.style.setProperty('--na', 'rgb(' + ca.slice(0, 3).map(Math.round).join(' ') + ' / ' + ca[3].toFixed(3) + ')'); sky.style.setProperty('--nb', 'rgb(' + cn.slice(0, 3).map(Math.round).join(' ') + ' / ' + cn[3].toFixed(3) + ')');
      sky.style.setProperty('--ax', ca[4].toFixed(1) + '%'); sky.style.setProperty('--ay', ca[5].toFixed(1) + '%'); sky.style.setProperty('--bx', cn[4].toFixed(1) + '%'); sky.style.setProperty('--by', cn[5].toFixed(1) + '%'); }
    if (PF.open && PF.k < .97) pfCtl.auto();
    if (pfOn) {
      /* the clickable windows follow the projected planets every frame */
      var wp = toPx(W2), pr2 = toPx(W3);
      if (!mob) { var lx = wp[0] + 52; if (lx + cw > G.vw - 24) { lx = wp[0] - 52 - cw; pfCard.classList.add('is-left'); } else pfCard.classList.remove('is-left'); lx = clamp(lx, 16, G.vw - cw - 16); pfCard.style.left = lx.toFixed(1) + 'px'; pfCard.style.top = clamp(wp[1] - 40, 90, G.vh - chh - 24).toFixed(1) + 'px'; }
      if (hitC) hitC.style.transform = 'translate(' + (wp[0] - 34).toFixed(1) + 'px,' + (wp[1] - 34).toFixed(1) + 'px)';
      if (hitP) hitP.style.transform = 'translate(' + (pr2[0] - 30).toFixed(1) + 'px,' + (pr2[1] - 30).toFixed(1) + 'px)';
      /* a window only accepts clicks when fully on screen and opaque */
      var onS = function (q) { return q[0] > 8 && q[0] < G.vw - 8 && q[1] > 60 && q[1] < G.vh - 8; };
      var fm = red ? 1 : clamp((PF.k - .9) / .07, 0, 1);
      PF.clickC = fm >= 1 && onS(wp); PF.clickP = fm >= 1 && onS(pr2);
      [[hitC, PF.clickC], [hitP, PF.clickP]].forEach(function (x) { var h = x[0]; if (!h) return; var hk = fm.toFixed(3) + x[1]; if (h.__k === hk) return; h.__k = hk; if (!x[1] && document.activeElement === h) h.blur(); h.style.opacity = fm.toFixed(3); h.style.pointerEvents = x[1] ? '' : 'none'; h.tabIndex = x[1] ? 0 : -1; h.setAttribute('aria-hidden', x[1] ? 'false' : 'true'); h.classList.toggle('is-off', !x[1]); });
      if (PF.open && !(PF.open === 'centium' ? PF.clickC : PF.clickP)) pfCtl.auto();
      if (mob && pfHint) { pfHint.style.left = clamp(wp[0] - 80, 12, G.vw - 172).toFixed(1) + 'px'; pfHint.style.top = (wp[1] + 44).toFixed(1) + 'px'; }
      if (pfProto && !mob) { pfProto.style.left = (pr2[0] + 36).toFixed(1) + 'px'; pfProto.style.top = (pr2[1] - 18).toFixed(1) + 'px'; }
      if (!mob && !red) pfCard.style.transform = 'perspective(900px) rotateY(' + (ptr.x * 7).toFixed(2) + 'deg) rotateX(' + (-ptr.y * 5).toFixed(2) + 'deg)';
    } else if (PF.inRange !== false) {
      /* HANDOVER e.1: the planet labels show only in this chapter. Out of it
         the windows are switched off, so a nav jump from Portfolio straight
         to another chapter cannot leave a pill behind (r26 kept their last
         state, frames 09-AB1/04, 11-FO1/03, 13-BL1/01, 16-FT1/03) */
      PF.clickC = PF.clickP = false;
      [hitC, hitP].forEach(function (h) { if (!h) return; h.__k = ''; if (document.activeElement === h) h.blur(); h.style.opacity = '0'; h.style.pointerEvents = 'none'; h.tabIndex = -1; h.setAttribute('aria-hidden', 'true'); h.classList.add('is-off'); });
      if (PF.open) pfCtl.auto();
    }
    PF.inRange = pfOn;
    if (phK !== api._phK) fdPh.forEach(function (ph) { if (phK >= 1) { ph.style.opacity = ''; ph.style.clipPath = ''; ph.style.webkitClipPath = ''; } else { var cp = 'inset(' + ((1 - phK) * 50).toFixed(2) + '% round 1rem)'; ph.style.opacity = phK.toFixed(3); ph.style.clipPath = cp; ph.style.webkitClipPath = cp; } });
    api._phK = phK;
    VG.forEach(function (o, i) { if (!o) return; var k = vlG[i], c = vlC, sc = 1 - .94 * eio(c), op = k * (1 - sst(.55, 1, c)), dr = red ? 1 : clamp(stars[i] * 1.25, 0, 1);
      var key = [VGP[i][0], VGP[i][1], op.toFixed(3), sc.toFixed(3), dr.toFixed(4), c.toFixed(3), red].join(); if (key === o.key) return; o.key = key;
      o.el.style.left = VGP[i][0] + 'px'; o.el.style.top = VGP[i][1] + 'px';
      o.el.style.opacity = op.toFixed(3); o.el.style.transform = 'translate(-50%, -50%) scale(' + sc.toFixed(3) + ')';
      o.paths.forEach(function (p) { p.style.strokeDashoffset = (1 - dr).toFixed(4); }); o.dots.forEach(function (d0) { d0.style.opacity = (dr * (1 - c)).toFixed(3); });
      o.st.style.opacity = (red ? 1 : sst(.35, .85, c)).toFixed(3); o.st.style.transform = 'scale(' + (.4 + .6 * sst(.35, .9, c)).toFixed(3) + ')'; });
    Object.keys(SWP).forEach(function (id) { var e = SWP[id], ix = SW[id], ai = ix === null ? 0 : Math.round(ix); for (var q = 0; q < e.dots.children.length; q++) { var on = q === ai ? 'true' : 'false'; if (e.dots.children[q].getAttribute('aria-current') !== on) e.dots.children[q].setAttribute('aria-current', on); } api.swipe[id] = ix; });
    /* Explorations: the cards float gently and follow the pointer (desktop) */
    var blOn = bl.top < G.vh && bl.top + bl.h > 0;
    cards.forEach(function (c, i) { if (!blOn && !red && !mob && c.style.translate) return; if (red || mob) { c.style.translate = ''; c.__fy = 0; return; } var d = [.7, 1.1, .9][i % 3], fy = Math.cos(t * .3 + i * 1.7) * 7 + ptr.y * 8 * d; c.__fy = +fy.toFixed(2); c.style.translate = (Math.sin(t * .35 + i * 2.1) * 6 + ptr.x * 10 * d).toFixed(2) + 'px ' + fy.toFixed(2) + 'px'; });

    if (scene && vis && root.classList.contains('jr-gl-on')) {
      var dpr = Math.min(window.devicePixelRatio || 1, AtxScene.QUAL[qName].dpr), asp7 = G.vw / G.vh;
      var U = {
        uT: t, uAsp: asp7, uD: D, uPx: dpr * (mob ? 1.05 : 1.25), uAlpha: alpha, uDrift: 0, uLine: line, uBinT: binT, uBinA: fp * 5,
        uHover: Math.max(ptr.hover, PF.h1), uC3: [C3[0], C3[1], 0], uP2: W2, uP3: W3,
        uS1: [SU[0][0], SU[0][1], 0], uS2: [SU[1][0], SU[1][1], 0], uS3: [SU[2][0], SU[2][1], 0], uStars: starsLit, uR: Rm,
        uPL: PL, uPR: PR, uPS: PS, uBin: bin, uCam: [red ? 0 : ptr.x * .03, red ? 0 : -ptr.y * .02], uCamT: camT, uDolly: dolly,
        uBinR: mob ? .11 : .26, uHov2: PF.h2
      };
      for (var k = 0; k < 9; k++) U['uW' + k] = w[k];
      /* Reach out: the beacon sits on the card, the button is its target */
      if (r7) { var bx = mob ? r7.left + r7.width * .5 : r7.left + r7.width * .26, by = mob ? r7.top + r7.height * .32 : r7.top + r7.height * .5;
        U.uBc = [(bx / G.vw * 2 - 1) * asp7, 1 - 2 * by / G.vh]; U.uBtn = [((b7.left + b7.width / 2) / G.vw * 2 - 1) * asp7, 1 - 2 * (b7.top + b7.height / 2) / G.vh]; U.uBR = Math.max(r7.width, r7.height) / G.vh * (mob ? 1.3 : 1.05); }
      scene.draw(U, dpr);
    }
    api._vis = vis;
  }

  /* frames race rAF against a timer, so a hidden, throttled or offscreen tab
     can never strand the scene (RV1/RV3) */
  var raf = 0, rbT = 0;
  function sched(ms) { if (raf) return; raf = 1; var fired = false, go = function () { if (fired) return; fired = true; raf = 0; frame(performance.now()); }; if (!ms && !document.hidden) requestAnimationFrame(go); setTimeout(go, ms || 80); }
  function kick() { sched(document.hidden ? 60 : 0); }
  function now() { raf = 0; frame(performance.now()); }
  function rebuild() { G.vw = root.clientWidth; G.vh = window.innerHeight; spFit(); build(); kick(); }

  var lw0 = root.clientWidth;
  window.addEventListener('resize', function () { var w0 = root.clientWidth; G.vh = window.innerHeight; if (Math.abs(w0 - lw0) > 2) { lw0 = w0; clearTimeout(rbT); rbT = setTimeout(rebuild, 160); } kick(); }, { passive: true });
  window.addEventListener('load', function () { setTimeout(rebuild, 60); });
  /* SP1: the planet box is re-measured when fonts or the layout move it, and the scene rereads it */
  var spT = 0; function spCheck() { clearTimeout(spT); spT = setTimeout(function () { if (spFit()) { build(); kick(); } }, 120); }
  window.addEventListener('resize', spCheck, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(spCheck);
  window.addEventListener('pointermove', function (e) { if (mqM.matches || e.pointerType !== 'mouse') return; ptr.tx = (e.clientX / G.vw - .5) * 2; ptr.ty = (e.clientY / G.vh - .5) * 2; kick(); }, { passive: true });
  if (pfCard) { pfCard.addEventListener('pointerenter', function () { ptr.th = 1; kick(); }); pfCard.addEventListener('pointerleave', function () { ptr.th = 0; kick(); }); }
  function onReduced() { root.classList.toggle('jr-reduced', reduced()); G.vw = root.clientWidth; G.vh = window.innerHeight; build(); now(); }
  if (mqR.addEventListener) mqR.addEventListener('change', onReduced);
  if (mqM.addEventListener) mqM.addEventListener('change', function () { swFocus(); tips(); rebuild(); });
  Atx.onQuality(function (n) { if (AtxScene && AtxScene.QUAL[n]) { qName = n; rebuild(); } });
  Atx.onKick(kick);

  /* a position inside a chapter: p < 0 before it, 0..1 through its pin,
     > 1 past it (r26 scrollTo) */
  function yFor(id, p) {
    var s = S[id]; if (!s || !s.el) return null;
    G.vh = window.innerHeight;
    var st0 = secState(id), top = s.el.getBoundingClientRect().top + window.scrollY + (st0.HO || 0);
    if (p < 0) return top + p * G.vh;
    if (p <= 1) return top + p * st0.travel;
    return top + st0.travel + (p - 1) * G.vh;
  }
  function scrollTo(id, p) { var y = yFor(id, p); if (y === null) return; window.scrollTo({ top: y, behavior: 'instant' }); now(); }
  /* nav jumps land on each pinned chapter's settled state (Round 13 PIN map).
     Only while the chapter is pinned: on phones Leadership and What guides us
     scroll freely (and nothing pins under reduced motion), where 100% of the
     map would land past the chapter's own heading; those use landing.js's
     plain section target instead. */
  var PIN = { about: 1, portfolio: .62, founders: 1, values: 1 };
  Atx.jumpTarget = function (id) { if (PIN[id] === undefined || !S[id] || !S[id].el) return null; G.vh = window.innerHeight; return secState(id).pinned ? yFor(id, PIN[id]) : null; };

  api.kick = kick; api.now = now; api.scrollTo = scrollTo; api.rebuild = rebuild;
  Object.defineProperty(api, 'quality', { get: function () { return qName; } });
  root.classList.toggle('jr-reduced', reduced());
  G.vw = root.clientWidth; G.vh = window.innerHeight;
  build(); kick();
  /* the loader's real-loading part: the journey scene is up */
  Atx.journey = api;

  /* ================= Philosophy: the comet (AB1 v9 to v13) ================= */
  (function () {
    var sec = S.about.el, stage = S.about.stage; if (!sec || !stage) return;
    var ccv = document.createElement('canvas'); ccv.className = 'ab-comet'; ccv.setAttribute('aria-hidden', 'true'); stage.insertBefore(ccv, stage.firstChild);
    var ctx = ccv.getContext('2d'); if (!ctx) return;
    var W = 1, H = 1, dpr = 1, craf = 0, lastT = 0, uD = -9, BX = null, stats = sec.querySelector('.ab-stats');
    function size() { dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = stage.clientWidth || innerWidth; H = stage.clientHeight || innerHeight; ccv.width = Math.round(W * dpr); ccv.height = Math.round(H * dpr); }
    /* the swish curve, in the mark's own coordinates */
    var SW = [[238, 790], [278, 773], [316.5, 754.5], [357.5, 737], [399, 718], [440.5, 697.5], [481.5, 676.5], [523, 654.5], [564.5, 631.5], [605.5, 607.5], [647, 582], [688.5, 556], [729.5, 529.5], [771, 501.5], [812.5, 472.5], [854, 442.5], [895.5, 411.5], [936.5, 379], [978, 344.5], [1019.5, 316.5], [1057.5, 278], [1102.5, 218.5], [1130, 187]];
    /* AB1 v13: one path. Head, trail and light lines all use the swish
       (Catmull-Rom through its points), continued past its ends by a
       quadratic that keeps the end curvature; depth only sets size and fade */
    function sw(u) { var n = SW.length - 1, P = SW, x, i, f;
      if (u >= 0 && u <= 1) { x = u * n; i = Math.min(n - 1, Math.floor(x)); f = x - i; var p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)], f2 = f * f, f3 = f2 * f;
        return [.5 * (2 * p1[0] + (-p0[0] + p2[0]) * f + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * f2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * f3), .5 * (2 * p1[1] + (-p0[1] + p2[1]) * f + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * f2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * f3)]; }
      var e = (u > 1 ? u - 1 : -u) * n, A = u > 1 ? P[n] : P[0], B = u > 1 ? P[n - 1] : P[1], C = u > 1 ? P[n - 2] : P[2], d = [A[0] - B[0], A[1] - B[1]], dd = [A[0] - 2 * B[0] + C[0], A[1] - 2 * B[1] + C[1]];
      return [A[0] + d[0] * e + .5 * dd[0] * e * e, A[1] + d[1] * e + .5 * dd[1] * e * e]; }
    function zAt(u) { return 1.05 + 1.6 * Math.pow(clamp(u - .45, 0, 1) / .7, 2) + 1.2 * Math.pow(clamp(.25 - u, 0, .4) / .34, 2); }
    var SUN = [330, 300], U0 = -.09, U1 = 1.16;
    /* time of flight: speed grows as 1/sqrt(distance to the sun), so the
       comet quickens on approach and eases away, with no easing curve */
    var TT = (function () { var n = 500, u = [], tau = [0], i; for (i = 0; i <= n; i++) u.push(U0 + (U1 - U0) * i / n);
      function v(x) { var q = sw(x); return 1 / Math.sqrt(Math.max(140, Math.hypot(q[0] - SUN[0], q[1] - SUN[1])) / 420); }
      for (i = 1; i <= n; i++) tau.push(tau[i - 1] + (u[i] - u[i - 1]) / v((u[i] + u[i - 1]) / 2));
      function at(x) { var j = clamp(Math.round((x - U0) / (U1 - U0) * n), 0, n); return tau[j]; } var ta = at(0), tb = at(1); tau = tau.map(function (x) { return (x - ta) / (tb - ta); }); return { u: u, tau: tau }; })();
    function uOfTau(x) { var T = TT.tau, n = T.length - 1; if (x <= T[0]) return U0; if (x >= T[n]) return U1; var lo = 0, hi = n; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (T[m] < x) lo = m; else hi = m; } var f = (x - T[lo]) / ((T[hi] - T[lo]) || 1); return TT.u[lo] + (TT.u[hi] - TT.u[lo]) * f; }
    function cbox() { var v = sec.querySelector('.jr-vis'), sr = stage.getBoundingClientRect(), r = v ? v.getBoundingClientRect() : sr, s = Math.min(r.width / 1124, r.height / 587) * .95; return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, s: s }; }
    function scr(q) { var bx = BX || (BX = cbox()); return [bx.x + (q[0] - 568) * bx.s, bx.y + (q[1] - 480) * bx.s]; }
    function pinP() { var r = sec.getBoundingClientRect(), t2 = r.height - 2 * innerHeight; if (t2 > 40) return clamp((-r.top - innerHeight) / t2, 0, 1); var tr = r.height - innerHeight; return r.top > 0 ? 0 : clamp(-r.top / Math.max(1, tr > 40 ? tr : r.height * .6), 0, 1); }
    function target(pin) { return uOfTau((pin - .08) / .72); }
    function geo(u) { var h = scr(sw(u)), s = scr(SUN), ax = h[0] - s[0], ay = h[1] - s[1], d = Math.hypot(ax, ay) || 1, bx = BX || cbox(); return { h: h, s: s, ax: ax / d, ay: ay / d, act: clamp(420 * bx.s / d, .55, 1.5), k: 1.15 / zAt(u) }; }
    var PUFF = (function () { var c = document.createElement('canvas'); c.width = c.height = 32; var x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,240,220,1)'); g.addColorStop(.35, 'rgba(255,232,206,.45)'); g.addColorStop(1, 'rgba(255,226,196,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return c; })();
    function fr(x) { return x - Math.floor(x); }
    function draw(u, pin, t, Gq) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var r = sec.getBoundingClientRect(), secV = clamp(r.bottom / (innerHeight * .5), 0, 1) * (r.top < innerHeight ? 1 : 0);
      var vis = sst(U0, 0, u) * (1 - sst(1.02, 1.15, u)) * clamp((4 - zAt(u)) / 1.5, 0, 1) * secV, sunV = sst(0, .06, pin) * (1 - sst(.88, .97, pin)) * secV, sc = Gq.k, h = Gq.h, mob = mqM.matches, bx = BX || cbox(), k;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      if (sunV > 0) { var s = Gq.s, sg = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], 90); sg.addColorStop(0, 'rgba(255,246,228,' + (.5 * sunV) + ')'); sg.addColorStop(.08, 'rgba(255,228,190,' + (.22 * sunV) + ')'); sg.addColorStop(.4, 'rgba(255,214,170,' + (.05 * sunV) + ')'); sg.addColorStop(1, 'rgba(255,214,170,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(s[0], s[1], 90, 0, 6.2832); ctx.fill(); }
      if (vis <= 0) return;
      var lg = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], 220 * sc); lg.addColorStop(0, 'rgba(214,240,244,' + (.10 * vis) + ')'); lg.addColorStop(1, 'rgba(143,216,232,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(h[0], h[1], 220 * sc, 0, 6.2832); ctx.fill();
      /* ion tail: faint, straight away from the sun, fine wavering filaments */
      var Li = (mob ? 50 : 90) * sc * Math.sqrt(Gq.act), px = -Gq.ay, py = Gq.ax;
      ctx.strokeStyle = 'rgba(140,186,255,' + (.02 * vis) + ')'; ctx.lineWidth = 9 * sc; ctx.beginPath(); ctx.moveTo(h[0], h[1]); ctx.lineTo(h[0] + Gq.ax * Li * .75, h[1] + Gq.ay * Li * .75); ctx.stroke();
      for (k = 0; k < 7; k++) { var ang = (k - 3) * .011 + Math.sin(t * .27 + k * 1.9) * .004, dx = Gq.ax * Math.cos(ang) - Gq.ay * Math.sin(ang), dy = Gq.ax * Math.sin(ang) + Gq.ay * Math.cos(ang), main = k === 3, ig = ctx.createLinearGradient(h[0], h[1], h[0] + dx * Li, h[1] + dy * Li);
        ig.addColorStop(0, 'rgba(160,202,255,' + ((main ? .13 : .06 + .04 * fr(k * .37)) * vis) + ')'); ig.addColorStop(.45, 'rgba(136,184,255,' + ((main ? .1 : .05) * vis) + ')'); ig.addColorStop(1, 'rgba(120,170,255,0)');
        ctx.strokeStyle = ig; ctx.lineWidth = main ? 1.1 : .45 + .35 * fr(k * .61); ctx.beginPath();
        for (var q = 0; q <= 32; q++) { var dq = Li * q / 32, f2 = dq / Li, lat = Math.sin(dq * .031 - t * 2.1 + k * 1.3) * (1 + 6 * Math.pow(f2, 1.4)) + Math.sin(dq * .11 - t * 3.6 + k) * .9 * f2 + (k - 3) * 1.6 * f2, xq = h[0] + dx * dq + px * lat, yq = h[1] + dy * dq + py * lat; if (q) ctx.lineTo(xq, yq); else ctx.moveTo(xq, yq); }
        ctx.stroke(); }
      for (k = 0; k < 2; k++) { var fk = (t * .22 + k * .5) % 1, kx = h[0] + Gq.ax * Li * fk, ky = h[1] + Gq.ay * Li * fk, ka = (1 - fk) * .2 * vis, kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, 7); kg.addColorStop(0, 'rgba(170,206,255,' + ka + ')'); kg.addColorStop(1, 'rgba(170,206,255,0)'); ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(kx, ky, 7, 0, 6.2832); ctx.fill(); }
      /* AB1 v12: the trail is drawn from the same path and the same scroll-
         driven u as the head, every frame: samples are pinned to fixed
         positions along the path behind the head (quantised in u, so they
         never slide), starting exactly at the head; grain offsets come from a
         hash of each sample's position, so it looks the same both ways */
      (function () { var DU = mob ? .0016 : .0011, LEN = .15, q0 = Math.floor(u / DU) * DU, M = Math.ceil(LEN / DU), prev = h;
        function hs(x) { var v = Math.sin(x * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
        for (var j = 0; j <= M; j++) { var uu = j ? q0 - (j - 1) * DU : u; if (uu < U0) break; var f = (u - uu) / LEN; if (f > 1) break;
          var p0 = j ? scr(sw(uu)) : h, p1 = scr(sw(uu + .002)), tx = p1[0] - p0[0], ty = p1[1] - p0[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, kz = 1.15 / zAt(uu), fade = Math.pow(1 - f, 1.6) * vis, wd = (1.5 + 30 * Math.pow(f, .85)) * kz * (bx.s * 1.6);
          var ps = (3 + 26 * Math.pow(f, .8)) * kz * bx.s * 1.6; ctx.globalAlpha = Math.min(1, .05 * fade * (.7 + .6 * hs(uu * 1000))); ctx.drawImage(PUFF, p0[0] - ps, p0[1] - ps, ps * 2, ps * 2); ctx.globalAlpha = 1;
          for (var gq = 0; gq < 3; gq++) { var key = Math.round(uu / DU) * 3 + gq, o = (hs(key) - .5) * 2 * wd + Math.sin(uu * 140 + gq * 2.1) * wd * .25, ga = fade * (.18 + .5 * hs(key + .5)) * (f < .02 ? 0 : 1), gs = .6 + hs(key + .25) * 1.1;
            ctx.fillStyle = (hs(key + .75) < .5 ? 'rgba(255,238,214,' : 'rgba(236,244,246,') + ga.toFixed(3) + ')'; ctx.fillRect(p0[0] + nx * o - gs / 2, p0[1] + ny * o - gs / 2, gs, gs); }
          if (j && f < .5) { ctx.strokeStyle = 'rgba(255,240,220,' + (.22 * Math.pow(1 - f / .5, 2) * vis).toFixed(3) + ')'; ctx.lineWidth = Math.max(.4, 2.2 * kz * (1 - f * 1.6)); ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p0[0], p0[1]); ctx.stroke(); }
          prev = p0; } })();
      /* coma: soft and slightly uneven, with a faint green-teal cast */
      for (k = 0; k < 3; k++) { var ox = Math.cos(t * .6 + k * 2.1) * 2.6 * sc + Gq.ax * k * 2 * sc, oy = Math.sin(t * .5 + k * 2.1) * 2.6 * sc + Gq.ay * k * 2 * sc, cr = (24 + 7 * k) * sc, cg = ctx.createRadialGradient(h[0] + ox, h[1] + oy, 0, h[0] + ox, h[1] + oy, cr);
        cg.addColorStop(0, 'rgba(240,250,246,' + ((k ? .12 : .45) * vis) + ')'); cg.addColorStop(.2, 'rgba(206,238,226,' + ((k ? .07 : .2) * vis) + ')'); cg.addColorStop(.55, 'rgba(150,212,206,' + (.09 * vis) + ')'); cg.addColorStop(1, 'rgba(143,216,232,0)'); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(h[0] + ox, h[1] + oy, cr, 0, 6.2832); ctx.fill(); }
      for (k = 0; k < 14; k++) { var ra = fr(k * .7548 + t * .05) * 6.2832, rr = (4 + 16 * fr(k * .5698)) * sc, aa = .12 * vis * (.5 + .5 * Math.sin(t * 3 + k)); ctx.fillStyle = 'rgba(236,248,244,' + aa.toFixed(3) + ')'; ctx.fillRect(h[0] + Math.cos(ra) * rr, h[1] + Math.sin(ra) * rr, .8, .8); }
      var ng = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], 5 * sc); ng.addColorStop(0, 'rgba(255,255,255,' + vis + ')'); ng.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(h[0], h[1], 5 * sc, 0, 6.2832); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(255,255,255,' + vis + ')'; ctx.beginPath(); ctx.arc(h[0], h[1], 1.2 * sc, 0, 6.2832); ctx.fill();
    }
    function cframe(nw) {
      api.cometF = (api.cometF || 0) + 1; BX = null;
      /* offscreen the comet is not drawn; the orbs keep the state of the side the
         visitor is on (passed: charged), so coming back from either side shows
         no late transition */
      var r = sec.getBoundingClientRect(); if (!(r.bottom > -100 && r.top < innerHeight + 100)) { lastT = 0; if (stats) stats.classList.toggle('is-charged', reduced() || r.bottom <= -100); return; }
      var red = reduced(), t = nw / 1000, dt = lastT ? Math.min(.05, t - lastT) : 1 / 60; lastT = t;
      var pin = red ? .6 : pinP(), uT = red ? .72 : target(pin);
      if (uD < -1 || Math.abs(uT - uD) > .08 || red) uD = uT; else uD += (uT - uD) * (1 - Math.exp(-dt * 9));
      var Gq = geo(uD); if (stats) stats.classList.toggle('is-charged', red || uD > .99);
      draw(uD, pin, red ? 4 : t, Gq); api.cometU = +uD.toFixed(3);
      if (!red) ckick();
    }
    function ckick() { if (craf) return; craf = 1; var fired = false, g = function () { if (fired) return; fired = true; craf = 0; cframe(performance.now()); }; requestAnimationFrame(g); setTimeout(g, 50); }
    var lw = 0; function rs() { if (Math.abs((stage.clientWidth || 0) - lw) < 2 && lw) return; lw = stage.clientWidth; size(); uD = -9; ckick(); }
    addEventListener('resize', rs, { passive: true }); addEventListener('scroll', ckick, { passive: true }); document.addEventListener('visibilitychange', ckick);
    if (mqR.addEventListener) mqR.addEventListener('change', function () { uD = -9; ckick(); });
    Atx.onKick(ckick);
    size(); lw = stage.clientWidth; ckick(); addEventListener('load', function () { size(); uD = -9; ckick(); });
  })();

  /* ================= What guides us: star halos (VA1 v7) ================= */
  (function () {
    var vis = J.querySelector('#values .vl-vis'); if (!vis) return;
    var hc = document.createElement('canvas'); hc.className = 'vl-halo'; hc.setAttribute('aria-hidden', 'true'); vis.insertBefore(hc, vis.firstChild);
    var ctx = hc.getContext('2d'); if (!ctx) return;
    var stars = [].slice.call(vis.querySelectorAll('.vl-star')), glyphs = [].slice.call(J.querySelectorAll('#values .vl-item .vl-glyph'));
    var W = 1, H = 1, dpr = 1, hraf = 0, seed = 3, PP = [];
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function size() { dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = (vis.clientWidth || 1) + 320; H = (vis.clientHeight || 1) + 320; hc.width = Math.round(W * dpr); hc.height = Math.round(H * dpr); var n = mqM.matches ? 26 : 60; PP = stars.map(function () { var a = []; for (var i = 0; i < n; i++) a.push({ r: 22 + rnd() * 34, a: rnd() * 6.2832, sp: (.25 + rnd() * .5) * (rnd() < .5 ? -1 : 1), far: 70 + rnd() * 110, fa: rnd() * 6.2832, s: .6 + rnd() * 1.6, t: rnd() * 6.28, tilt: .45 + rnd() * .3 }); return a; }); }
    /* each star follows its own glyph's draw-on */
    function kOf(i) { var g = glyphs[i], p = g && g.querySelector('[data-draw]'); if (reduced()) return 1; if (!p) return 0; var v = parseFloat(p.style.strokeDashoffset); return isNaN(v) ? (g.closest('.vl-item').style.opacity === '0' ? 0 : 1) : Math.max(0, Math.min(1, 1 - v)); }
    function hframe(nw) {
      hraf = 0; var r = vis.getBoundingClientRect(); if (r.bottom < -50 || r.top > innerHeight + 50) return;
      var t = reduced() ? 4 : nw / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      stars.forEach(function (st, i) {
        var sr = st.getBoundingClientRect(), x = sr.left - r.left + 160 + sr.width / 2, y = sr.top - r.top + 160 + sr.height / 2, k = kOf(i), e = k * k * (3 - 2 * k);
        if (k <= 0) return;
        var gl = ctx.createRadialGradient(x, y, 0, x, y, 90); gl.addColorStop(0, 'rgba(207,232,240,' + (.22 * e) + ')'); gl.addColorStop(.35, 'rgba(143,216,232,' + (.08 * e) + ')'); gl.addColorStop(1, 'rgba(143,216,232,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 90, 0, 6.2832); ctx.fill();
        PP[i].forEach(function (p, j) { var ang = p.a + t * p.sp * .5, rr = p.far + (p.r - p.far) * e, fx = Math.cos(p.fa + t * .05) * p.far * (1 - e), fy = Math.sin(p.fa + t * .05) * p.far * (1 - e); var px = x + Math.cos(ang) * rr * e + fx, py = y + Math.sin(ang) * rr * p.tilt * e + fy; var a = (.25 + .6 * e) * (.7 + .3 * Math.sin(t * 2 + p.t)) * Math.min(1, k * 2); ctx.fillStyle = (j % 4 ? 'rgba(143,216,232,' : 'rgba(255,236,210,') + a.toFixed(3) + ')'; ctx.fillRect(px - p.s / 2, py - p.s / 2, p.s, p.s); });
      });
      if (!reduced()) hkick();
    }
    function hkick() { if (hraf) return; hraf = 1; var f = false, g = function () { if (f) return; f = true; hraf = 0; hframe(performance.now()); }; requestAnimationFrame(g); setTimeout(g, 60); }
    addEventListener('scroll', hkick, { passive: true }); addEventListener('resize', function () { size(); hkick(); }, { passive: true }); addEventListener('load', function () { size(); hkick(); });
    Atx.onKick(hkick);
    size(); hkick();
  })();

  /* ================= What guides us: each value holds, then clears (VA1 v9) ================= */
  (function () {
    var sec = S.values.el; if (!sec) return;
    var items = [].slice.call(sec.querySelectorAll('.vl-item')), st = S.values.stage, list = sec.querySelector('.vl-list'), vraf = 0;
    var WIN = [[.30, .37], [.52, .59], [.74, .81]];
    function setv(it, vt, vg) { it.style.setProperty('--vt', vt); it.style.setProperty('--vg', vg); it.style.pointerEvents = +vt < .2 ? 'none' : ''; }
    function tick() { vraf = 0; var r = sec.getBoundingClientRect(), vh = innerHeight, span = r.height - vh, pinned = st && getComputedStyle(st).position === 'sticky' && span > 20;
      if (reduced()) { items.forEach(function (it) { setv(it, '1', '1'); }); return; }
      if (mqM.matches || !pinned) { var ex = 1 - sst(.35, .05, r.bottom / vh), swp = list && list.scrollWidth > list.clientWidth + 4, step = swp && items[1] ? items[1].offsetLeft - items[0].offsetLeft : 1, ix = swp ? list.scrollLeft / (step || 1) : -1;
        items.forEach(function (it, i) { var g0 = swp ? Math.max(0, 1 - Math.abs(ix - i) * 1.6) : 1 - sst(.2, -.15, (items[i + 1] ? items[i + 1].getBoundingClientRect().top : r.bottom) / vh - .5); setv(it, '1', (Math.max(0, Math.min(1, g0)) * ex).toFixed(3)); }); return; }
      if (r.bottom < -50 || r.top > vh + 50) return;
      var p = Math.max(0, Math.min(1, -r.top / span));
      items.forEach(function (it, i) { var out = 1 - sst(WIN[i][0], WIN[i][1], p); setv(it, out.toFixed(3), out.toFixed(3)); }); }
    function vkick() { if (!vraf) vraf = requestAnimationFrame(tick); }
    addEventListener('scroll', vkick, { passive: true }); addEventListener('resize', vkick, { passive: true }); addEventListener('load', vkick); if (list) list.addEventListener('scroll', vkick, { passive: true });
    if (mqR.addEventListener) mqR.addEventListener('change', vkick);
    Atx.onKick(vkick);
    tick();
  })();

  /* ================= Portfolio: the tappable planets and their cards (PO1) ================= */
  var pfCtl = { auto: function () {} };
  function tips() { [].forEach.call(J.querySelectorAll('.pf-hit-tip'), function (t) { t.textContent = mqM.matches ? 'Tap to explore' : 'Click to explore'; }); }
  tips();
  (function () {
    var sec = S.portfolio.el; if (!sec) return;
    var cardsBy = { centium: sec.querySelector('#pf-card-centium'), soon: sec.querySelector('#pf-card-soon') };
    var hits = { centium: hitC, soon: hitP };
    var track = sec.querySelector('.pf-track');
    var cur = '', tmr = 0;
    var pfDots = SWP.portfolio && SWP.portfolio.dots;
    function set(id) { PF.open = id; root.classList.toggle('pf-card-open', !!id); if (pfDots) pfDots.inert = !id; kick(); }
    function focusables(id) { return [].slice.call(cardsBy[id].querySelectorAll('a[href], button')); }
    function open(id, focus) {
      if (cur && cur !== id) close(true);
      cur = id; clearTimeout(tmr); sec.classList.remove('pf-closing'); sec.classList.add('pf-open'); sec.setAttribute('data-pf-open', id);
      Object.keys(cardsBy).forEach(function (k) { var on = k === id; cardsBy[k].classList.toggle('is-open', on); cardsBy[k].setAttribute('aria-hidden', on ? 'false' : 'true'); hits[k].setAttribute('aria-expanded', on ? 'true' : 'false'); });
      if (mqM.matches && track) { var c = cardsBy[id]; track.scrollLeft = c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2; }
      set(id); seen();
      if (focus) setTimeout(function () { var b = cardsBy[id].querySelector('a, .pf-x'); try { b.focus({ preventScroll: true }); } catch { /* ignore */ } }, 60);
    }
    function close(instant, back) {
      if (!cur) return; var was = cur; cur = '';
      Object.keys(cardsBy).forEach(function (k) { hits[k].setAttribute('aria-expanded', 'false'); cardsBy[k].setAttribute('aria-hidden', 'true'); });
      sec.classList.add('pf-closing'); sec.removeAttribute('data-pf-open');
      var done = function () { sec.classList.remove('pf-closing', 'pf-open'); Object.keys(cardsBy).forEach(function (k) { cardsBy[k].classList.remove('is-open'); }); };
      if (instant) done(); else tmr = setTimeout(done, 280);
      set(''); if (back) { try { hits[was].focus({ preventScroll: true }); } catch { /* ignore */ } }
    }
    Object.keys(hits).forEach(function (k) {
      if (!hits[k] || !cardsBy[k]) return;
      hits[k].addEventListener('click', function (e) { e.stopPropagation(); if (cur === k) close(false); else open(k, e.detail === 0); });
      hits[k].addEventListener('pointerenter', function () { PF.hov = k; kick(); });
      hits[k].addEventListener('pointerleave', function () { PF.hov = ''; kick(); });
      hits[k].addEventListener('focus', function () { PF.hov = k; kick(); });
      hits[k].addEventListener('blur', function () { PF.hov = ''; kick(); });
      cardsBy[k].querySelector('.pf-x').addEventListener('click', function (e) { e.stopPropagation(); close(false, true); });
    });
    if (track) track.addEventListener('scroll', function () { if (!cur || !mqM.matches) return; var c = track.children, step = c.length > 1 ? c[1].offsetLeft - c[0].offsetLeft : 1, i = Math.round(track.scrollLeft / (step || 1)), id = i ? 'soon' : 'centium'; if (id !== cur) { cur = id; Object.keys(cardsBy).forEach(function (k) { var on = k === id; cardsBy[k].classList.toggle('is-open', on); cardsBy[k].setAttribute('aria-hidden', on ? 'false' : 'true'); hits[k].setAttribute('aria-expanded', on ? 'true' : 'false'); }); sec.setAttribute('data-pf-open', id); set(id); } }, { passive: true });
    document.addEventListener('pointerdown', function (e) { if (!cur) return; var t = e.target; if (t.closest && (t.closest('.pf-card') || t.closest('.pf-proto') || t.closest('.pf-hit') || t.closest('.jr-dots'))) return; close(false); });
    document.addEventListener('keydown', function (e) {
      if (!cur) return;
      if (e.key === 'Escape') { close(false, true); return; }
      /* HANDOVER h: focus stays in the open card while it has focus */
      if (e.key === 'Tab' && cardsBy[cur].contains(document.activeElement)) {
        var f = focusables(cur); if (!f.length) return;
        var i = f.indexOf(document.activeElement), n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i >= f.length - 1 ? 0 : i + 1);
        e.preventDefault(); try { f[n].focus({ preventScroll: true }); } catch { /* ignore */ }
      }
    });
    /* the phone hint, shown once ("Tap a world to explore") */
    var KEY = 'atx-pf-hint-seen';
    function seen() { try { localStorage.setItem(KEY, '1'); } catch { /* storage blocked */ } if (pfHint) pfHint.classList.remove('is-on'); }
    function maybeHint() { var s0; try { s0 = localStorage.getItem(KEY); } catch { /* storage blocked */ } if (s0 || !mqM.matches || !pfHint || cur) return; var r = sec.getBoundingClientRect(); if (r.top < innerHeight * .3 && r.bottom > innerHeight * .7) { pfHint.classList.add('is-on'); setTimeout(function () { pfHint.classList.remove('is-on'); try { localStorage.setItem(KEY, '1'); } catch { /* storage blocked */ } }, 4200); removeEventListener('scroll', maybeHint); } }
    addEventListener('scroll', maybeHint, { passive: true });
    pfCtl.auto = function () { if (cur) close(false); };
  })();

  /* ================= JN1: the chapter dock on phones ================= */
  (function () {
    var jn = document.querySelector('.jn'); if (!jn) return;
    var NM = { hero: 'Atraxia', about: 'Our philosophy', portfolio: 'Our portfolio', founders: 'Leadership', values: 'What guides us', blog: 'Explorations', contact: 'Reach out' };
    var pill = jn.querySelector('.jn-pill'), lab = jn.querySelector('.jn-label'), skip = jn.querySelector('.jn-skip'), top = jn.querySelector('.jn-top'), sheet = jn.querySelector('.jn-sheet');
    var rows = [].slice.call(sheet.querySelectorAll('[data-go]')), last = '';
    function cur() { var ids = ['about', 'portfolio', 'founders', 'values', 'blog', 'contact'], c = 'hero'; ids.forEach(function (id) { var e = document.getElementById(id); if (e && e.getBoundingClientRect().top <= innerHeight * .5) c = id; }); return c; }
    function upd() {
      var d = root, p = Math.max(0, Math.min(1, scrollY / Math.max(1, d.scrollHeight - innerHeight))), c = cur(), I = Atx.intro;
      jn.style.setProperty('--jp', p.toFixed(4));
      if (c !== last) { last = c; lab.textContent = NM[c] || 'Atraxia'; rows.forEach(function (b) { b.setAttribute('aria-current', b.getAttribute('data-go') === c ? 'true' : 'false'); }); }
      skip.hidden = !(c === 'hero' && I && !I.reduced && I.progress < .9);
      top.hidden = !(c === 'blog' || c === 'contact' || p > .9);
    }
    function open() { sheet.hidden = false; pill.setAttribute('aria-expanded', 'true'); var b = sheet.querySelector('[aria-current="true"]') || rows[0]; try { b.focus({ preventScroll: true }); } catch { /* ignore */ } }
    function close() { sheet.hidden = true; pill.setAttribute('aria-expanded', 'false'); }
    pill.addEventListener('click', function () { if (sheet.hidden) open(); else close(); });
    sheet.querySelector('.jn-scrim').addEventListener('click', close);
    /* a chapter row jumps like the nav (Round 13: veil, focus, history) */
    rows.forEach(function (b) { b.addEventListener('click', function () { close(); if (window.__atxJump) window.__atxJump(b.getAttribute('data-go')); upd(); }); });
    skip.addEventListener('click', function () { if (Atx.intro) Atx.intro.scrollTo(1); upd(); });
    top.addEventListener('click', function () { close(); window.scrollTo({ top: 0, behavior: 'instant' }); upd(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) { close(); pill.focus(); } });
    var ur = 0; function uk() { if (!ur) ur = requestAnimationFrame(function () { ur = 0; upd(); }); }
    addEventListener('scroll', uk, { passive: true }); addEventListener('resize', uk, { passive: true }); addEventListener('load', upd);
    setInterval(upd, 700); upd();
  })();
})();
