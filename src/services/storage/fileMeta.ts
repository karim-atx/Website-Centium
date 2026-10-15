import { PDFDocument } from "pdf-lib";

/**
 * B2 file description for blood_panels / imaging_records (file_name,
 * file_type, file_pages, file_bytes). Descriptive only: the object is still
 * reached through the path column under the bucket policies. Pages are read
 * on the device with pdf-lib (PDF only); a PDF that cannot be parsed simply
 * has no page count. Limits per the table CHECKs: name 1-200, bytes up to
 * 50 MB, pages 1-500.
 */
/** A stored file_type (CHECK: null, 'pdf' or 'image') narrowed to its union. */
export const fileTypeOf = (v: string | null | undefined): FileMeta["file_type"] | null => (v === "pdf" || v === "image" ? v : null);

export interface FileMeta {
  file_name: string | null;
  file_type: "pdf" | "image";
  file_pages: number | null;
  file_bytes: number | null;
}

export async function fileMetaOf(file: File): Promise<FileMeta> {
  const pdf = file.type === "application/pdf";
  let pages: number | null = null;
  if (pdf) {
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
      const n = doc.getPageCount();
      pages = n >= 1 && n <= 500 ? n : null;
    } catch {
      pages = null;
    }
  }
  const name = file.name.trim().slice(0, 200);
  return {
    file_name: name || null,
    file_type: pdf ? "pdf" : "image",
    file_pages: pages,
    file_bytes: file.size >= 1 && file.size <= 52428800 ? file.size : null,
  };
}

/** "3.2 MB" / "640 KB". */
export const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
