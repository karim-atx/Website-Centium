// The camera half of barcode scanning: reads product barcodes (EAN-13, EAN-8,
// UPC-A, UPC-E) from a live <video>.
//
// NATIVE FIRST. BarcodeDetector (Chrome on Android, Safari 17+ behind its own
// support list) decodes in the platform and costs nothing to load. Where it
// is missing or cannot read retail codes, ZXing compiled to WebAssembly takes
// over — imported only then, with its .wasm served from our own origin, so a
// phone that has the native detector never downloads it.

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

/**
 * Whether this browser can show a camera at all: a secure context and
 * getUserMedia. The typed field is the way in everywhere else.
 */
export function canUseBarcodeScanner(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext === true &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

export interface FrameReader {
  engine: "native" | "zxing";
  /** The raw text of the first retail barcode in view, or null. */
  read: (video: HTMLVideoElement) => Promise<string | null>;
}

interface NativeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
interface NativeDetectorCtor {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
}

async function nativeReader(): Promise<FrameReader | null> {
  const Ctor = (globalThis as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const supported = await Ctor.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    if (!formats.includes("ean_13")) return null;
    const detector = new Ctor({ formats: [...formats] });
    return {
      engine: "native",
      read: async (video) => {
        const found = await detector.detect(video);
        return found[0]?.rawValue ?? null;
      },
    };
  } catch {
    return null;
  }
}

async function zxingReader(): Promise<FrameReader> {
  const [{ prepareZXingModule, readBarcodes }, { default: wasmUrl }] = await Promise.all([
    import("zxing-wasm/reader"),
    import("zxing-wasm/reader/zxing_reader.wasm?url"),
  ]);
  await prepareZXingModule({
    overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) },
    fireImmediately: true,
  });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return {
    engine: "zxing",
    read: async (video) => {
      if (!ctx || !video.videoWidth) return null;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const results = await readBarcodes(image, {
        formats: ["EAN-13", "EAN-8", "UPC-A", "UPC-E"],
        tryHarder: true,
        maxNumberOfSymbols: 1,
      });
      return results[0]?.text ?? null;
    },
  };
}

/** The best reader this browser has. */
export async function createFrameReader(): Promise<FrameReader> {
  return (await nativeReader()) ?? zxingReader();
}
