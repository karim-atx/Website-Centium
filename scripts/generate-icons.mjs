/**
 * Regenerates every icon derived from the Centium mark. public/favicon.svg is the
 * single source of truth (two filled paths: the C, then the leaf); nothing here
 * traces or redraws artwork, it only renders that master into:
 *   public/favicon.ico (16/32/48 PNG-in-ICO), public/icons/favicon-{16,32,48,192,512}.png,
 *   public/icons/apple-touch-icon.png, public/pwa-{192x192,512x512}.png,
 *   public/pwa-maskable-512x512.png, public/safari-pinned-tab.svg
 *
 * Run (the three dependencies are build tooling used rarely, so they are
 * deliberately not in package.json; --no-save leaves package.json/lock alone):
 *   npm install --no-save sharp @resvg/resvg-js polygon-clipping && node scripts/generate-icons.mjs
 * Add --check to write nothing and instead exit 1 if any committed icon differs
 * from what this would produce. Output is byte-for-byte reproducible with
 * sharp 0.35.5, @resvg/resvg-js 2.6.2 and polygon-clipping 0.15.7 on Node 24;
 * a different encoder version can change PNG bytes without changing the picture.
 *
 * The 16 and 32 px icons use a copy of the leaf with the vein widened to
 * VEIN_WIDTH units (about 34 in the master): at 16 px the real vein is under a
 * pixel wide and the leaf reads as a solid blob. Larger sizes use the master.
 * If the master's artwork changes, bump the `?v=` on the icon links in
 * index.html and the manifest in vite.config.ts as well.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'polygon-clipping';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';

const VEIN_WIDTH = 50;
const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const check = process.argv.includes('--check');

// ---- the master ------------------------------------------------------------
const master = fs.readFileSync(PUBLIC + 'favicon.svg', 'utf8');
const viewBox = master.match(/viewBox="([^"]+)"/)[1];
const [[purple, dC], [teal, dL]] = [...master.matchAll(/<path fill="([^"]+)" d="([^"]+)"/g)].map((m) => [m[1], m[2]]);
const markSvg = (leaf = dL) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path fill="${purple}" d="${dC}"/><path fill="${teal}" d="${leaf}"/></svg>\n`;

// ---- minimal path geometry (absolute M/L/C/Z only, which is all the master uses)
const parse = (d) => {
  const t = d.match(/[MLCZ]|-?\d+\.?\d*/g);
  const segs = [];
  let i = 0, cur = null, start = null;
  const n = () => parseFloat(t[i++]);
  while (i < t.length) {
    const c = t[i++];
    if (c === 'M') { cur = [n(), n()]; start = cur; }
    else if (c === 'L') { const p = [n(), n()]; segs.push({ t: 'L', p0: cur, p1: p }); cur = p; }
    else if (c === 'C') { const c1 = [n(), n()], c2 = [n(), n()], p = [n(), n()]; segs.push({ t: 'C', p0: cur, c1, c2, p1: p }); cur = p; }
    else if (c === 'Z' && Math.hypot(cur[0] - start[0], cur[1] - start[1]) > 1e-6) segs.push({ t: 'L', p0: cur, p1: start });
  }
  return segs;
};
const flatten = (d, steps) => {
  const ring = [];
  for (const s of parse(d)) {
    if (s.t === 'L') { ring.push(s.p0); continue; }
    for (let k = 0; k < steps; k++) {
      const u = k / steps, v = 1 - u;
      ring.push([0, 1].map((a) => v * v * v * s.p0[a] + 3 * v * v * u * s.c1[a] + 3 * v * u * u * s.c2[a] + u * u * u * s.p1[a]));
    }
  }
  return ring;
};
const closeRing = (r) => [...r, r[0]];

