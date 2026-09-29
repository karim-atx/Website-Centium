// Splits one body figure into CELLS: the connected areas of its silhouette
// mask bounded by its own drawn line art. A zone is then a set of cells, so
// every zone follows that figure's contours, stays inside its silhouette and
// cannot overlap another zone.
import { readFileSync } from "node:fs";
import { decodePng } from "./png.mjs";

/** Line-art alpha above this is a wall. */
export const WALL_ALPHA = Number(process.env.WALL_ALPHA ?? 20);
/** Walls are thickened by this many pixels so hairline gaps in a stroke don't join two muscles. */
export const WALL_GROW = Number(process.env.WALL_GROW ?? 3);
/** Cells smaller than this are folded into their neighbour (stroke crumbs). */
export const MIN_CELL = 60;

export function loadFigure(dir, key) {
  const art = decodePng(readFileSync(`${dir}/${key}.png`));
  const mask = decodePng(readFileSync(`${dir}/${key}-mask.png`));
  if (art.width !== mask.width || art.height !== mask.height) throw new Error(`${key}: art and mask differ in size`);
  return { key, width: art.width, height: art.height, art: art.data, mask: mask.data };
}

export function segment(fig) {
  const { width: W, height: H } = fig;
  const N = W * H;
  const inside = new Uint8Array(N);
  const wall = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    inside[i] = fig.mask[i * 4 + 3] > 128 ? 1 : 0;
    wall[i] = fig.art[i * 4 + 3] > WALL_ALPHA ? 1 : 0;
  }
  // Thicken walls.
  let grown = wall;
  for (let g = 0; g < WALL_GROW; g++) {
    const next = new Uint8Array(grown);
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (grown[i]) continue;
        if (grown[i - 1] || grown[i + 1] || grown[i - W] || grown[i + W]) next[i] = 1;
      }
    grown = next;
  }
  // Label cells (4-connected).
  const label = new Int32Array(N).fill(-1);
  const cells = [];
  const stack = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (!inside[s] || grown[s] || label[s] !== -1) continue;
    const id = cells.length;
    let sp = 0, area = 0, sx = 0, sy = 0;
    let minX = W, minY = H, maxX = 0, maxY = 0;
    stack[sp++] = s;
    label[s] = id;
    while (sp) {
      const i = stack[--sp];
      const x = i % W, y = (i / W) | 0;
      area++; sx += x; sy += y;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= N) continue;
        if ((j % W) - x > 1 || x - (j % W) > 1) continue;
        if (inside[j] && !grown[j] && label[j] === -1) {
          label[j] = id;
          stack[sp++] = j;
        }
      }
    }
    cells.push({ id, area, cx: Math.round(sx / area), cy: Math.round(sy / area), box: [minX, minY, maxX, maxY] });
  }
  return { W, H, inside, wall: grown, label, cells };
}

/**
 * Pixels of the silhouette that belong to no cell (the walls themselves, and
 * crumbs below MIN_CELL) go to the nearest cell, by a breadth-first wave, so
 * zones meet with no gaps under the line art.
 */
export function fillGaps(seg) {
  const { W, H, inside, label, cells } = seg;
  const N = W * H;
  const own = new Int32Array(label);
  for (let i = 0; i < N; i++) if (own[i] !== -1 && cells[own[i]].area < MIN_CELL) own[i] = -1;
  let frontier = [];
  for (let i = 0; i < N; i++) if (own[i] !== -1) frontier.push(i);
  while (frontier.length) {
    const next = [];
    for (const i of frontier) {
      const x = i % W;
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= N) continue;
        if (Math.abs((j % W) - x) > 1) continue;
        if (inside[j] && own[j] === -1) {
          own[j] = own[i];
          next.push(j);
        }
      }
    }
    frontier = next;
  }
  return own;
}
