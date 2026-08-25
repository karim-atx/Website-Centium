import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { BloodMarker } from "../../types";
import { Download, Share2 } from "lucide-react";

const CARD_W = 640;
const CARD_H = 800;

// V6 (QA 6.0): the share-card background is a gradient keyed to the
// marker's status instead of a flat brand purple — green for normal, red
// for high, blue for low, so the shared image itself communicates the
// reading at a glance.
const statusGradient: Record<BloodMarker["status"], [string, string]> = {
  normal: ["#3F9165", "#1F5C3D"],
  high: ["#E9736A", "#A9291B"],
  low: ["#6FA8DC", "#2E5F8A"],
};

function drawCard(canvas: HTMLCanvasElement, marker: BloodMarker) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = CARD_W;
  canvas.height = CARD_H;

  // background — gradient keyed to normal/high/low status
  const [from, to] = statusGradient[marker.status];
  const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // wordmark
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 28px Manrope, sans-serif";
  ctx.fillText("CENTIUM", 48, 72);

  // marker name
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "600 20px Manrope, sans-serif";
  ctx.fillText(marker.name.toUpperCase(), 48, 200);

  // value
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 96px Manrope, sans-serif";
  ctx.fillText(`${marker.value}`, 48, 300);
  ctx.font = "600 32px Manrope, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(marker.unit, 48, 340);

  // status pill
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  const pillY = 380;
  ctx.beginPath();
  ctx.roundRect(48, pillY, 160, 44, 22);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 18px Manrope, sans-serif";
  ctx.fillText(marker.status.toUpperCase(), 78, pillY + 29);

  // history
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "600 16px Manrope, sans-serif";
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

  ctx.font = "500 14px Manrope, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  marker.history.forEach((h, i) => {
    const x = 48 + (i / (marker.history.length - 1 || 1)) * chartW;
    ctx.fillText(h.date, Math.min(x, CARD_W - 100), historyY + 130);
  });

  // footer
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 15px Manrope, sans-serif";
  ctx.fillText("Prototype health tracking — not a diagnosis.", 48, CARD_H - 48);
}

// V7 (QA 7.0): "the ability to share a summary of the entire biomarkers
// list" — a second card layout, one row per marker with its current value,
// status and trend direction (from its own history) instead of one
// marker's full detail.
function drawSummaryCard(canvas: HTMLCanvasElement, markers: BloodMarker[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rowH = 84;
  const headerH = 140;
  const footerH = 60;
  canvas.width = CARD_W;
  canvas.height = headerH + markers.length * rowH + footerH;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#7D6BB5");
  grad.addColorStop(1, "#4A3F70");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 28px Manrope, sans-serif";
  ctx.fillText("CENTIUM", 48, 60);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "600 18px Manrope, sans-serif";
  ctx.fillText("BIOMARKER SUMMARY", 48, 100);

  const statusDot: Record<BloodMarker["status"], string> = {
    normal: "#7ED6A5",
    high: "#F0958C",
    low: "#8FC1F0",
  };

  markers.forEach((m, i) => {
    const y = headerH + i * rowH;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(CARD_W - 48, y);
    ctx.stroke();

    ctx.fillStyle = statusDot[m.status];
    ctx.beginPath();
    ctx.arc(58, y + rowH / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 22px Manrope, sans-serif";
    ctx.fillText(m.name, 80, y + rowH / 2 - 4);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 14px Manrope, sans-serif";
    ctx.fillText(`Range: ${m.range} ${m.unit}`, 80, y + rowH / 2 + 20);

    const last = m.history[m.history.length - 1]?.value ?? m.value;
    const prev = m.history[m.history.length - 2]?.value ?? last;
    const arrow = last === prev ? "→" : last > prev ? "↑" : "↓";

    ctx.textAlign = "right";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 26px Manrope, sans-serif";
    ctx.fillText(`${m.value} ${arrow}`, CARD_W - 48, y + rowH / 2 + 2);
    ctx.font = "500 14px Manrope, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(m.unit, CARD_W - 48, y + rowH / 2 + 22);
    ctx.textAlign = "left";
  });

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 15px Manrope, sans-serif";
  ctx.fillText("Prototype health tracking — not a diagnosis.", 48, canvas.height - 24);
}

export const ShareBiomarkerSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  marker: BloodMarker | null;
  markers?: BloodMarker[];
}> = ({ open, onClose, marker, markers }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const isSummary = !marker && !!markers?.length;

  useEffect(() => {
    if (!open || !canvasRef.current) {
      setReady(false);
      return;
    }
    if (marker) {
      drawCard(canvasRef.current, marker);
      setReady(true);
    } else if (markers?.length) {
      drawSummaryCard(canvasRef.current, markers);
      setReady(true);
    } else {
      setReady(false);
    }
  }, [open, marker, markers]);

  const fileBase = marker ? marker.name.toLowerCase().replace(/\s+/g, "-") : "biomarker-summary";

  const download = () => {
    if (!canvasRef.current || !ready) return;
    const link = document.createElement("a");
    link.download = `centium-${fileBase}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const share = async () => {
    if (!canvasRef.current || !ready) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `centium-${fileBase}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${marker ? marker.name : "Biomarker summary"} — Centium` });
          return;
        } catch {
          // fall through to download
        }
      }
      download();
    });
  };

  if (!marker && !isSummary) return null;

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
