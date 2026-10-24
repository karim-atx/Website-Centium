/* Atraxia website: the 404's sky (NF1 v9). Ported from the handover's
   404-sky.reference.js (stars, dust, nebula, comet; prototype nf404-v9.js)
   and 404-constellation.reference.js (the missing star; nf404-v7.js, frozen
   on this page), merged into one script. Plain 2D canvas: no WebGL, no
   landing scene, nothing fetched. Loaded with defer on 404.html only.

   - canvas.nf-field: a still, long-exposure sky drawn once per viewport size
     into an offscreen layer (point-spread stars by temperature in three
     depths, thinning out around the copy; teal and violet haze; a faint
     diagonal band crossed by dark dust; grain). Each frame copies it, adds 14
     twinkling near stars and, while one is visible, the comet.
   - canvas.nf-lost: the constellation whose last star is missing. On the 404
     it is a still frame (the prototype freezes it at t = 0): lines at a fixed
     2.5%, no line fade, no twinkle, so no pointer parallax either. Redrawn
     only when the viewport size changes.
   - The comet: one at a time, the first 4s after load, then every 15 to 30s.
     Its tail is the same arc sampled backwards from the head (v9).
   - Frame rate: 30fps while a comet is visible, otherwise 15fps; each frame
     request races a 100ms timer (site rule); nothing runs while hidden.
   - Reduced motion: still stars, no twinkle, no comet (redrawn once when the
     setting changes). No 2D canvas: the plain #02060C base shows. */
