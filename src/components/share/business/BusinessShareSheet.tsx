import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BottomSheet } from "../../ui/BottomSheet";
import { useIsDark } from "../../../hooks/useIsDark";
import { linePx, textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../pro/proInk";
import { OverlayEditor, type OverlayState } from "../OverlayEditor";
import { DEFAULT_CROP, EDITOR_W, editorHeight, type Size } from "../overlayModel";
import { ShareDestinations, type Destination } from "../ShareDestinations";
import { MORE_DOTS_GLYPH } from "../destinationGlyphs";
import { canCopyImage, canCopyText, copyCanvasImage, copyText, saveCanvas, shareCanvas } from "../shareActions";
import { BizCard, type CardFill } from "./BizCard";
import { exportCard, exportPhotoCard } from "./paintBizCard";
import {
  CARD_SHADOW,
  CEN_GRADIENT,
  CHECKER,
  DEF_HIDE,
  DEST_PREVIEW_W,
  ITEM_NOUN,
  PHOTO_SWATCH,
  SHEET_TITLE,
  cardContent,
  cardH,
  cardLink,
  exportArtboardH,
  previewWidth,
  templateFormats,
  toggleHide,
  toggleRows,
  toggleSub,
  type BizBackground,
  type BizBrand,
  type BizFormat,
  type TemplateData,
} from "./bizCardModel";

// Market + Share 3.0 · B-SH.3 the business share sheet and B-SH.5 Your photo,
// ported from Business Sharing Screens (sheet lines 107 to 244, logic 348 to
// 386), in the app's MasterBottomSheet (BottomSheet: band #F0EEFD, 1px
// #7248F8, r32, 53 title bar, body r22 padding 18, footer 8 20 34 under a
// #F2F2F2 rule):
// - format track (#F3F3FD r14 padding 4 gap 5; 34-tall r11 items 12 / 700;
//   active #A79AD5 / white, idle #F5F4FE / #6D50D3): Story · Post, plus
//   Sticker for Offer and Class;
// - the live preview on a #F5F5F6 r20 well (padding 14; the checker for the
//   sticker) at 150 (Story, Sticker) or 196 (Post); with Your photo, the
//   OverlayEditor (chrome "business", the card filling the 220 frame);
// - Background (12 / 600 #5B5349, 14 above, 8 below): chips r999, padding 5
//   10 5 6, 11 / 14, a 14 swatch; on #AEA1DC white 700, off white, 1px
//   rgba(36,31,27,0.11), #5B5349 600;
// - the sticker note 11.5 / 1.5 #8C8378;
// - "Show on the card": rows padding 9 0 over a 1px rule, 14 title, 11 faint
//   line, "Always on" with a 12 lock, or the 42 × 26 switch (knob 22; on
//   #AEA1DC, off #D9D6E3; a row turned off carries the 3px 35% halo);
// - footer: the shield line "Only what you select is shared." (12 / 700
//   #5F5093, 13 glyph) and the 50 r16 #AEA1DC CTA "Next";
// - Destinations ("Share", CTA "Done"): the card at 120, the shared tiles
//   (Instagram Story · WhatsApp · Save image · Copy · More) and the note.
// Copy is the link for Story and Post, the sticker image for Sticker (HANDOVER
// §12). Every image is drawn on the device (paintBizCard); a photo never
// leaves it. D-49: the result says "Card shared", never "Shared to your
// Instagram Story" (the web can't know where it went).

export interface ShareResult {
  text: string;
  tone: "success" | "error";
}

const SHIELD = "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z";
const LOCK = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const FORMAT_LABEL: Record<BizFormat, string> = { story: "Story", post: "Post", sticker: "Sticker" };
const BG_LABEL: Record<BizBackground, string> = { biz: "Business colours", cen: "Centium", photo: "Your photo" };

interface Photo {
  url: string;
  img: HTMLImageElement;
}

function loadPhoto(file: File): Promise<Photo | null> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ url, img });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export const BusinessShareSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  brand: BizBrand;
  data: TemplateData;
  /** For the one-time overlay hint (per user). */
  userId: string | null;
  onResult: (r: ShareResult) => void;
}> = ({ open, onClose, brand, data, userId, onResult }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const t = data.t;
  const formats = templateFormats(t);
  const [format, setFormat] = useState<BizFormat>("story");
  const [bg, setBg] = useState<BizBackground>("biz");
  const [hide, setHide] = useState<string[]>(() => DEF_HIDE[t] ?? []);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [step, setStep] = useState<"edit" | "dest">("edit");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [destImg, setDestImg] = useState<string | null>(null);
  const overlay = useRef<(OverlayState & { layer: Size; frame: Size }) | null>(null);
  const measure = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The draft lives as long as the sheet: the button mounts a fresh one per open.
  // The object URL lives as long as the photo.
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );

  const sticker = format === "sticker";
  const photoMode = !sticker && bg === "photo" && !!photo;
  const fill: CardFill = sticker || photoMode ? "clear" : bg === "cen" ? "cen" : "biz";
  const rows = useMemo(() => toggleRows(data, brand), [data, brand]);
  const content = useMemo(() => cardContent(brand, data, hide), [brand, data, hide]);
  const link = useMemo(() => cardLink(brand.slug, data), [brand.slug, data]);
  const photoFormat: "story" | "post" = format === "post" ? "post" : "story";

  const card = (width: number, f: CardFill, flat?: boolean, fmt: BizFormat = format) => (
    <BizCard brand={brand} content={content} format={fmt} fill={f} linkText={link.text} linkHref={link.href} width={width} flat={flat} />
  );

  const pickPhoto = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const p = await loadPhoto(file);
    if (!p) return;
    overlay.current = null;
    setPhoto(p);
    setBg("photo");
  };
  const chooseBg = (k: BizBackground) => {
    if (k === "photo") {
      if (!photo || bg === "photo") pickPhoto();
      else setBg("photo");
      return;
    }
    setBg(k);
  };

  const next = async () => {
    const root = measure.current?.querySelector<HTMLElement>("[data-card-root]");
    if (!root) return;
    setBusy(true);
    setFailed(false);
    try {
      let c: HTMLCanvasElement;
      if (photoMode && photo) {
        const frame = { w: EDITOR_W, h: editorHeight(photoFormat) };
        const st = overlay.current ?? {
          transform: { x: frame.w / 2, y: frame.h / 2, scale: 1, rotation: 0 },
          crop: DEFAULT_CROP,
          layer: { w: EDITOR_W, h: (EDITOR_W * cardH(photoFormat)) / 300 },
          frame,
        };
        c = await exportPhotoCard(root, photoFormat, photo.img, st);
        setDestImg(c.toDataURL("image/png"));
      } else {
        c = await exportCard(root, format, fill === "clear");
        setDestImg(null);
      }
      setCanvas(c);
      setStep("dest");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const fileName = `centium-${t}-${format}.png`;
  const finish = (r: ShareResult) => {
    onResult(r);
    onClose();
  };
  const failText = "Couldn't share the card. Try again.";
  const share = async () => {
    if (!canvas) return;
    const out = await shareCanvas(canvas, fileName, sticker ? null : link.href);
    if (out === "shared") finish({ text: "Card shared", tone: "success" });
    else if (out === "saved") finish({ text: "Saved to Photos", tone: "success" });
    else if (out === "failed") finish({ text: failText, tone: "error" });
  };
  const destinations: Destination[] = [
    { key: "ig", label: "Instagram Story", onPress: () => void share() },
    { key: "wa", label: "WhatsApp", onPress: () => void share() },
    {
      key: "save",
      label: "Save image",
      onPress: () => {
        if (!canvas) return;
        try {
          saveCanvas(canvas, fileName);
          finish({ text: "Saved to Photos", tone: "success" });
        } catch {
          finish({ text: "Couldn't save the image. Try again.", tone: "error" });
        }
      },
    },
    ...((sticker ? canCopyImage() : canCopyText())
      ? [
          {
            key: "copy" as const,
            label: "Copy",
            onPress: () =>
              void (async () => {
                if (sticker) {
                  const ok = canvas ? await copyCanvasImage(canvas) : false;
                  finish(ok ? { text: "Sticker copied. Paste it onto your photo.", tone: "success" } : { text: "Couldn't copy the sticker. Try again.", tone: "error" });
                } else {
                  const ok = await copyText(link.href);
                  finish(ok ? { text: "Link copied", tone: "success" } : { text: "Couldn't copy the link. Try again.", tone: "error" });
                }
              })(),
          },
        ]
      : []),
    { key: "more", label: "More", glyph: MORE_DOTS_GLYPH, onPress: () => void share() },
  ];

  const sectionLabel = (text: string, margin: string) => <div style={{ margin, fontSize: textPx(12), fontWeight: 600, color: m.ink2 }}>{text}</div>;

  const footer = (
    <div>
      <div className="flex items-center justify-center" style={{ gap: 6, padding: "2px 0 10px", fontSize: textPx(12), fontWeight: 700, color: m.cancelink }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
          <path d={SHIELD} />
        </svg>
        Only what you select is shared.
      </div>
      {failed && step === "edit" && (
        <p role="alert" style={{ margin: "0 0 8px", textAlign: "center", fontSize: textPx(12), color: m.high, fontWeight: 600 }}>
          Couldn't make the image. Try again.
        </p>
      )}
      <button
        type="button"
        onClick={step === "edit" ? () => void next() : onClose}
        disabled={busy}
        aria-busy={busy || undefined}
        className="tap w-full flex items-center justify-center transition-transform duration-[140ms] ease-out active:scale-[0.97] disabled:opacity-40"
        style={{ height: 50, borderRadius: 16, background: m.fill, color: m.onfill, fontSize: textPx(15), fontWeight: 700 }}
      >
        {step === "edit" ? "Next" : "Done"}
      </button>
    </div>
  );

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={step === "edit" ? SHEET_TITLE[t] : "Share"}
        onBack={step === "dest" ? () => setStep("edit") : undefined}
        size="tall"
        bodyPadding={{ top: 18, right: 18, bottom: 18, left: 18 }}
        footer={footer}
        footerRule
        footerBottom={34}
      >
        {step === "edit" ? (
          <>
            <div role="radiogroup" aria-label="Format" className="flex" style={{ gap: 5, padding: 4, borderRadius: 14, background: m.segtrack }}>
              {formats.map((f) => {
                const on = f === format;
                return (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setFormat(f)}
                    className="tap flex-1 flex items-center justify-center"
                    style={{ minHeight: 34, borderRadius: 11, background: on ? m.segactive : m.segidle, color: on ? m.onfill : m.segink, fontSize: textPx(12), fontWeight: 700 }}
                  >
                    {FORMAT_LABEL[f]}
                  </button>
                );
              })}
            </div>

            {photoMode && photo ? (
              <div style={{ marginTop: 12 }}>
                <OverlayEditor
                  key={`${photoFormat}-${photo.url}`}
                  format={photoFormat}
                  photoUrl={photo.url}
                  layer={card(EDITOR_W, "clear", true, photoFormat)}
                  layerWidth={EDITOR_W}
                  anchor="fill"
                  chrome="business"
                  hintKey={userId ? `centium.overlayHint.${userId}` : null}
                  layerLabel="Your card"
                  onChange={(s) => {
                    overlay.current = s;
                  }}
                />
              </div>
            ) : (
              <div className="flex justify-center" style={{ marginTop: 12, borderRadius: 20, background: sticker ? CHECKER : m.soft, padding: 14 }}>
                {card(previewWidth(format), fill)}
              </div>
            )}

            {!sticker && (
              <>
                {sectionLabel("Background", "14px 0 8px")}
                <div role="radiogroup" aria-label="Background" className="flex flex-wrap" style={{ gap: 6 }}>
                  {(["biz", "cen", "photo"] as BizBackground[]).map((k) => {
                    const on = k === bg && (k !== "photo" || !!photo);
                    const sw = k === "biz" ? `linear-gradient(150deg, ${brand.c1}, ${brand.c2})` : k === "cen" ? CEN_GRADIENT : PHOTO_SWATCH;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => chooseBg(k)}
                        className="tap relative inline-flex items-center whitespace-nowrap before:absolute before:-inset-y-[9px] before:inset-x-0 before:content-['']"
                        style={{ gap: 6, borderRadius: 999, paddingBlock: "5px", paddingInline: "6px 10px", fontSize: textPx(11), lineHeight: linePx(14), fontWeight: on ? 700 : 600, border: `1px solid ${on ? m.fill : m.border}`, background: on ? m.fill : m.card, color: on ? m.onfill : m.ink2 }}
                      >
                        <span aria-hidden style={{ width: 14, height: 14, borderRadius: 999, background: sw, boxShadow: "0 0 0 1px rgba(36,31,27,0.1)", flex: "none" }} />
                        {BG_LABEL[k]}
                      </button>
                    );
                  })}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e)} aria-hidden tabIndex={-1} />
              </>
            )}
            {sticker && (
              <div style={{ fontSize: textPx(11.5), lineHeight: 1.5, color: m.faint, marginTop: 10 }}>
                Transparent, with white text. Copy it, then paste it onto your own photo or video. The checkerboard is only here to show there's no background.
              </div>
            )}

            {sectionLabel("Show on the card", "14px 0 4px")}
            {rows.map((r) => {
              const on = r.lock || !hide.includes(r.key);
              const text = (
                <span className="flex-1 min-w-0 text-start">
                  <span className="block" style={{ fontSize: textPx(14), color: m.ink }}>
                    {r.title}
                  </span>
                  {toggleSub(r, on) && (
                    <span className="block" style={{ fontSize: textPx(11), color: m.faint, overflowWrap: "anywhere" }}>
                      {toggleSub(r, on)}
                    </span>
                  )}
                </span>
              );
              const rowStyle: React.CSSProperties = { gap: 12, padding: "9px 0", borderTop: `1px solid ${m.div}`, minHeight: 44 };
              if (r.lock) {
                return (
                  <div key={r.key} className="flex items-center" style={rowStyle}>
                    {text}
                    <span className="inline-flex items-center shrink-0" style={{ gap: 4, fontSize: textPx(11), fontWeight: 600, color: m.faint }}>
                      {LOCK}
                      Always on
                    </span>
                  </div>
                );
              }
              return (
                <button
                  key={r.key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => setHide((h) => toggleHide(h, rows, r.key, !on))}
                  className="tap w-full flex items-center"
                  style={rowStyle}
                >
                  {text}
                  <span
                    aria-hidden
                    className="relative shrink-0"
                    style={{ width: 42, height: 26, borderRadius: 999, background: on ? m.fill : m.swoff, boxShadow: on ? "none" : "0 0 0 3px rgba(174,161,220,0.35)" }}
                  >
                    <span style={{ position: "absolute", left: on ? 18 : 2, top: 2, width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }} />
                  </span>
                </button>
              );
            })}
          </>
        ) : (
          <>
            <div className="flex justify-center" style={{ marginBottom: 14 }}>
              {destImg ? (
                <img
                  src={destImg}
                  alt={`${brand.name}. ${content.title}`}
                  style={{ width: DEST_PREVIEW_W, height: Math.round(((DEST_PREVIEW_W * cardH(photoFormat)) / 300) * 10) / 10, objectFit: "cover", borderRadius: 8, boxShadow: CARD_SHADOW }}
                />
              ) : sticker ? (
                <div style={{ borderRadius: 14, background: CHECKER, padding: 8 }}>{card(DEST_PREVIEW_W, "clear")}</div>
              ) : (
                card(DEST_PREVIEW_W, fill)
              )}
            </div>
            <ShareDestinations items={destinations} note={`The QR code opens ${ITEM_NOUN[t]} in Centium. In a browser, Instagram and WhatsApp open through your device's share options.`} />
          </>
        )}
      </BottomSheet>

      {/* The export's measure copy: the same card, unscaled, off screen (paintBizCard draws from it). */}
      {open &&
        createPortal(
          <div ref={measure} aria-hidden style={{ position: "fixed", insetInlineStart: -10000, top: 0, width: 300, pointerEvents: "none", opacity: 0 }}>
            <BizCard
              brand={brand}
              content={content}
              format={photoMode ? photoFormat : format}
              fill={fill}
              linkText={link.text}
              linkHref={link.href}
              width={300}
              flat
              artboardH={photoMode ? cardH(photoFormat) : exportArtboardH(format)}
            />
          </div>,
          document.body,
        )}
    </>
  );
};
