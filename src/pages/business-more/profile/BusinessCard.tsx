import { createPortal } from "react-dom";
import { Clock, Download, Mail, MapPin, Phone, Share2, Star, X } from "lucide-react";
import { useBackCloses } from "../../../hooks/useBackCloses";
import {  } from "../../../components/business-more/kit";
import { copyText } from "../../../components/business-more/share";

// MO1B-026 / -027 / -028 · the business card (BizMoreV8 `hasShare`, line 151):
// left / right 20, centred, r24, shadow 0 20px 48px rgba(36,31,27,0.28); a 96
// cover band (stripes, or the cover photo) with a 36 close; the 60 r18 logo
// ringed 3 in the card colour, 30 into the band; name 18/800, type 12, the
// rating 11.5/700 with a 13 / 2.4 star; info rows 11.5/600 line 15 with 13 /
// 2.2 glyphs; Share (fill) and Save image (soft), 46 r14.
//
// PUBLIC FIELDS ONLY (HANDOVER 4). THE QR AND THE /b/{slug} LINK
// ARE NOT DRAWN: there is no public business page for them to open yet
// (BU6-13), and a code that leads nowhere would be worse than none. Share
// sends the card's text instead; Save image renders the card to a PNG.

export interface CardData {
  name: string;
  initials: string;
  type: string;
  rating: string | null;
  rows: { kind: "address" | "hours" | "phone" | "email"; text: string }[];
  coverUrl: string | null;
  logoUrl: string | null;
}

const ICON = { address: MapPin, hours: Clock, phone: Phone, email: Mail } as const;

const stripes = "repeating-linear-gradient(135deg, rgb(var(--c-primary-pale)) 0 10px, var(--biz-list) 10px 20px)";

