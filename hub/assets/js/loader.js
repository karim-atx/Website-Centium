/* Atraxia website: the landing loader (LO1 v4). Landing page only.

   Loaded synchronously straight after the #ld markup, so it starts while the
   rest of the page is still parsing (the reference ran inline at the same
   spot). Ported literally from source/index.r26.html (the __atxLoader
   script): the Atraxia mark gathers from starlight. Grains drift in from a
   faint star field and settle on the exact mark, sampled from
   atraxia-mark-hi.png with getImageData (same-origin, so the canvas is never
   tainted); the swish draws in left to right with a travelling point of
   light; the finished mark glows and the wordmark is unmasked; then the
   mark's light unfolds into a two-armed spiral at the centre, where the hero
   galaxy opens, and the loader fades into it.

   Gathering is paced by real loading (document, fonts, the two scene
   scripts, the first 14 images and the mark image), minimum 2.2s, maximum
   9s. Repeat visits start 82% formed and run a short version. Reduced
   motion: the mark fades in, then the same fade into the hero.

   Added for the handover (not in the reference): the progress indicator, a
   role="progressbar" ring (the reference's own hidden .ld-ring markup and
   styles) whose aria-valuenow follows real loading; a still fallback if the
   mark cannot be sampled; and keyboard handling, so focus never sits under
   the loader. Prototype flags (?ld-first, ?noloader) and the board's
   replay/show hooks are not shipped. */
