import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette, METRIC_IDENTITY, SHARE_TOKENS } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../pro/proInk";
import { BottomSheet } from "../../ui/BottomSheet";
import { ConfirmationStrip, type StripTone } from "../../market/ConfirmationStrip";
import { OverlayEditor, type OverlayState } from "../OverlayEditor";
import { ShareDestinations, type Destination } from "../ShareDestinations";
import { canCopyImage, copyCanvasImage, saveCanvas, shareCanvas } from "../shareActions";
import type { Size } from "../overlayModel";
import { ClientShareCard, PhotoStatsLayer } from "./ClientShareCard";
import { drawClientCard, drawPhotoCard, loadImage } from "./drawClientCard";
import {
  DEST_PREVIEW_W,
  PREVIEW_W,
  cardStats,
  exportFileName,
  initialOn,
  previewRadius,
  statRows,
  templateAllowed,
  type ClientBackground,
  type ClientCardSpec,
  type ClientFormat,
} from "./clientCardModel";
import { useShareLocks } from "./useShareLocks";

// Market + Share 3.0 · C-SH.2 the client share sheet, C-SH.5 "Your photo",
// C-SH.6 the confirmations. Literal values from the Client Sharing screen
// file (lines 240 to 404, the script's sheet / rows / PRESET logic):
// - the MasterBottomSheet chrome (BottomSheet: band, 53 title bar, the 26
//   close ring), body padding 18, the pinned footer 8 20 34 under a #F2F2F2
//   rule: "Only what you select is shared." (12 / 700 #5F5093, a 13 shield)
//   over the 50-tall r16 #AEA1DC CTA (15 / 700);
// - Format Story · Post · Sticker: the #F3F3FD r14 track, padding 4, gap 5,
//   34-tall r11 items 12 / 700, active #A79AD5 / white, idle #F5F4FE /
//   #6D50D3;
// - the live preview in a r20 well (#F5F5F6; the light checkerboard behind
//   the sticker), padding 14: Story 150, Post 196, Sticker 180 wide;
// - Background (12 / 600 #5B5349, 14 above, 8 below): chips r999, padding
//   5 10 5 6, 11 / 14, a 14 swatch ringed rgba(36,31,27,0.1); on #AEA1DC
//   white 700, off white / rgba(36,31,27,0.11) / #5B5349 600. Hidden for the
//   sticker, which shows its note instead;
// - "Show on the card": rows padding 9 0 over a 1px rgba(36,31,27,0.06)
//   rule, title 14, second line 11 #8C8378; the headline "Always on" (a 12
//   lock, 11 / 600 #8C8378); switches 42 × 26 r999, on #AEA1DC off #D9D6E3,
//   the 22 knob at 18 / 2 with 0 1px 3px rgba(0,0,0,0.18). D-28: a locked
//   stat has no switch, a lock and the lock line.
// Then "Share": the card at 120, the Destinations grid and its note
// (ShareDestinations), CTA "Done". A destination closes the sheet and shows
// the C-SH.6 strip ("Saved to Photos", "Sticker copied. Paste it onto your
// photo.", and per D-49 "Card shared").
// D-30: nothing is logged. Photos stay on the device (object URLs only).

const LIGHT_CHECK = SHARE_TOKENS.checkerLight;
const PHOTO_SWATCH = "repeating-linear-gradient(135deg, #3E3A36 0 3px, #37332F 3px 6px)";
const BRAND_SWATCH = "linear-gradient(150deg, #7D6BB5, #4F7F78)";
const DEST_NOTE = "Only what you select is shared. In a browser, Instagram and WhatsApp open through your device's share options.";

const SHIELD = "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z";

type Strip = { text: string; tone: StripTone };

export interface ClientShareSheetProps {
  /** The card to share; null keeps the sheet closed. */
  spec: ClientCardSpec | null;
  onClose: () => void;
}