// The leaf's four sharp corners (tip, stem tip, vein end, lobe tip) are the four path nodes with the largest turn.
const leafCorners = (d) => {
  const segs = parse(d);
  const vec = (a, b) => [b[0] - a[0], b[1] - a[1]];
  const moved = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-9;
  // tangent leaving a segment's start / arriving at its end (skipping control points that sit on the node)
  const dirOut = (s) => (s.t === 'L' ? vec(s.p0, s.p1) : vec(s.p0, [s.c1, s.c2, s.p1].find((q) => moved(s.p0, q))));
  const dirIn = (s) => (s.t === 'L' ? vec(s.p0, s.p1) : vec([s.c2, s.c1, s.p0].find((q) => moved(q, s.p1)), s.p1));
  const nodes = segs.map((s, k) => {
    const a = dirIn(s), b = dirOut(segs[(k + 1) % segs.length]);
    return { p: s.p1, turn: Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])) };
  });
  const four = nodes.sort((a, b) => b.turn - a.turn).slice(0, 4).map((x) => x.p);
  const byY = [...four].sort((a, b) => a[1] - b[1]);
  const stem = byY[3];
  const rest = four.filter((p) => p !== byY[0] && p !== stem).sort((a, b) => a[0] - b[0]);
  return { stem, veinEnd: rest[1], lobeTip: rest[0] };
};

// Leaf with the vein channel widened: subtract a strip along the channel's centreline that tapers to a point at the vein end.
const widenVein = (leafD, width) => {
  const ring = flatten(leafD, 120);
  const { stem, veinEnd, lobeTip } = leafCorners(leafD);
  const idx = (pt) => ring.reduce((b, p, i) => (Math.hypot(p[0] - pt[0], p[1] - pt[1]) < Math.hypot(ring[b][0] - pt[0], ring[b][1] - pt[1]) ? i : b), 0);
  const chain = (a, b) => { const o = []; for (let i = a; ; i = (i + 1) % ring.length) { o.push(ring[i]); if (i === b) break; } return o; };
  const lower = chain(idx(stem), idx(veinEnd)); // channel's lower edge: stem tip -> vein end
  const upper = chain(idx(veinEnd), idx(lobeTip)); // channel's upper edge: vein end -> lobe tip
  const nearest = (p, c) => c.reduce((b, q) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); return d < b.d ? { d, q } : b; }, { d: 1e9, q: null });
  const centre = [];
  for (let i = 0; i < lower.length; i += Math.max(1, Math.floor(lower.length / 160))) {
    const p = lower[i], { q } = nearest(p, upper);
    centre.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
  }
  const c = [...centre].reverse(); // exit -> vein end
  const d0 = [c[0][0] - c[3][0], c[0][1] - c[3][1]], L0 = Math.hypot(...d0);
  c.unshift([c[0][0] + (d0[0] / L0) * 60, c[0][1] + (d0[1] / L0) * 60]); // run the cut cleanly through the open end
  const len = [0];
  for (let i = 1; i < c.length; i++) len.push(len[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const left = [], right = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)], tn = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(...tn);
    const hw = (width / 2) * Math.max(0, Math.min(1, (1 - len[i] / len[len.length - 1]) / 0.35));
    left.push([c[i][0] - (tn[1] / L) * hw, c[i][1] + (tn[0] / L) * hw]);
    right.push([c[i][0] + (tn[1] / L) * hw, c[i][1] - (tn[0] / L) * hw]);
  }
  const strip = [...left, ...right.reverse()];
  const cut = pc.difference([closeRing(ring)], [closeRing(strip)]);
  return cut.map((poly) => poly.map((r) => 'M ' + r.slice(0, -1).map((p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' L ') + ' Z').join(' ')).join(' ');
};

