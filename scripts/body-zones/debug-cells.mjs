// Debug: writes each figure's cells in distinct colours plus a JSON of cell
// ids, centroids and areas, for choosing which cells make each zone.
// Usage: node scripts/body-zones/debug-cells.mjs <assetsDir> <outDir>
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { encodePng } from "./png.mjs";
import { loadFigure, segment, MIN_CELL } from "./segment.mjs";

const [, , dir, out] = process.argv;
mkdirSync(out, { recursive: true });
const FIGS = ["male-front", "male-back", "female-front", "female-back", "andro-front", "andro-back"];
for (const key of FIGS) {
  const fig = loadFigure(dir, key);
  // The spec's cuts, burnt in exactly as build.mjs does.
  const spec = JSON.parse(readFileSync(new URL("./zones.spec.json", import.meta.url), "utf8"));
  for (const [[x0, y0], [x1, y1]] of spec.figures[key]?.cuts ?? []) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps), y = Math.round(y0 + ((y1 - y0) * s) / steps);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) fig.art[((y + dy) * fig.width + x + dx) * 4 + 3] = 255;
    }
  }
  const seg = segment(fig);
  const data = Buffer.alloc(seg.W * seg.H * 4);
  const hue = (id) => [(id * 97) % 200 + 40, (id * 57) % 200 + 40, (id * 151) % 200 + 40];
  for (let i = 0; i < seg.W * seg.H; i++) {
    const l = seg.label[i];
    if (fig.art[i * 4 + 3] > 40) { data[i * 4 + 3] = 255; continue; }
    if (l === -1) continue;
    const [r, g, b] = seg.cells[l].area < MIN_CELL ? [255, 0, 0] : hue(l);
    data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = 170;
  }
  writeFileSync(`${out}/${key}-cells.png`, encodePng({ width: seg.W, height: seg.H, data }));
  const big = seg.cells.filter((c) => c.area >= MIN_CELL);
  writeFileSync(`${out}/${key}-cells.json`, JSON.stringify({ W: seg.W, H: seg.H, cells: big }, null, 0));
  console.log(key, `${seg.W}x${seg.H}`, "cells", seg.cells.length, "kept", big.length);
}
