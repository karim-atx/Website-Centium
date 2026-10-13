// OB-265 "ID photo blurry": a check on an ID photo before it is uploaded, so
// the owner can retake it now instead of hearing about it from a reviewer two
// days later (OB-242 "The back of your ID is blurry.").
//
// The measure is the variance of the Laplacian of the grey image: a sharp
// photo of a card full of printed text has strong, frequent edges and a high
// variance; an out-of-focus or shaken one has soft edges and a low variance.
// It is measured on the image scaled so its long edge is BLUR_EDGE, so the
// threshold means the same thing for a 12 MP phone photo and a small scan,
// after a 1px Gaussian blur: without it a phone camera's sensor noise reads as
// "sharp" (measured: a heavily blurred card with noise scored as high as a
// sharp one). A browser without canvas filters skips that step, which only
// raises the score, so it flags less, never more.
//
// Calibrated in Chrome on a 3000×2000 photo of a printed card: sharp ~110
// (with or without noise), blurred 4px ~17, 6px ~6, 8px ~3.
//
// THE THRESHOLD IS OURS (the handoff draws the state, not the rule). It is set
// low on purpose: a false "blurry" on a good photo stops somebody going live,
// so only a clearly soft photo is flagged, and the step accepts the photo if
// the same row is flagged twice in a row (PoliciesStep). The reviewer still
// sees every file.
//
// Pure (no DOM), so the node tests run it; the browser half is blurCheck.ts.

export const BLUR_EDGE = 1024;
export const BLUR_THRESHOLD = 8;

/** Variance of the 4-neighbour Laplacian over a grey image (0..255, row-major). */
export function laplacianVariance(grey: ArrayLike<number>, width: number, height: number): number {
  if (width < 3 || height < 3) return Infinity;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;
      const v = grey[i - width] + grey[i + width] + grey[i - 1] + grey[i + 1] - 4 * grey[i];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** RGBA pixels to grey (Rec. 601 luma). */
export function toGrey(rgba: ArrayLike<number>, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) out[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  return out;
}
