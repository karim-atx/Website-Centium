import test from "node:test";
import assert from "node:assert/strict";
import {
  isPdf,
  pdfCarriesMetadata,
  checkPdfInput,
  describePdfRefusal,
  PDF_MAX_BYTES,
} from "./pdfBytes";

const enc = (s: string) => new Uint8Array(Array.from(s, (c) => c.charCodeAt(0)));

/** A minimal well-formed-enough PDF for the byte checks. */
const bare = (body = "") => enc(`%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n${body}%%EOF\n`);

test("isPdf accepts the PDF header", () => {
  assert.equal(isPdf(bare()), true);
});

test("isPdf refuses anything else, including an empty file", () => {
  assert.equal(isPdf(new Uint8Array()), false);
  assert.equal(isPdf(enc("not a pdf at all")), false);
  // A JPEG, which is the realistic mistake: the file picker accepts a drag.
  assert.equal(isPdf(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00])), false);
  // A truncated header is not a header.
  assert.equal(isPdf(enc("%PDF")), false);
});

test("A STRIPPED PDF CARRIES NOTHING IDENTIFYING", () => {
  assert.equal(pdfCarriesMetadata(bare()), false);
});

test("every identifying Info key is caught", () => {
  for (const key of ["/Author", "/Creator", "/Producer", "/Title", "/Subject", "/Keywords"]) {
    assert.equal(
      pdfCarriesMetadata(bare(`2 0 obj\n<< ${key} (Dr Jane Smith) >>\nendobj\n`)),
      true,
      `${key} should be caught`
    );
  }
});

test("A DATE IS NOT IDENTIFYING AND IS NOT REFUSED", () => {
  // pdf-lib writes a ModDate on every save; refusing it would refuse everything.
  assert.equal(pdfCarriesMetadata(bare("2 0 obj\n<< /ModDate (D:19700101000000Z) >>\nendobj\n")), false);
  assert.equal(pdfCarriesMetadata(bare("2 0 obj\n<< /CreationDate (D:19700101000000Z) >>\nendobj\n")), false);
});

test("an XMP stream is caught, spaced or not", () => {
  assert.equal(pdfCarriesMetadata(bare("3 0 obj\n<< /Type /Metadata /Subtype /XML >>\nstream\n")), true);
  assert.equal(pdfCarriesMetadata(bare("3 0 obj\n<< /Type/Metadata >>\nstream\n")), true);
});

test("XMP caught by its XML markers even without the dictionary", () => {
  assert.equal(pdfCarriesMetadata(bare('<?xpacket begin="" id="W5M0Mp"?>\n')), true);
  assert.equal(pdfCarriesMetadata(bare('<x:xmpmeta xmlns:x="adobe:ns:meta/">\n')), true);
});

test("a key at the very start and the very end is still found", () => {
  assert.equal(pdfCarriesMetadata(enc("/Author (X)")), true);
  assert.equal(pdfCarriesMetadata(enc("%PDF-1.7\n/Author")), true);
});

test("a needle longer than the file does not match", () => {
  assert.equal(pdfCarriesMetadata(enc("/Auth")), false);
  assert.equal(pdfCarriesMetadata(new Uint8Array()), false);
});

test("a near-miss key is not a false positive", () => {
  // "/Authorised" contains "/Author", so it IS caught — the check is
  // deliberately conservative and this records that choice rather than
  // pretending it discriminates.
  assert.equal(pdfCarriesMetadata(bare("/Authorised (yes)")), true);
  // But an unrelated word is not.
  assert.equal(pdfCarriesMetadata(bare("/Contents 4 0 R\n/MediaBox [0 0 612 792]")), false);
});

test("checkPdfInput refuses an empty file first", () => {
  assert.deepEqual(checkPdfInput(new Uint8Array()), { ok: false, reason: "empty" });
});

test("checkPdfInput refuses over the bucket's 20 MB", () => {
  const big = new Uint8Array(PDF_MAX_BYTES + 1);
  big.set(enc("%PDF-"));
  assert.deepEqual(checkPdfInput(big), { ok: false, reason: "too-large" });
});

test("exactly 20 MB is allowed, one byte over is not", () => {
  const atLimit = new Uint8Array(PDF_MAX_BYTES);
  atLimit.set(enc("%PDF-"));
  assert.deepEqual(checkPdfInput(atLimit), { ok: true });
});

test("checkPdfInput refuses a non-PDF that is the right size", () => {
  assert.deepEqual(checkPdfInput(enc("hello, this is a text file")), { ok: false, reason: "not-pdf" });
});

test("checkPdfInput accepts a plain PDF", () => {
  assert.deepEqual(checkPdfInput(bare()), { ok: true });
});

test("every refusal has words, and they say what to do", () => {
  for (const reason of ["empty", "too-large", "not-pdf", "metadata-remains"] as const) {
    const text = describePdfRefusal(reason);
    assert.ok(text.length > 0, `${reason} has no message`);
    assert.ok(/\.$/.test(text), `${reason} should end in a full stop`);
  }
  assert.match(describePdfRefusal("too-large"), /20 MB/);
});