(function () {
  'use strict';
  var mqR = matchMedia('(prefers-reduced-motion: reduce)'), mqM = matchMedia('(max-width: 760px), (pointer: coarse)');
  var W = 0, H = 0, mob = false;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ss(a, b, v) { var k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); }

  /* ================= the sky: stars, dust, nebula, comet ================= */
  var cv, x, base, bx, dpr, seed = 3, SPR = {}, TW = [], comet = null, nextAt = 0, last = 0, pending = false;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var TEMP = [[178, 204, 255], [244, 246, 255], [255, 240, 222], [255, 216, 168]];
  function temp() { var r = rnd(); return TEMP[r < .16 ? 0 : r < .72 ? 1 : r < .9 ? 2 : 3]; }
  /* point-spread sprite: a sharp white core (radius 10 of 64) in a wide faint halo, once per colour */
  function psf(c) { var k = c.join(','); if (SPR[k]) return SPR[k]; var s = 64, m = 32, e = document.createElement('canvas'); e.width = e.height = s; var g = e.getContext('2d');
    var w = g.createRadialGradient(m, m, 0, m, m, m); w.addColorStop(0, 'rgba(' + k + ',.2)'); w.addColorStop(.22, 'rgba(' + k + ',.05)'); w.addColorStop(.6, 'rgba(' + k + ',.01)'); w.addColorStop(1, 'rgba(' + k + ',0)'); g.fillStyle = w; g.fillRect(0, 0, s, s);
    var cr = g.createRadialGradient(m, m, 0, m, m, 10); cr.addColorStop(0, 'rgba(255,255,255,1)'); cr.addColorStop(.3, 'rgba(' + k + ',.85)'); cr.addColorStop(1, 'rgba(' + k + ',0)'); g.fillStyle = cr; g.fillRect(0, 0, s, s); return (SPR[k] = e); }
  function star(g, px, py, b, soft, c, a) { var d = (5 + 30 * Math.pow(b, 1.5)) * soft; g.globalAlpha = Math.min(1, a * (.3 + .7 * b)); g.drawImage(psf(c), px - d / 2, py - d / 2, d, d); }
  /* how much the field gives way around the copy: .3 at the centre column, 1 outside it */
  function clear(px, py) { var nx = (px - W / 2) / (W * (mob ? .46 : .3)), ny = (py - H * .5) / (H * .34); return .3 + .7 * ss(.55, 1.25, Math.sqrt(nx * nx + ny * ny)); }
  function buildBase() {
    seed = 3; base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height; bx = base.getContext('2d'); bx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bx.fillStyle = '#02060C'; bx.fillRect(0, 0, W, H);
    var blob = function (cx, cy, r, col, a) { var g = bx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(.5, 'rgba(' + col + ',' + a * .4 + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); bx.fillStyle = g; bx.fillRect(cx - r, cy - r, r * 2, r * 2); };
    bx.globalCompositeOperation = 'lighter';
    blob(W * .18, H * .2, Math.max(W, H) * .55, '18,58,74', .22); blob(W * .9, H * .85, Math.max(W, H) * .5, '44,34,92', .12); blob(W * .5, H * 1.05, W * .6, '10,40,56', .18);
    /* a faint diagonal band of unresolved light, with darker dust in it */
    for (var i = 0; i < 26; i++) { var u = i / 25, cx = W * (-.1 + u * 1.2), cy = H * (.92 - u * .78) + (rnd() - .5) * H * .08; blob(cx, cy, Math.max(W, H) * (.08 + rnd() * .07), '150,180,196', .022 + rnd() * .018); }
    bx.globalCompositeOperation = 'source-over';
    for (var j = 0; j < 16; j++) { var v = rnd(), dx = W * (-.05 + v * 1.1), dy = H * (.9 - v * .78) + (rnd() - .5) * H * .05; var dr = Math.max(W, H) * (.03 + rnd() * .05), dg = bx.createRadialGradient(dx, dy, 0, dx, dy, dr); dg.addColorStop(0, 'rgba(2,6,12,.22)'); dg.addColorStop(1, 'rgba(2,6,12,0)'); bx.fillStyle = dg; bx.fillRect(dx - dr, dy - dr, dr * 2, dr * 2); }
    bx.globalCompositeOperation = 'lighter';
    var area = W * H / (1440 * 900), N = Math.round((mob ? 900 : 1500) * Math.max(.45, area)); TW = [];
    for (var k = 0; k < N; k++) { var px = rnd() * W, py = rnd() * H, z = rnd(), b = Math.pow(rnd(), 4.2), near = z > .93, far = z < .55;
      b = b * (near ? .95 : far ? .45 : .7); var soft = near ? .9 : far ? 1.25 : 1, a = clear(px, py) * (far ? .7 : 1);
      if (near && b > .32 && TW.length < 14 && clear(px, py) > .8) { TW.push({ x: px, y: py, b: b, soft: soft, c: temp(), f: rnd() * 6.28, per: 7 + rnd() * 8 }); continue; }
      star(bx, px, py, b, soft, temp(), a); }
    /* fine grain against banding */
    var n = document.createElement('canvas'); n.width = n.height = 96; var nx = n.getContext('2d'), id = nx.createImageData(96, 96); for (var p = 0; p < id.data.length; p += 4) { var g = Math.random() * 255; id.data[p] = id.data[p + 1] = id.data[p + 2] = g; id.data[p + 3] = 255; } nx.putImageData(id, 0, 0);
    bx.globalCompositeOperation = 'overlay'; bx.globalAlpha = .035; bx.fillStyle = bx.createPattern(n, 'repeat'); bx.fillRect(0, 0, W, H); bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over';
  }
  /* comet path, in css px: upper left on desktop, above the copy on phones */
  function path() { if (mob) return { a: [W * .02, 64], c: [W * .3, 88], b: [W * .58, 124], dur: 5.5 };
    return { a: [-W * .03, H * .07], c: [W * .2, H * .1], b: [W * .44, H * .25], dur: 7.5 }; }
  function bez(P, u) { var m = 1 - u; return [m * m * P.a[0] + 2 * m * u * P.c[0] + u * u * P.b[0], m * m * P.a[1] + 2 * m * u * P.c[1] + u * u * P.b[1]]; }
  function ease(u) { return clamp(u - .06 * Math.sin(2 * Math.PI * u), 0, 1); }
  /* One path, one timing: the head sits at e(u) on the path, and the tail is the same path sampled backwards from e, the
     stretch it has just travelled. So it always starts at the nucleus and curves with the path, with no offset, lag or gap. */
  function drawComet(u) {
    var P = path(), e = ease(clamp(u, 0, 1)), env = Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 1.6), sc = .85 + .25 * e; if (env <= .002) return;
    var p = bez(P, e), span = mob ? .2 : .17, N = 40, T = [];
    for (var i = 0; i <= N; i++) { var ee = e - span * i / N; if (ee < 0) break; T.push(bez(P, ee)); }
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round'; x.lineJoin = 'round';
    var n = T.length; if (n > 1) {
      /* normals along the tail, for the streaks spreading slightly behind the head */
      var nrm = T.map(function (pt, k) { var a2 = T[Math.max(0, k - 1)], b2 = T[Math.min(n - 1, k + 1)], dx = b2[0] - a2[0], dy = b2[1] - a2[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
      var line = function (off, w, rgb, a0, pw) { for (var k = 1; k < n; k++) { var f0 = (k - 1) / N, f1 = k / N, s0 = off * f0 * f0 * 26 * sc, s1 = off * f1 * f1 * 26 * sc, al = a0 * Math.pow(1 - f1, pw) * env; if (al < .003) break;
          x.globalAlpha = al; x.strokeStyle = 'rgb(' + rgb + ')'; x.lineWidth = Math.max(.35, w * (1 - .55 * f1) * sc);
          x.beginPath(); x.moveTo(T[k - 1][0] + nrm[k - 1][0] * s0, T[k - 1][1] + nrm[k - 1][1] * s0); x.lineTo(T[k][0] + nrm[k][0] * s1, T[k][1] + nrm[k][1] * s1); x.stroke(); } };
      /* broad soft body, brightest at the head */
      line(0, 7, '255,236,214', .07, 1.6); line(0, 3.6, '255,240,222', .12, 1.8);
      /* fine streaks inside it, spreading a little */
      [-1, -.6, -.3, .3, .6, 1].forEach(function (o, k) { line(o, .55, '255,242,226', .1 + .03 * (k % 2), 1.4); });
      /* a faint bluish inner streak along the same line */
      line(0, .9, '160,204,255', .22, 2.2);
    }
    var cr = 9 * sc, cg = x.createRadialGradient(p[0], p[1], 0, p[0], p[1], cr); cg.addColorStop(0, 'rgba(230,246,250,' + .55 * env + ')'); cg.addColorStop(.35, 'rgba(206,236,244,' + .16 * env + ')'); cg.addColorStop(1, 'rgba(206,236,244,0)');
    x.globalAlpha = 1; x.fillStyle = cg; x.fillRect(p[0] - cr, p[1] - cr, cr * 2, cr * 2);
    star(x, p[0], p[1], .55, .8, [244, 248, 255], env);
    x.restore();
  }
  function frame(now) {
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.drawImage(base, 0, 0); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    var red = mqR.matches, t = now / 1000;
    x.globalCompositeOperation = 'lighter';
    TW.forEach(function (s) { star(x, s.x, s.y, s.b, s.soft, s.c, red ? 1 : .9 + .1 * Math.sin(t * 2 * Math.PI / s.per + s.f)); });
    x.globalCompositeOperation = 'source-over';
    if (red) return;
    if (!comet && now >= nextAt) comet = { t0: now, dur: path().dur * 1000 };
    if (comet) { var u = (now - comet.t0) / comet.dur; if (u >= 1) { comet = null; nextAt = now + 15000 + Math.random() * 15000; } else drawComet(u); }
    schedule();
  }
  /* one pending frame at a time: a requestAnimationFrame raced against a 100ms timer, whichever fires first */
  function schedule() {
    if (pending || document.hidden) return; pending = true;
    var done = false, tm = 0, go = function () { if (done) return; done = true; clearTimeout(tm); pending = false; tick(); };
    requestAnimationFrame(go); tm = setTimeout(go, 100);
  }
  function tick() { var now = performance.now(); if (now - last < (comet ? 33 : 66)) { schedule(); return; } last = now; frame(now); }

  /* ================= the constellation: the missing star ================= */
  var lv, lx, ldpr, lseed = 29, LSPR = {}, FIELD = [], CON = [], MISS = null;
  function lrnd() { lseed = (lseed * 16807) % 2147483647; return lseed / 2147483647; }
  var LTEMP = [[178, 204, 255], [214, 228, 255], [244, 246, 255], [255, 244, 228], [255, 222, 180]];
  function ltemp() { var r = lrnd(); return LTEMP[r < .16 ? 0 : r < .4 ? 1 : r < .72 ? 2 : r < .9 ? 3 : 4]; }
  /* its own point-spread sprite: core plus a wide faint halo, rendered once per colour */
  function lpsf(c) { var k = c.join(','); if (LSPR[k]) return LSPR[k]; var s = 64, m = s / 2, cvs = document.createElement('canvas'); cvs.width = cvs.height = s; var g = cvs.getContext('2d');
    var w = g.createRadialGradient(m, m, 0, m, m, m); w.addColorStop(0, 'rgba(' + k + ',.22)'); w.addColorStop(.25, 'rgba(' + k + ',.06)'); w.addColorStop(.6, 'rgba(' + k + ',.012)'); w.addColorStop(1, 'rgba(' + k + ',0)'); g.fillStyle = w; g.fillRect(0, 0, s, s);
    var cr = g.createRadialGradient(m, m, 0, m, m, m * .16); cr.addColorStop(0, 'rgba(255,255,255,1)'); cr.addColorStop(.35, 'rgba(' + k + ',.85)'); cr.addColorStop(1, 'rgba(' + k + ',0)'); g.fillStyle = cr; g.fillRect(0, 0, s, s);
    return (LSPR[k] = cvs); }
  function lstar(px, py, b, soft, c, a) { /* b: brightness 0..1, soft: 1 sharp .. 1.6 near/soft */ var d = (6 + 34 * Math.pow(b, 1.4)) * soft; lx.globalAlpha = Math.min(1, a * (.35 + .65 * b)); lx.drawImage(lpsf(c), px - d / 2, py - d / 2, d, d); }
  function region() { if (mob) return { x: W - 176, y: 76, s: 150 }; var s = Math.min(340, W * .22); return { x: W * .62, y: H * .1, s: s }; }
  function lbuild() {
    lseed = 29; FIELD = []; CON = [];
    var S = region();
    /* the constellation, in region units: irregular, six stars, the seventh missing. The second random number of each
       star (its twinkle period in the prototype) is still drawn, so every star keeps its place in the sequence. */
    var P = [[.04, .62, .52], [.2, .5, .78], [.33, .58, .44], [.47, .31, .66], [.61, .38, .5], [.74, .16, .7]];
    CON = P.map(function (p, i) { var o = { u: p[0], v: p[1], b: p[2], c: [LTEMP[2], LTEMP[3], LTEMP[1], LTEMP[4], LTEMP[2], LTEMP[0]][i], f: lrnd() * 6.28 }; lrnd(); return o; });
    MISS = { u: .93, v: .34 };
    var n = mob ? 70 : 120;
    for (var i = 0; i < n; i++) { var u = lrnd() * 1.3 - .15, v = lrnd() * 1.1 - .2, du = (u - MISS.u) * S.s, dv = (v - MISS.v) * S.s;
      if (Math.hypot(du, dv) < (mob ? 22 : 30)) continue; var z = lrnd(), b = Math.pow(lrnd(), 3.2) * (z > .9 ? .5 : .3);
      var o = { u: u, v: v, b: b, soft: z > .9 ? 1.45 : z > .5 ? 1.1 : .85, z: z, c: ltemp(), f: lrnd() * 6.28 }; lrnd(); FIELD.push(o); }
  }
  /* the frozen frame (the prototype's t = 0): each star at .86 + .14·sin(phase), lines at 2.5%, afterglow at 80% */
  function ldraw() {
    lx.setTransform(ldpr, 0, 0, ldpr, 0, 0); lx.clearRect(0, 0, W, H);
    var R = region(), at = function (o) { return [R.x + o.u * R.s, R.y + o.v * R.s]; };
    var tw = function (o) { return .86 + .14 * Math.sin(o.f); };
    /* slight emptiness: soften the scene's own stars beneath the missing spot */
    var m = at(MISS), er = mob ? 26 : 36, eg = lx.createRadialGradient(m[0], m[1], 0, m[0], m[1], er);
    eg.addColorStop(0, 'rgba(2,6,12,.34)'); eg.addColorStop(.45, 'rgba(2,6,12,.2)'); eg.addColorStop(.8, 'rgba(2,6,12,.06)'); eg.addColorStop(1, 'rgba(2,6,12,0)');
    lx.globalCompositeOperation = 'source-over'; lx.globalAlpha = 1; lx.fillStyle = eg; lx.fillRect(m[0] - er, m[1] - er, er * 2, er * 2);
    lx.globalCompositeOperation = 'lighter';
    FIELD.forEach(function (o) { var p = at(o); lstar(p[0], p[1], o.b, o.soft, o.c, tw(o)); });
    var pts = CON.map(at);
    /* overlay lines, as on astronomy photographs: 0.5px, broken 7px short of every star; the last stops halfway to the spot */
    var la = .025; lx.globalAlpha = la; lx.strokeStyle = 'rgb(206,232,240)'; lx.lineWidth = .5; lx.lineCap = 'butt';
    var seg = function (a, b, endGap) { var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), g0 = 7 / L, g1 = (endGap == null ? 7 : endGap) / L; if (g0 + g1 >= 1) return; lx.beginPath(); lx.moveTo(a[0] + dx * g0, a[1] + dy * g0); lx.lineTo(b[0] - dx * g1, b[1] - dy * g1); lx.stroke(); };
    for (var i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i]);
    var lastPt = pts[pts.length - 1], g2 = Math.hypot(m[0] - lastPt[0], m[1] - lastPt[1]) * .45; lx.globalAlpha = la * .7; seg(lastPt, m, g2);
    CON.forEach(function (o, i) { lstar(pts[i][0], pts[i][1], o.b, 1, o.c, tw(o)); });
    /* the faint afterglow where the star should be */
    var ag = lx.createRadialGradient(m[0], m[1], 0, m[0], m[1], 9); ag.addColorStop(0, 'rgba(255,226,190,.035)'); ag.addColorStop(1, 'rgba(255,226,190,0)');
    lx.globalAlpha = .8; lx.fillStyle = ag; lx.fillRect(m[0] - 9, m[1] - 9, 18, 18);
    lx.globalAlpha = 1; lx.globalCompositeOperation = 'source-over';
  }

  /* ================= shared: size, start ================= */
  /* rebuilds both layers, only when the viewport (or its pixel ratio, or the phone switch) changed */
  var sized = false;
  function size() {
    var w = innerWidth, h = innerHeight, m = mqM.matches, r = devicePixelRatio || 1;
    if (sized && w === W && h === H && m === mob && Math.min(r, 2) === dpr) return false;
    sized = true; W = w; H = h; mob = m; dpr = Math.min(r, 2); ldpr = Math.min(r, mob ? 1.5 : 2);
    if (x) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); buildBase(); }
    if (lx) { lv.width = Math.round(W * ldpr); lv.height = Math.round(H * ldpr); lbuild(); ldraw(); }
    return true;
  }
  function start() {
    if (!document.querySelector('main.nf')) return;
    cv = document.createElement('canvas'); cv.className = 'nf-field'; cv.setAttribute('aria-hidden', 'true');
    lv = document.createElement('canvas'); lv.className = 'nf-lost'; lv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(lv, document.body.firstChild); document.body.insertBefore(cv, lv);
    x = cv.getContext('2d'); lx = lv.getContext('2d'); if (!x && !lx) return; /* no 2D canvas: the plain base shows */
    size(); var rt = 0; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (size() && x) frame(performance.now()); }, 120); });
    if (!x) return;
    nextAt = performance.now() + 4000; frame(performance.now());
    document.addEventListener('visibilitychange', function () { if (!document.hidden) frame(performance.now()); });
    if (mqR.addEventListener) mqR.addEventListener('change', function () { frame(performance.now()); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
