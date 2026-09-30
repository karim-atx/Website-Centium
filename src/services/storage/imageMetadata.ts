// Removing location and camera metadata from PNG and WebP files, losslessly.
//
// Both formats keep metadata in separate, typed chunks beside the pixels, so
// the chunks can be dropped without decoding or re-encoding the image: the
// pixels, colour profile and transparency come through byte for byte.
//
//   PNG   eXIf (Exif: GPS, camera make/model, serial numbers), and the text
//         chunks tEXt / zTXt / iTXt, which is where XMP lives — XMP carries GPS
//         and device fields just as Exif does. All four go.
//   WebP  EXIF and "XMP " go, and the VP8X header's two flags announcing them
//         are cleared so the file does not claim metadata it no longer has.
//
// Everything else — IHDR, PLTE, IDAT, iCCP, sRGB, gAMA, tRNS, pHYs, animation
// chunks, VP8/VP8L/ALPH/ICCP/ANIM/ANMF — is copied unchanged.

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_METADATA = new Set(["eXIf", "tEXt", "zTXt", "iTXt"]);
const WEBP_METADATA = new Set(["EXIF", "XMP "]);

const fourcc = (b: Uint8Array, at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);

export function isPng(b: Uint8Array) {
  return b.length >= 8 && PNG_SIGNATURE.every((v, i) => b[i] === v);
}

export function isWebp(b: Uint8Array) {
  return b.length >= 12 && fourcc(b, 0) === "RIFF" && fourcc(b, 8) === "WEBP";
}

/** The PNG with its metadata chunks removed, or null if nothing needed removing. Throws on a malformed file. */
export function stripPngMetadata(b: Uint8Array): Uint8Array | null {
  if (!isPng(b)) throw new Error("not a PNG");
  const keep: Uint8Array[] = [b.subarray(0, 8)];
  let removed = false;
  let at = 8;
  while (at < b.length) {
    if (at + 12 > b.length) throw new Error("truncated PNG chunk");
    const len = ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
    const type = fourcc(b, at + 4);
    const end = at + 12 + len; // length + type + data + CRC
    if (end > b.length) throw new Error("PNG chunk runs past the end");
    if (PNG_METADATA.has(type)) removed = true;
    else keep.push(b.subarray(at, end));
    at = end;
    if (type === "IEND") break;
  }
  return removed ? concat(keep) : null;
}

/** The WebP with EXIF/XMP removed, or null if nothing needed removing. Throws on a malformed file. */
export function stripWebpMetadata(b: Uint8Array): Uint8Array | null {
  if (!isWebp(b)) throw new Error("not a WebP");
  const keep: Uint8Array[] = [];
  let removed = false;
  let vp8xIndex = -1;
  let at = 12;
  while (at + 8 <= b.length) {
    const type = fourcc(b, at);
    const size = (b[at + 4] | (b[at + 5] << 8) | (b[at + 6] << 16) | (b[at + 7] << 24)) >>> 0;
    const end = at + 8 + size + (size % 2); // chunks are padded to an even length
    if (end > b.length + 1) throw new Error("WebP chunk runs past the end");
    const chunk = b.slice(at, Math.min(end, b.length));
    if (WEBP_METADATA.has(type)) removed = true;
    else {
      if (type === "VP8X") vp8xIndex = keep.length;
      keep.push(chunk);
    }
    at = end;
  }
  if (!removed) return null;
  if (vp8xIndex >= 0) {
    // VP8X flags byte: bit 3 = EXIF present, bit 2 = XMP present.
    keep[vp8xIndex][8] &= ~(0x08 | 0x04);
  }
  const body = concat(keep);
  const out = new Uint8Array(12 + body.length);
  out.set(b.subarray(0, 12), 0);
  out.set(body, 12);
  const riffSize = out.length - 8;
  out[4] = riffSize & 0xff;
  out[5] = (riffSize >>> 8) & 0xff;
  out[6] = (riffSize >>> 16) & 0xff;
  out[7] = (riffSize >>> 24) & 0xff;
  return out;
}

/** Chunk types present, in order — for verification. */
export function pngChunkTypes(b: Uint8Array): string[] {
  const types: string[] = [];
  let at = 8;
  while (at + 12 <= b.length) {
    const len = ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
    types.push(fourcc(b, at + 4));
    at += 12 + len;
  }
  return types;
}

export function webpChunkTypes(b: Uint8Array): string[] {
  const types: string[] = [];
  let at = 12;
  while (at + 8 <= b.length) {
    const size = (b[at + 4] | (b[at + 5] << 8) | (b[at + 6] << 16) | (b[at + 7] << 24)) >>> 0;
    types.push(fourcc(b, at));
    at += 8 + size + (size % 2);
  }
  return types;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
