import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Info, Share2, Sticker } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { INK, NO_ICON_SCALE } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { ShareCard } from "./ShareCard";
import { drawShareCard } from "./drawShareCard";
import type { CardPro, CardSpec, ShareFormat, ShareStyle } from "./shareCardModel";

// Release 3 · W8 SH7 "Share options · browser fallback" and "Shared ·
// confirmation" (source/gen/r31.js shareOpts31). Centium is a web app, so
// Instagram can never be opened directly: the "in the app" variant (Share to
// Instagram Stories) is not drawn, only the browser fallback.
//
// The export follows ShareBiomarkerSheet: the card is drawn on a canvas
// (drawShareCard, 1080 wide), Save image downloads it, More hands a File to
// navigator.share when the device can share files and falls back to the
// download otherwise. Copy sticker puts the transparent Sticker PNG on the
// clipboard, and is hidden where the browser can't write images there.
//
// Each action is recorded first (onRecord): for a client's win the record
// must exist before anything leaves the device, so a failure stops the export
// and shows the message. File names and the share title are neutral (no
// client name), as they show before the image is opened.

export type RecordResult = { ok: true; link: string | null } | { ok: false; message: string };

export interface ShareOptionsSheetProps {
  open: boolean;
  onClose: () => void;
  spec: CardSpec;
  pro: CardPro;
  format: ShareFormat;
  style: ShareStyle;
  /** The client as shown on the card ("S.R.", "Sam", "A client"). */
  client?: string;
  qr?: boolean;
  hide?: number[];
  /** The Photo style's picture, as an object URL. */
  photoUrl?: string | null;
  /** The client's first name, for "{first} can see what you shared…" (client wins only). */
  clientFirstName?: string;
  onRecord: (format: ShareFormat) => Promise<RecordResult>;
  /** Called by Done on the confirmation, before the sheet closes. */
  onDone?: () => void;
}

type Action = "save" | "copy" | "more";
type Done = { heading: string; body: string };

const SHARE_TITLE = "Centium";
const fileName = (format: ShareFormat) => `centium-share-${format}.png`;

const canCopyImage = () =>
  typeof window !== "undefined" && typeof ClipboardItem !== "undefined" && typeof navigator !== "undefined" && !!navigator.clipboard && typeof navigator.clipboard.write === "function";

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("photo failed to load"));
    img.src = url;
  });
}

/** shareOpts31 tileB: 68 tall, radius 14, 1px charcoal 11% border, the card surface; icon 18 / 2, label 12.5 / 700. */
const Tile: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void; disabled: boolean; busy: boolean }> = ({ label, icon, onClick, disabled, busy }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-busy={busy || undefined}
    className="tap flex flex-col items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-[filter] duration-150 ease-out active:brightness-[0.92]"
    style={{ minHeight: 68, gap: 6, borderRadius: 14, border: "1px solid rgb(var(--c-charcoal) / 0.11)", background: INK.card, padding: "8px 6px" }}
  >
    {icon}
    <span style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.ch, lineHeight: 1.25 }}>{label}</span>
  </button>
);

