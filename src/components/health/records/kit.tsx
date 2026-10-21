import React from "react";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { CentredPopup } from "../../ui/CentredPopup";
import { textPx, linePx } from "../../../theme/textSize";
import { useHealthMode, hairline } from "../metric/MetricKit";

// Shared pieces of the Biomarkers & imaging page (HE1.9 family,
// docs/health-b-handover.md lines 614-2863). Every value is the handover's
// literal; dark values from the tables' dark column (* derivations recorded
// in the checklists' O5 rows).

export { useHealthMode, hairline };

/** "Sep 14, 2026" from yyyy-mm-dd (no time zone shift). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "–";
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${month} ${d}, ${y}`;
}

/** "30 to 100" / "under 3.0" / "above 30" / "–" (HE1.9 #22, no unit). */
export function rangeText(low: number | null | undefined, high: number | null | undefined): string {
  const l = low ?? null;
  const h = high ?? null;
  if (l !== null && h !== null) return `${l} to ${h}`;
  if (h !== null) return `under ${h}`;
  if (l !== null) return `above ${l}`;
  return "–";
}

export type LabStatus = "low" | "normal" | "high" | null | undefined;

/**
 * Range status (V6-11: trend colours retired). Out of range #C2453F (dark
 * #E8837C, the range-status rule's dark value; table #C2453F* derived), in
 * range #357A4D (dark #6DC08A). Unknown status: nothing.
 */
export function statusInfo(status: LabStatus, dark: boolean) {
  if (!status) return null;
  if (status === "normal") return { word: "In range", long: "In range", Icon: Check, color: dark ? "#6DC08A" : "#357A4D" };
  const out = dark ? "#E8837C" : "#C2453F";
  return status === "low"
    ? { word: "Below", long: "Below range", Icon: ArrowDown, color: out }
    : { word: "Above", long: "Above range", Icon: ArrowUp, color: out };
}

/** Status word + icon (HE1.9 #25-#26: 10.5/15.8 700, icon 12, gap 3). */
export const StatusWord: React.FC<{ status: LabStatus; size?: number; line?: number; icon?: number; long?: boolean }> = ({
  status,
  size = 10.5,
  line = 15.8,
  icon = 12,
  long,
}) => {
  const { dark } = useHealthMode();
  const s = statusInfo(status, dark);
  if (!s) return null;
  return (
    <span className="inline-flex items-center shrink-0" style={{ gap: 3, color: s.color, fontSize: textPx(size), lineHeight: linePx(line), fontWeight: 700 }}>
      <s.Icon size={icon} strokeWidth={2.2} aria-hidden />
      {long ? s.long : s.word}
    </span>
  );
};

export const statusColor = (status: LabStatus, dark: boolean) => statusInfo(status, dark)?.color ?? "rgb(var(--c-charcoal))";

/** Theme-following lavender inks. */
export const deepInk = (dark: boolean) => (dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))");
export const tileFill = (dark: boolean) => (dark ? "rgb(var(--th-303141))" : "rgb(var(--th-f0edf9))");
export const fieldFill = (dark: boolean) => (dark ? "#242730" : "#F5F5F6");
export const cardFill = "rgb(var(--c-cream-card))";
export const INK = "rgb(var(--c-charcoal))";
export const INK_SOFT = "rgb(var(--c-charcoal-soft))";
export const INK_FAINT = "rgb(var(--c-charcoal-faint))";
/** Pinned page CTA fill.pinned #9A8CD6 (dark #A991FE; High contrast #5B48B8). */
export const PINNED_FILL: React.CSSProperties = { background: "rgb(var(--c-fill-pinned))" };

/** List card (r18, 0.5px hairline #241F1B@8%, white / #1C1F28). */
export const ListCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ children, style, className }) => {
  const { dark, hc } = useHealthMode();
  return (
    <div className={`overflow-hidden ${className ?? ""}`} style={{ borderRadius: 18, background: cardFill, border: `0.5px solid ${hairline(dark, hc)}`, ...style }}>
      {children}
    </div>
  );
};

/** Row separator 0.5px #241F1B@5% (dark #F5F3FA@5%). */
export const rowRule = (dark: boolean, hc: boolean, alpha = 0.05) => `0.5px solid ${hairline(dark, hc, alpha)}`;

