import piexif from "piexifjs";

// Removing location and device identifiers from an image before it is stored.
//
// THE EXPOSURE THIS CLOSES IS REAL AND WAS LIVE. uploadPrivateFile sent the
// File it was handed, byte for byte, and nothing inspected it. A phone
// photograph carries EXIF; a phone photograph of a lab report taken at home
// carries the user's HOME COORDINATES into `lab-reports` or `medical-imaging`,
// where any professional holding the matching consent can read the object.
// Consent to see a blood panel is not consent to learn where someone lives.
//
// SELECTIVE, NOT WHOLESALE, and that is the reason this costs a dependency.
// Re-encoding through a canvas would drop every tag — which gets the privacy
// outcome by accident while also discarding Orientation, so correctly-taken
// photographs render sideways. Two tags are worth keeping:
//
//   * Orientation — without it the image is displayed rotated, and a lab
//     report a professional has to tilt their head to read is a worse outcome
//     than the one this module exists to prevent.
//   * DateTimeOriginal — when a scan or report was actually taken is clinical
//     provenance, and is not private in the way a location is.
//
// Everything else identifying is removed. GPS goes as a whole IFD rather than
// tag by tag: it holds latitude, longitude, altitude, timestamps and a
// processing method, and enumerating them invites missing one when a phone
// writes a field nobody anticipated.

/** Tags removed from the 0th IFD — who took it and with what. */
const ZEROTH_TO_REMOVE = [
  piexif.ImageIFD.Make,
  piexif.ImageIFD.Model,
  piexif.ImageIFD.Software,
] as const;

/** Tags removed from the Exif IFD — identifiers unique to one physical device. */
const EXIF_TO_REMOVE = [
  piexif.ExifIFD.BodySerialNumber,
  piexif.ExifIFD.LensSerialNumber,
] as const;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, original: File): File {
  const comma = dataUrl.indexOf(",");
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  // Name and type carried over deliberately: uploadPrivateFile derives the
  // stored extension and contentType from the MIME type, so changing it here
  // would rename the object for no reason.
  return new File([bytes], original.name, { type: original.type, lastModified: original.lastModified });
}

/**
 * Returns the file with location and device identifiers removed.
 *
 * JPEG ONLY, BY DESIGN. It is the only format these buckets accept that
 * carries EXIF in a form piexifjs can rewrite — `load()` throws outright on a
 * PNG — and it is the format every phone camera produces, so it covers the
 * case this exists for. PNG, WebP and PDF are returned untouched rather than
 * run through a parser that would either fail or, worse, corrupt them.
 *
 * NEVER BLOCKS AN UPLOAD, AND THIS IS DELIBERATE. Every failure path returns
 * the ORIGINAL file rather than throwing, and a future reader should resist
 * "fixing" that into a hard failure. A user losing a lab report because an
 * EXIF parser met an unusual file is a worse outcome than the metadata leak
 * this prevents — the leak is bounded and known, the lost upload is neither.
 * A failure is logged so a systematic one is visible rather than silent.
 */
export async function stripPrivateExif(file: File): Promise<File> {
  if (file.type !== "image/jpeg") return file;

  try {
    const dataUrl = await fileToDataUrl(file);
    const exif = piexif.load(dataUrl);

    // NOTHING TO REMOVE MEANS NOTHING TO REWRITE, and the point is not the
    // handful of bytes saved. Every rewrite is an opportunity to corrupt a
    // file, so the number of clinical images whose bytes this module touches
    // at all should be no larger than the job requires — the same
    // conservatism behind these buckets getting no compression. Without this,
    // a JPEG carrying no EXIF came back 24 bytes larger with an empty EXIF
    // block inserted: harmless, but work done on a file that needed none.
    const carriesTargetTag =
      Object.keys(exif.GPS ?? {}).length > 0 ||
      ZEROTH_TO_REMOVE.some((tag) => exif["0th"]?.[tag] !== undefined) ||
      EXIF_TO_REMOVE.some((tag) => exif.Exif?.[tag] !== undefined) ||
      // Truthiness, not `!== undefined`: piexifjs reports "no thumbnail" as
      // null rather than omitting the key, so an identity check against
      // undefined is true for every image and defeats this whole block.
      Boolean(exif.thumbnail) ||
      Object.keys(exif["1st"] ?? {}).length > 0;
    if (!carriesTargetTag) return file;

    // Whole IFD. See the note above on why this is not enumerated.
    exif.GPS = {};
    // Each IFD is optional in the parsed shape — an image may carry Exif and
    // no 0th, or neither — so each is checked rather than assumed present.
    if (exif["0th"]) for (const tag of ZEROTH_TO_REMOVE) delete exif["0th"][tag];
    if (exif.Exif) for (const tag of EXIF_TO_REMOVE) delete exif.Exif[tag];

    // The embedded thumbnail is a second copy of the same scene and carries
    // its own IFD. Leaving it would strip the metadata from the image while
    // keeping a miniature of it, with tags, alongside.
    delete exif.thumbnail;
    exif["1st"] = {};

    return dataUrlToFile(piexif.insert(piexif.dump(exif), dataUrl), file);
  } catch (error) {
    console.warn(
      "[storage] Could not strip metadata, uploading the original:",
      error instanceof Error ? error.message : String(error)
    );
    return file;
  }
}
