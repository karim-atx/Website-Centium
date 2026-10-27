// Centium landing v29: which band is teal- or lavender-dominant (prototype
// pickBands, 03_motion/09-bands.md). Pure, so it is unit-tested.

type Hue = "teal" | "lav";

/** The prototype's pickBands: one random draw per page load decides which band
 *  is teal- or lavender-dominant; neighbours always alternate. `seed` fixes it. */
export function pickBands(seed?: number) {
  let z = seed != null ? (seed * 2654435761) >>> 0 : (Math.random() * 4294967296) >>> 0;
  const r = () => {
    z = (z * 1664525 + 1013904223) >>> 0;
    return z / 4294967296;
  };
  const first = r() < 0.5 ? "teal" : "lav",
    dom = [0, 1, 2, 3, 4].map((i): Hue => ((i % 2 === 0) === (first === "teal") ? "teal" : "lav")),
    seeds = dom.map(() => (r() * 1e9) >>> 0);
  return { dom, seed: seeds };
}
