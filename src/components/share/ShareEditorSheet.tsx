import React, { useEffect, useRef, useState } from "react";
import { Camera, Images, Lock, Share2 } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { CtaButton } from "../ui/PinnedCta";
import { Toggle } from "../ui/Toggle";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { useApp } from "../../context/AppContext";
import { SHARE_TOKENS } from "../../theme/marketTokens";
import { ShareCard, ShareLayer } from "./ShareCard";
import { OverlayEditor } from "./OverlayEditor";
import { EDITOR_W, editorHeight } from "./overlayModel";
import { LAYER, type LayerPlacement } from "./shareLayerModel";
import { EditorLabel, StyleChip } from "./shareKit";
import { t, tk } from "../../i18n/core";
import {
  EDITOR_STYLES,
  FORMATS,
  cardLink,
  cardStyleOf,
  clientShownAs,
  editorStyleLabel,
  formatLabel,
  usesOverlay,
  type CardPro,
  type CardSpec,
  type EditorStyle,
  type ShareFormat,
  type Visibility,
} from "./shareCardModel";

/** What the editor hands on to the share options. */
export interface EditorResult {
  format: ShareFormat;
  /** "Y" is P-SH.3's Your photo (recorded as style "photo", D-29). */
  style: EditorStyle;
  hide: number[];
  qr: boolean;
  /** The client as shown (wins only). */
  client: string | undefined;
  visibility: Visibility | null;
  photoUrl: string | null;
  /** Your photo: where the layer and the photo crop sit (null otherwise). */
  placement: LayerPlacement | null;
}

/** A win's consent: the client's name and the most they allowed. */
export interface WinConsent {
  fullName: string;
  firstName: string;
  /** share_requests.visibility after the answer (allowed_no_name sets "none"). */
  allowed: Visibility;
}

const RANK: Record<Visibility, number> = { none: 0, initials: 1, name: 2 };
const VIS_LABEL: Record<Visibility, string> = { name: tk("Name"), initials: tk("Initials"), none: tk("Nothing") };

/**
 * Release 3 · W8 SH6 Share editor (source/gen/r31.js editor31), a tall
 * BottomSheet "Share this win" (or "Share this card" for the practice):
 * - the format tabs Story / Post / Square / Sticker (SegmentedTabs, 12 below);
 * - the live preview (r20 soft, padding 14, centred, 14 below) at 150 for
 *   Story and Sticker, 196 for Post, 212 for Square; the sticker on the
 *   transparency checker;
 * - Style chips Light / Dark / Brand / Photo (chip23, gap 6);
 * - Photo: "Background photo", Take a photo / Choose from library (44 r12
 *   tiles, as BiomarkerCaptureFlow's two inputs), the photo permission line;
 * - Sticker: "The sticker has no background…";
 * - "Show on the card": the win itself (Always on, lock), then a switch per
 *   stat; "{first} shown as" Name / Initials / Nothing, never more than the
 *   client allowed ("Name · off" and the lock line when they allowed it
 *   without their name); "Link": QR code and link to your profile;
 * - pinned Share (share-2).
 * A photo stays on the device: it is drawn into the image, never uploaded.
 *
 * Market + Share 3.0 · P-SH.3 (additive; every element above is unchanged):
 * - a fifth style chip "Your photo" (EDITOR_STYLES; no ADDED badge, D-52).
 *   On Story, Post or Square it replaces the card preview with the shared
 *   OverlayEditor (chrome "client", anchor "corner", the 100-wide ShareLayer:
 *   the card's content, the QR on its white tile); it uses the same Take a
 *   photo / Choose from library inputs, and until a photo is chosen the frame
 *   shows the layer in its default corner with Share off. Recorded as style
 *   "photo" (D-29); the Sticker has no Your photo and draws as the repo's;
 * - on the Sticker, "Check on a light background": the preview well on the
 *   light checker with the sticker bare on it (preview only; the copied and
 *   saved sticker stay transparent).
 */