/** Tile 32 r10 #F0EDF9 (dark #303141) + Lucide 17 #7D6BB5 (dark #C3B3FB). */
export const RowTile: React.FC<{ icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }> }> = ({ icon: Icon }) => {
  const { dark } = useHealthMode();
  return (
    <span aria-hidden className="grid place-items-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: tileFill(dark) }}>
      <Icon size={17} strokeWidth={1.75} style={{ color: deepInk(dark) }} />
    </span>
  );
};

/** Row title 13.5/18 600 and meta 11/15 400 #8C8378 m-top 2. */
export const RowText: React.FC<{ title: React.ReactNode; meta?: React.ReactNode }> = ({ title, meta }) => (
  <span className="flex-1 min-w-0 block">
    <span className="block truncate" style={{ fontSize: textPx(13.5), lineHeight: linePx(18), fontWeight: 600, color: INK }}>
      {title}
    </span>
    {meta !== undefined && (
      <span className="block truncate" style={{ marginTop: 2, fontSize: textPx(11), lineHeight: linePx(15), fontWeight: 400, color: INK_FAINT }}>
        {meta}
      </span>
    )}
  </span>
);

/** Field label 12/16 600 #8C8378, m 0 0 6 2. */
export const FieldLabel: React.FC<{ children: React.ReactNode; htmlFor?: string; style?: React.CSSProperties }> = ({ children, htmlFor, style }) => (
  <label htmlFor={htmlFor} className="block" style={{ margin: "0 0 6px 2px", fontSize: textPx(12), lineHeight: linePx(16), fontWeight: 600, color: INK_FAINT, ...style }}>
    {children}
  </label>
);

/** Field box style: 44 r12 #F5F5F6 + 0.5px #241F1B@10% (dark #242730 + #F5F3FA@10%), pad 0 12, 14/20. */
export function fieldStyle(dark: boolean, hc: boolean, weight: 400 | 600 = 400): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    padding: "0 12px",
    background: fieldFill(dark),
    border: `0.5px solid ${hairline(dark, hc, 0.1)}`,
    fontSize: textPx(14),
    lineHeight: linePx(20),
    fontWeight: weight,
    color: INK,
  };
}

/** Help line 11/16 400 #8C8378, m 5 0 0 2. */
export const HelpLine: React.FC<{ children: React.ReactNode; error?: boolean; style?: React.CSSProperties }> = ({ children, error, style }) => {
  const { dark } = useHealthMode();
  return (
    <p style={{ margin: "5px 0 0 2px", fontSize: textPx(11), lineHeight: linePx(16), fontWeight: 400, color: error ? (dark ? "#F09A8E" : "#C0392B") : INK_FAINT, ...style }} role={error ? "alert" : undefined}>
      {children}
    </p>
  );
};

/** Error line 12/18 #C0392B (dark #F09A8E). */
export const ErrorLine: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const { dark } = useHealthMode();
  return (
    <p role="alert" style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: dark ? "#F09A8E" : "#C0392B", ...style }}>
      {children}
    </p>
  );
};

/**
 * HE1.9.b.4 confirm (X-01 drawn Part B popup: 350 r24 pad 20): title 17/25.5
 * 800 ls-0.3; body 13/19.5 400 #5B5349 m-top 6; Keep (outline 0.5px
 * #241F1B@14%, ink #5B5349) and the action side by side, 46 tall r14, gap 8,
 * 14/21 700; destructive #C0392B white (dark #F09A8E with #0D0B1A, V6-02).
 * `geometry="ours"` for our own popups (342 / r22 / 48).
 */
