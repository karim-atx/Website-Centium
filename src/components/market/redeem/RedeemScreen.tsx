import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { CameraOff, Clock, Keyboard, WifiOff } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette, type MarketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../pro/proInk";
import { BottomSheet } from "../../ui/BottomSheet";
import { useCameraCodeReader } from "../../food/useCameraCodeReader";
import { FOCUS_CSS, usePress } from "../usePress";
import { BackHeader } from "../offers/parts";
import { checkVoucher, checkView, codeComplete, formatCode, markVoucherUsed, type CheckView, type VoucherCheck } from "../../../services/vouchers/check";

// Market + Share 3.0 · W3 · Redeem a voucher (B-MA.4 `scan`…`scanInvalid`,
// Business Marketplace Screens lines 249–300 and `R` / `scanCode`; P-MA.4,
// Professional Marketplace Screens lines 329–337, `R`, the scanEnter sheet),
// shared by the business (/app/business/redeem) and the professional
// (/app/pro/marketplace/redeem). Literal values:
// - the back header "Marketplace" / "Redeem a voucher";
// - the camera view: 380 tall, radius 24, --soft, the 210 framing square
//   (radius 20, 2px --fill) centred over the real camera (the desk ScanSheet's
//   zxing / BarcodeDetector reader, QR); never the board's "CAMERA VIEW"
//   label (D-52). Camera blocked / no camera / offline are ours, inside the
//   same panel;
// - the hint 13 --ink2 centred (12 below); "Enter code" (16 below): 48 + 1px
//   --border, radius 14, gap 8, 14 / 700 --pdark, the 17 keyboard icon;
// - Enter code (MasterBottomSheet): the --sgrey box (radius 14, padding
//   12 14), "Voucher code" 13 / 500 --slabel (8 above the field), the field
//   --sfield radius 10 padding 11 13 14 / 19 (upper case, dashes put in,
//   XXXX-XXXX-XXXX, D-24), the helper 11.5 / 16 --faint (8 above); the CTA
//   "Check code" (50, radius 16, --fill, 15 / 700) disabled until 12
//   characters;
// - Voucher check (MasterBottomSheet): a centred column: the 56 circle
//   (Valid --goodbg / --good check 26; Already used --cautionbg / --caution
//   X 24; Expired and Not valid --highbg / --high X 24), the title 20 / 800
//   (12 below), the body 13 / 19 --ink2 (4 below, max 300), the rows on
//   --sgrey (14 below, radius 14, padding 4 14; rows padding 9 0, 12.5,
//   --slabel / 700, 0.5px --div between); the CTA "Mark as used" or "Scan
//   another" (the markup's --fill, not R's unused ctaBg).
// Ours: the "Voucher marked as used" result after Mark as used (a repeat
// shows Already used and changes nothing), the pending "coming soon" result
// while DB2 hasn't landed, the error and offline lines.

export interface RedeemScreenProps {
  variant: "business" | "professional";
  onBack: () => void;
  backLabel: string;
}

type Result = { kind: "check"; check: VoucherCheck } | { kind: "pending" };