export const ClientShareSheet: React.FC<ClientShareSheetProps> = ({ spec, onClose }) => {
  const [strip, setStrip] = useState<Strip | null>(null);
  const [sheetOpen, setSheetOpen] = useState(!!spec);
  const [live, setLive] = useState<ClientCardSpec | null>(spec);

  // A new spec opens the sheet; the strip, once shown, outlives it.
  const [prevSpec, setPrevSpec] = useState(spec);
  if (spec !== prevSpec) {
    setPrevSpec(spec);
    if (spec) {
      setLive(spec);
      setSheetOpen(true);
      setStrip(null);
    } else setSheetOpen(false);
  }

  const finish = useCallback(() => {
    setStrip(null);
    setLive(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!strip) return;
    const id = window.setTimeout(finish, 4200);
    return () => window.clearTimeout(id);
  }, [strip, finish]);

  return (
    <>
      {live && sheetOpen && (
        <SheetBody
          key={live.template + live.date + live.subject}
          spec={live}
          onClose={finish}
          onDone={(s) => {
            setSheetOpen(false);
            setStrip(s);
          }}
        />
      )}
      {strip &&
        createPortal(
          <div className="fixed start-0 end-0 z-[60] mx-auto w-full max-w-[430px]" style={{ top: "calc(env(safe-area-inset-top) + 10px)", padding: "0 16px" }}>
            <ConfirmationStrip text={strip.text} action="Done" onAction={finish} tone={strip.tone} />
          </div>,
          document.body,
        )}
    </>
  );
};

const Switch: React.FC<{ on: boolean; label: string; onChange: (on: boolean) => void }> = ({ on, label, onChange }) => {
  const m = marketPalette(useIsDark());
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="tap relative shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ width: 42, height: 26, borderRadius: 999, background: on ? m.fill : m.swoff, outlineColor: m.fill, transition: "background 160ms ease" }}
    >
      <span
        aria-hidden
        style={{ position: "absolute", left: on ? 18 : 2, top: 2, width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: "left 160ms ease" }}
      />
    </button>
  );
};

