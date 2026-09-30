import React from "react";
import { Lock } from "lucide-react";

/**
 * In place of a photo, voice note or file the viewer may no longer open.
 *
 * Shown when the storage rule refuses it (Database 20261001040000): a
 * professional whose engagement with a client has ended no longer sees what
 * that client sent. The message itself stays in the conversation; only the
 * file is withheld, and this says so rather than showing a broken image.
 */
export const AttachmentGone: React.FC<{ kind: "photo" | "voice" | "file"; className?: string }> = ({
  kind,
  className,
}) => (
  <span
    role="note"
    className={`flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-[12.5px] font-semibold ${className ?? ""}`}
  >
    <Lock size={14} className="shrink-0" aria-hidden />
    <span>
      {kind === "photo" ? "Photo" : kind === "voice" ? "Voice note" : "File"} · No longer available
    </span>
  </span>
);
