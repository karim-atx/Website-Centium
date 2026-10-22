/* Atraxia website: the Blog and article backdrop, a lighter build of the
   landing scene (scene.js). Blog and article only.

   The reference build loaded the whole landing page in an iframe in "scene
   mode" (index.r26.html?scene=blog|article) and parked it. What that parked
   frame actually renders was read back from its WebGL state (uniforms, see
   design-handover/atraxia/B1.md) and is reproduced here directly: only the
   Reach out beacon (7) and the drifting footer field (8) formations are
   compiled, at the reference quality (medium on desktop, low on phones),
   with time running at 45% on the Blog and 30% on articles, where the canvas
   is also dimmed to 55%. If the scene cannot start (no WebGL, a failed
   compile, a lost context) or has not drawn within 10s, the still image of
   the same scene is shown instead (html.sc-still). */
(function () {
  'use strict';
  var de = document.documentElement;
  var Atx = window.Atx, AtxScene = window.AtxScene;
  var sky = document.querySelector('.sl-sky');
  if (!sky || !Atx || !AtxScene) { de.classList.add('sc-still'); return; }

  var article = de.classList.contains('sl-post');
  var K = article ? 0.3 : 0.45;
  /* the parked state, as read from the reference frame (desktop 1440x900 at
     q=medium; phone 390x844 at q=low) */
  var PARK = {
    desktop: { uW7: 0.3935, uW8: 0.6065, uAlpha: 0.7625, uCamT: [0, 0.0567], uDolly: 0.8029, px: 1.25, quality: 'medium' },
    mobile: { uW7: 0.4218, uW8: 0.5782, uAlpha: 0.7668, uCamT: [0, 0.0582], uDolly: 0.5335, px: 1.05, quality: 'low' }
  };
  /* reduced motion: the reference settles on the footer field alone, still */
  var REDUCED = { uW7: 0, uW8: 1, uAlpha: 0.702, uCamT: [0, 0], uDolly: 0 };

  var cv = document.createElement('canvas');
  cv.className = 'sc-canvas';
  cv.setAttribute('aria-hidden', 'true');
  sky.appendChild(cv);

  var scene = AtxScene.create(cv, { formations: [7, 8] });
  var stopped = false, drawn = false, raf = 0, t0 = performance.now(), built = '', mob = false, quality = 'medium';
  function still() {
    stopped = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    de.classList.remove('sc-live');
    de.classList.add('sc-still');
  }
  if (!scene) { still(); return; }
  scene.onLost = still;
  var startTimer = setTimeout(function () { if (!drawn) still(); }, 10000);

  function asp() { return (document.documentElement.clientWidth || innerWidth) / (innerHeight || 1); }
  function rebuild() {
    mob = Atx.mobile();
    var p = mob ? PARK.mobile : PARK.desktop;
    /* follow the governor down, never above the reference quality */
    var order = ['low', 'medium', 'high'];
    quality = order[Math.min(order.indexOf(p.quality), order.indexOf(Atx.quality))];
    var key = quality + ':' + mob + ':' + asp().toFixed(3);
    if (key === built) return;
    built = key;
    scene.build(quality, { asp: asp(), mob: mob });
  }

  function frame(now) {
    raf = 0;
    if (stopped) return;
    var red = Atx.reduced(), p = mob ? PARK.mobile : PARK.desktop, s = red ? REDUCED : p, a = asp();
    var dpr = Math.min(window.devicePixelRatio || 1, AtxScene.QUAL[quality].dpr);
    var ok = scene.draw({
      uW7: s.uW7, uW8: s.uW8,
      uT: red ? 8 : (now - t0) / 1000 * K,
      uAsp: a, uD: 3, uPx: dpr * p.px,
      uAlpha: s.uAlpha, uDrift: 0,
      uCam: [0, 0], uCamT: s.uCamT, uDolly: s.uDolly,
      /* in the parked frame Reach out is removed, so its beacon sits at the
         top-left corner with no radius */
      uBc: [-a, 1], uBtn: [-a, 1], uBR: 0
    }, dpr);
    if (ok && !drawn) { drawn = true; clearTimeout(startTimer); de.classList.add('sc-live'); }
    if (!red && !document.hidden) schedule();
  }
  function schedule() { if (!raf && !stopped) raf = requestAnimationFrame(frame); }

  var rsT = 0, lastW = document.documentElement.clientWidth, lastH = innerHeight;
  addEventListener('resize', function () {
    clearTimeout(rsT);
    rsT = setTimeout(function () {
      var w = document.documentElement.clientWidth;
      if (Math.abs(w - lastW) > 2 || Math.abs(innerHeight - lastH) > 2) { lastW = w; lastH = innerHeight; rebuild(); }
      schedule();
    }, 160);
  }, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  Atx.onKick(schedule);
  Atx.onQuality(function () { rebuild(); schedule(); });
  if (Atx.mqReduced.addEventListener) Atx.mqReduced.addEventListener('change', schedule);
  if (Atx.mqMobile.addEventListener) Atx.mqMobile.addEventListener('change', function () { rebuild(); schedule(); });

  rebuild();
  schedule();
})();
