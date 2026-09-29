// Lists each figure's cells (after the spec's cuts) with an interior point,
// area and bounding box: the points are what zones.spec.json uses as seeds.
import { readFileSync } from "node:fs";
import { loadFigure, segment, MIN_CELL } from "./segment.mjs";
const [, , dir, only] = process.argv;
const spec = JSON.parse(readFileSync(new URL("./zones.spec.json", import.meta.url), "utf8"));
for (const key of Object.keys(spec.figures)) {
  if (only && key !== only) continue;
  const fig = loadFigure(dir, key);
  for (const [[x0, y0], [x1, y1]] of spec.figures[key].cuts ?? []) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps), y = Math.round(y0 + ((y1 - y0) * s) / steps);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) fig.art[((y + dy) * fig.width + x + dx) * 4 + 3] = 255;
    }
  }
  const seg = segment(fig);
  console.log(`== ${key}`);
  for (const c of seg.cells) {
    if (c.area < MIN_CELL) continue;
    // Interior point: the cell pixel nearest its centroid.
    let best = null, bd = Infinity;
    for (let y = c.box[1]; y <= c.box[3]; y++) for (let x = c.box[0]; x <= c.box[2]; x++) {
      if (seg.label[y * seg.W + x] !== c.id) continue;
      const d = (x - c.cx) ** 2 + (y - c.cy) ** 2;
      if (d < bd) { bd = d; best = [x, y]; }
    }
    console.log(`${c.id}\tp=${best}\ta=${c.area}\tbox=${c.box.join(",")}`);
  }
}
