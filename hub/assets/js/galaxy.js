/* Atraxia website: the hero intro galaxy (HE1 v8, TR1, TR2). Landing page only.

   Ported from source/index.r26.html (the __atxIntro script, shaders 01 to 06
   in the handover's assets/shaders): raw WebGL1, no library. A density-wave
   spiral galaxy (bulge, old and young discs, star-forming knots, halo,
   globular clusters, foreground and background stars, dust) is rendered
   through a star pass, a nebula pass, a two-pass bloom and a composite. A
   virtual camera is driven by scroll: every visual is a pure function of the
   intro progress p (scroll through the pinned hero) and the handoff h (the
   scroll right after it, TR2), plus ambient time, so it scrubs and reverses.

   Not shipped from the reference: the ?q=, ?nogl, ?ix= and ?noloader review
   flags, the board's setReduced override, and the DOM writes to layers the
   reference had already hidden for good (the hero wordmark and the veil,
   display: none; .ix-tint, held at .45 by an !important rule). Without
   WebGL (or on a shader error or context loss) the hero shows its still
   galaxy (.gx-still) and the copy, with no pin.

   Added (not in the reference): keyboard focus on the hero copy or the
   header while the intro is still opening settles the intro, so a focused
   link is never invisible. */
(function () {
  'use strict';
  var Atx = window.Atx;
  var root = document.documentElement, pin = document.getElementById('intro');
  if (!Atx || !pin || Atx.intro) return;
  root.classList.add('ix-js');
  var hero = pin.querySelector('.hero'), cv = hero.querySelector('.gx-gl');
  var scrim = hero.querySelector('.hs-scrim'), deep = hero.querySelector('.ix-deep'), cue = hero.querySelector('.ix-cue');
  var cp = hero.querySelector('.hs-copy'), stg = hero.querySelector('.hs-stage');
  var nav = document.querySelector('.nav');
  var mqR = Atx.mqReduced, mqM = Atx.mqMobile;
  function reduced() { return mqR.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function win(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function eoc(t) { return 1 - Math.pow(1 - t, 3); }
  function eio(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function eis(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

  /* Round 11: the journey is pulled up by the hero's height plus the handoff,
     measured, so Philosophy's stage is already pinned under the hero for the
     whole handoff and nothing moves vertically while the hero dissolves */
  function fit() {
    var J = document.getElementById('journey'); if (!J) return;
    if (root.classList.contains('ix-reduced')) { J.style.marginTop = ''; return; }
    var hd = pin.querySelector('.ix-hand');
    J.style.marginTop = -(hero.offsetHeight + (hd ? hd.offsetHeight : 0)) + 'px';
  }
  addEventListener('resize', fit, { passive: true });
  addEventListener('load', fit);

  /* ---------- still fallback: no WebGL ---------- */
  function still(why) {
    root.classList.remove('gx-on');
    root.classList.add('gx-lost', 'ix-reduced');
    if (nav) { nav.style.opacity = ''; nav.style.pointerEvents = ''; }
    Atx.intro = { progress: 1, handoff: 0, phase: why, quality: 'none', length: 0, reduced: true, scrollTo: function () {}, handTo: function () {} };
    Atx.introLength = function () { return 0; };
    fit();
    if (Atx.refreshHeader) Atx.refreshHeader();
  }

  /* ---------- quality budgets (HANDOVER g) ---------- */
  var QUAL = {
    high:   { d: { n: 110000, neb: 56, dpr: 1.5, bloom: .5,  dof: 1, ca: 1, fps: 60 }, m: { n: 48000, neb: 28, dpr: 1.5, bloom: .35, dof: 0, ca: 1, fps: 60 } },
    medium: { d: { n: 65000,  neb: 40, dpr: 1.25, bloom: .35, dof: 1, ca: 1, fps: 60 }, m: { n: 30000, neb: 20, dpr: 1.25, bloom: .25, dof: 0, ca: 0, fps: 60 } },
    low:    { d: { n: 28000,  neb: 18, dpr: 1,   bloom: .25, dof: 0, ca: 0, fps: 60 }, m: { n: 15000, neb: 10, dpr: 1,    bloom: .25, dof: 0, ca: 0, fps: 30 } }
  };
  var qName = QUAL[Atx.quality] ? Atx.quality : 'medium';

  /* ---------- WebGL ---------- */
  var gl = null;
  try { gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' }); } catch { gl = null; }
  if (!gl) { still('No WebGL · still fallback'); return; }
  root.classList.add('gx-on');

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function prog(vs, fs) {
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p: p, u: u };
  }

  /* shaders 01 STAR_VS, 02 STAR_FS, 03 NEB_VS, 04 NEB_FS, 05 BLUR_FS, 06 COMP_FS (literal) */
  var STAR_VS = [
    'attribute vec4 aA; attribute vec4 aB;',
    'uniform mat4 uVP, uPVP; uniform vec2 uShift, uPShift, uRes, uPtr;',
    'uniform float uTime, uSpin, uDiff, uProjK, uFocus, uDof, uStreak, uMaxPt, uPtrK, uBright, uDust, uTwist, uPat;',
    'varying vec3 vCol; varying float vA; varying vec2 vDir; varying float vLen; varying float vSize; varying float vEl;',
    'float qOf(float a){ float q = mix(1.0, 0.70, smoothstep(0.0, 0.10, a)); q = mix(q, 0.86, smoothstep(0.10, 0.95, a)); return mix(q, 1.0, smoothstep(1.05, 1.4, a)); }',
    'void main(){',
    '  float typ = floor(aB.w + 0.0005); float sd = fract(aB.w); float a = aA.x; vec3 p; float armK = 1.0;',
    '  bool disc = typ < 0.5 || (typ > 2.5 && typ < 5.5);',
    '  if (disc) {',
    '    float q = qOf(a); float phi = -uTwist*a + uTime*uPat;',
    '    float om = typ > 3.5 ? 0.0 : (uSpin + uDiff/(a+0.25)) - uPat;',
    '    float e = aA.y + uTime*om; float lx = cos(e)*a, lz = sin(e)*a*q; float cp = cos(phi), sp = sin(phi);',
    '    p = vec3(lx*cp - lz*sp, aA.z, lx*sp + lz*cp);',
    '    float br = (typ > 2.5 && typ < 3.5 && sd > 0.85) ? 1.5708 : 0.0;',
    '    float d = mod(atan(lz, lx) - 0.7854 - br + 1.5708, 3.14159) - 1.5708;',
    '    armK = mix(1.0, 0.7*exp(-d*d/0.95) + 0.3*exp(-d*d/0.22), smoothstep(0.1, 0.3, a)) * (br > 0.0 ? 0.5 : 1.0);',
    '  } else { float th = aA.y + (typ < 1.5 ? uTime*0.004 : 0.0); p = vec3(cos(th)*a, aA.z, sin(th)*a); }',
    '  vec4 c = uVP*vec4(p,1.0); vec4 q2 = uPVP*vec4(p,1.0);',
    '  c.xy += uShift*c.w; q2.xy += uPShift*q2.w;',
    '  if (c.w < 0.02) { gl_Position = vec4(2.0,2.0,2.0,1.0); gl_PointSize = 0.0; return; }',
    '  vec2 n = c.xy/c.w; vec2 np = q2.w > 0.02 ? q2.xy/q2.w : n;',
    '  vec2 dpx = (n-np)*0.5*uRes;',
    '  float len = min(length(dpx)*uStreak, 0.6*uMaxPt);',
    '  vec2 dir = length(dpx) > 0.001 ? normalize(dpx) : vec2(1.0,0.0);',
    '  vEl = 0.0;',
    '  if (typ > 4.5 && typ < 5.5) { float ps = atan(p.z, p.x), rr = length(p.xz); vec3 T = normalize(vec3(cos(ps)+rr*uTwist*sin(ps), 0.0, sin(ps)-rr*uTwist*cos(ps)));',
    '    vec4 c2 = uVP*vec4(p+T*0.03,1.0); c2.xy += uShift*c2.w; vec2 dd = (c2.xy/max(c2.w,0.02)-n)*uRes; dir = length(dd) > 0.001 ? normalize(dd) : vec2(1.0,0.0); vEl = 0.32 + 0.2*fract(sd*5.3); len = 0.0; }',
    '  if (typ > 1.5 && typ < 2.5) { float an = sd*6.2831; dir = vec2(cos(an), sin(an)); vEl = 0.22 + 0.6*fract(sd*13.7); len = 0.0; }',
    '  vec2 spx = (n*0.5+0.5)*uRes; vec2 d2 = spx-uPtr; float push = uPtrK*exp(-dot(d2,d2)/(2.0*120.0*120.0));',
    '  spx += (d2/max(length(d2),1.0))*push*22.0;',
    '  spx -= dir*len*0.5; n = spx/uRes*2.0-1.0;',
    '  float base = aA.w*uProjK/c.w*((typ > 2.5 && typ < 3.5) ? 0.75 + 0.6*armK : 1.0);',
    '  float coc = uDof*abs(c.w-uFocus)/c.w*5.0;',
    '  float farK = disc ? clamp((c.w - uFocus)/(0.6*uFocus + 0.4), 0.0, 1.0) : 0.0;',
    '  float size = clamp(max(base,1.1)+coc+farK*1.3, 1.0, uMaxPt-len);',
    '  float tw = 0.72+0.28*sin(uTime*(1.2+fract(sd*7.31)*2.6)+sd*6.2831); if (vEl > 0.0) tw = 1.0;',
    '  float energy = clamp((base*base)/(size*size), 0.035, 1.0);',
    '  float bK = typ < 0.5 ? 0.42+1.0*armK : (typ > 2.5 && typ < 3.5) ? 0.06+1.9*pow(armK, 1.15) : 1.0;',
    '  float nearFade = smoothstep(0.03, 0.16, c.w);',
    '  vA = tw*energy*nearFade*uBright*bK*(1.0-0.34*farK); vCol = aB.rgb;',
    '  if (uDust > 0.5) { vA = aB.r*nearFade*uBright*clamp(base/size*1.6, 0.25, 1.0)*mix(0.3, 1.0, smoothstep(0.9, 2.6, c.w)); vCol = vec3(0.010,0.007,0.005); }',
    '  vDir = dir; vLen = len; vSize = size;',
    '  gl_Position = vec4(n, 0.0, 1.0); gl_PointSize = size+len;',
    '}'].join('\n');
  var STAR_FS = [
    'precision highp float;',
    'varying vec3 vCol; varying float vA; varying vec2 vDir; varying float vLen; varying float vSize; varying float vEl;',
    'void main(){',
    '  vec2 q = (gl_PointCoord-0.5)*vec2(1.0,-1.0)*(vSize+vLen); float rad = vSize*0.5; float f;',
    '  if (vEl > 0.0) { float al = dot(q, vDir), pe = dot(q, vec2(-vDir.y, vDir.x))/vEl;',
    '    f = 0.7*exp(-(al*al+pe*pe)/(rad*rad*0.3)) + 0.45*exp(-dot(q,q)/(rad*rad*0.03)); }',
    '  else { vec2 a = -vDir*vLen*0.5; vec2 ba = vDir*vLen; vec2 pa = q-a;',
    '    float h = clamp(dot(pa,ba)/max(dot(ba,ba),0.0001), 0.0, 1.0);',
    '    float dist = length(pa-ba*h);',
    '    f = exp(-dist*dist/(rad*rad*0.32)); if (vLen > 0.5) f *= 0.3+0.7*h; }',
    '  f = min(f, 1.0)*vA; gl_FragColor = vec4(vCol*f, f);',
    '}'].join('\n');
  var NEB_VS = [
    'attribute vec4 aC; attribute vec4 aK;',
    'uniform mat4 uV, uP; uniform vec2 uShift; uniform float uTime, uSpin;',
    'varying vec2 vUv; varying float vPh; varying float vMix; varying float vLight;',
    'void main(){',
    '  float r = aC.x; float th = aC.y + uTime*uSpin*0.8;',
    '  vec4 v = uV*vec4(cos(th)*r, aC.z, sin(th)*r, 1.0);',
    '  float s = aC.w*(0.92+0.08*sin(uTime*0.25+aK.z*6.2831));',
    '  v.xy += aK.xy*s;',
    '  vec4 c = uP*v; c.xy += uShift*c.w; gl_Position = c;',
    '  vUv = aK.xy; vPh = aK.z; vMix = aK.w; vLight = 1.0/(r+0.45);',
    '}'].join('\n');
  var NEB_FS = [
    'precision highp float;',
    'varying vec2 vUv; varying float vPh; varying float vMix; varying float vLight;',
    'uniform float uTime, uNebK;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
    'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }',
    'float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }',
    'void main(){',
    '  float d = length(vUv); if (d > 1.0) discard;',
    '  if (vMix > 1.5) { float gg = exp(-d*d*(vMix > 3.5 ? 2.4 : 5.5)); vec3 cc = vMix < 2.5 ? vec3(1.0,0.80,0.52) : vMix < 3.5 ? vec3(1.0,0.48,0.64) : vMix < 4.5 ? vec3(0.60,0.72,0.92) : vec3(0.66,0.78,1.0); float aa = gg*(1.0-d)*uNebK*(vMix < 2.5 ? 0.7 : vMix < 3.5 ? 0.6 : vMix < 4.5 ? 0.09 : 0.085); gl_FragColor = vec4(cc*aa, aa*0.6); return; }',
    '  vec2 w = vUv*1.6 + vec2(vPh*13.0, vPh*7.0) + vec2(uTime*0.012, -uTime*0.008);',
    '  float n = fbm(w + fbm(w*1.7)*0.8);',
    '  float fall = pow(1.0-d, 1.8);',
    '  float breathe = 0.86+0.14*sin(uTime*0.3+vPh*6.2831);',
    '  vec3 violet = vec3(0.22,0.32,0.66), teal = vec3(0.16,0.55,0.66);',
    '  vec3 col = mix(violet, teal, vMix)*(0.55+vLight*0.55);',
    '  float a = smoothstep(0.35, 0.95, n)*fall*breathe*uNebK*0.55;',
    '  gl_FragColor = vec4(col*a, a*0.6);',
    '}'].join('\n');
  var QUAD_VS = 'attribute vec2 aP; varying vec2 vUv; void main(){ vUv = aP*0.5+0.5; gl_Position = vec4(aP,0.0,1.0); }';
  var BLUR_FS = [
    'precision highp float; varying vec2 vUv; uniform sampler2D uT; uniform vec2 uD;',
    'void main(){ vec3 s = texture2D(uT,vUv).rgb*0.227;',
    '  s += (texture2D(uT,vUv+uD*1.384).rgb + texture2D(uT,vUv-uD*1.384).rgb)*0.316;',
    '  s += (texture2D(uT,vUv+uD*3.231).rgb + texture2D(uT,vUv-uD*3.231).rgb)*0.070;',
    '  gl_FragColor = vec4(s,1.0); }'].join('\n');
  var COMP_FS = [
    'precision highp float; varying vec2 vUv;',
    'uniform sampler2D uS, uB; uniform vec2 uRes, uC; uniform float uBloomK, uCA, uTime, uGrain, uRingR, uRingA;',
    'void main(){',
    '  vec2 px = vUv*uRes; vec2 dc = px-uC; float dl = length(dc);',
    '  float ring = uRingA*exp(-pow((dl-uRingR)/(uRes.y*0.045), 2.0));',
    '  vec2 uv = vUv - (dc/max(dl,1.0))/uRes*ring*14.0;',
    '  vec2 off = (uv-uC/uRes)*uCA;',
    '  vec3 col = vec3(texture2D(uS,uv+off).r, texture2D(uS,uv).g, texture2D(uS,uv-off).b);',
    '  col += texture2D(uB,uv).rgb*uBloomK;',
    '  col += vec3(0.62,0.92,1.0)*ring*0.42;',
    '  float g = fract(sin(dot(px+fract(uTime)*97.0, vec2(12.9898,78.233)))*43758.5453)-0.5;',
    '  col = 1.0-exp(-col*1.35);',
    '  col += g*uGrain*(0.15+col);',
    '  col = clamp(col, 0.0, 1.0);',
    '  float a = clamp(max(col.r, max(col.g, col.b))*1.08, 0.0, 1.0);',
    '  gl_FragColor = vec4(col, a);',
    '}'].join('\n');

  var P_STAR, P_NEB, P_BLUR, P_COMP;
  try { P_STAR = prog(STAR_VS, STAR_FS); P_NEB = prog(NEB_VS, NEB_FS); P_BLUR = prog(QUAD_VS, BLUR_FS); P_COMP = prog(QUAD_VS, COMP_FS); }
  catch (err) { console.warn('[galaxy] shader error', err); still('Shader error · still fallback'); return; }
  var MAXPT = Math.min(128, gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64);

  var quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  /* ---------- the galaxy ---------- */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var starBuf = gl.createBuffer(), nebBuf = gl.createBuffer(), dustBuf = gl.createBuffer(), starCount = 0, nebVerts = 0, dustCount = 0;
  /* HE1 v6: density-wave galaxy. Every disc star rides an ellipse; each ellipse
     is a little larger and turned a little further (-GX.tw rad per unit radius)
     than the one inside it, so the two arms appear where the orbits crowd. The
     ellipses turn slowly as a pattern (GX.pat) while the stars run round them
     faster near the centre, so stars stream through arms that hold shape. */
  var GX = { spin: .02, diff: .02, tw: 5.2, pat: .02 };
  function sst(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function qOf(a) { var q = lerp(1, .70, sst(0, .1, a)); q = lerp(q, .86, sst(.1, .95, a)); return lerp(q, 1, sst(1.05, 1.4, a)); }
  function crestE(a, side, jit) { var al = Math.PI / 4 + side * Math.PI + jit; return Math.atan2(Math.sin(al), qOf(a) * Math.cos(al)); }
  function world(a, e) { var q = qOf(a), lx = Math.cos(e) * a, lz = Math.sin(e) * a * q, ph = -GX.tw * a, x = lx * Math.cos(ph) - lz * Math.sin(ph), z = lx * Math.sin(ph) + lz * Math.cos(ph); return [Math.hypot(x, z), Math.atan2(z, x)]; }
  function build(Q) {
    var r = rng(20261021), N = Q.n, A = new Float32Array(N * 8), k = 0, sc = N / 65000;
    function g() { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }
    function put(rad, th, y, size, cr, cg, cb, typ) { if (k >= N) return; var o = k * 8; A[o] = rad; A[o + 1] = th; A[o + 2] = y; A[o + 3] = size; A[o + 4] = cr; A[o + 5] = cg; A[o + 6] = cb; A[o + 7] = typ + Math.min(.995, r()); k++; }
    function sphere(rmin, rmax) { var d = rmin + r() * (rmax - rmin), cz = r() * 2 - 1, rr = d * Math.sqrt(1 - cz * cz); return [rr, r() * 6.2832, d * cz]; }
    var i, j, br, m;
    /* bulge: dense, golden, slightly elongated (the inner ellipses are flattest, so it reads as a short bar) */
    var nB = N * .24 | 0;
    for (i = 0; i < nB; i++) {
      var bar = r() < .28, R3 = bar ? Math.min(.16, Math.abs(g()) * .06) : Math.min(.5, -Math.log(1 - r() * .995) * .082 + Math.abs(g()) * .01), cz = r() * 2 - 1, ab = bar ? Math.max(.004, R3) : Math.max(.004, R3 * Math.sqrt(1 - cz * cz));
      br = (.6 + r() * .5) * (bar ? .9 : 1.7) * (1.12 - .55 * sst(0, .42, R3)); var rg = r() < .07;
      put(ab, r() * 6.2832, bar ? g() * .035 : R3 * cz * .8, (rg ? .0048 : .0032) + r() * r() * .0045, br, (rg ? .6 : .86 + r() * .07) * br, (rg ? .38 : .62 + r() * .14) * br, bar ? 0 : 1);
    }
    /* old disc: exponential, warm white, a few red and orange giants */
    var nO = N * .33 | 0;
    for (i = 0; i < nO; i++) {
      var ao = .04 + Math.min(1.35, -Math.log(1 - r() * .985) * .3), tt = clamp(ao / 1.2, 0, 1), cr, cg, cb; br = .32 + r() * .48;
      if (tt < .4) { m = tt / .4; cr = 1; cg = lerp(.9, .91, m); cb = lerp(.74, .86, m); } else { m = (tt - .4) / .6; cr = lerp(.94, .8, m); cg = lerp(.91, .86, m); cb = lerp(.86, .96, m); }
      var gi = r() < .04; if (gi) { cr = 1; cg = .62 + r() * .1; cb = .36 + r() * .08; br *= 1.25; }
      br *= (1 - .5 * sst(.55, 1.3, ao)) * (.35 + .65 * sst(.08, .42, ao));
      put(ao, r() * 6.2832, g() * (.005 + .062 * Math.exp(-ao * 2.5)), (gi ? .0045 : .0022) + Math.pow(r(), 3) * .005, cr * br, cg * br, cb * br, 0);
    }
    /* young blue-white stars: thin disc, lit as they pass through the arms */
    var nY = N * .27 | 0;
    for (i = 0; i < nY; i++) {
      var ay = .14 + Math.min(1.2, -Math.log(1 - r() * .98) * .34), oy = clamp((ay - .75) / .45, 0, 1); br = .55 + r() * .5;
      br *= 1 - .4 * sst(.7, 1.3, ay);
      put(ay, r() * 6.2832, g() * (.003 + .022 * Math.exp(-ay * 2.3)), .0026 + Math.pow(r(), 3) * .0068, lerp(.70, .5, oy) * br, lerp(.82, .84, oy) * br, lerp(1, .93, oy) * br, 3);
    }
    /* star-forming knots on the downstream edge of the arms, fixed to the pattern */
    var KN = Math.round(Q.neb * 1.6), knots = [], per = Math.max(12, (N * .05 / KN) | 0);
    for (i = 0; i < KN; i++) {
      var ak = .22 + Math.pow(r(), .85) * .88 + g() * .03, sk = r() < .5 ? 0 : 1, ek = crestE(ak, sk, .1 + g() * .32); knots.push([ak, ek]);
      var pk = r() < .4, nk = Math.round(per * (.4 + r() * 1.2));
      for (j = 0; j < nk; j++) { var pink = pk ? r() < .75 : r() < .15, b2 = .7 + r() * .5; put(Math.max(.05, ak + g() * .01), ek + g() * .016 / ak, g() * .003, .0032 + r() * .0042, (pink ? 1 : .72) * b2, (pink ? .52 : .85) * b2, (pink ? .68 : 1) * b2, 4); }
    }
    /* faint stellar halo */
    var nH = N * .05 | 0;
    for (i = 0; i < nH; i++) { var shp = sphere(.3, 2.1); br = .14 + r() * .22; put(shp[0], shp[1], shp[2] * .8, .003 + r() * .004, .92 * br, .86 * br, .78 * br, 1); }
    /* globular clusters */
    for (i = 0; i < 6; i++) {
      var gc = sphere(.45, 1.5), gx = Math.cos(gc[1]) * gc[0], gz = Math.sin(gc[1]) * gc[0], gy = gc[2] * .7, gn = Math.max(20, (N * .0016) | 0);
      for (j = 0; j < gn; j++) { var x = gx + g() * .011, z = gz + g() * .011, y = gy + g() * .011, b3 = .6 + r() * .4; put(Math.hypot(x, z), Math.atan2(z, x), y, .0026 + r() * .003, b3, .9 * b3, .72 * b3, 1); }
    }
    /* foreground stars */
    var nF = Math.max(8, N * .0003 | 0);
    for (i = 0; i < nF; i++) { var fs = sphere(1.7, 3.2), kf = r(); br = .8 + r() * .5; br *= .6; put(fs[0], fs[1], fs[2], .005 + r() * .004, (kf < .3 ? .78 : 1) * br, (kf < .3 ? .86 : kf < .7 ? .97 : .88) * br, (kf < .3 ? 1 : kf < .7 ? .94 : .7) * br, 1); }
    /* background: distant galaxies (elongated) and many faint stars on deep shells */
    var nG = Math.round(45 * sc);
    for (i = 0; i < nG; i++) { var bg = sphere(8, 14), warm = r() < .6; br = .12 + r() * .16; put(bg[0], bg[1], bg[2], .028 + r() * .05, (warm ? 1 : .72) * br, (warm ? .86 : .82) * br, (warm ? .68 : 1) * br, 2); }
    while (k < N) { var bs = sphere(6, 13), kb = r(); br = .2 + Math.pow(r(), 2) * .55; put(bs[0], bs[1], bs[2], .006 + r() * .009, (kb < .25 ? .8 : 1) * br, (kb < .25 ? .88 : kb < .6 ? .96 : .9) * br, (kb < .25 ? 1 : kb < .6 ? .94 : .8) * br, 6); }
    starCount = k;
    /* dust: dark wisps on the inner edge of each arm, a few feathers, faint dust between the arms */
    var nD = (N * .12) | 0, DA = new Float32Array(nD * 8), dd = 0;
    for (i = 0; i < nD; i++) {
      var od = dd * 8, kd = r(), ad, ed, op, sz;
      if (kd < .68) { var sd2 = r() < .5 ? 0 : 1; ad = .14 + Math.pow(r(), .8) * .95; ed = crestE(ad, sd2, -(.1 + Math.abs(g()) * .3)); op = (.09 + r() * .14) * (.35 + .65 * Math.abs(Math.sin(ad * 19 + sd2 * 2.1) * Math.sin(ad * 7.3 + 1.3))) * sst(.15, .3, ad) * (1 - sst(.95, 1.15, ad)); ad += g() * .03; sz = .026 + r() * .05; }
      else if (kd < .8) { ad = .2 + r() * .8; ed = crestE(ad, r() < .5 ? 0 : 1, -.1 - r() * .32); ad += .015 + r() * .05; op = .05 + r() * .07; sz = .012 + r() * .018; }
      else { ad = .15 + r() * 1.0; ed = r() * 6.2832; op = .07 + r() * .1; sz = .02 + r() * .03; }
      op *= (.12 + .88 * sst(.3, .62, ad)) * .6; sz *= 1 + .8 * (1 - sst(.3, .7, ad));
      DA[od] = ad; DA[od + 1] = ed; DA[od + 2] = g() * .026 * Math.exp(-ad * 1.5); DA[od + 3] = sz; DA[od + 4] = op; DA[od + 7] = 5 + Math.min(.995, r()); dd++;
    }
    dustCount = dd; gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf); gl.bufferData(gl.ARRAY_BUFFER, DA, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf); gl.bufferData(gl.ARRAY_BUFFER, A.subarray(0, k * 8), gl.STATIC_DRAW);
    /* soft glows: emission clouds along the arms, the core, the halo, and each star-forming knot */
    var M = Q.neb, KG = Math.min(knots.length, 70), V = new Float32Array((M + (M >> 1) + 6 + KG + 96) * 6 * 8), cn2 = [[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]], v = 0;
    function quad(rho, psi, yy, s, ph, mix) { for (var c = 0; c < 6; c++) { var o = v * 8; V[o] = rho; V[o + 1] = psi; V[o + 2] = yy; V[o + 3] = s; V[o + 4] = cn2[c][0]; V[o + 5] = cn2[c][1]; V[o + 6] = ph; V[o + 7] = mix; v++; } }
    for (i = 0; i < M; i++) { var an = .15 + Math.pow(r(), .8) * .95, w0 = world(an, crestE(an, r() < .5 ? 0 : 1, g() * .25)); quad(w0[0], w0[1], g() * .015, .07 + r() * .17, r(), clamp(an * .9 + g() * .2, 0, 1)); }
    for (i = 0; i < (M >> 1); i++) { var am = .25 + Math.pow(r(), .8) * .85, w2 = world(am, crestE(am, r() < .5 ? 0 : 1, 1.5708 + g() * .35)); quad(w2[0], w2[1], g() * .02, .1 + r() * .14, r(), .92); }
    for (i = 0; i < 96; i++) { var ah = .16 + (i >> 1) / 48 * 1.0, w3 = world(ah, crestE(ah, i & 1, g() * .12)); quad(w3[0], w3[1], g() * .01, .09 + ah * .14, r(), 5); }
    quad(0, 0, 0, .13, .3, 2); quad(0, 0, 0, .3, .6, 2); quad(0, 0, 0, .3, .9, 2); quad(0, 0, 0, .46, .2, 2); quad(0, 0, 0, .85, .5, 4); quad(0, 0, 0, 1.8, .9, 4);
    for (i = 0; i < KG; i++) { var w1 = world(knots[i][0], knots[i][1]); quad(w1[0], w1[1], 0, .022 + r() * .03, r(), 3); }
    nebVerts = v;
    gl.bindBuffer(gl.ARRAY_BUFFER, nebBuf); gl.bufferData(gl.ARRAY_BUFFER, V.subarray(0, v * 8), gl.STATIC_DRAW);
  }

  /* ---------- render targets ---------- */
  function tex(w, h) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t: t, f: f, w: w, h: h };
  }
  function free(rt) { if (rt) { gl.deleteTexture(rt.t); gl.deleteFramebuffer(rt.f); } }
  var RT = {}, G = { W: 0, H: 0, L: 1, HD: 0 }, Q;
  function setQuality(name) {
    qName = QUAL[name] ? name : qName;
    Q = QUAL[qName][mqM.matches ? 'm' : 'd'];
    build(Q); G.W = 0; measure(); kick();
  }
  function measure() {
    var mob = mqM.matches;
    G.mob = mob; G.vw = root.clientWidth; G.vh = window.innerHeight;
    G.heroH = hero.offsetHeight; var handEl = pin.querySelector('.ix-hand'); G.HD = handEl ? handEl.offsetHeight : 0; G.L = Math.max(1, pin.offsetHeight - G.heroH - G.HD);
    var cw = cv.clientWidth, ch = cv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, Q.dpr);
    var W = Math.max(2, Math.round(cw * dpr)), H = Math.max(2, Math.round(ch * dpr));
    G.cssW = cw; G.cssH = ch;
    if (W !== G.W || H !== G.H) {
      G.W = W; G.H = H; cv.width = W; cv.height = H;
      free(RT.s); free(RT.a); free(RT.b);
      RT.s = tex(W, H);
      var bw = Math.max(2, Math.round(W * Q.bloom)), bh = Math.max(2, Math.round(H * Q.bloom));
      RT.a = tex(bw, bh); RT.b = tex(bw, bh);
    }
    G.dpr = dpr;
    /* final hero framing: galaxy centre and on-screen radius, per layout (66% across on desktop, 58% on phones) */
    G.fcx = cw * (mob ? .58 : .66); G.fcy = G.heroH * (mob ? .36 : .49);
    G.frad = mob ? cw * .62 : Math.min(cw * .3, ch * .52);
  }

  /* ---------- camera ---------- */
  function persp(f, as, n, fa) { var t = 1 / Math.tan(f / 2); return [t / as, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]; }
  function mul(a, b) { var o = new Array(16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function view(e, roll) {
    var z = norm(e), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    var cr = Math.cos(roll), sr = Math.sin(roll), x2 = [x[0] * cr + y[0] * sr, x[1] * cr + y[1] * sr, x[2] * cr + y[2] * sr], y2 = cross(z, x2);
    return [x2[0], y2[0], z[0], 0, x2[1], y2[1], z[1], 0, x2[2], y2[2], z[2], 0, -dot(x2, e), -dot(y2, e), -dot(z, e), 1];
  }
  var DEG = Math.PI / 180;
  function cam(p) {
    var a1 = eis(win(p, 0, .15)), a2 = eio(win(p, .15, .45)), a3 = eio(win(p, .45, .75)), a4 = eoc(win(p, .75, .92));
    var fov = lerp(lerp(lerp(64, 58, a1), 46, a2), 40, a3) * DEG;
    var tanH = Math.tan(fov / 2), Df = 1.0 * (G.cssH / 2) / (tanH * G.frad);
    var d = p < .15 ? lerp(1.28, .78, a1) : p < .45 ? lerp(.78, 3.3, a2) : lerp(3.3, Df, a3);
    var el = (p < .15 ? lerp(3, 7.5, a1) : p < .45 ? lerp(7.5, 54, a2) : lerp(54, 50, a3)) * DEG;
    var az = 0.15 + .78 * a1 + 1.32 * a2 + .38 * a3 + .04 * a4;
    var roll = lerp(.14, .05, a1) * (1 - a2);
    var sx = (2 * G.fcx / G.cssW - 1), sy = (1 - 2 * G.fcy / G.cssH);
    var shift = eio(win(p, .45, .82));
    return { fov: fov, d: d, el: el, az: az, roll: roll, sx: sx * shift, sy: sy * shift };
  }
  var tilt = { x: 0, y: 0, tx: 0, ty: 0 }, ptr = { x: -9999, y: -9999, k: 0, tk: 0 };
  var prev = null, caS = 0, t0 = performance.now();

  /* ---------- typography ---------- */
  var lines = [].slice.call(hero.querySelectorAll('.tx-l'));
  var LINES = lines.map(function (el, li) {
    var text = el.textContent, chars = []; el.textContent = '';
    text.split(' ').forEach(function (w, wi, arr) {
      var ws = document.createElement('span'); ws.className = 'tx-w';
      for (var i = 0; i < w.length; i++) { var c = document.createElement('span'); c.className = 'tx-c'; c.textContent = w[i]; ws.appendChild(c); chars.push(c); }
      el.appendChild(ws); if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return { el: el, chars: chars, a: li ? .80 : .76, b: li ? .91 : .88 };
  });
  var label = hero.querySelector('.eyebrow .label'), rule = hero.querySelector('.eyebrow .rule');
  var lede = hero.querySelector('.hero-lede'), btns = [].slice.call(hero.querySelectorAll('.hero-actions .btn'));
  function clearStyle(el) { el.style.opacity = ''; el.style.transform = ''; el.style.filter = ''; el.style.textShadow = ''; el.style.color = ''; el.style.letterSpacing = ''; el.style.clipPath = ''; el.style.webkitClipPath = ''; el.style.width = ''; }
  function typo(p, live) {
    var kl = live ? eoc(win(p, .74, .86)) : 1;
    if (kl >= 1) { clearStyle(label); clearStyle(rule); }
    else { label.style.opacity = kl.toFixed(3); label.style.letterSpacing = lerp(.62, .24, kl).toFixed(3) + 'em'; label.style.filter = 'blur(' + ((1 - kl) * 4).toFixed(2) + 'px)'; rule.style.width = (38 * kl).toFixed(1) + 'px'; }
    LINES.forEach(function (L) {
      var k = live ? eoc(win(p, L.a, L.b)) : 1;
      L.el.style.transform = k >= 1 ? '' : 'translateY(' + ((1 - k) * 104).toFixed(2) + '%)';
      var n = L.chars.length;
      L.chars.forEach(function (c, i) {
        var s = L.a + (L.b - L.a) * .5 * i / n, e = s + (L.b - L.a) * .5;
        var ci = live ? eoc(win(p, s, e)) : 1;
        if (ci >= 1) { if (c.style.opacity) clearStyle(c); return; }
        var gg = 1 - ci;
        c.style.opacity = ci.toFixed(3);
        c.style.filter = 'blur(' + (gg * 7).toFixed(2) + 'px)';
        c.style.transform = 'translateY(' + (gg * .28).toFixed(3) + 'em)';
        c.style.color = 'rgb(' + Math.round(lerp(244, 214, gg)) + ' ' + Math.round(lerp(250, 247, gg)) + ' ' + Math.round(lerp(252, 255, gg)) + ')';
        c.style.textShadow = '0 0 ' + (16 + 34 * gg).toFixed(1) + 'px rgb(143 216 232 / ' + (.9 * gg).toFixed(3) + '), 0 2px 46px rgb(1 5 10 / 0.78)';
      });
    });
    var kd = live ? eoc(win(p, .84, .93)) : 1;
    if (kd >= 1) clearStyle(lede);
    else { var cl = 'inset(0 0 ' + ((1 - kd) * 100).toFixed(2) + '% 0)'; lede.style.clipPath = cl; lede.style.webkitClipPath = cl; lede.style.opacity = (.3 + .7 * kd).toFixed(3); lede.style.filter = 'blur(' + ((1 - kd) * 5).toFixed(2) + 'px)'; lede.style.transform = 'translateY(' + ((1 - kd) * 10).toFixed(2) + 'px)'; }
    btns.forEach(function (b, i) {
      var kb = live ? eoc(win(p, .87 + i * .03, .95 + i * .02)) : 1;
      if (kb >= 1) { b.style.opacity = ''; b.style.transform = ''; b.style.filter = ''; return; }
      b.style.opacity = kb.toFixed(3); b.style.transform = 'translateY(' + ((1 - kb) * 16).toFixed(2) + 'px)'; b.style.filter = 'blur(' + ((1 - kb) * 4).toFixed(2) + 'px)';
    });
  }
  function op(el, v) { if (el) el.style.opacity = v.toFixed(3); }

  function handoff() {
    if (reduced()) { var hr = hero.getBoundingClientRect(); return clamp(-hr.top / Math.max(1, G.heroH * .85), 0, 1); }
    if (!G.HD) return 0;
    return clamp((-pin.getBoundingClientRect().top - G.L) / G.HD, 0, 1);
  }
  function progress() {
    if (reduced()) return 1;
    var p = clamp(-pin.getBoundingClientRect().top / G.L, 0, 1); return p > .9985 ? 1 : p;
  }

  /* ---------- frame ---------- */
  function render(p, time) {
    var red = reduced(), live = !red && p < 1;
    root.classList.toggle('ix-live', live);
    root.classList.toggle('gx-idle', !live);
    hero.classList.toggle('ix-open', live && p < .97);
    var C = cam(p), hh = handoff(), he = eis(hh);
    api.handoff = hh;
    if (hh > 0 && !red) {
      /* TR2: the camera keeps travelling, down toward the disc and into the core */
      C.d *= lerp(1, .3, he); C.el -= 26 * DEG * he; C.az += .55 * he; C.fov += 10 * DEG * he; C.roll += .05 * Math.sin(Math.PI * hh);
    }
    var az = C.az + tilt.x * .09, el = C.el + tilt.y * .05;
    var e = [C.d * Math.cos(el) * Math.cos(az), C.d * Math.sin(el), C.d * Math.cos(el) * Math.sin(az)];
    var V = view(e, C.roll), P = persp(C.fov, G.cssW / G.cssH, .015, 30), VP = mul(P, V);
    var pv = prev || { VP: VP, sx: C.sx, sy: C.sy };
    /* screen speed of the core (kept from the reference: it feeds the chromatic term, which is off) */
    var sp = 0; if (prev) { var c0 = mul(VP, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, .6, 0, 0, 1]), c1 = mul(pv.VP, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, .6, 0, 0, 1]); sp = Math.hypot(c0[12] / c0[15] - c1[12] / c1[15], c0[13] / c0[15] - c1[13] / c1[15]); }
    caS += (Math.min(1, sp * 18) - caS) * .15;
    var streakK = (live ? lerp(1.0, .55, win(p, .1, .45)) * (1 - win(p, .6, .9) * .7) : .15) * .25;
    var ring = win(p, .92, 1), ringA = 0;
    var bloomK = (live ? lerp(1.0, .72, win(p, .15, .75)) : .72);

    gl.bindFramebuffer(gl.FRAMEBUFFER, RT.s.f); gl.viewport(0, 0, G.W, G.H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    /* nebula */
    gl.useProgram(P_NEB.p); var u = P_NEB.u;
    gl.uniformMatrix4fv(u.uV, false, V); gl.uniformMatrix4fv(u.uP, false, P); gl.uniform2f(u.uShift, C.sx, C.sy);
    gl.uniform1f(u.uTime, time); gl.uniform1f(u.uSpin, GX.pat / .8); gl.uniform1f(u.uNebK, lerp(.62, .4, win(p, .15, .75)));
    gl.bindBuffer(gl.ARRAY_BUFFER, nebBuf);
    var aC = gl.getAttribLocation(P_NEB.p, 'aC'), aK = gl.getAttribLocation(P_NEB.p, 'aK');
    gl.enableVertexAttribArray(aC); gl.vertexAttribPointer(aC, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(aK); gl.vertexAttribPointer(aK, 4, gl.FLOAT, false, 32, 16);
    gl.drawArrays(gl.TRIANGLES, 0, nebVerts);
    gl.disableVertexAttribArray(aC); gl.disableVertexAttribArray(aK);
    /* stars */
    gl.useProgram(P_STAR.p); u = P_STAR.u;
    gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniformMatrix4fv(u.uPVP, false, pv.VP);
    gl.uniform2f(u.uShift, C.sx, C.sy); gl.uniform2f(u.uPShift, pv.sx, pv.sy); gl.uniform2f(u.uRes, G.W, G.H);
    gl.uniform2f(u.uPtr, ptr.x * G.dpr, (G.cssH - ptr.y) * G.dpr);
    gl.uniform1f(u.uTime, time); gl.uniform1f(u.uSpin, GX.spin); gl.uniform1f(u.uDiff, GX.diff); gl.uniform1f(u.uTwist, GX.tw); gl.uniform1f(u.uPat, GX.pat);
    gl.uniform1f(u.uProjK, (G.H / 2) / Math.tan(C.fov / 2)); gl.uniform1f(u.uFocus, C.d);
    gl.uniform1f(u.uDof, Q.dof ? (live ? lerp(1, .45, win(p, .45, .85)) : .45) : 0);
    gl.uniform1f(u.uStreak, streakK); gl.uniform1f(u.uMaxPt, MAXPT); gl.uniform1f(u.uPtrK, ptr.k);
    gl.uniform1f(u.uBright, 1.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
    var aA = gl.getAttribLocation(P_STAR.p, 'aA'), aB = gl.getAttribLocation(P_STAR.p, 'aB');
    gl.enableVertexAttribArray(aA); gl.vertexAttribPointer(aA, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(aB); gl.vertexAttribPointer(aB, 4, gl.FLOAT, false, 32, 16);
    gl.drawArrays(gl.POINTS, 0, starCount);
    if (dustCount) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(u.uDust, 1); gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
      gl.vertexAttribPointer(aA, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(aB, 4, gl.FLOAT, false, 32, 16);
      gl.drawArrays(gl.POINTS, 0, dustCount); gl.uniform1f(u.uDust, 0); gl.blendFunc(gl.ONE, gl.ONE);
    }
    gl.disableVertexAttribArray(aA); gl.disableVertexAttribArray(aB);
    gl.disable(gl.BLEND);
    /* bloom: downsample + separable blur */
    gl.useProgram(P_BLUR.p); u = P_BLUR.u;
    var aP = gl.getAttribLocation(P_BLUR.p, 'aP');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.uT, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, RT.a.f); gl.viewport(0, 0, RT.a.w, RT.a.h);
    gl.bindTexture(gl.TEXTURE_2D, RT.s.t); gl.uniform2f(u.uD, 1 / RT.s.w, 1 / RT.s.h); gl.drawArrays(gl.TRIANGLES, 0, 6);
    for (var it = 0; it < 2; it++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, RT.b.f); gl.bindTexture(gl.TEXTURE_2D, RT.a.t); gl.uniform2f(u.uD, (1.5 + it) / RT.a.w, 0); gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, RT.a.f); gl.bindTexture(gl.TEXTURE_2D, RT.b.t); gl.uniform2f(u.uD, 0, (1.5 + it) / RT.a.h); gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    /* composite to screen */
    gl.useProgram(P_COMP.p); u = P_COMP.u;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, G.W, G.H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RT.s.t); gl.uniform1i(u.uS, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, RT.a.t); gl.uniform1i(u.uB, 1);
    var cx = (C.sx * .5 + .5) * G.W, cy = (C.sy * .5 + .5) * G.H;
    gl.uniform2f(u.uRes, G.W, G.H); gl.uniform2f(u.uC, cx, cy);
    gl.uniform1f(u.uBloomK, bloomK + (red ? 0 : .35 * Math.sin(Math.PI * Math.min(1, hh * 1.4)))); gl.uniform1f(u.uCA, 0); gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uGrain, .012); gl.uniform1f(u.uRingR, ring * G.H * 1.1); gl.uniform1f(u.uRingA, ringA);
    var aP2 = gl.getAttribLocation(P_COMP.p, 'aP'); gl.enableVertexAttribArray(aP2); gl.vertexAttribPointer(aP2, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE0);
    prev = { VP: VP, sx: C.sx, sy: C.sy };

    /* DOM layers */
    op(deep, live ? .55 * eoc(win(p, .1, .4)) * (1 - eio(win(p, .5, .85))) : 0);
    if (live) op(scrim, eio(win(p, .68, .9))); else scrim.style.opacity = '';
    op(cue, live ? 1 - win(p, 0, .05) : 0);
    var kn = live ? eoc(win(p, .84, .96)) : 1;
    if (nav) { nav.style.opacity = kn >= 1 ? '' : kn.toFixed(3); nav.style.pointerEvents = kn < .5 ? 'none' : ''; }
    typo(p, live);
    /* TR2: hero copy eases out, the stage dissolves into the shared sky */
    var mobH = mqM.matches;
    var kc = red ? win(hh, 0, .7) : eio(win(hh, 0, mobH ? .55 : .42));
    if (kc <= 0) { cp.style.opacity = ''; cp.style.transform = ''; cp.style.filter = ''; cp.style.pointerEvents = ''; }
    else { cp.style.opacity = (1 - kc).toFixed(3); cp.style.pointerEvents = kc > .5 ? 'none' : ''; cp.style.transform = red ? '' : 'translateY(' + (-26 * kc).toFixed(2) + 'px)'; cp.style.filter = red ? '' : 'blur(' + (6 * kc).toFixed(2) + 'px)'; }
    var ks = red ? win(hh, .1, .9) : eio(win(hh, .15, .92)); stg.style.opacity = ks <= 0 ? '' : (1 - ks).toFixed(3);
    cv.style.opacity = red || hh <= 0 ? '' : (1 - eio(win(hh, .3, .95))).toFixed(3);
    api.progress = p;
    api.phase = red ? 'Reduced motion' : p <= 0 ? 'Opening' : p < .15 ? '1 · Entering' : p < .45 ? '2 · Pull-back reveal' : p < .75 ? '3 · Glide' : p < .92 ? '4 · Text reveal' : p < 1 ? '5 · Lock-in' : 'Released';
  }

  var raf = 0, last = 0, onScreen = true, lost = false, frozen = 12;
  function frame(now) {
    raf = 0;
    if (lost || !onScreen) return;
    var minDt = Q.fps === 30 ? 31 : 0;
    if (now - last < minDt) { raf = requestAnimationFrame(frame); return; }
    last = now;
    tilt.x += (tilt.tx - tilt.x) * .05; tilt.y += (tilt.ty - tilt.y) * .05; ptr.k += (ptr.tk - ptr.k) * .08;
    var p = progress();
    render(p, reduced() ? frozen : (now - t0) / 1000);
    if (!reduced()) raf = document.hidden ? setTimeout(function () { raf = 0; frame(performance.now()); }, 500) : requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !lost) raf = document.hidden ? setTimeout(function () { raf = 0; frame(performance.now()); }, 40) : requestAnimationFrame(frame); }

  cv.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); lost = true; root.classList.add('gx-lost'); }, false);
  /* the hero canvases pause once the hero is off screen (HANDOVER g) */
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; if (onScreen) kick(); }, { rootMargin: '120px' }).observe(hero);
  document.addEventListener('visibilitychange', kick);
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () { measure(); prev = null; kick(); }, { passive: true });
  window.addEventListener('load', function () { measure(); kick(); });
  function onReducedChange() { root.classList.toggle('ix-reduced', reduced()); fit(); measure(); prev = null; render(progress(), frozen); kick(); if (Atx.refreshHeader) Atx.refreshHeader(); }
  if (mqR.addEventListener) mqR.addEventListener('change', onReducedChange);
  /* the galaxy owns the pointer: a slight tilt, and once settled a soft push on the stars near it */
  window.addEventListener('pointermove', function (ev) {
    if (mqM.matches || ev.pointerType !== 'mouse') return;
    var r = cv.getBoundingClientRect();
    tilt.tx = (ev.clientX / G.vw - .5) * 2; tilt.ty = (ev.clientY / G.vh - .5) * 2;
    ptr.x = ev.clientX - r.left; ptr.y = ev.clientY - r.top; ptr.tk = progress() >= .92 ? 1 : 0; kick();
  }, { passive: true });
  document.addEventListener('pointerleave', function () { ptr.tk = 0; tilt.tx = tilt.ty = 0; kick(); });
  /* device motion on phones, only once settled and only if the platform allows it */
  var motionAsked = false;
  function onOrient(ev) { if (progress() < .92 || ev.gamma == null) return; tilt.tx = clamp(ev.gamma / 30, -1, 1); tilt.ty = clamp((ev.beta - 45) / 30, -1, 1); kick(); }
  if (mqM.matches && window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      window.addEventListener('touchend', function ask() {
        if (motionAsked || progress() < .92) return; motionAsked = true;
        DeviceOrientationEvent.requestPermission().then(function (s) { if (s === 'granted') window.addEventListener('deviceorientation', onOrient); }).catch(function () {});
        window.removeEventListener('touchend', ask);
      }, { passive: true });
    } else window.addEventListener('deviceorientation', onOrient);
  }

  var api = Atx.intro = {
    progress: 0, handoff: 0, phase: '',
    get length() { return G.L; }, get quality() { return qName; }, get reduced() { return reduced(); },
    scrollTo: function (p) { var top = pin.getBoundingClientRect().top + window.scrollY; window.scrollTo({ top: top + clamp(p, 0, 1) * G.L, behavior: 'instant' }); prev = null; kick(); },
    handTo: function (h) { var top = pin.getBoundingClientRect().top + window.scrollY; window.scrollTo({ top: top + G.L + clamp(h, 0, 1) * G.HD, behavior: 'instant' }); prev = null; kick(); }
  };
  /* the header's dark layer starts 24px after the intro */
  Atx.introLength = function () { return reduced() ? 0 : G.L; };
  Atx.onKick(kick);
  Atx.onQuality(function (n) { setQuality(n); });

  /* keyboard: a link focused while the opening still hides it settles the intro */
  document.addEventListener('focusin', function (ev) {
    var t = ev.target;
    if (reduced() || !t || !t.closest || !cp.contains(t) || !t.closest('a, button')) return;
    if (progress() < 1) api.scrollTo(1);
  });

  root.classList.toggle('ix-reduced', reduced());
  Q = QUAL[qName][mqM.matches ? 'm' : 'd'];
  build(Q); measure(); fit();
  render(progress(), reduced() ? frozen : 0);
  kick();
  if (Atx.refreshHeader) Atx.refreshHeader();
})();
