// Byte-level checks on a course PDF, before and after it is rewritten. Pure,
// so the rule "no metadata survives" is tested on its own — the same split the
// forum's photoBytes.ts uses for the same reason.
//
// WHAT A PDF CARRIES THAT NOBODY MEANT TO PUBLISH. A PDF exported from Word or
// Pages names the author in its Info dictionary, usually with the account's
// real name rather than the one on the course, and often the file path it was
// saved from. A second copy of the same thing lives in an XMP metadata stream
// as XML. Both survive every operation that is not a deliberate rewrite, and
// neither is visible in any reader's main view, so an author has no way to
// notice.
//
// THIS FILE DOES NOT DO THE STRIPPING — pdf.ts does, through pdf-lib. What is
// here is the verification: given the bytes that came back, is there still
// something in them that should not be. Checking the output rather than
// trusting the library is the forum photo lesson exactly: re-drawing a JPEG
// through a canvas is *supposed* to discard EXIF, and the check is there
// because "supposed to" is not a guarantee anybody tested on this input.

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/** True for anything that does not begin with a PDF header. */
export function isPdf(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_HEADER.length) return false;
  return PDF_HEADER.every((b, i) => bytes[i] === b);
}

/**
 * The Info-dictionary keys that name a person, a machine or a file path.
 *
 * CreationDate and ModDate are NOT here. A date is not identifying on its own,
 * pdf-lib writes a ModDate of its own on every save, and refusing the output
 * for carrying one would refuse every file.
 */
const IDENTIFYING_KEYS = ["/Author", "/Creator", "/Producer", "/Title", "/Subject", "/Keywords"] as const;

const bytesOf = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

function contains(haystack: Uint8Array, needle: number[]): boolean {
  if (needle.length === 0 || haystack.length < needle.length) return false;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let k = 0; k < needle.length; k++) {
      if (haystack[i + k] !== needle[k]) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * True when the rewritten bytes still carry something identifying: an Info key
 * that names a person or a machine, or an XMP metadata stream.
 *
 * THIS IS A SUBSTRING SEARCH OVER THE WHOLE FILE, not a parse, and that is
 * deliberate in both directions. It cannot be fooled by a key hiding in a
 * cross-reference stream the parser would skip; and it is allowed to be
 * conservative, because a false positive refuses an upload with a message the
 * author can act on, while a false negative publishes their name. An embedded
 * font legitimately named "/Producer" would be refused — that has not been
 * seen, and refusing is the safe direction.
 *
 * Compressed object streams are the known limit: a PDF whose Info dictionary
 * lives inside a /ObjStm is not searchable this way. pdf-lib writes the
 * trailer dictionary uncompressed on save, so the output this checks is the
 * output it can see — which is why isPdf() and the pdf-lib round trip in
 * pdf.ts are both part of the rule and not this function alone.
 */
export function pdfCarriesMetadata(bytes: Uint8Array): boolean {
  for (const key of IDENTIFYING_KEYS) {
    if (contains(bytes, bytesOf(key))) return true;
  }
  // The XMP stream, by the marker every writer emits around it.
  if (contains(bytes, bytesOf("/Type /Metadata")) || contains(bytes, bytesOf("/Type/Metadata"))) return true;
  if (contains(bytes, bytesOf("<x:xmpmeta")) || contains(bytes, bytesOf("<?xpacket"))) return true;
  return false;
}

/** 20 MB, the course-pdfs bucket's own file_size_limit. */
export const PDF_MAX_BYTES = 20 * 1024 * 1024;

export type PdfRefusal =
  | { ok: true }
  | { ok: false; reason: "not-pdf" | "too-large" | "empty" | "metadata-remains" };

/** What the caller may upload, checked before any rewrite is attempted. */
export function checkPdfInput(bytes: Uint8Array): PdfRefusal {
  if (bytes.length === 0) return { ok: false, reason: "empty" };
  if (bytes.length > PDF_MAX_BYTES) return { ok: false, reason: "too-large" };
  if (!isPdf(bytes)) return { ok: false, reason: "not-pdf" };
  return { ok: true };
}

/** Words for each refusal. The size limit is the bucket's, so it is named. */
export function describePdfRefusal(reason: Exclude<PdfRefusal, { ok: true }>["reason"]): string {
  switch (reason) {
    case "empty":
      return "That file is empty.";
    case "too-large":
      return "PDFs can be up to 20 MB.";
    case "not-pdf":
      return "That isn't a PDF. Choose a .pdf file.";
    case "metadata-remains":
      // The author can act on this: export a fresh copy, or flatten it.
      return "We couldn't strip the hidden details from that PDF, so it wasn't uploaded. Try exporting it again from your editor.";
  }
}
