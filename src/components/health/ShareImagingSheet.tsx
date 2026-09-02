import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { ImagingRecord } from "../../types";
import { Download, Share2 } from "lucide-react";

const CARD_W = 640;

// QA 13.0: "similarly to biomarkers you should be able to share the
// Imaging & tests" — same canvas-card + Save/Share pattern as
// ShareBiomarkerSheet, drawing either one record's detail or a summary list
// of every imaging/test record.
function drawCard(canvas: HTMLCanvasElement, record: ImagingRecord) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = CARD_W;
  canvas.height = 480;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#7D6BB5");
  grad.addColorStop(1, "#4A3F70");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 52px Manrope, sans-serif";
  ctx.fillText(record.type, 48, 96);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "600 22px Manrope, sans-serif";
  ctx.fillText(record.date, 48, 140);

  if (record.note) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "500 20px Manrope, sans-serif";
    const words = record.note.split(" ");
    let line = "";
    let y = 210;
    words.forEach((w) => {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > CARD_W - 96 && line) {
        ctx.fillText(line, 48, y);
        line = w;
        y += 30;
      } else {
        line = test;
      }
    });
    if (line) ctx.fillText(line, 48, y);
  }

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 15px Manrope, sans-serif";
  ctx.fillText("Prototype health tracking — not a diagnosis.", 48, canvas.height - 32);
}

function drawSummaryCard(canvas: HTMLCanvasElement, records: ImagingRecord[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rowH = 76;
  const headerH = 130;
  const footerH = 56;
  canvas.width = CARD_W;
  canvas.height = headerH + records.length * rowH + footerH;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#7D6BB5");
  grad.addColorStop(1, "#4A3F70");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 40px Manrope, sans-serif";
  ctx.fillText("IMAGING & TESTS", 48, 76);

  records.forEach((r, i) => {
    const y = headerH + i * rowH;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(CARD_W - 48, y);
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 22px Manrope, sans-serif";
    ctx.fillText(r.type, 48, y + rowH / 2 - 2);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 15px Manrope, sans-serif";
    ctx.fillText(r.date, 48, y + rowH / 2 + 22);
  });

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 15px Manrope, sans-serif";
  ctx.fillText("Prototype health tracking — not a diagnosis.", 48, canvas.height - 24);
}

export const ShareImagingSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  record: ImagingRecord | null;
  records?: ImagingRecord[];
}> = ({ open, onClose, record, records }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const isSummary = !record && !!records?.length;

  useEffect(() => {
    if (!open || !canvasRef.current) {
      setReady(false);
      return;
    }
    if (record) {
      drawCard(canvasRef.current, record);
      setReady(true);
    } else if (records?.length) {
      drawSummaryCard(canvasRef.current, records);
      setReady(true);
    } else {
      setReady(false);
    }
  }, [open, record, records]);

  const fileBase = record ? record.type.toLowerCase().replace(/\s+/g, "-") : "imaging-summary";

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
          await navigator.share({ files: [file], title: `${record ? record.type : "Imaging & tests"} — Centium` });
          return;
        } catch {
          // fall through to download
        }
      }
      download();
    });
  };

  if (!record && !isSummary) return null;

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