export const RedeemScreen: React.FC<RedeemScreenProps> = ({ variant, onBack, backLabel }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const online = useOnline();
  const pro = variant === "professional";
  const who = pro ? "client" : "member";
  const [enterOpen, setEnterOpen] = useState(false);
  const [code, setCode] = useState("");
  const [enterError, setEnterError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [checking, setChecking] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const busyRef = useRef(false);
  const enterPress = usePress();

  const sheetOpen = enterOpen || !!result;

  /** Checks a typed code or a camera read; the result opens the Voucher check sheet. */
  const run = useCallback(
    async (raw: string, from: "camera" | "typed") => {
      if (busyRef.current) return;
      busyRef.current = true;
      setChecking(true);
      setEnterError(null);
      setScanNote(null);
      const r = await checkVoucher(raw);
      busyRef.current = false;
      setChecking(false);
      if (r.ok) {
        setEnterOpen(false);
        setMarkError(null);
        setResult({ kind: "check", check: r.check });
        return;
      }
      if (r.pending) {
        setEnterOpen(false);
        setResult({ kind: "pending" });
        return;
      }
      const text = r.offline ? "You're offline. Check the voucher again when you're connected." : r.message;
      if (from === "typed") setEnterError(text);
      else setScanNote(text);
    },
    []
  );

  const accept = useCallback(
    (raw: string) => {
      if (busyRef.current || sheetOpen) return false;
      void run(raw, "camera");
      return true;
    },
    [run, sheetOpen]
  );
  const { video, camera } = useCameraCodeReader({ active: online && !sheetOpen, kind: "qr", accept });

  const scanAnother = () => {
    setResult(null);
    setMarkError(null);
    setCode("");
  };

  const mark = async (c: VoucherCheck) => {
    if (marking) return;
    setMarking(true);
    setMarkError(null);
    const r = await markVoucherUsed(c);
    setMarking(false);
    if (r.ok) {
      setResult({ kind: "check", check: r.check });
      return;
    }
    if (r.pending) {
      setResult({ kind: "pending" });
      return;
    }
    setMarkError(r.offline ? "You're offline. Try again when you're connected." : r.message);
  };

  const view: CheckView | null = result?.kind === "check" ? checkView(result.check, variant) : null;
  const showVideo = online && (camera === "starting" || camera === "scanning");

  return (
    <div style={{ color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <BackHeader eyebrow="Marketplace" title="Redeem a voucher" onBack={onBack} backLabel={backLabel} />

      <div
        data-camera={showVideo ? camera : online ? camera : "offline"}
        style={{ position: "relative", height: 380, borderRadius: 24, background: m.soft, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      >
        {/* Always mounted, so a camera allowed after a refusal can start again. */}
        <video ref={video} muted playsInline aria-label="Camera" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 24, opacity: showVideo && camera === "scanning" ? 1 : 0, display: showVideo ? "block" : "none" }} />
        {showVideo ? (
          <div aria-hidden style={{ position: "relative", width: 210, height: 210, boxSizing: "border-box", borderRadius: 20, border: `2px solid ${m.fill}` }} />
        ) : (
          <CameraNote m={m} kind={!online ? "offline" : camera === "denied" ? "denied" : "unavailable"} who={who} />
        )}
      </div>

      <p role="status" style={{ margin: "12px 0 0", fontSize: textPx(13), color: scanNote ? m.high : m.ink2, textAlign: "center", fontWeight: scanNote ? 600 : 400, lineHeight: scanNote ? linePx(19) : "normal" }}>
        {scanNote ?? (checking && !enterOpen ? "Checking the voucher…" : `Point the camera at the ${who}'s QR code.`)}
      </p>

      <button
        type="button"
        onClick={() => {
          setEnterError(null);
          setEnterOpen(true);
        }}
        {...enterPress.handlers}
        className="market-focus"
        style={{
          width: "100%",
          marginTop: 16,
          height: 50,
          boxSizing: "border-box",
          borderRadius: 14,
          border: `1px solid ${m.border}`,
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: 0,
          fontFamily: "inherit",
          fontSize: textPx(14),
          fontWeight: 700,
          color: m.pdark,
          cursor: "pointer",
          ...enterPress.style,
        }}
      >
        <Keyboard size={17} strokeWidth={2} aria-hidden style={NO_ICON_SCALE} />
        Enter code
      </button>

      <EnterCodeSheet
        open={enterOpen}
        onClose={() => {
          if (!checking) setEnterOpen(false);
        }}
        code={code}
        setCode={(v) => {
          setEnterError(null);
          setCode(formatCode(v));
        }}
        busy={checking}
        error={enterError}
        who={who}
        onCheck={() => void run(code, "typed")}
      />

      <BottomSheet
        open={!!result}
        onClose={() => {
          if (!marking) scanAnother();
        }}
        title="Voucher check"
        footerRule
        footer={
          <SheetCta
            label={result?.kind === "pending" ? "Close" : marking ? "One moment…" : (view?.cta ?? "Scan another")}
            busy={marking}
            onPress={() => {
              if (result?.kind === "check" && view?.cta === "Mark as used") void mark(result.check);
              else scanAnother();
            }}
          />
        }
      >
        {result?.kind === "pending" ? (
          <ResultBody m={m} tone="neutral" icon="clock" title="Voucher checks are coming soon" body="You'll be able to check vouchers and mark them as used here soon." rows={[]} />
        ) : view ? (
          <ResultBody m={m} tone={view.tone} icon={view.icon} title={view.title} body={view.body} rows={view.rows} error={markError} />
        ) : null}
      </BottomSheet>
    </div>
  );
};

/** Inside the camera panel when the camera can't run (ours, in the handover chrome). */
const CameraNote: React.FC<{ m: MarketPalette; kind: "denied" | "unavailable" | "offline"; who: string }> = ({ m, kind, who }) => {
  const Icon = kind === "offline" ? WifiOff : CameraOff;
  const title = kind === "offline" ? "You're offline" : kind === "denied" ? "Camera is blocked" : "No camera available";
  const body =
    kind === "offline"
      ? "Checking a voucher needs a connection. Try again when you're connected."
      : kind === "denied"
        ? `Allow camera access for Centium in your browser settings, or enter the code under the ${who}'s QR code.`
        : `This device can't scan vouchers. Enter the code under the ${who}'s QR code instead.`;
  return (
    <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "0 28px" }}>
      <span aria-hidden style={{ width: 56, height: 56, borderRadius: 999, background: m.card, color: m.pdark, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={24} strokeWidth={2} style={NO_ICON_SCALE} />
      </span>
      <div style={{ fontSize: textPx(16), fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: textPx(13), lineHeight: linePx(19), color: m.ink2, maxWidth: 280 }}>{body}</div>
    </div>
  );
};

/** The sheet's pinned CTA: 50, radius 16, --fill / --onfill, 15 / 700; disabled = opacity 0.4. */
const SheetCta: React.FC<{ label: string; onPress: () => void; disabled?: boolean; busy?: boolean }> = ({ label, onPress, disabled, busy }) => {
  const m = marketPalette(useIsDark());
  const press = usePress();
  const off = disabled || busy;
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button
        type="button"
        onClick={() => !off && onPress()}
        disabled={disabled}
        aria-busy={busy || undefined}
        className="market-focus"
        {...press.handlers}
        style={{ width: "100%", height: 50, borderRadius: 16, border: 0, background: m.fill, color: m.onfill, fontFamily: "inherit", fontSize: textPx(15), fontWeight: 700, cursor: off ? "default" : "pointer", opacity: disabled ? 0.4 : 1, ...(off ? {} : press.style) }}
      >
        {label}
      </button>
    </>
  );
};

const EnterCodeSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  code: string;
  setCode: (v: string) => void;
  busy: boolean;
  error: string | null;
  who: string;
  onCheck: () => void;
}> = ({ open, onClose, code, setCode, busy, error, who, onCheck }) => {
  const m = marketPalette(useIsDark());
  const id = useId();
  const ready = codeComplete(code);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);
  return (
    <BottomSheet open={open} onClose={onClose} title="Enter code" footerRule footer={<SheetCta label={busy ? "Checking…" : "Check code"} onPress={onCheck} disabled={!ready} busy={busy} />}>
      <div style={{ background: m.sgrey, borderRadius: 14, padding: "12px 14px", lineHeight: "normal" }}>
        <label htmlFor={id} style={{ display: "block", fontSize: textPx(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>
          Voucher code
        </label>
        <input
          ref={inputRef}
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && ready && !busy) onCheck();
          }}
          placeholder="XXXX-XXXX-XXXX"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={14}
          aria-describedby={`${id}-help${error ? ` ${id}-err` : ""}`}
          aria-invalid={error ? true : undefined}
          className="market-focus"
          style={{ display: "block", width: "100%", boxSizing: "border-box", background: m.card, borderRadius: 10, padding: "11px 13px", fontFamily: "inherit", fontSize: textPx(14), lineHeight: linePx(19), color: m.ink, border: 0, outline: "none", letterSpacing: "0.02em" }}
        />
        <div id={`${id}-help`} style={{ fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint, marginTop: 8 }}>
          Letters and numbers, as shown under the {who}'s QR code.
        </div>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.high }}>
          {error}
        </p>
      ) : null}
    </BottomSheet>
  );
};

