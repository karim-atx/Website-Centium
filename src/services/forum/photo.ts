import { jpegCarriesMetadata, stripEncoderSegments } from "./photoBytes";

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

/** Formats a phone may hand over that the browser itself may still be able to decode. */
const MAYBE_DECODABLE = ["image/heic", "image/heif", ""];

export const PHOTO_FORMAT_UNSUPPORTED =
  "This photo's format isn't supported here. Choose a JPEG, PNG or WebP photo.";

type Drawable = { source: CanvasImageSource; width: number; height: number; done: () => void };

/**
 * Decodes the photo with its orientation applied. createImageBitmap with the
 * orientation option first; where that is missing or refuses (older Safari,
 * some Android browsers), an <img>, which applies EXIF orientation by default
 * (image-orientation: from-image) in every current browser.
 */
async function decode(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      const b = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: b, width: b.width, height: b.height, done: () => b.close() };
    } catch {
      /* fall through to the image element */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
}

/** Which step a refusal came from, for the console only: never the file or its name. */
function refuse(stage: string, message = PHOTO_NOT_PREPARED): PreparedPhoto {
  console.warn(`[forum photo] not added at: ${stage}`);
  return { ok: false, message };
}

export async function prepareForumPhoto(file: File): Promise<PreparedPhoto> {
  // A phone can hand over a HEIC photo, or one with no type at all (some
  // Android browsers do for camera shots). Those are tried, not refused:
  // whether this browser can decode them is the real question.
  if (!ACCEPTED.includes(file.type) && !MAYBE_DECODABLE.includes(file.type)) {
    return refuse("type", "Choose a JPEG, PNG or WebP photo.");
  }
  let picture: Drawable;
  try {
    picture = await decode(file);
  } catch {
    return refuse("decode", ACCEPTED.includes(file.type) ? PHOTO_NOT_PREPARED : PHOTO_FORMAT_UNSUPPORTED);
  }
  try {
    const bitmap = picture;
    if (!(bitmap.width > 0 && bitmap.height > 0)) return refuse("size");
    const scale = Math.min(1, FORUM_PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return refuse("canvas");
    // JPEG has no transparency: a PNG's clear areas would otherwise turn black.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap.source, 0, 0, width, height);
    bitmap.done();

    const blob = await toJpeg(canvas);
    if (!blob) return refuse("encode");
    // The encoder's own segments go (see stripEncoderSegments), then the
    // strict check runs on what is left, exactly as before.
    const bytes = stripEncoderSegments(new Uint8Array(await blob.arrayBuffer()));
    if (!bytes) return refuse("encode-shape");
    if (jpegCarriesMetadata(bytes)) return refuse("metadata");
    if (bytes.length > FORUM_PHOTO_MAX_BYTES) {
      return { ok: false, message: "This photo is too large. Choose one under 5 MB." };
    }
    return { ok: true, file: new File([bytes as BlobPart], "photo.jpg", { type: "image/jpeg" }) };
  } catch {
    return refuse("draw");
  }
}
