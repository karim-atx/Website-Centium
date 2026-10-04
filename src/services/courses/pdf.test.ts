import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import { preparePdf } from "./pdf";
import { pdfCarriesMetadata, PDF_MAX_BYTES } from "./pdfBytes";

// The real round trip, not a mock.
//
// preparePdf opens no Supabase client, so it is testable here, and it is worth
// testing here rather than only in a browser: the two bugs this file catches —
// emptied keys that stay in the file, and an XMP object that outlives the
// reference to it — both looked correct in the source and were only visible in
// the bytes that came out.

const NAME = "Dr Jane Smith";
const PATH = "/Users/jane/Documents/private-course-draft.docx";

/** A PDF that looks like a real export: Info fields and two XMP streams. */
async function exportedPdf(opts: { xmp?: boolean } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("Week 1 plan", { x: 60, y: 700, size: 24, font });
  doc.setTitle("My private plan");
  doc.setAuthor(NAME);
  doc.setSubject("Confidential");
  doc.setKeywords(["draft", "internal"]);
  doc.setProducer("Microsoft Word for Mac");
  doc.setCreator(PATH);

  if (opts.xmp !== false) {
    const xml =
      '<?xpacket begin="" id="W5M0Mp"?><x:xmpmeta xmlns:x="adobe:ns:meta/">' +
      `<rdf:RDF><rdf:Description dc:creator="${NAME}"/></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
    // On the catalogue, where most writers put it...
    doc.catalog.set(PDFName.of("Metadata"), doc.context.register(doc.context.stream(xml, { Type: "Metadata", Subtype: "XML" })));
    // ...and on the page, where some also do.
    page.node.set(PDFName.of("Metadata"), doc.context.register(doc.context.stream(xml, { Type: "Metadata", Subtype: "XML" })));
  }
  return doc.save({ useObjectStreams: false });
}

const text = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

test("THE AUTHOR'S NAME DOES NOT SURVIVE", async () => {
  const dirty = await exportedPdf();
  assert.ok(text(dirty).includes(NAME), "the fixture should start out carrying the name");

  const result = await preparePdf(new Blob([dirty]));
  assert.ok(result.ok, result.ok ? "" : result.message);
  assert.ok(!text(result.bytes).includes(NAME), "the name is still in the output");
});

test("THE FILE PATH THEY SAVED FROM DOES NOT SURVIVE", async () => {
  const result = await preparePdf(new Blob([(await exportedPdf())]));
  assert.ok(result.ok);
  assert.ok(!text(result.bytes).includes(PATH));
  assert.ok(!text(result.bytes).includes("jane"));
});

test("the output passes the byte check that guards the upload", async () => {
  const result = await preparePdf(new Blob([(await exportedPdf())]));
  assert.ok(result.ok);
  assert.equal(pdfCarriesMetadata(result.bytes), false);
});

test("a PDF with no XMP is stripped just the same", async () => {
  const result = await preparePdf(new Blob([(await exportedPdf({ xmp: false }))]));
  assert.ok(result.ok);
  assert.equal(pdfCarriesMetadata(result.bytes), false);
});

test("THE DOCUMENT STILL OPENS, AND ITS PAGE IS STILL THERE", async () => {
  const result = await preparePdf(new Blob([(await exportedPdf())]));
  assert.ok(result.ok);
  const back = await PDFDocument.load(result.bytes);
  assert.equal(back.getPageCount(), 1);
  assert.equal(back.getTitle() ?? null, null);
  assert.equal(back.getAuthor() ?? null, null);
});

test("a multi-page document keeps every page", async () => {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  doc.addPage([612, 792]);
  doc.addPage([612, 792]);
  doc.setAuthor(NAME);
  const result = await preparePdf(new Blob([(await doc.save({ useObjectStreams: false }))]));
  assert.ok(result.ok);
  assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 3);
});

test("stripping twice is stable", async () => {
  const once = await preparePdf(new Blob([(await exportedPdf())]));
  assert.ok(once.ok);
  const twice = await preparePdf(new Blob([once.bytes]));
  assert.ok(twice.ok);
  assert.equal(pdfCarriesMetadata(twice.bytes), false);
});

test("a file that is not a PDF is refused before anything is parsed", async () => {
  const result = await preparePdf(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])]));
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.message, /isn't a PDF/);
});

test("an empty file is refused", async () => {
  const result = await preparePdf(new Blob([]));
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.message, /empty/);
});

test("a file over the bucket's limit is refused without parsing it", async () => {
  const big = new Uint8Array(PDF_MAX_BYTES + 1);
  big.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
  const result = await preparePdf(new Blob([big]));
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.message, /20 MB/);
});

test("A PDF HEADER OVER RUBBISH IS REFUSED, NOT UPLOADED", async () => {
  // Passes checkPdfInput on its header and then fails to parse, which is the
  // path that must end in a refusal rather than an exception.
  const result = await preparePdf(new Blob([new TextEncoder().encode("%PDF-1.7\nthis is not a document")]));
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.message, /couldn't read that PDF/);
});
