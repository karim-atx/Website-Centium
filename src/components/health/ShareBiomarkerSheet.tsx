import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { BloodMarker } from "../../types";
import { Download, Share2 } from "lucide-react";

const CARD_W = 640;
const CARD_H = 800;

function drawCard(canvas: HTMLCanvasElement, marker: BloodMarker) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = CARD_W;
  canvas.height = CARD_H;

  // background
  const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
  grad.addColorStop(0, "#1B6B52");
  grad.addColorStop(1, "#134F3D");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // wordmark
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("SOHATI", 48, 72);

  // marker name
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(marker.name.toUpperCase(), 48, 200);

  // value
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 96px Georgia, serif";
  ctx.fillText(`${marker.value}`, 48, 300);
  ctx.font = "600 32px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(marker.unit, 48, 340);

  // status pill
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  const pillY = 380;
  ctx.beginPath();
  ctx.roundRect(48, pillY, 160, 44, 22);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 18px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(marker.status.toUpperCase(), 78, pillY + 29);

  // history
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "600 16px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("HISTORY", 48, 470);

  const historyY = 500;
  const chartW = CARD_W - 96;
  const values = marker.history.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  marker.history.forEach((h, i) => {
    const x = 48 + (i / (marker.history.length - 1 || 1)) * chartW;
    const y = historyY + 100 - ((h.value - min) / range) * 100;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.font = "500 14px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  marker.history.forEach((h, i) => {
    const x = 48 + (i / (marker.history.length - 1 || 1)) * chartW;
    ctx.fillText(h.date, Math.min(x, CARD_W - 100), historyY + 130);
  });

  // footer
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 15px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("Prototype health tracking — not a diagnosis.", 48, CARD_H - 48);
}

export const ShareBiomarkerSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  marker: BloodMarker | null;
}> = ({ open, onClose, marker }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (open && marker && canvasRef.current) {
      drawCard(canvasRef.current, marker);
      setReady(true);
    } else {
      setReady(false);
    }
  }, [open, marker]);

  const download = () => {
    if (!canvasRef.current || !marker) return;
    const link = document.createElement("a");
    link.download = `sohati-${marker.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const share = async () => {
    if (!canvasRef.current || !marker) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `sohati-${marker.name}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${marker.name} — Sohati` });
          return;
        } catch {
          // fall through to download
        }
      }
      download();
    });
  };

  if (!marker) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title="Share Result">
      <div className="animate-fade-slide-up">
        <div className="rounded-3xl overflow-hidden shadow-lift mb-5">
          <canvas ref={canvasRef} className="w-full h-auto block" />
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" fullWidth onClick={download} disabled={!ready}>
            <Download size={15} /> Save Image
          </Button>
          <Button fullWidth onClick={share} disabled={!ready}>
            <Share2 size={15} /> Share
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