const ResultBody: React.FC<{
  m: MarketPalette;
  tone: CheckView["tone"] | "neutral";
  icon: CheckView["icon"] | "clock";
  title: string;
  body: string;
  rows: { k: string; v: string }[];
  error?: string | null;
}> = ({ m, tone, icon, title, body, rows, error }) => {
  const [bg, ink] = tone === "good" ? [m.goodbg, m.good] : tone === "caution" ? [m.cautionbg, m.caution] : tone === "high" ? [m.highbg, m.high] : [m.soft, m.faint];
  return (
    <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", lineHeight: "normal", color: m.ink }}>
      <span aria-hidden style={{ width: 56, height: 56, borderRadius: 999, background: bg, color: ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon === "check" ? (
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={NO_ICON_SCALE}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : icon === "x" ? (
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" style={NO_ICON_SCALE}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <Clock size={24} strokeWidth={2.4} style={NO_ICON_SCALE} />
        )}
      </span>
      <div style={{ fontSize: textPx(20), fontWeight: 800, marginTop: 12 }}>{title}</div>
      <div style={{ fontSize: textPx(13), lineHeight: linePx(19), color: m.ink2, marginTop: 4, maxWidth: 300 }}>{body}</div>
      {rows.length > 0 ? (
        <dl style={{ margin: "14px 0 0", width: "100%", boxSizing: "border-box", borderRadius: 14, background: m.sgrey, padding: "4px 14px", textAlign: "left" }}>
          {rows.map((r, i) => (
            <div key={r.k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i === 0 ? undefined : `0.5px solid ${m.div}`, fontSize: textPx(12.5) }}>
              <dt style={{ color: m.slabel }}>{r.k}</dt>
              <dd style={{ margin: 0, fontWeight: 700, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{r.v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {error ? (
        <p role="alert" style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.high }}>
          {error}
        </p>
      ) : null}
    </div>
  );
};