const Lock: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const SheetBody: React.FC<{ spec: ClientCardSpec; onClose: () => void; onDone: (s: Strip) => void }> = ({ spec, onClose, onDone }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const { authUserId } = useApp();
  const locks = useShareLocks();
  const [step, setStep] = useState<"edit" | "dest">("edit");
  const [format, setFormat] = useState<ClientFormat>("story");
  const [background, setBackground] = useState<ClientBackground>("B");
  const [on, setOn] = useState<Set<string>>(() => initialOn(spec));
  const [photo, setPhoto] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<{ card: HTMLCanvasElement; sticker: HTMLCanvasElement | null; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cardSrc = useRef<HTMLDivElement>(null);
  const stickerSrc = useRef<HTMLDivElement>(null);
  const layerSrc = useRef<HTMLDivElement>(null);
  const overlay = useRef<(OverlayState & { layer: Size; frame: Size }) | null>(null);

  const stats = useMemo(() => cardStats(spec, on, locks), [spec, on, locks]);
  const rows = useMemo(() => statRows(spec, on, locks), [spec, on, locks]);
  const photoMode = background === "P" && !!photo && format !== "sticker";
  const allowed = templateAllowed(spec.template, locks);

  // Photos stay on the device: the object URL is released with the sheet.
  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);

  const pickPhoto = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = URL.createObjectURL(f);
    try {
      const img = await loadImage(url);
      setPhoto({ url, img });
      setBackground("P");
    } catch {
      URL.revokeObjectURL(url);
    }
  };

  // The export: drawn when the Destinations step opens, so a destination
  // shares at once (navigator.share needs the tap's activation).
  const prepare = useCallback(async () => {
    try {
      const card = document.createElement("canvas");
      if (photoMode && photo && layerSrc.current && overlay.current) {
        const o = overlay.current;
        await drawPhotoCard(card, { format: format === "post" ? "post" : "story", photo: photo.img, crop: o.crop, transform: o.transform, frame: o.frame, layer: layerSrc.current, layerSize: o.layer });
      } else if (cardSrc.current) {
        await drawClientCard(card, cardSrc.current, format);
      } else throw new Error("no source");
      let sticker: HTMLCanvasElement | null = null;
      if (canCopyImage() && stickerSrc.current) {
        sticker = format === "sticker" ? card : document.createElement("canvas");
        if (format !== "sticker") await drawClientCard(sticker, stickerSrc.current, "sticker");
      }
      setReady({ card, sticker, url: card.toDataURL("image/png") });
    } catch {
      setFailed(true);
    }
  }, [photoMode, photo, format]);


  const act = async (fn: () => Promise<Strip | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      const s = await fn();
      if (s) onDone(s);
    } finally {
      setBusy(false);
    }
  };
  const errorStrip: Strip = { text: "Couldn't share the card. Try again.", tone: "error" };
  const name = exportFileName(spec.template, format);
  const viaShare = () =>
    act(async () => {
      if (!ready) return null;
      const r = await shareCanvas(ready.card, name);
      return r === "shared" ? { text: "Card shared", tone: "success" } : r === "saved" ? { text: "Saved to Photos", tone: "success" } : r === "aborted" ? null : errorStrip;
    });
  const items: Destination[] = [
    { key: "ig", label: "Instagram Story", onPress: () => void viaShare() },
    { key: "wa", label: "WhatsApp", onPress: () => void viaShare() },
    {
      key: "save",
      label: "Save image",
      onPress: () =>
        void act(async () => {
          if (!ready) return null;
          try {
            saveCanvas(ready.card, name);
            return { text: "Saved to Photos", tone: "success" };
          } catch {
            return errorStrip;
          }
        }),
    },
    ...(ready?.sticker || (!ready && canCopyImage())
      ? [
          {
            key: "copy" as const,
            label: "Copy sticker",
            onPress: () =>
              void act(async () => {
                if (!ready?.sticker) return null;
                return (await copyCanvasImage(ready.sticker)) ? { text: "Sticker copied. Paste it onto your photo.", tone: "success" } : errorStrip;
              }),
          },
        ]
      : []),
    // D-49: Share to Community stays hidden until Community takes image posts (and always for under-18s).
    ...(!locks.communityHidden ? [{ key: "comm" as const, label: "Share to Community", onPress: () => undefined }] : []),
    { key: "more", label: "More", onPress: () => void viaShare() },
  ];

  const toggle = (key: string, value: boolean) =>
    setOn((cur) => {
      const next = new Set(cur);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });

  const label = (s: string) => <div style={{ margin: "14px 0 8px", fontSize: textPx(12), fontWeight: 600, color: m.ink2 }}>{s}</div>;
  const ctaStyle: React.CSSProperties = { width: "100%", height: 50, borderRadius: 16, background: m.fill, color: dark ? m.onfill : "#FFFFFF", fontSize: textPx(15), fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };

  const footer =
    step === "edit" ? (
      <>
        <div className="flex items-center justify-center" style={{ gap: 6, padding: "2px 0 10px", fontSize: textPx(12), fontWeight: 700, color: m.cancelink }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
            <path d={SHIELD} />
          </svg>
          Only what you select is shared.
        </div>
        <button
          type="button"
          className="tap disabled:opacity-40"
          style={ctaStyle}
          disabled={!allowed}
          onClick={() => {
            setReady(null);
            setFailed(false);
            setStep("dest");
            void prepare();
          }}
        >
          Next
        </button>
      </>
    ) : (
      <button type="button" className="tap" style={ctaStyle} onClick={onClose}>
        Done
      </button>
    );

  const preview = (width: number) => <ClientShareCard spec={spec} stats={stats} format={format} background={background === "P" ? "B" : background} width={width} />;

  return (
    <>
      <BottomSheet
        open
        onClose={onClose}
        onBack={step === "dest" ? () => setStep("edit") : undefined}
        title={step === "edit" ? spec.sheetTitle : "Share"}
        size="tall"
        bodyPadding={{ top: 18, right: 18, bottom: 18, left: 18 }}
        footer={footer}
        footerRule
      >
        {step === "edit" ? (
          <>
            <div role="radiogroup" aria-label="Format" className="flex" style={{ gap: 5, padding: 4, borderRadius: 14, background: m.segtrack }}>
              {(["story", "post", "sticker"] as const).map((f) => {
                const a = f === format;
                return (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={a}
                    onClick={() => setFormat(f)}
                    className="tap flex items-center justify-center"
                    style={{ flex: 1, height: 34, borderRadius: 11, background: a ? m.segactive : m.segidle, color: a ? (dark ? m.onfill : "#FFFFFF") : m.segink, fontSize: textPx(12), fontWeight: 700 }}
                  >
                    {f === "story" ? "Story" : f === "post" ? "Post" : "Sticker"}
                  </button>
                );
              })}
            </div>

            {photoMode && photo ? (
              <div style={{ marginTop: 12 }}>
                <OverlayEditor
                  key={photo.url}
                  format={format === "post" ? "post" : "story"}
                  photoUrl={photo.url}
                  layer={<PhotoStatsLayer spec={spec} stats={stats} />}
                  layerWidth={100}
                  anchor="corner"
                  chrome="client"
                  hintKey={authUserId ? `centium.overlayHint.${authUserId}` : null}
                  layerLabel={`Your ${spec.template === "pr" ? "personal best" : spec.template === "food" ? "food day" : spec.template} stats`}
                  onChange={(s) => (overlay.current = s)}
                />
              </div>
            ) : (
              <div className="flex justify-center" style={{ marginTop: 12, borderRadius: 20, background: format === "sticker" ? LIGHT_CHECK : m.soft, padding: 14 }}>
                {preview(PREVIEW_W[format])}
              </div>
            )}

            {format !== "sticker" ? (
              <>
                {label("Background")}
                <div role="radiogroup" aria-label="Background" className="flex flex-wrap" style={{ gap: 6 }}>
                  {(
                    [
                      ["B", "Centium", BRAND_SWATCH],
                      ["I", spec.patternLabel, METRIC_IDENTITY[spec.id][0]],
                      ["P", "Your photo", PHOTO_SWATCH],
                    ] as const
                  ).map(([k, n, sw]) => {
                    const a = k === "P" ? photoMode : background === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={a}
                        onClick={() => (k === "P" ? pickPhoto() : setBackground(k))}
                        className="tap inline-flex items-center"
                        style={{
                          gap: 6,
                          borderRadius: 999,
                          paddingBlock: "5px", paddingInline: "6px 10px",
                          fontSize: textPx(11),
                          lineHeight: linePx(14),
                          fontWeight: a ? 700 : 600,
                          border: `1px solid ${a ? m.fill : m.border}`,
                          background: a ? m.fill : m.card,
                          color: a ? (dark ? m.onfill : "#FFFFFF") : m.ink2,
                        }}
                      >
                        <span aria-hidden style={{ width: 14, height: 14, borderRadius: 999, background: sw, boxShadow: "0 0 0 1px rgba(36,31,27,0.1)", flex: "none" }} />
                        {n}
                      </button>
                    );
                  })}
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e)} />
              </>
            ) : (
              <div style={{ fontSize: textPx(11.5), lineHeight: 1.5, color: m.faint, marginTop: 10 }}>Transparent, with white stats. Copy it, then paste it onto your own photo or video.</div>
            )}

            <div style={{ margin: "14px 0 4px", fontSize: textPx(12), fontWeight: 600, color: m.ink2 }}>Show on the card</div>
            {rows.map((r) => (
              <div key={r.key} className="flex items-center" style={{ gap: 12, padding: "9px 0", borderTop: `1px solid ${m.div}` }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: textPx(14), color: m.ink }}>{r.title}</span>
                  <span style={{ display: "block", fontSize: textPx(11), color: m.faint }}>{r.sub}</span>
                </span>
                {r.kind === "headline" ? (
                  <span className="inline-flex items-center" style={{ gap: 4, fontSize: textPx(11), fontWeight: 600, color: m.faint }}>
                    <Lock />
                    Always on
                  </span>
                ) : r.kind === "locked" ? (
                  <span className="inline-flex items-center" role="img" aria-label="Locked" style={{ color: m.faint }}>
                    <Lock />
                  </span>
                ) : (
                  <Switch on={r.on} label={`Show ${r.title.toLowerCase()} on the card`} onChange={(v) => toggle(r.key, v)} />
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="flex justify-center" style={{ marginBottom: 14 }}>
              {photoMode ? (
                ready ? (
                  <img src={ready.url} alt="Your card" style={{ width: DEST_PREVIEW_W, borderRadius: previewRadius(DEST_PREVIEW_W), boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(36,31,27,0.10)", display: "block" }} />
                ) : (
                  <div className="animate-skeleton-pulse" style={{ width: DEST_PREVIEW_W, height: format === "post" ? 150 : 213.3, borderRadius: previewRadius(DEST_PREVIEW_W), background: m.soft }} />
                )
              ) : format === "sticker" ? (
                <div style={{ borderRadius: previewRadius(DEST_PREVIEW_W), background: LIGHT_CHECK }}>{preview(DEST_PREVIEW_W)}</div>
              ) : (
                preview(DEST_PREVIEW_W)
              )}
            </div>
            {failed ? (
              <ConfirmationStrip text="Couldn't make the card. Try again." action="Retry"
                onAction={() => {
                  setFailed(false);
                  void prepare();
                }} tone="error" notchBg={m.sbody} still />
            ) : (
              <ShareDestinations items={items} note={DEST_NOTE} disabled={!ready || busy} />
            )}
          </>
        )}
      </BottomSheet>

      {/* The export sources: the same card unscaled (300 wide), the sticker and the photo layer, off screen. */}
      {createPortal(
        <div aria-hidden style={{ position: "fixed", insetInlineStart: -10000, top: 0, pointerEvents: "none", visibility: "hidden" }}>
          <ClientShareCard innerRef={cardSrc} spec={spec} stats={stats} format={format} background={background === "P" ? "B" : background} width={300} flat square />
          <ClientShareCard innerRef={stickerSrc} spec={spec} stats={stats} format="sticker" background="B" width={300} flat square />
          <div style={{ textShadow: "0 1px 8px rgba(0,0,0,0.42)", color: "#FFFFFF" }}>
            <PhotoStatsLayer innerRef={layerSrc} spec={spec} stats={stats} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