export const ShareEditorSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  spec: CardSpec;
  pro: CardPro;
  /** A client win; null for the professional's own practice. */
  win: WinConsent | null;
  /** The label of the always-on row ("Back squat 120 kg"). */
  winLabel?: string;
  /** The stat switches' lines (one per spec.stats entry): title and value. */
  statRows?: { title: string; sub: string }[];
  initialFormat?: ShareFormat;
  initialStyle?: EditorStyle;
  onShare: (r: EditorResult) => void;
}> = ({ open, onClose, spec, pro, win, winLabel, statRows, initialFormat = "story", initialStyle = "B", onShare }) => {
  const { authUserId } = useApp();
  const [format, setFormat] = useState<ShareFormat>(initialFormat);
  const [style, setStyle] = useState<EditorStyle>(initialStyle);
  // P-SH.3 ADDED: where the Your photo layer and crop sit (OverlayEditor), and
  // the sticker's "Check on a light background" (preview only).
  const [placement, setPlacement] = useState<LayerPlacement | null>(null);
  const [lightCheck, setLightCheck] = useState(false);
  const [hide, setHide] = useState<number[]>([]);
  const [qr, setQr] = useState(true);
  const [visibility, setVisibility] = useState<Visibility>(() => (win ? win.allowed : "none"));
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  // The object URL lives as long as the sheet.
  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl]
  );

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    setPhotoUrl(URL.createObjectURL(f));
  };

  const shownAs = win ? clientShownAs(win.fullName, visibility) : undefined;
  const W = format === "story" || format === "sticker" ? 150 : format === "post" ? 196 : 212;
  const overlay = usesOverlay(style, format);
  const needsPhoto = (style === "P" || style === "Y") && format !== "sticker" && !photoUrl;
  const stickerLight = format === "sticker" && lightCheck;
  const rows = statRows ?? spec.stats.map((s) => ({ title: s.label, sub: s.value }));

  const trow = (title: string, sub: string | undefined, right: React.ReactNode, key: string) => (
    <div key={key} className="flex items-center" style={{ gap: 12, padding: "10px 0", borderTop: `1px solid ${INK.b06}` }}>
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: textPx(14), color: INK.ch }}>
          {title}
        </span>
        {sub ? (
          <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
            {sub}
          </span>
        ) : null}
      </span>
      {right}
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={win ? t("Share this win") : t("Share this card")}
      size="tall"
      footer={
        <CtaButton
          label={t("Share")}
          icon={<Share2 size={15} strokeWidth={2} aria-hidden />}
          disabled={needsPhoto || (overlay && !placement)}
          onClick={() => onShare({ format, style, hide, qr, client: shownAs, visibility: win ? visibility : null, photoUrl, placement: overlay ? placement : null })}
        />
      }
    >
      <SegmentedTabs items={FORMATS.map((f) => ({ key: f, label: formatLabel(f) }))} activeKey={format} onChange={(k) => setFormat(k as ShareFormat)} className="mb-3" />
      {overlay && photoUrl ? (
        // P-SH.3 ADDED: Your photo replaces the card preview with the overlay editor (the yp* frames).
        <div style={{ marginBottom: 14 }}>
          <OverlayEditor
            format={format}
            photoUrl={photoUrl}
            layer={<ShareLayer spec={spec} pro={pro} client={shownAs} qr={qr} hide={hide} />}
            layerWidth={LAYER.width}
            anchor="corner"
            chrome="client"
            hintKey={authUserId ? `centium.overlayHint.${authUserId}` : null}
            layerLabel={t("Your card")}
            onChange={setPlacement}
          />
        </div>
      ) : overlay ? (
        // Your photo before a photo is chosen: the editor's frame with the layer in its default corner; Share waits for the photo.
        <div className="flex justify-center" style={{ borderRadius: 20, background: INK.soft, padding: 10, marginBottom: 14 }}>
          <div style={{ position: "relative", width: EDITOR_W, height: editorHeight(format), flex: "none", borderRadius: 10, overflow: "hidden", background: "#2A2B31", boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(36,31,27,0.10)" }}>
            <div style={{ position: "absolute", left: SHARE_TOKENS.safeMargin, bottom: SHARE_TOKENS.safeMargin, width: LAYER.width, color: "#FFFFFF", textShadow: `0 ${LAYER.shadow.y}px ${LAYER.shadow.blur}px ${LAYER.shadow.color}` }}>
              <ShareLayer spec={spec} pro={pro} client={shownAs} qr={qr} hide={hide} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center" style={{ borderRadius: 20, background: stickerLight ? SHARE_TOKENS.checkerLight : INK.soft, padding: 14, marginBottom: 14 }}>
          <ShareCard spec={spec} pro={pro} format={format} style={cardStyleOf(style)} width={W} client={shownAs} qr={qr} hide={hide} photoUrl={photoUrl} onChecker={format === "sticker"} bare={stickerLight} />
        </div>
      )}

      <EditorLabel first>{t("Style")}</EditorLabel>
      <div role="radiogroup" aria-label={t("Style")} className="flex flex-wrap" style={{ gap: 6 }}>
        {EDITOR_STYLES.map((k) => (
          <StyleChip key={k} on={k === style} label={editorStyleLabel(k)} onClick={() => setStyle(k)} />
        ))}
      </div>
      {(style === "P" || style === "Y") && format !== "sticker" && (
        <>
          <EditorLabel>{t("Background photo")}</EditorLabel>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            {[
              { icon: Camera, label: t("Take a photo"), ref: camera },
              { icon: Images, label: t("Choose from library"), ref: gallery },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => b.ref.current?.click()}
                className="tap flex items-center justify-center min-w-0"
                style={{ height: 44, borderRadius: 12, border: "1px solid rgb(var(--c-charcoal) / 0.11)", background: INK.card, gap: 7, fontSize: textPx(13), fontWeight: 700, color: INK.ch }}
              >
                <b.icon size={15} strokeWidth={2} aria-hidden className="shrink-0" style={{ color: INK.chS }} />
                <span className="truncate">{b.label}</span>
              </button>
            ))}
          </div>
          <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
          <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={pick} />
          <p style={{ fontSize: textPx(11), color: INK.chF, marginTop: 6 }}>{t("Use your own photo. A client's photo needs that client's permission for photos.")}</p>
        </>
      )}
      {format === "sticker" && (
        <>
          <p style={{ fontSize: textPx(11.5), lineHeight: 1.5, color: INK.chF, marginTop: 10 }}>{t("The sticker has no background. Copy it, then paste it onto your own photo or video in Instagram.")}</p>
          {/* P-SH.3 ADDED (stLight): the preview well on the light checker; the copied / saved sticker stays transparent. */}
          <div style={{ marginTop: 8 }}>
            {trow(t("Check on a light background"), t("Preview only. The copied sticker stays transparent."), <Toggle checked={lightCheck} onChange={setLightCheck} label={t("Check on a light background")} />, "light")}
          </div>
        </>
      )}

      {(win || rows.length > 0) && (
        <>
          <EditorLabel>{t("Show on the card")}</EditorLabel>
          <div>
            {win &&
              trow(
                winLabel ?? spec.subject ?? spec.title ?? spec.eyebrow,
                t("The win itself"),
                <span className="inline-flex items-center shrink-0" style={{ gap: 4, fontSize: textPx(11), fontWeight: 600, color: INK.chF }}>
                  <Lock size={12} strokeWidth={2} aria-hidden />
                  {t("Always on")}
                </span>,
                "win"
              )}
            {rows.map((r, i) =>
              trow(
                r.title,
                r.sub,
                <Toggle checked={!hide.includes(i)} onChange={(on) => setHide((h) => (on ? h.filter((x) => x !== i) : [...h, i]))} label={t("Show {title} on the card", { title: r.title })} />,
                `s${i}`
              )
            )}
          </div>
        </>
      )}

      {win && (
        <>
          <EditorLabel>{t("{name} shown as", { name: win.firstName })}</EditorLabel>
          <SegmentedTabs
            items={(["name", "initials", "none"] as Visibility[]).map((v) => ({ key: v, label: RANK[v] <= RANK[win.allowed] ? t(VIS_LABEL[v]) : t("{label} · off", { label: t(VIS_LABEL[v]) }) }))}
            activeKey={visibility}
            onChange={(k) => {
              // A level above what the client allowed stays off ("Name · off").
              if (RANK[k as Visibility] <= RANK[win.allowed]) setVisibility(k as Visibility);
            }}
            className="mb-0"
          />
          {win.allowed !== "name" && (
            <p className="flex items-center" style={{ gap: 5, fontSize: textPx(11.5), color: INK.chF, marginTop: 6 }}>
              <Lock size={12} strokeWidth={2} aria-hidden className="shrink-0" />
              {win.allowed === "none" ? t("{name} allowed sharing without their name.", { name: win.firstName }) : t("{name} allowed sharing by their initials.", { name: win.firstName })}
            </p>
          )}
        </>
      )}

      {pro.handle && (
        <>
          <EditorLabel>{t("Link")}</EditorLabel>
          <div>{trow(t("QR code and link to your profile"), cardLink(pro.handle), <Toggle checked={qr} onChange={setQr} label={t("QR code and link to your profile")} />, "qr")}</div>
        </>
      )}
    </BottomSheet>
  );
};