export const ShareOptionsSheet: React.FC<ShareOptionsSheetProps> = ({ open, onClose, spec, pro, format, style, client, qr, hide, photoUrl, clientFirstName, onRecord, onDone }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stickerRef = useRef<HTMLCanvasElement | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hideKey = (hide ?? []).join(",");
  // One token per drawing: the result counts only for the inputs it was drawn from.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a new token whenever any input changes
  const drawToken = useMemo(() => ({}), [spec, pro, format, style, client, qr, hideKey, photoUrl, attempt]);
  const [drawn, setDrawn] = useState<{ token: object; ok: boolean } | null>(null);
  const draw: "drawing" | "ready" | "error" = drawn?.token === drawToken ? (drawn.ok ? "ready" : "error") : "drawing";
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [copyable] = useState(canCopyImage);

  // A fresh sheet each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDone(null);
      setMessage(null);
      setBusy(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    void (async () => {
      try {
        const photo = style === "P" && photoUrl ? await loadImage(photoUrl) : null;
        const opts = { spec, pro, style, client, qr, hide: hideKey ? hideKey.split(",").map(Number) : undefined, photo };
        // Fresh canvases, so an older drawing still in flight never paints over a newer one.
        const main = document.createElement("canvas");
        await drawShareCard(main, { ...opts, format });
        const sticker = copyable ? document.createElement("canvas") : null;
        if (sticker) await drawShareCard(sticker, { ...opts, format: "sticker" });
        if (!live) return;
        canvasRef.current = main;
        stickerRef.current = sticker;
        setDrawn({ token: drawToken, ok: true });
      } catch {
        if (live) setDrawn({ token: drawToken, ok: false });
      }
    })();
    return () => {
      live = false;
    };
  }, [open, drawToken, spec, pro, format, style, client, qr, hideKey, photoUrl, copyable]);

  const ready = draw === "ready" && !busy;
  const clientLine = clientFirstName ? ` ${clientFirstName} can see what you shared in their Sharing your wins list.` : "";

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = fileName(format);
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const record = async (f: ShareFormat): Promise<RecordResult> => {
    try {
      return await onRecord(f);
    } catch {
      return { ok: false, message: "Couldn't share. Check your connection and try again." };
    }
  };

  const saved: Done = { heading: "Image saved", body: `Find it in your photos. Add it to your Story in Instagram.${clientLine}` };

  const onSave = async () => {
    if (!ready) return;
    setBusy("save");
    setMessage(null);
    const r = await record(format);
    if (!r.ok) {
      setMessage(r.message);
      setBusy(null);
      return;
    }
    download();
    setBusy(null);
    setDone(saved);
  };

  const onMore = async () => {
    const canvas = canvasRef.current;
    if (!ready || !canvas) return;
    setBusy("more");
    setMessage(null);
    let file: File | null = null;
    try {
      file = new File([await toBlob(canvas)], fileName(format), { type: "image/png" });
    } catch {
      file = null;
    }
    const r = await record(format);
    if (!r.ok) {
      setMessage(r.message);
      setBusy(null);
      return;
    }
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: SHARE_TITLE, ...(r.link ? { url: r.link } : null) });
        setBusy(null);
        setDone({ heading: "Card shared", body: `It's on its way.${clientLine}` });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") {
          setBusy(null);
          return;
        }
        // Anything else falls through to the download.
      }
    }
    download();
    setBusy(null);
    setDone(saved);
  };

  const onCopy = async () => {
    const sticker = stickerRef.current;
    if (!ready || !sticker) return;
    setBusy("copy");
    setMessage(null);
    let refused: string | null = null;
    // The clipboard write starts inside the tap (Safari keeps the gesture);
    // its image arrives only once the share is recorded.
    const blob = (async () => {
      const r = await record("sticker");
      if (!r.ok) {
        refused = r.message;
        throw new Error("not recorded");
      }
      return toBlob(sticker);
    })();
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setDone({ heading: "Sticker copied", body: `Paste it onto your own photo or video in Instagram.${clientLine}` });
    } catch {
      // A refused record wins over the clipboard's own error.
      await blob.catch(() => null);
      setMessage(refused ?? "Couldn't copy the sticker. Save the image instead.");
    }
    setBusy(null);
  };

  const finish = () => {
    onDone?.();
    onClose();
  };

  const iconStyle = { ...NO_ICON_SCALE, color: INK.prDeep, flex: "none" } as const;

  return (
    <BottomSheet open={open} onClose={onClose} title={done ? "Shared" : "Share"} footer={done ? <CtaButton label="Done" size="sheet" onClick={finish} /> : undefined}>
      {done ? (
        <div className="flex flex-col items-center text-center" style={{ padding: "8px 0 4px" }} role="status">
          <span className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 9999, background: INK.goodBg }}>
            <Check size={30} strokeWidth={2.4} aria-hidden style={{ ...NO_ICON_SCALE, color: INK.good }} />
          </span>
          <p style={{ fontSize: textPx(18), fontWeight: 800, color: INK.ch, marginTop: 14 }}>{done.heading}</p>
          <p style={{ fontSize: textPx(13), lineHeight: 1.55, color: INK.chS, marginTop: 6, maxWidth: 290 }}>{done.body}</p>
        </div>
      ) : (
        <div aria-busy={draw === "drawing" || !!busy || undefined}>
          <div className="flex justify-center" style={{ marginBottom: 16 }}>
            <ShareCard spec={spec} pro={pro} format={format} style={style} width={format === "post" ? 150 : 120} client={client} qr={qr} hide={hide} photoUrl={photoUrl} onChecker={format === "sticker"} />
          </div>
          {draw === "error" ? (
            <div role="alert" className="flex items-center justify-between" style={{ gap: 10, borderRadius: 14, background: INK.hiBg, padding: "4px 4px 4px 12px", marginBottom: 12 }}>
              <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>Couldn't draw the card. Try again.</p>
              <button type="button" onClick={() => setAttempt((a) => a + 1)} className="tap shrink-0" style={{ minHeight: 44, padding: "0 12px", fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
                Retry
              </button>
            </div>
          ) : null}
          <div className="flex items-start" style={{ gap: 10, borderRadius: 14, background: INK.soft, padding: 12, marginBottom: 12 }}>
            <Info size={15} strokeWidth={2} aria-hidden style={{ ...NO_ICON_SCALE, color: INK.chS, flex: "none", marginTop: 1 }} />
            <p style={{ fontSize: textPx(12), lineHeight: 1.5, color: INK.chS }}>
              Instagram can't open from a browser. Save the image or copy the sticker, then add it to your Story in Instagram. More opens your device's share options.
            </p>
          </div>
          {message ? (
            <p role="alert" className="text-center" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 8 }}>
              {message}
            </p>
          ) : null}
          <div className="grid" style={{ gap: 8 }}>
            <CtaButton label="Save image" icon={<Download size={15} aria-hidden />} size="sheet" onClick={onSave} disabled={!ready} loading={busy === "save"} />
          </div>
          <div className="grid" style={{ gridTemplateColumns: copyable ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)", gap: 8, marginTop: 8 }}>
            {copyable ? <Tile label="Copy sticker" icon={<Sticker size={18} strokeWidth={2} aria-hidden style={iconStyle} />} onClick={onCopy} disabled={!ready} busy={busy === "copy"} /> : null}
            <Tile label="More" icon={<Share2 size={18} strokeWidth={2} aria-hidden style={iconStyle} />} onClick={onMore} disabled={!ready} busy={busy === "more"} />
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