export const ConfirmPopup: React.FC<{
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
  destructive?: boolean;
  geometry?: "partB" | "ours";
}> = ({ open, title, body, confirmLabel, cancelLabel = "Keep", onConfirm, onCancel, busy, error, destructive = true, geometry = "partB" }) => {
  const { dark, hc } = useHealthMode();
  const h = geometry === "ours" ? 48 : 46;
  return (
    <CentredPopup open={open} onClose={() => !busy && onCancel()} title={title} geometry={geometry} align="start" bodyWeight={400} body={<span style={{ display: "block", fontSize: textPx(13), lineHeight: linePx(19.5) }}>{body}</span>}>
      {error && <ErrorLine style={{ marginTop: -4, marginBottom: 10 }}>{error}</ErrorLine>}
      <div className="flex" style={{ gap: 8, marginTop: 2 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="tap flex-1 disabled:opacity-40"
          style={{ height: h, borderRadius: 14, border: `0.5px solid ${hairline(dark, hc, 0.14)}`, color: INK_SOFT, fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 700 }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy || undefined}
          className="tap flex-1 disabled:opacity-60"
          style={{
            height: h,
            borderRadius: 14,
            background: destructive ? "rgb(var(--c-status-high))" : "rgb(var(--c-fill-pinned))",
            color: destructive ? "rgb(var(--c-on-destructive))" : "rgb(var(--c-on-primary-fill))",
            fontSize: textPx(14),
            lineHeight: linePx(21),
            fontWeight: 700,
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </CentredPopup>
  );
};

/** Neutral skeleton bar #F5F5F6 (dark #242730), pulse 1.2 s, static under Reduce motion. */
export const Skel: React.FC<{ w: number | string; h: number; r?: number }> = ({ w, h, r = 6 }) => {
  const { dark } = useHealthMode();
  return <span aria-hidden className="block animate-skeleton-pulse" style={{ width: w, height: h, borderRadius: r, background: fieldFill(dark) }} />;
};

/** Retry card "Couldn't load your …. Retry" (12/18 600 #C0392B, Retry 700). */
export const RetryCard: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => {
  const { dark, hc } = useHealthMode();
  const red = dark ? "#F09A8E" : "#C0392B";
  return (
    <div role="alert" className="flex items-center justify-between" style={{ borderRadius: 18, padding: "4px 14px", background: cardFill, border: `0.5px solid ${hairline(dark, hc)}` }}>
      <span style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: red }}>{message}</span>
      <button type="button" onClick={onRetry} className="tap min-h-[44px] px-2" style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: red }}>
        Retry
      </button>
    </div>
  );
};

/** Empty card (OURS-*-empty): 358 r18 hairline, pad 32 20, centred icon 22 + title 13.5/20.3 600 + body 11.5/17.3. */
export const EmptyCard: React.FC<{ icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; title: string; body?: string }> = ({ icon: Icon, title, body }) => (
  <ListCard style={{ padding: "32px 20px" }} className="text-center">
    <Icon size={22} style={{ color: INK_FAINT, margin: "0 auto 8px" }} />
    <p style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 600, color: INK }}>{title}</p>
    {body && <p style={{ margin: "2px auto 0", maxWidth: 280, fontSize: textPx(11.5), lineHeight: linePx(17.3), fontWeight: 400, color: INK_FAINT }}>{body}</p>}
  </ListCard>
);

/** Caps section label (9.5/14.3 700 ls1.9 uppercase #9A94B3, dark #8A8698), m 20 0 9 0. */
export const SectionCaps: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const { dark, hc } = useHealthMode();
  return (
    <h2 className="uppercase" style={{ margin: "20px 0 9px", fontSize: textPx(9.5), lineHeight: linePx(14.3), fontWeight: 700, letterSpacing: 1.9, color: hc ? INK : dark ? "#8A8698" : "#9A94B3", ...style }}>
      {children}
    </h2>
  );
};

/** Sheet section label 12/18 700 ls1.4 uppercase #5F5093 (dark #C3B3FB), m 0 0 4 2. */
export const SheetCaps: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const { dark } = useHealthMode();
  return (
    <h3 className="uppercase" style={{ margin: "0 0 4px 2px", fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, letterSpacing: 1.4, color: dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-5f5093))", ...style }}>
      {children}
    </h3>
  );
};

/** File kind from a stored path (the extension is derived from the validated MIME type). */
export const fileKind = (path: string | null | undefined): "PDF" | "Photo" | null => {
  if (!path) return null;
  return path.toLowerCase().endsWith(".pdf") ? "PDF" : "Photo";
};

/** The default report name (blood_panels.name not landed: BACKEND B2). */
export const REPORT_NAME_DEFAULT = "Blood panel";

/** Plural helper. */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
