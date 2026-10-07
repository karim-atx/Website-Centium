import { useEffect, useState } from "react";
import { qrModules } from "../../services/venues/venueLogic";

// The membership pass's QR (MO1.4.2.2.2), a real, scannable code: the
// pass_token from my_gym_memberships() (32 hex characters, the doc's bearer
// credential) is what the desk's verify_gym_pass() reads back.
//
// NO NEW DEPENDENCY. zxing-wasm is already installed for the barcode scanner
// (services/barcode/scanner.ts uses its reader); its writer build encodes QR
// too. Lazy-loaded like the reader, so the wasm only downloads when a pass is
// shown. The modules are drawn as an SVG in #241F1B on white, as the frame
// does, in light and dark alike (a QR needs its quiet, light ground to scan).

let writer: Promise<typeof import("zxing-wasm/writer")> | null = null;
async function loadWriter() {
  if (!writer) {
    writer = (async () => {
      const [mod, { default: wasmUrl }] = await Promise.all([
        import("zxing-wasm/writer"),
        import("zxing-wasm/writer/zxing_writer.wasm?url"),
      ]);
      await mod.prepareZXingModule({
        overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) },
        fireImmediately: true,
      });
      return mod;
    })();
    writer.catch(() => {
      writer = null;
    });
  }
  return writer;
}

export function PassQr({ value, size }: { value: string; size: number }) {
  const [state, setState] = useState<{ value: string; rows: boolean[][] | null; failed: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const mod = await loadWriter();
        const r = await mod.writeBarcode(value, { format: "QRCode", scale: 1, addQuietZones: false, options: "ecLevel=M" });
        if (!live) return;
        if (r.error || !r.symbol) {
          setState({ value, rows: null, failed: true });
          return;
        }
        setState({ value, rows: qrModules(r.symbol.data, r.symbol.width, r.symbol.height), failed: false });
      } catch {
        if (live) setState({ value, rows: null, failed: true });
      }
    })();
    return () => {
      live = false;
    };
  }, [value]);

  const current = state && state.value === value ? state : null;
  if (!current) return <div aria-busy="true" className="rounded-lg bg-cream-soft animate-pulse" style={{ width: size, height: size }} />;
  if (current.failed || !current.rows) {
    return (
      <p role="alert" className="m-0 flex items-center justify-center text-center text-[12px] font-semibold text-status-high" style={{ width: size, height: size }}>
        Couldn't draw your pass. Close it and try again.
      </p>
    );
  }
  const n = current.rows.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label="Membership pass QR code">
      <rect width={n} height={n} fill="#FFFFFF" />
      {current.rows.flatMap((row, y) => row.map((dark, x) => (dark ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#241F1B" /> : null)))}
    </svg>
  );
}
