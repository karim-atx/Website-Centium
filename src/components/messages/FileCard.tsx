import { fileBadge, formatBytes } from "./fileMeta";

/**
 * A document in a message (phase 2A, screen 2): a type badge, the file's name,
 * and its size and time.
 *
 * Name, size and type are what the sender's device reported (Database
 * 20261002030000). Files sent before those were recorded have none of them, so
 * they read "File" with no size rather than a guess. The design also shows a
 * page count; nothing records one, so it is left out.
 */
export const FileCard: React.FC<{
  name: string | null;
  bytes: number | null;
  mime: string | null;
  time?: string;
  onOpen: () => void;
  className?: string;
}> = ({ name, bytes, mime, time, onOpen, className }) => {
  const badge = fileBadge(mime, name);
  const meta = [formatBytes(bytes), time].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`tap w-full flex items-center gap-2.5 rounded-[14px] bg-cream-card border border-charcoal/10 px-3 py-2.5 text-left text-charcoal ${
        className ?? ""
      }`}
    >
      <span
        className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[10px] font-extrabold shrink-0 ${badge.tone}`}
      >
        {badge.label}
      </span>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[13.5px] font-bold truncate">{name ?? "File"}</span>
        {meta && <span className="text-xs text-charcoal-soft">{meta}</span>}
      </span>
    </button>
  );
};