// ---- placement ---------------------------------------------------------------
const pts = [...flatten(dC, 60), ...flatten(dL, 60)];
const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, markH = Math.max(...ys) - Math.min(...ys);
// minimal enclosing circle (Badoiu-Clarkson), so the maskable safe-zone fit is exact rather than bounding-box based
let centre = [cx, cy];
for (let i = 1; i <= 4000; i++) {
  let far = pts[0], fd = -1;
  for (const p of pts) { const d = (p[0] - centre[0]) ** 2 + (p[1] - centre[1]) ** 2; if (d > fd) { fd = d; far = p; } }
  centre = [centre[0] + (far[0] - centre[0]) / (i + 1), centre[1] + (far[1] - centre[1]) / (i + 1)];
}
const enclosingR = Math.sqrt(Math.max(...pts.map((p) => (p[0] - centre[0]) ** 2 + (p[1] - centre[1]) ** 2)));
/** The mark at `frac` of the canvas height (or inside a circle of `fitRadius` px on a `px` canvas), centred, on an optional background tile. */
const compose = ({ frac, bg = null, tileRx = 0, around = [cx, cy], fitRadius = null, px = null }) => {
  const side = fitRadius ? (enclosingR * px) / fitRadius : markH / frac;
  const vx = around[0] - side / 2, vy = around[1] - side / 2;
  const back = bg ? `<rect x="${vx}" y="${vy}" width="${side}" height="${side}" rx="${tileRx * side}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${side} ${side}">${back}<path fill="${purple}" d="${dC}"/><path fill="${teal}" d="${dL}"/></svg>`;
};
const png = (svg, px) => Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: px } }).render().asPng());
const opaque = (buf, bg) => sharp(buf).flatten({ background: bg }).removeAlpha().png().toBuffer();

// ---- build everything in memory, then write or compare ---------------------------
const small = markSvg(widenVein(dL, VEIN_WIDTH));
const out = new Map();
out.set('icons/favicon-16.png', png(small, 16));
out.set('icons/favicon-32.png', png(small, 32));
out.set('icons/favicon-48.png', png(markSvg(), 48));
out.set('icons/favicon-192.png', png(markSvg(), 192));
out.set('icons/favicon-512.png', png(markSvg(), 512));
// iOS applies its own rounding, so the apple-touch icon is an opaque full square (transparency turns black there); mark ~70% of height
out.set('icons/apple-touch-icon.png', await opaque(png(compose({ frac: 0.7, bg: '#FFFFFF' }), 180), '#FFFFFF'));
// 'any' PWA icons: white rounded tile (22% radius), mark 72%; maskable: full-bleed solid, mark inside the 80% safe-zone circle with a little margin
out.set('pwa-192x192.png', png(compose({ frac: 0.72, bg: '#FFFFFF', tileRx: 0.22 }), 192));
out.set('pwa-512x512.png', png(compose({ frac: 0.72, bg: '#FFFFFF', tileRx: 0.22 }), 512));
out.set('pwa-maskable-512x512.png', await opaque(png(compose({ frac: 0, bg: '#FFFFFF', around: centre, fitRadius: 512 * 0.39, px: 512 }), 512), '#FFFFFF'));
out.set('safari-pinned-tab.svg', Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path fill="#000" d="${dC}"/><path fill="#000" d="${dL}"/></svg>\n`));
// favicon.ico: PNG-in-ICO with 16 (wide-vein), 32 (wide-vein) and 48 (master)
const entries = [16, 32, 48].map((s) => ({ s, b: out.get(`icons/favicon-${s}.png`) }));
const head = Buffer.alloc(6);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(entries.length, 4);
let offset = 6 + 16 * entries.length;
const dir = entries.map((e) => {
  const d = Buffer.alloc(16);
  d[0] = e.s; d[1] = e.s; d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(e.b.length, 8); d.writeUInt32LE(offset, 12);
  offset += e.b.length;
  return d;
});
out.set('favicon.ico', Buffer.concat([head, ...dir, ...entries.map((e) => e.b)]));

let differing = 0;
for (const [name, buf] of out) {
  const file = PUBLIC + name;
  if (check) {
    const same = fs.existsSync(file) && fs.readFileSync(file).equals(buf);
    if (!same) differing++;
    console.log(`${same ? 'same   ' : 'DIFFERS'} public/${name}`);
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    console.log(`wrote   public/${name} (${buf.length} bytes)`);
  }
}
if (check) {
  console.log(differing ? `${differing} file(s) differ from the committed icons.` : 'All icons match what this script produces, byte for byte.');
  process.exitCode = differing ? 1 : 0;
}