export function BusinessCard({
  open,
  onClose,
  data,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  data: CardData;
  onToast: (m: string) => void;
}) {
  useBackCloses(open, onClose);
  if (!open) return null;

  const shareText = [data.name, data.type, ...data.rows.map((r) => r.text)].filter(Boolean).join("\n");

  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: data.name, text: shareText });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    onToast((await copyText(shareText)) ? "Details copied." : "Couldn't share right now. Try again.");
  };

  const save = async () => {
    const ok = await renderCardPng(data);
    onToast(ok ? "Image saved to your downloads." : "Couldn't save the image. Try again.");
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ padding: "0 calc(var(--app-gutter, 0px) + 20px)" }}>
      <div className="absolute inset-0 animate-fade-in" style={{ background: "rgba(36,31,27,0.4)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Business card"
        className="relative w-full max-w-[390px] bg-cream-card overflow-hidden animate-pop [--biz-list:#F7F7FC] dark:[--biz-list:rgba(174,161,220,0.10)]"
        style={{ borderRadius: 24, boxShadow: "0 20px 48px rgba(36,31,27,0.28)" }}
      >
        <div className="relative" style={{ height: 96, background: data.coverUrl ? undefined : stripes }}>
          {data.coverUrl && <img src={data.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            // 36 drawn; .tap gives the 44 hit area (MO1B-026 row 3).
            className="tap absolute flex items-center justify-center rounded-full bg-cream-card text-charcoal-soft"
            style={{ right: 8, top: 8, width: 36, height: 36 }}
          >
            <X size={16} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        <div className="relative" style={{ padding: "0 18px 16px", marginTop: -30 }}>
          <span
            className="flex items-center justify-center overflow-hidden bg-th-8e7fd0 text-white text-[20px] font-extrabold"
            style={{ width: 60, height: 60, borderRadius: 18, boxShadow: "0 0 0 3px rgb(var(--c-cream-card))" }}
          >
            {data.logoUrl ? <img src={data.logoUrl} alt="" className="w-full h-full object-cover" /> : data.initials}
          </span>
          <p className="text-[18px] font-extrabold leading-[24px] text-charcoal break-words" style={{ marginTop: 8 }}>
            {data.name}
          </p>
          <p className="text-[12px] leading-[17px] text-charcoal-faint">{data.type}</p>
          {data.rating && (
            <p className="flex items-center text-[11.5px] font-bold text-charcoal" style={{ gap: 4, marginTop: 4 }}>
              <Star size={13} strokeWidth={2.4} aria-hidden className="text-primary-dark" />
              {data.rating}
            </p>
          )}
          {data.rows.length > 0 && (
            <div className="flex flex-col" style={{ gap: 8, marginTop: 12 }}>
              {data.rows.map((r) => {
                const Icon = ICON[r.kind];
                return (
                  <span key={r.kind} className="flex text-[11.5px] font-semibold leading-[15px] text-charcoal-soft" style={{ gap: 7 }}>
                    <Icon size={13} strokeWidth={2.2} aria-hidden className="shrink-0 text-primary-dark" style={{ marginTop: 1 }} />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{r.text}</span>
                  </span>
                );
              })}
            </div>
          )}
          <div className="flex" style={{ gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => void share()}
              className="tap flex-1 flex items-center justify-center bg-primary-fill text-on-primary-fill text-[13.5px] font-extrabold"
              style={{ height: 46, borderRadius: 14, gap: 6 }}
            >
              <Share2 size={15} strokeWidth={2.4} aria-hidden />
              Share
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className="tap flex-1 flex items-center justify-center bg-cream-soft text-charcoal text-[13.5px] font-bold"
              style={{ height: 46, borderRadius: 14, gap: 6 }}
            >
              <Download size={15} strokeWidth={2.4} aria-hidden />
              Save image
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Save image (MO1B-028): the light card drawn to a 2x PNG, then downloaded
// (web; the native app saves to Photos).

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function renderCardPng(d: CardData): Promise<boolean> {
  try {
    const W = 350;
    const S = 2;
    const font = "Manrope, ui-sans-serif, system-ui, sans-serif";
    const measure = document.createElement("canvas").getContext("2d");
    if (!measure) return false;
    measure.font = `600 11.5px ${font}`;
    const rowLines = d.rows.map((r) => wrap(measure, r.text, W - 36 - 20));
    measure.font = `800 18px ${font}`;
    const nameLines = wrap(measure, d.name, W - 36);
    const H = 96 + 34 + 8 + nameLines.length * 24 + 17 + (d.rating ? 19 : 0) + (rowLines.length ? 12 : 0) + rowLines.reduce((n, l) => n + l.length * 15 + 8, 0) + 16;

    const canvas = document.createElement("canvas");
    canvas.width = W * S;
    canvas.height = H * S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.scale(S, S);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 24);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 24);
    ctx.clip();

    const cover = d.coverUrl ? await loadImage(d.coverUrl) : null;
    if (cover) {
      const r = Math.max(W / cover.width, 96 / cover.height);
      ctx.drawImage(cover, (W - cover.width * r) / 2, (96 - cover.height * r) / 2, cover.width * r, cover.height * r);
    } else {
      ctx.fillStyle = "#F7F7FC";
      ctx.fillRect(0, 0, W, 96);
      ctx.strokeStyle = "#F0EDF9";
      ctx.lineWidth = 7;
      for (let x = -96; x < W + 96; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 96);
        ctx.lineTo(x + 96, 0);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Logo 60 r18 with a 3 white ring.
    const lx = 18;
    const ly = 66;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(lx - 3, ly - 3, 66, 66, 21);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(lx, ly, 60, 60, 18);
    ctx.clip();
    const logo = d.logoUrl ? await loadImage(d.logoUrl) : null;
    if (logo) ctx.drawImage(logo, lx, ly, 60, 60);
    else {
      ctx.fillStyle = "#8E7FD0";
      ctx.fillRect(lx, ly, 60, 60);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 20px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(d.initials, lx + 30, ly + 31);
    }
    ctx.restore();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    let y = ly + 60 + 8;
    ctx.fillStyle = "#241F1B";
    ctx.font = `800 18px ${font}`;
    for (const l of nameLines) {
      ctx.fillText(l, 18, y + 18);
      y += 24;
    }
    ctx.fillStyle = "#8C8378";
    ctx.font = `400 12px ${font}`;
    ctx.fillText(d.type, 18, y + 12.5);
    y += 17;
    if (d.rating) {
      ctx.fillStyle = "#241F1B";
      ctx.font = `700 11.5px ${font}`;
      ctx.fillText(`★ ${d.rating}`, 18, y + 4 + 12);
      y += 19;
    }
    if (rowLines.length) y += 12;
    ctx.fillStyle = "#5B5349";
    ctx.font = `600 11.5px ${font}`;
    rowLines.forEach((lines) => {
      ctx.fillStyle = "#7D6BB5";
      ctx.beginPath();
      ctx.arc(24.5, y + 7.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5B5349";
      for (const l of lines) {
        ctx.fillText(l, 38, y + 11.5);
        y += 15;
      }
      y += 8;
    });

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d.name.replace(/[^\w -]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "business"}-card.png`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}
