// Byte-level checks on a forum photo after it has been re-drawn. Pure, so the
// rule "no metadata segment survives" is tested on its own.

const ICC = [0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00]; // "ICC_PROFILE\0"

function isIccSegment(bytes: Uint8Array, start: number): boolean {
  return ICC.every((b, k) => bytes[start + 4 + k] === b);
}

/**
 * True when a JPEG still carries a segment that can hold location or camera
 * details: APP1 (Exif, XMP), APP2-APP15, or a COM comment. Two segments are
 * allowed because they describe only how to draw the pixels: APP0 (JFIF,
 * pixel density) and an APP2 that is an ICC colour profile, which Chrome's
 * canvas encoder writes on every JPEG. Any other APP2 is refused.
 *
 * Also true for anything that is not a well-formed JPEG up to its first scan,
 * so a malformed result is refused rather than shared.
 */
export function jpegCarriesMetadata(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return true;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return true;
    const marker = bytes[i + 1];
    // Start of scan: the header is over, and everything after is pixel data.
    if (marker === 0xda) return false;
    // Standalone markers carry no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2) return true;
    if (marker === 0xe2 && isIccSegment(bytes, i)) {
      i += 2 + length;
      continue;
    }
    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) return true;
    i += 2 + length;
  }
  return true;
}
