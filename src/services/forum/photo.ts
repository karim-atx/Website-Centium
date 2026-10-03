import { jpegCarriesMetadata } from "./photoBytes";

// Preparing a forum photo: every byte of metadata removed, or no photo at all.
//
// THE OPPOSITE OF stripPrivateExif's RULE, ON PURPOSE. That function never
// blocks an upload, because a lost lab report is worse than a bounded leak to
// a professional the user chose. A forum photo is shown to the whole
// community, often under a nickname, so a photo that still carries where it
// was taken would undo the nickname. Here a failure REFUSES the photo.
//
// RE-DRAWN, NOT EDITED. The image is decoded (with its orientation applied),
// drawn to a canvas and encoded again as JPEG. A canvas encoder writes no
// Exif, XMP or comment, so location, camera make and model, serial numbers and
// the embedded thumbnail all go, whatever tags a phone invented. The result is
// then checked byte by byte, and refused if anything that can hold metadata is
// still there.
//
// Long edge capped at 2048px, which keeps a phone photo well inside the
// bucket's 5 MB limit without a visible loss on a phone screen.

/**
 * On since Database f3df07e, which moved the forum-photos write policies'
 * ownership check into security-definer functions (the first version read
 * forum_photos directly, which the authenticated role cannot, and refused
 * every upload). Kept as a switch so photos can be turned off in one place.
 */
export const FORUM_PHOTOS_ENABLED = true;

export const FORUM_PHOTO_MAX_EDGE = 2048;
export const FORUM_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
export const FORUM_PHOTO_ACCEPT = ACCEPTED.join(",");

export type PreparedPhoto = { ok: true; file: File } | { ok: false; message: string };

export const PHOTO_NOT_PREPARED =
  "This photo couldn't be prepared safely, so it wasn't added. Try a different photo.";

async function decode(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
}

export async function prepareForumPhoto(file: File): Promise<PreparedPhoto> {
  if (!ACCEPTED.includes(file.type)) {
    return { ok: false, message: "Choose a JPEG, PNG or WebP photo." };
  }
  try {
    const bitmap = await decode(file);
    const scale = Math.min(1, FORUM_PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, message: PHOTO_NOT_PREPARED };
    // JPEG has no transparency: a PNG's clear areas would otherwise turn black.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await toJpeg(canvas);
    if (!blob) return { ok: false, message: PHOTO_NOT_PREPARED };
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (jpegCarriesMetadata(bytes)) return { ok: false, message: PHOTO_NOT_PREPARED };
    if (bytes.length > FORUM_PHOTO_MAX_BYTES) {
      return { ok: false, message: "This photo is too large. Choose one under 5 MB." };
    }
    return { ok: true, file: new File([bytes as BlobPart], "photo.jpg", { type: "image/jpeg" }) };
  } catch {
    return { ok: false, message: PHOTO_NOT_PREPARED };
  }
}
