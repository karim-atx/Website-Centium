import React, { useEffect, useState } from "react";
import { qrModules } from "../../services/venues/venueLogic";

// Release 3 · W8: the share card's QR to centium.app/p/{handle}. The same
// zxing-wasm writer as marketplace/PassQr.tsx (no new dependency), loaded
// lazily; copied rather than imported so PassQr stays as it is. The DOM card
// draws the modules as an SVG; the canvas export reads them through
// qrRows(). #241F1B on white, as qr31.

let writer: Promise<typeof import("zxing-wasm/writer")> | null = null;
async function loadWriter() {
  if (!writer) {
    writer = (async () => {
      const [mod, { default: wasmUrl }] = await Promise.all([import("zxing-wasm/writer"), import("zxing-wasm/writer/zxing_writer.wasm?url")]);
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

const cache = new Map<string, boolean[][]>();

/** The QR's modules (true = dark), or null when it can't be drawn. */
export async function qrRows(value: string): Promise<boolean[][] | null> {
  const hit = cache.get(value);
  if (hit) return hit;
  try {
    const mod = await loadWriter();
    const r = await mod.writeBarcode(value, { format: "QRCode", scale: 1, addQuietZones: false, options: "ecLevel=M" });
    if (r.error || !r.symbol) return null;
    const rows = qrModules(r.symbol.data, r.symbol.width, r.symbol.height);
    cache.set(value, rows);
    return rows;
  } catch {
    return null;
  }
}

export const ShareQr: React.FC<{ value: string; size: number }> = ({ value, size }) => {
  const [state, setState] = useState<{ value: string; rows: boolean[][] | null } | null>(() => (cache.has(value) ? { value, rows: cache.get(value)! } : null));
  useEffect(() => {
    let live = true;
    void qrRows(value).then((rows) => live && setState({ value, rows }));
    return () => {
      live = false;
    };
  }, [value]);
  const rows = state && state.value === value ? state.rows : null;
  if (!rows) return <span aria-hidden style={{ display: "block", width: size, height: size, background: "#FFFFFF" }} />;
  const n = rows.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label="QR code to the profile" style={{ display: "block" }}>
      <rect width={n} height={n} fill="#FFFFFF" />
      {rows.flatMap((row, y) => row.map((dark, x) => (dark ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill="#241F1B" /> : null)))}
    </svg>
  );
};