(function () {
  'use strict';
  var ld = document.getElementById('ld');
  var Atx = window.Atx;
  if (!ld || !Atx || Atx.loader) return;
  var mqR = matchMedia('(prefers-reduced-motion: reduce)'), mob = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  var KEY = 'atx-visited-v19', repeat = false;
  try { repeat = !!localStorage.getItem(KEY); } catch { /* storage blocked: treat as a first visit */ }
  var cv = ld.querySelector('canvas'), ctx = cv && cv.getContext && cv.getContext('2d'), word = ld.querySelector('.ld-word');
  var bar = ld.querySelector('[role="progressbar"]'), ringP = bar && bar.querySelector('.p');
  var W = 1, H = 1, dpr = 1, cx = 0, cy = 0, MW = 1, R = 1, sd = 5, AR = .717, A = [], S = [], BG = [], BIN = [], TINT = null, ready = false;
  function rnd() { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }
  function g() { return Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(6.2832 * rnd()); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sst(a, b, x) { var k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); }
  function eio(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight;
    if (ctx) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    cx = W * .5; cy = H * .46; MW = mob ? Math.min(W * .5, 230) : Math.min(W * .2, 290); R = Math.min(W, H) * (mob ? .44 : .38);
    if (word) { word.style.top = Math.round(cy + MW * AR / 2 + (mob ? 34 : 48)) + 'px'; word.style.bottom = 'auto'; }
  }
  for (var b = 0; b < (mob ? 160 : 320); b++) BG.push([rnd(), rnd(), Math.pow(rnd(), 2.2), rnd() * 6.28, rnd() < .15]);
  function galaxyPt(p) { var core = rnd() < .16, arm = rnd() < .5 ? 0 : Math.PI, rad = core ? Math.abs(g()) * .07 : .05 + Math.pow(rnd(), .75) * .95; p.gr = rad; p.gt = arm + Math.log(Math.max(rad, .05) / .05) * 1.55 + g() * .2 / Math.max(rad, .2); }

  var img = new Image();
  img.onload = function () {
    AR = img.naturalHeight / img.naturalWidth; size();
    var cw = 300, ch = Math.round(cw * AR), oc = document.createElement('canvas'); oc.width = cw; oc.height = ch;
    var ox = oc.getContext('2d'); ox.drawImage(img, 0, 0, cw, ch);
    var dt = null;
    try { dt = ox.getImageData(0, 0, cw, ch).data; } catch { /* tainted canvas: no grains, the still mark below is used */ }
    var tc = document.createElement('canvas'); tc.width = 600; tc.height = Math.round(600 * AR); var tx = tc.getContext('2d'); tx.drawImage(img, 0, 0, tc.width, tc.height);
    try {
      var td = tx.getImageData(0, 0, tc.width, tc.height), d = td.data;
      for (var i = 0; i < d.length; i += 4) { var sw = d[i + 1] > 95; d[i] = sw ? 156 : 236; d[i + 1] = sw ? 222 : 246; d[i + 2] = sw ? 234 : 248; }
      tx.putImageData(td, 0, 0); TINT = tc;
    } catch { TINT = img; }
    if (dt) {
      var ca = [], cs = [];
      for (var y = 0; y < ch; y++) for (var x = 0; x < cw; x++) { var o = (y * cw + x) * 4; if (dt[o + 3] < 140) continue; (dt[o + 1] > 95 ? cs : ca).push([(x + rnd()) / cw, (y + rnd()) / cw]); }
      var nA = mob ? 900 : 2100, nS = mob ? 700 : 1600, x0 = 1, x1 = 0;
      for (i = 0; i < nA && ca.length; i++) { var pa = ca[(rnd() * ca.length) | 0], p = { tx: pa[0], ty: pa[1], sx: rnd() * 1.3 - .15, sy: rnd() * 1.3 - .15, d: rnd() * .4, c: g() * .22, sz: .7 + Math.pow(rnd(), 3) * 1.4, ph: rnd() * 6.28 }; galaxyPt(p); A.push(p); }
      for (i = 0; i < nS && cs.length; i++) { var ps = cs[(rnd() * cs.length) | 0], q2 = { tx: ps[0], ty: ps[1], jx: g(), jy: g(), sz: .7 + Math.pow(rnd(), 3) * 1.3, ph: rnd() * 6.28 }; galaxyPt(q2); S.push(q2); if (q2.tx < x0) x0 = q2.tx; if (q2.tx > x1) x1 = q2.tx; }
      var NB = 60, sum = []; for (i = 0; i < NB; i++) sum.push([0, 0]);
      S.forEach(function (q3) { q3.xn = (q3.tx - x0) / ((x1 - x0) || 1); var bi = Math.min(NB - 1, (q3.xn * NB) | 0); sum[bi][0] += q3.ty; sum[bi][1]++; });
      BIN = sum.map(function (v, k) { return [x0 + (x1 - x0) * (k + .5) / NB, v[1] ? v[0] / v[1] : null]; });
    }
    ready = true; sch();
  };
  img.onerror = function () { ready = true; sch(); };
  img.src = 'atraxia/atraxia-mark-hi.png';

  /* real loading: document parsed and loaded, the hero intro and the journey
     scene running, the first 14 images, the fonts, and the mark image. A page
     without a journey canvas (before batch 3 lands it) counts that part done. */
  function journeyUp() { return !!Atx.journey || !document.querySelector('.jr-gl'); }
  var rl = 0;
  function real() {
    var ims = [].slice.call(document.images, 0, 14), ok = ims.filter(function (im) { return im.complete; }).length, f = ims.length ? ok / ims.length : 1;
    var parts = [document.readyState !== 'loading' ? 1 : 0, document.readyState === 'complete' ? 1 : 0, Atx.intro ? 1 : 0, journeyUp() ? 1 : 0, f, (document.fonts && document.fonts.status === 'loaded') ? 1 : 0, ready ? 1 : 0];
    if (document.readyState === 'complete' && Atx.intro && ready) return 1;
    if (document.readyState !== 'loading' && Atx.intro && journeyUp() && performance.now() - t0 > 3000) return 1;
    return parts.reduce(function (a, c) { return a + c; }, 0) / parts.length;
  }

  var t0 = performance.now(), MIN = 2200, IGN = 1100, HO = 1300, e = 0, ig = 0, ho = 0, phase = 'gather', raf = 0, red = mqR.matches, done = false, lastN = 0;
  function timing() { MIN = red ? 700 : repeat ? 650 : 2200; IGN = red ? 500 : repeat ? 450 : 1100; HO = red ? 600 : repeat ? 750 : 1300; e = repeat && !red ? .82 : 0; }
  function mpt(p) { return [cx + (p.tx - .5) * MW, cy + (p.ty - AR / 2) * MW]; }

  /* the progress indicator: a monotonic value that never runs ahead of real
     loading, shown on the ring and announced in 5% steps */
  var pv = 0, said = -1;
  function progress(v, ringK) {
    pv = Math.max(pv, clamp(v, 0, 1));
    if (!bar) return;
    var n = Math.round(pv * 100), step = n >= 100 ? 100 : n - n % 5;
    if (step !== said) { said = step; bar.setAttribute('aria-valuenow', String(step)); }
    if (ringP) ringP.style.strokeDashoffset = (1 - pv).toFixed(4);
    bar.style.opacity = ringK.toFixed(3);
  }

  function render(t) {
    var k0 = phase === 'gather' ? e : 1, g2 = phase === 'gather' ? 0 : phase === 'ignite' ? ig : 1, h = phase === 'handoff' ? ho : 0, eh = eio(h);
    var wk = phase === 'gather' ? 0 : phase === 'ignite' ? sst(.25, 1, ig) : 1;
    if (word) {
      word.style.opacity = (wk * (1 - sst(0, .55, h))).toFixed(3);
      var cl = 'inset(0 ' + ((1 - wk) * 100).toFixed(2) + '% 0 0)'; word.style.clipPath = cl; word.style.webkitClipPath = cl;
      word.style.transform = 'translate(-50%, ' + ((1 - wk) * 6).toFixed(2) + 'px)';
    }
    progress(phase === 'gather' ? Math.min(e, rl) : 1, phase === 'gather' ? 1 : phase === 'ignite' ? 1 - sst(0, .4, ig) : 0);
    ld.style.opacity = (1 - sst(.4, 1, h)).toFixed(3);
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < BG.length; i++) {
      var bs = BG[i], a0 = (.1 + .45 * bs[2]) * (.75 + .25 * Math.sin(t * (.6 + bs[2]) + bs[3])) * (1 - .6 * eh), z = bs[4] ? 1.6 : 1;
      ctx.fillStyle = (bs[4] ? 'rgba(255,238,214,' : 'rgba(207,232,240,') + a0.toFixed(3) + ')'; ctx.fillRect(bs[0] * W - z / 2, bs[1] * H - z / 2, z, z);
    }
    /* reduced motion, or no grains (the mark could not be sampled): the mark fades in */
    if (red || (ready && !A.length)) {
      if (TINT) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, k0 * 1.2) * .92 * (1 - eh); ctx.drawImage(TINT, cx - MW / 2, cy - MW * AR / 2, MW, MW * AR); ctx.globalAlpha = 1; }
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    var rot = t * .1, gR = R * (1 + .06 * eh);
    /* the A: each grain flies in on a gentle curve from its star */
    for (i = 0; i < A.length; i++) {
      var p = A[i], kk = eio(clamp((k0 * 1.55 - p.d) / .95, 0, 1)), m = mpt(p), sx = p.sx * W, sy = p.sy * H, mx = (sx + m[0]) / 2 - (m[1] - sy) * p.c, my = (sy + m[1]) / 2 + (m[0] - sx) * p.c, u = 1 - kk;
      var x = u * u * sx + 2 * u * kk * mx + kk * kk * m[0], y = u * u * sy + 2 * u * kk * my + kk * kk * m[1];
      if (eh > 0) { var th = p.gt + rot * (1 + .6 / (p.gr + .3)); x += (cx + Math.cos(th) * p.gr * gR - x) * eh; y += (cy + Math.sin(th) * p.gr * gR * .42 - y) * eh; }
      var a = (.1 + .62 * kk) * (.8 + .2 * Math.sin(t * 1.7 + p.ph)) * (1 - .5 * g2 * (1 - eh)) * (1 - .35 * eh);
      ctx.fillStyle = (p.gr < .12 && eh > .3 ? 'rgba(255,236,212,' : 'rgba(228,242,246,') + a.toFixed(3) + ')'; ctx.fillRect(x - p.sz / 2, y - p.sz / 2, p.sz, p.sz);
    }
    /* the swish: drawn in from the left by a travelling point of light */
    var f = clamp((k0 - .32) / .64, 0, 1);
    for (i = 0; i < S.length; i++) {
      var q3 = S[i], vis = sst(0, .05, f - q3.xn), hd = f > 0 && f < 1 ? Math.exp(-Math.pow((f - q3.xn) / .025, 2)) : 0;
      if (vis <= 0 && hd < .02) continue;
      var m2 = mpt(q3), x2 = m2[0] + q3.jx * 7 * (1 - vis), y2 = m2[1] + q3.jy * 7 * (1 - vis);
      if (eh > 0) { var th2 = q3.gt + rot * (1 + .6 / (q3.gr + .3)); x2 += (cx + Math.cos(th2) * q3.gr * gR - x2) * eh; y2 += (cy + Math.sin(th2) * q3.gr * gR * .42 - y2) * eh; }
      var a2 = (vis * .62 + hd * .7) * (.82 + .18 * Math.sin(t * 2 + q3.ph)) * (1 - .5 * g2 * (1 - eh)) * (1 - .35 * eh);
      ctx.fillStyle = hd > .4 ? 'rgba(240,252,255,' + a2.toFixed(3) + ')' : 'rgba(150,218,232,' + a2.toFixed(3) + ')'; ctx.fillRect(x2 - q3.sz / 2, y2 - q3.sz / 2, q3.sz, q3.sz);
    }
    if (f > 0 && f < 1 && BIN.length) {
      var bi = Math.min(BIN.length - 1, (f * BIN.length) | 0);
      while (bi > 0 && BIN[bi][1] === null) bi--;
      if (BIN[bi][1] !== null) {
        var hx = cx + (BIN[bi][0] - .5) * MW, hy = cy + (BIN[bi][1] - AR / 2) * MW, hr = 26 * MW / 290, hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
        hg.addColorStop(0, 'rgba(244,252,255,.55)'); hg.addColorStop(.25, 'rgba(160,222,236,.18)'); hg.addColorStop(1, 'rgba(143,216,232,0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 6.2832); ctx.fill();
      }
    }
    /* glow: the exact mark, softly lit, then its light opens into the galaxy */
    if (g2 > 0) {
      var bl = g2 * (1 - eh), bg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, MW * .95);
      bg2.addColorStop(0, 'rgba(143,216,232,' + (.13 * bl).toFixed(3) + ')'); bg2.addColorStop(.6, 'rgba(60,140,170,' + (.04 * bl).toFixed(3) + ')'); bg2.addColorStop(1, 'rgba(60,140,170,0)');
      ctx.fillStyle = bg2; ctx.fillRect(cx - MW, cy - MW, MW * 2, MW * 2);
      if (TINT) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = sst(0, .8, g2) * .9 * (1 - sst(0, .5, h)); ctx.drawImage(TINT, cx - MW / 2, cy - MW * AR / 2, MW, MW * AR); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; }
    }
    if (eh > 0) {
      var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .3);
      cg.addColorStop(0, 'rgba(255,248,236,' + (.5 * Math.sin(Math.PI * Math.min(1, h * 1.2))).toFixed(3) + ')'); cg.addColorStop(.3, 'rgba(255,226,190,' + (.14 * eh).toFixed(3) + ')'); cg.addColorStop(1, 'rgba(143,216,232,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, R * .3, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function finish() {
    if (done) return;
    done = true;
    progress(1, 0);
    ld.classList.add('is-gone'); ld.style.display = 'none';
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    window.dispatchEvent(new Event('atx:loaded'));
  }
  /* the reference's own scheduler: a frame raced against a 50ms timer */
  function sch() {
    if (raf || done) return;
    raf = 1;
    var fired = false, go = function () { if (fired) return; fired = true; raf = 0; tick(performance.now()); };
    requestAnimationFrame(go); setTimeout(go, 50);
  }
  function tick(now) {
    if (done) return;
    var el = now - t0, dt = lastN ? Math.min(.6, (now - lastN) / 1000) : 1 / 60; lastN = now;
    if (phase === 'gather') {
      rl = el > 9000 ? 1 : real();
      var tgt = Math.min(rl, el / MIN);
      if (!ready && el < 9000) tgt = Math.min(tgt, .05);
      e += (tgt - e) * Math.min(1, dt * 3.2);
      if (tgt >= 1 && e > .985) { e = 1; phase = 'ignite'; t0 = now; }
    } else if (phase === 'ignite') { ig = Math.min(1, el / IGN); if (ig >= 1) { phase = 'handoff'; t0 = now; } }
    else { ho = Math.min(1, el / HO); if (ho >= 1) { render(now / 1000); finish(); return; } }
    render(now / 1000); sch();
  }
  addEventListener('resize', function () { if (!done) size(); }, { passive: true });

  /* Keyboard: the loader is pointer-transparent and never hides the page from
     assistive technology. The skip link sits above it. As soon as focus moves
     into the page (the skip link's target, or any link), the loader steps
     aside so the focused element is visible. */
  document.addEventListener('focusin', function (ev) {
    if (done) return;
    var t = ev.target;
    if (t && t.classList && t.classList.contains('skip-link')) return;
    finish();
  }, true);

  Atx.loader = {
    skip: finish,
    get phase() { return done ? 'done' : phase; },
    get progress() { return e; },
    get value() { return pv; },
    get repeat() { return repeat; },
    get ready() { return ready; }
  };
  timing(); size(); t0 = performance.now(); tick(t0);
})();
