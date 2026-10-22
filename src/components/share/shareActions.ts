// Market + Share 3.0 · the destinations' browser actions, shared by the client
// (C-SH.2 Destinations) and business (B-SH.3 Destinations) sheets. The same
// rules as the professional ShareOptionsSheet (Release 3 W8), which is left
// as it is (P-SH is additive only):
// - Save image downloads the PNG drawn on a canvas;
// - Instagram Story, WhatsApp and More hand a File to navigator.share when
//   the device can share files (a browser can't open Instagram or WhatsApp
//   directly, D-49), and fall back to the download otherwise;
// - Copy puts the transparent sticker PNG on the clipboard (hidden where the
//   browser can't write images there), or copies the link (business);
// - photos stay on the device: everything is drawn locally, nothing uploads.
// File names and the share title are neutral.

export const SHARE_TITLE = "Centium";

export const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));

export const canCopyImage = (): boolean =>
  typeof window !== "undefined" && typeof ClipboardItem !== "undefined" && typeof navigator !== "undefined" && !!navigator.clipboard && typeof navigator.clipboard.write === "function";

export const canCopyText = (): boolean => typeof navigator !== "undefined" && !!navigator.clipboard && typeof navigator.clipboard.writeText === "function";

export function saveCanvas(canvas: HTMLCanvasElement, fileName: string): void {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export type ShareOutcome = "shared" | "saved" | "aborted" | "failed";

/** navigator.share with the image (and the link, when there is one); the download when files can't be shared. */
export async function shareCanvas(canvas: HTMLCanvasElement, fileName: string, url?: string | null): Promise<ShareOutcome> {
  let file: File | null = null;
  try {
    file = new File([await canvasToBlob(canvas)], fileName, { type: "image/png" });
  } catch {
    file = null;
  }
  if (file && typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: SHARE_TITLE, ...(url ? { url } : null) });
      return "shared";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "aborted";
      return "failed";
    }
  }
  try {
    saveCanvas(canvas, fileName);
    return "saved";
  } catch {
    return "failed";
  }
}

export async function copyCanvasImage(canvas: HTMLCanvasElement): Promise<boolean> {
  if (!canCopyImage()) return false;
  try {
    const blob = await canvasToBlob(canvas);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (!canCopyText()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Every pixel's alpha in a sticker canvas's corner: 0 means the background is transparent. */
export function cornerAlpha(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return -1;
  return ctx.getImageData(0, 0, 1, 1).data[3];
}
