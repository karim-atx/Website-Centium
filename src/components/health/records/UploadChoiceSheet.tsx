import { partBSheetTone } from "../log/LogSheetParts";
import React, { useRef, useState } from "react";
import { Camera, ChevronRight, FileText, PenLine } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { textPx, linePx } from "../../../theme/textSize";
import { acceptFor } from "../../../services/storage";
import { useHealthMode, rowRule, tileFill, deepInk, HelpLine, INK, INK_FAINT } from "./kit";

// OURS-upload-choice: "camera or files" for Labs "Upload a report", Imaging
// "Add imaging", the web "Scan a report" (HE1.9.2 is NATIVE: the live camera
// becomes the OS camera input) and Replace. "Type it in" keeps the manual
// add (no file). Bucket limits shown and enforced at pick time (V6-82:
// lab-reports 10 MB, medical-imaging 25 MB).

const LIMIT_MB: Record<"lab-reports" | "medical-imaging", number> = { "lab-reports": 10, "medical-imaging": 25 };
const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export const UploadChoiceSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  bucket: "lab-reports" | "medical-imaging";
  onFile: (file: File) => void;
  /** "Type it in" (omitted for Replace). */
  onTypeIt?: () => void;
}> = ({ open, onClose, title, bucket, onFile, onTypeIt }) => {
  const { dark, hc } = useHealthMode();
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const mb = LIMIT_MB[bucket];

  const take = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError("That type isn't supported. Use PDF, JPG or PNG.");
    if (file.size > mb * 1024 * 1024) return setError(`That file is too big. The limit is ${mb} MB.`);
    if (file.size === 0) return setError("That type isn't supported. Use PDF, JPG or PNG.");
    setError(null);
    onFile(file);
  };

  const rows: { key: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; title: string; sub: string; onClick: () => void }[] = [
    { key: "photo", icon: Camera, title: "Take a photo", sub: "Use your camera", onClick: () => camera.current?.click() },
    { key: "file", icon: FileText, title: "Choose a file", sub: "PDF, JPG or PNG", onClick: () => picker.current?.click() },
  ];
  if (onTypeIt) rows.push({ key: "type", icon: PenLine, title: "Type it in", sub: "No file, just the details", onClick: onTypeIt });

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title={title}
      chrome="partB" tone={partBSheetTone(dark)}
    >
      <input ref={camera} type="file" accept={acceptFor(bucket, true)} capture="environment" className="hidden" onChange={take} />
      <input ref={picker} type="file" accept={acceptFor(bucket)} className="hidden" onChange={take} />
      {rows.map((r, i) => (
        <button
          key={r.key}
          type="button"
          onClick={r.onClick}
          className="tap w-full flex items-center text-left"
          style={{ minHeight: 56, gap: 12, borderTop: i ? rowRule(dark, hc, 0.08) : undefined }}
        >
          <span aria-hidden className="grid place-items-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: tileFill(dark) }}>
            <r.icon size={18} style={{ color: deepInk(dark) }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 600, color: INK }}>
              {r.title}
            </span>
            <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(17.3), color: INK_FAINT }}>
              {r.sub}
            </span>
          </span>
          <ChevronRight size={17} style={{ color: INK_FAINT }} aria-hidden />
        </button>
      ))}
      <HelpLine style={{ marginTop: 10 }}>{`Files up to ${mb} MB.`}</HelpLine>
      {error && <HelpLine error>{error}</HelpLine>}
    </BottomSheet>
  );
};
