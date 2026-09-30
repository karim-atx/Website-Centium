import { strict as assert } from "node:assert";
import { test } from "node:test";
import { pngChunkTypes, stripPngMetadata, stripWebpMetadata, webpChunkTypes } from "./imageMetadata";

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const u32be = (n: number) => Uint8Array.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const u32le = (n: number) => Uint8Array.from([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
const join = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
const pngChunk = (type: string, data: Uint8Array) => join(u32be(data.length), ascii(type), data, u32be(0));
const webpChunk = (type: string, data: Uint8Array) =>
  join(ascii(type), u32le(data.length), data, data.length % 2 ? Uint8Array.of(0) : new Uint8Array());
const GPS_XMP = ascii('<x:xmpmeta><rdf:Description exif:GPSLatitude="33,53.0N" tiff:Make="Apple"/></x:xmpmeta>');
const EXIF = join(ascii("Exif\0\0MM"), ascii("GPS 33.8886 35.4955 iPhone 15 Pro serial C39X"));

function png(...extra: Uint8Array[]) {
  return join(
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", new Uint8Array(13)),
    pngChunk("sRGB", Uint8Array.of(0)),
    ...extra,
    pngChunk("IDAT", Uint8Array.of(1, 2, 3, 4)),
    pngChunk("IEND", new Uint8Array())
  );
}

test("PNG: Exif and every text chunk (where XMP lives) are removed, everything else kept byte for byte", () => {
  const input = png(
    pngChunk("eXIf", EXIF),
    pngChunk("iTXt", join(ascii("XML:com.adobe.xmp\0\0\0\0\0"), GPS_XMP)),
    pngChunk("tEXt", ascii("Author\0Somebody")),
    pngChunk("zTXt", ascii("Comment\0\0x"))
  );
  const out = stripPngMetadata(input)!;
  assert.deepEqual(pngChunkTypes(out), ["IHDR", "sRGB", "IDAT", "IEND"]);
  assert.deepEqual(out, png());
  const asText = new TextDecoder("latin1").decode(out);
  assert.ok(!asText.includes("GPS") && !asText.includes("Apple") && !asText.includes("iPhone"));
});

test("PNG without metadata is left alone", () => {
  assert.equal(stripPngMetadata(png()), null);
});

test("PNG that is not one, or truncated, throws (the caller then uploads nothing it cannot vouch for)", () => {
  assert.throws(() => stripPngMetadata(ascii("GIF89a")));
  assert.throws(() => stripPngMetadata(png(pngChunk("eXIf", EXIF)).slice(0, 40)));
});

function webp(flags: number, ...extra: Uint8Array[]) {
  const vp8x = join(Uint8Array.of(flags, 0, 0, 0), Uint8Array.of(9, 0, 0), Uint8Array.of(9, 0, 0));
  const body = join(webpChunk("VP8X", vp8x), webpChunk("VP8L", Uint8Array.of(0x2f, 1, 2, 3, 4)), ...extra);
  return join(ascii("RIFF"), u32le(4 + body.length), ascii("WEBP"), body);
}

test("WebP: EXIF and XMP chunks removed, VP8X flags cleared, RIFF size corrected", () => {
  const input = webp(0x08 | 0x04 | 0x10, webpChunk("EXIF", EXIF), webpChunk("XMP ", GPS_XMP));
  const out = stripWebpMetadata(input)!;
  assert.deepEqual(webpChunkTypes(out), ["VP8X", "VP8L"]);
  // Flags: EXIF (0x08) and XMP (0x04) cleared, the alpha flag (0x10) kept.
  assert.equal(out[20], 0x10);
  const riff = out[4] | (out[5] << 8) | (out[6] << 16) | (out[7] << 24);
  assert.equal(riff, out.length - 8);
  assert.deepEqual(out, webp(0x10));
  const asText = new TextDecoder("latin1").decode(out);
  assert.ok(!asText.includes("GPS") && !asText.includes("Apple"));
});

test("WebP without metadata is left alone; odd-length chunks keep their padding", () => {
  assert.equal(stripWebpMetadata(webp(0)), null);
  const odd = webp(0x08, webpChunk("EXIF", ascii("abc")));
  assert.deepEqual(webpChunkTypes(stripWebpMetadata(odd)!), ["VP8X", "VP8L"]);
});
