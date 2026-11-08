import { loadArabicForCanvas } from "../../i18n/fonts";
import { layoutPages, type Block, type BlockKind, type LayoutOptions } from "./summaryLayout";

// Round G3 · the doctor summary as a PDF made on the device, nothing
// uploaded. The pages are painted on a canvas (as the share cards are, so the
// browser shapes Arabic exactly as on screen) and placed, one image a page,
// in an A4 PDF with pdf-lib, which loads on demand in its own chunk as it
// does for course PDFs (services/courses/pdf).

// A4 at 2× (595 × 842 pt).
const OPTIONS: LayoutOptions = {
  width: 1190,
  height: 1684,
  margin: 96,
  footer: 56,
  size: { title: 40, subtitle: 22, notice: 24, heading: 28, line: 22, empty: 22 },
  leading: 1.45,
  before: { notice: 12, heading: 28, line: 2, empty: 2 },
};
const WEIGHT: Record<BlockKind, number> = { title: 800, subtitle: 500, notice: 700, heading: 700, line: 400, empty: 400 };
const INK: Record<BlockKind, string> = { title: "#241F1B", subtitle: "#5B5349", notice: "#9B2C2C", heading: "#241F1B", line: "#241F1B", empty: "#71685E" };
const font = (k: BlockKind) => `${WEIGHT[k]} ${OPTIONS.size[k]}px Manrope, "IBM Plex Sans Arabic", sans-serif`;
const FOOT = `500 18px Manrope, "IBM Plex Sans Arabic", sans-serif`;

export async function makeSummaryPdf(blocks: readonly Block[], footer: string, rtl: boolean): Promise<Blob> {
  const kinds = Object.keys(WEIGHT) as BlockKind[];
  await loadArabicForCanvas([...kinds.map(font), FOOT], blocks.map((b) => b.text).join(" ") + footer);
  const canvas = document.createElement("canvas");
  canvas.width = OPTIONS.width;
  canvas.height = OPTIONS.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  const pages = layoutPages(blocks, OPTIONS, (s, k) => {
    ctx.font = font(k);
    return ctx.measureText(s).width;
  });

  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const x = rtl ? OPTIONS.width - OPTIONS.margin : OPTIONS.margin;
  for (let i = 0; i < pages.length; i++) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, OPTIONS.width, OPTIONS.height);
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    ctx.textBaseline = "alphabetic";
    for (const l of pages[i]) {
      ctx.font = font(l.kind);
      ctx.fillStyle = INK[l.kind];
      ctx.fillText(l.text, x, l.y);
    }
    ctx.font = FOOT;
    ctx.fillStyle = "#71685E";
    ctx.fillText(`${footer} · ${i + 1}/${pages.length}`, x, OPTIONS.height - OPTIONS.margin + 20);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
    const img = await doc.embedPng(new Uint8Array(await png.arrayBuffer()));
    const page = doc.addPage([595.28, 841.89]);
    page.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

/** Saves a blob as a file on the device. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
