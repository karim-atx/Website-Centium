import { checkPdfInput, describePdfRefusal, isPdf, pdfCarriesMetadata } from "./pdfBytes";

// Preparing a course PDF: every identifying field removed, or no PDF at all.
//
// THE FORUM PHOTO RULE, APPLIED TO A FORMAT THAT HAS NO CANVAS. A photo is
// re-drawn, and re-encoding pixels discards EXIF as a side effect. A PDF has no
// equivalent: its metadata is structure, not a header to drop. So the document
// is parsed, the Info dictionary is emptied, every XMP stream is removed, and
// the result is saved afresh.
//
// AND THEN THE OUTPUT IS CHECKED, which is the part that matters, and which
// caught two real mistakes while this was being written:
//
//   * setTitle("") and its siblings leave the KEYS in place with empty values.
//     The names were gone but "/Author" was still in the file, so the check
//     refused every upload. The entries are deleted outright instead.
//   * catalog.delete(Metadata) removes the REFERENCE and leaves the stream
//     object in the document, where pdf-lib serialises it anyway — the XML
//     naming the author survived in full. The objects themselves are deleted.
//
// Both were invisible without checking the bytes that actually come out, which
// is the whole argument for checking them.
//
// pdf-lib IS LOADED ON DEMAND. It is the largest dependency in the app and only
// a professional building a course ever needs it, so it is imported here and
// lands in its own chunk rather than in every learner's bundle.

export type PreparedPdf = { ok: true; bytes: Uint8Array } | { ok: false; message: string };

/**
 * Parse, strip, save, verify. Returns the bytes to upload, or the reason not to
 * upload anything.
 */
export async function preparePdf(file: Blob): Promise<PreparedPdf> {
  const input = new Uint8Array(await file.arrayBuffer());

  const allowed = checkPdfInput(input);
  if (!allowed.ok) return { ok: false, message: describePdfRefusal(allowed.reason) };

  let out: Uint8Array;
  try {
    const { PDFDocument, PDFDict, PDFName } = await import("pdf-lib");
    // updateMetadata: false stops pdf-lib stamping its own Producer and
    // ModDate back on at save time, which would re-add two of the keys this
    // function exists to remove. ignoreEncryption lets a "protected" export
    // through the parser; if it cannot really be rewritten the output check
    // catches it, so there is one refusal path rather than two.
    const doc = await PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false });

    // 1. THE INFO DICTIONARY, emptied key by key. Title, Author, Subject,
    //    Keywords, Creator, Producer, CreationDate, ModDate — whatever is
    //    there goes, rather than a fixed list, so a non-standard key some
    //    exporter invented goes with them.
    const infoRef = doc.context.trailerInfo.Info;
    const info = infoRef ? doc.context.lookup(infoRef) : null;
    if (info instanceof PDFDict) {
      for (const key of [...info.keys()]) info.delete(key);
    }

    // 2. EVERY XMP STREAM, wherever it hangs. The catalogue is the usual
    //    place, but a page can carry its own and some exporters attach one to
    //    an embedded image, so this walks every indirect object rather than
    //    trusting the two it expects. Both halves are needed: the reference,
    //    so nothing points at it, and the object, because pdf-lib writes out
    //    every registered object whether or not anything still refers to it.
    const META = PDFName.of("Metadata");
    const TYPE = PDFName.of("Type");
    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
      // A stream keeps its dictionary on .dict; a plain dictionary IS one.
      const held = (obj as unknown as { dict?: unknown }).dict;
      const dict = obj instanceof PDFDict ? obj : held instanceof PDFDict ? held : null;
      if (!dict) continue;
      if (dict.get(META)) dict.delete(META);
      if (dict.get(TYPE)?.toString() === "/Metadata") doc.context.delete(ref);
    }
    doc.catalog.delete(META);

    // useObjectStreams: false keeps the trailer and what is left of the Info
    // dictionary as plain bytes. Compressed into an object stream they would
    // be unreadable to pdfCarriesMetadata(), which would then pass a file it
    // had not actually looked inside.
    out = await doc.save({ useObjectStreams: false, updateFieldAppearances: false });
  } catch {
    return {
      ok: false,
      message: "We couldn't read that PDF. Try exporting it again from your editor.",
    };
  }

  // The output is checked, not assumed.
  if (!isPdf(out) || out.length === 0) {
    return { ok: false, message: describePdfRefusal("not-pdf") };
  }
  if (pdfCarriesMetadata(out)) {
    return { ok: false, message: describePdfRefusal("metadata-remains") };
  }
  return { ok: true, bytes: out };
}
