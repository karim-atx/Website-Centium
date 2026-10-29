/**
 * Round E · reads the text of a lab report ON THE DEVICE.
 *
 * NOTHING LEAVES THE PHONE. The photo or PDF is read in this browser by
 * tesseract.js (text recognition, compiled to wasm) and pdf.js; neither the
 * file nor the text read from it is sent anywhere. The only network requests
 * are the reader's own files, fetched once from Centium's site
 * (public/ocr/…, copied there by vite.config.ts) the first time someone
 * scans; no CDN, no service, no upload. tesseract.js keeps its English model
 * in this browser's storage afterwards.
 *
 * LOADED ONLY WHEN USED: both libraries are dynamic imports, so the app's
 * first load is unchanged.
 *
 * A PDF with a text layer (most lab PDFs are generated, not scanned) is read
 * straight from that layer, which is exact; a scanned PDF's pages are drawn
 * and read like a photo. At most MAX_PAGES pages are read.
 */

declare const __OCR_BASE__: string;

const MAX_PAGES = 6;
/** Longest edge a page or photo is drawn at before reading. */
const MAX_EDGE = 3200;

export type ReadOutcome =
  | { ok: true; text: string }
  | { ok: false; reason: "cancelled" | "unreadable" | "failed" };

export interface ReadOptions {
  /** 0 to 1, across the whole read. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

const abs = (path: string) => new URL(path, window.location.origin).href;

type PdfJs = typeof import("pdfjs-dist");
let pdfjs: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjs) {
    pdfjs = (import(/* @vite-ignore */ abs(`${__OCR_BASE__}/pdf/pdf.min.mjs`)) as Promise<PdfJs>).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = abs(`${__OCR_BASE__}/pdf/pdf.worker.min.mjs`);
      return lib;
    });
    pdfjs.catch(() => (pdfjs = null));
  }
  return pdfjs;
}

type OcrWorker = Awaited<ReturnType<typeof import("tesseract.js").createWorker>>;

async function startReader(onProgress: (f: number) => void): Promise<OcrWorker> {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: abs(`${__OCR_BASE__}/worker.min.js`),
    corePath: abs(`${__OCR_BASE__}/core/`),
    langPath: abs(`${__OCR_BASE__}/lang`),
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
  // One uniform block: a report's rows stay whole lines (name, result, unit,
  // range), where the default page layout splits the columns apart. Measured
  // on a generated report: every value read, against several lost.
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
  return worker;
}

/** A photo drawn upright (EXIF orientation applied) and no larger than MAX_EDGE. */
async function drawImage(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  // Small photos are enlarged (up to 2×): the reader drops decimal points in small print.
  const scale = Math.min(2, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  // Grey on white reads better than colour for printed reports.
  ctx.filter = "grayscale(1) contrast(1.15)";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

interface TextItem {
  str: string;
  transform: number[];
}

/** A PDF page's text layer as lines: items grouped by baseline, left to right. */
function linesOf(items: TextItem[]): string {
  const rows: { y: number; parts: { x: number; s: string }[] }[] = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const row = rows.find((r) => Math.abs(r.y - y) < 3);
    if (row) row.parts.push({ x, s: it.str });
    else rows.push({ y, parts: [{ x, s: it.str }] });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) =>
      r.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.s.trim())
        .join(" ")
    )
    .join("\n");
}

/** Reads a report photo or PDF into text, on this device. */
export async function readReport(file: File, { onProgress, signal }: ReadOptions = {}): Promise<ReadOutcome> {
  const progress = (f: number) => onProgress?.(Math.max(0, Math.min(1, f)));
  let worker: OcrWorker | null = null;
  const stop = () => void worker?.terminate();
  signal?.addEventListener("abort", stop, { once: true });
  try {
    progress(0.02);
    const pages: (string | HTMLCanvasElement)[] = [];
    if (file.type === "application/pdf") {
      const lib = await loadPdfJs();
      const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
      const count = Math.min(doc.numPages, MAX_PAGES);
      for (let n = 1; n <= count; n++) {
        if (signal?.aborted) return { ok: false, reason: "cancelled" };
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        const text = linesOf(content.items as TextItem[]);
        if (text.replace(/\s/g, "").length >= 40) {
          pages.push(text);
        } else {
          // A scanned page: draw it and read it like a photo.
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(3, MAX_EDGE / Math.max(base.width, base.height)) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
          pages.push(canvas);
        }
      }
      await doc.destroy();
    } else {
      pages.push(await drawImage(file));
    }
    if (signal?.aborted) return { ok: false, reason: "cancelled" };

    const images = pages.filter((p): p is HTMLCanvasElement => typeof p !== "string");
    const texts: string[] = [];
    if (images.length === 0) {
      progress(1);
      return { ok: true, text: pages.join("\n") };
    }
    let done = 0;
    worker = await startReader((f) => progress(0.1 + (0.9 * (done + f)) / images.length));
    if (signal?.aborted) return { ok: false, reason: "cancelled" };
    progress(0.1);
    for (const p of pages) {
      if (typeof p === "string") {
        texts.push(p);
        continue;
      }
      const { data } = await worker.recognize(p);
      texts.push(data.text);
      done++;
      if (signal?.aborted) return { ok: false, reason: "cancelled" };
    }
    progress(1);
    const text = texts.join("\n");
    return text.replace(/\s/g, "").length < 10 ? { ok: false, reason: "unreadable" } : { ok: true, text };
  } catch (e) {
    if (signal?.aborted) return { ok: false, reason: "cancelled" };
    console.error("[labs] The on-device reader failed:", e);
    return { ok: false, reason: "failed" };
  } finally {
    signal?.removeEventListener("abort", stop);
    void worker?.terminate();
  }
}
