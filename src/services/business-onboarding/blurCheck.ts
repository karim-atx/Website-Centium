import { BLUR_EDGE, BLUR_THRESHOLD, laplacianVariance, toGrey } from "./blur";

// The browser half of the OB-265 blur check (see ./blur for the measure and
// its calibration): decode, scale, soften by 1px, measure.

/**
 * Whether an image file looks too blurry to read. Never throws: an image this
 * browser cannot decode or draw is not called blurry (the upload path refuses
 * it with its own message).
 */
export async function looksBlurry(file: Blob): Promise<boolean> {
  try {
    if (typeof createImageBitmap !== "function" || typeof document === "undefined") return false;
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, BLUR_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      bitmap.close();
      return false;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.filter = "blur(1px)";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const { data } = ctx.getImageData(0, 0, w, h);
    return laplacianVariance(toGrey(data, w, h), w, h) < BLUR_THRESHOLD;
  } catch {
    return false;
  }
}
