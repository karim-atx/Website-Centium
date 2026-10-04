import React, { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Folder, GripVertical, MoreVertical } from "lucide-react";
import { headInk, headInkSoft, type FolderFamily } from "../../data/folderColors";
import { folderColorOptions, swatchName } from "./folderList";

// The folder pieces the Routines tab built (WO1.1), shared so the coach's
// template folders get the same header, ⋮ menu anchor, rename field, colour
// swatches and drop indicators rather than a second copy. Moved here
// unchanged apart from the item noun on the header ("routine"/"template").


/**
 * Where a dragged item will land (2026-09-30, replacing WO1.1's "placeholder
 * gap"): an invisible marker centred in the gap between two rows. Its negative
 * margins cancel its own height and the list's flex gap, so nothing shifts
 * while it moves. The line itself is drawn by InsertionLine, above the lifted
 * card, which would otherwise cover it.
 */
export const Placeholder: React.FC<{ gap: number }> = ({ gap }) => (
  <div data-dnd-placeholder aria-hidden style={{ height: 2, margin: `${-(gap + 2) / 2}px 0` }} />
);

/**
 * The visible insertion line, in the same layer as the lifted card and just
 * above it, placed on the list's [data-dnd-placeholder] marker after every
 * render of a drag. Positioned by writing its own style (it has no state).
 */
export const InsertionLine: React.FC<{ listRef: React.RefObject<HTMLDivElement | null> }> = ({ listRef }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const marker = listRef.current?.querySelector<HTMLElement>("[data-dnd-placeholder]");
    if (!el) return;
    if (!marker) {
      el.style.display = "none";
      return;
    }
    // Layout position, ignoring transforms, as useRoutineDrag measures drop
    // targets: the line never jumps while rows slide.
    let top = 0;
    let left = 0;
    for (let n: HTMLElement | null = marker; n; n = n.offsetParent as HTMLElement | null) {
      top += n.offsetTop;
      left += n.offsetLeft;
    }
    el.style.display = "block";
    el.style.top = `${top - window.scrollY + marker.offsetHeight / 2 - 1.5}px`;
    el.style.left = `${left - window.scrollX}px`;
    el.style.width = `${marker.offsetWidth}px`;
  });
  return createPortal(
    <div
      ref={ref}
      aria-hidden
      className="fixed pointer-events-none"
      style={{ display: "none", zIndex: 56, height: 3, borderRadius: 2, background: "#7D6BB5", boxShadow: "0 0 0 1.5px #FFFFFF" }}
    >
      <span
        className="absolute rounded-full"
        style={{ left: -5, top: -3.5, width: 10, height: 10, border: "2.5px solid #7D6BB5", background: "#FFFFFF" }}
      />
    </div>,
    document.body
  );
};

/** One row of the twelve folder colours (new folder, new subfolder, edit colour). */
export const ColorSwatches: React.FC<{ value: string | undefined; onPick: (c: string) => void; size: 24 | 28; width?: number }> = ({
  value,
  onPick,
  size,
  width,
}) => (
  <div className="flex flex-wrap gap-2" style={width ? { width } : undefined}>
    {folderColorOptions.map((c) => (
      <button
        key={c}
        type="button"
        onClick={() => onPick(c)}
        aria-label={swatchName(c)}
        aria-pressed={value === c}
        className="tap rounded-full"
        style={{
          width: size,
          height: size,
          background: c,
          // A faint ring in the theme's ink, so a dark swatch (Black) still
          // shows on a dark popover.
          boxShadow: "inset 0 0 0 1px rgb(var(--c-charcoal) / 0.22)",
          outline: value === c ? "2px solid rgb(var(--c-charcoal))" : "none",
          outlineOffset: 2,
        }}
      />
    ))}
  </div>
);

/** The ⋮ menu's "Edit color" popover, anchored under the menu button. */
export const ColorPopover: React.FC<{ value: string | undefined; onPick: (c: string) => void; onDone: () => void }> = ({
  value,
  onPick,
  onDone,
}) => (
  <div
    className="absolute right-0 top-7 z-20 bg-cream-card rounded-2xl shadow-lift border border-charcoal/[0.06] p-3 animate-fade-slide-up"
    onClick={(ev) => ev.stopPropagation()}
  >
    <div className="mb-2">
      <ColorSwatches value={value} onPick={onPick} size={28} width={208} />
    </div>
    <button onClick={onDone} className="tap w-full text-center text-xs font-semibold text-charcoal-soft">
      Done
    </button>
  </div>
);

type PressProps = Record<string, unknown>;
type GripProps = Record<string, unknown>;

/** The inline rename field (folders and their items rename the same way). */
export const RenameField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  tone: "light" | "dark";
  /** The Save label's colour where the background decides it (a folder header). */
  ink?: string;
}> = ({ value, onChange, onCommit, tone, ink }) => (
  <div className="flex items-center gap-2 flex-1 min-w-0" data-no-drag>
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && value.trim()) onCommit();
      }}
      className="flex-1 min-w-0 rounded-lg bg-cream-card border border-charcoal/10 px-2 py-1 text-sm"
    />
    <button
      onClick={onCommit}
      className={clsx("text-xs font-semibold", !ink && (tone === "light" ? "text-white" : "text-primary"))}
      style={ink ? { color: ink } : undefined}
    >
      Save
    </button>
  </div>
);

/**
 * A folder header (WO1.1 frame): folder tile, name + chevron, item count,
 * then ⋮ and the six-dot grip 13px apart, 14px from the right edge. Tapping
 * the name toggles the folder; a long-press or the grip drags it. Rendered
 * bare (no handlers) as the lifted card while dragging.
 */
export const FolderHeader: React.FC<{
  folder: { id: string; name: string };
  family: FolderFamily;
  count: number;
  /** What the folder holds, singular and plural: "routine"/"routines". */
  noun?: [string, string];
  collapsed: boolean;
  highlighted?: boolean;
  onToggle?: () => void;
  onMenu?: (anchor: HTMLElement) => void;
  renaming?: boolean;
  renameDraft?: string;
  onRenameDraft?: (v: string) => void;
  onRenameCommit?: () => void;
  press?: PressProps;
  grip?: GripProps;
  colorEditor?: React.ReactNode;
}> = ({
  folder,
  family,
  count,
  noun = ["routine", "routines"],
  collapsed,
  highlighted,
  onToggle,
  onMenu,
  renaming,
  renameDraft,
  onRenameDraft,
  onRenameCommit,
  press,
  grip,
  colorEditor,
}) => {
  const gripProps = grip;
  // Near-black on the light headers, white on the dark one (headInk), so
  // the name, count, chevron, ⋮ and grip all reach 4.5:1 on every colour.
  const ink = headInk(family);
  const inkSoft = headInkSoft(family);
  return (
    <div
      data-drag-card
      data-dnd-header={onToggle ? folder.id : undefined}
      {...press}
      className="flex items-center gap-[13px] justify-between rounded-[14px] select-none transition-shadow"
      style={{
        background: family.head,
        minHeight: 54,
        padding: "0 14px",
        WebkitTouchCallout: "none",
        // An item dragged over this folder: dropping adds it to the end.
        boxShadow: highlighted ? `0 0 0 2px #FFFFFF inset, 0 0 0 2px ${family.tile}` : undefined,
      }}
    >
      {renaming ? (
        <RenameField value={renameDraft ?? ""} onChange={(v) => onRenameDraft?.(v)} onCommit={() => onRenameCommit?.()} tone="light" ink={ink} />
      ) : (
        <>
          <button onClick={onToggle} className="tap flex items-center gap-[13px] flex-1 text-left min-w-0 self-stretch">
            <span
              className="w-[33px] h-[33px] rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: family.tile }}
            >
              <Folder size={16} style={{ color: "#FFFFFF" }} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-[7px]">
                <span className="text-[15px] font-extrabold truncate" style={{ color: ink }}>{folder.name}</span>
                {collapsed ? (
                  <ChevronRight size={15} strokeWidth={2.4} className="shrink-0" style={{ color: ink }} />
                ) : (
                  <ChevronDown size={15} strokeWidth={2.4} className="shrink-0" style={{ color: ink }} />
                )}
              </span>
              <span className="block text-[11.5px] mt-px" style={{ color: inkSoft }}>
                {count} {count === 1 ? noun[0] : noun[1]}
              </span>
            </span>
          </button>
          <div className="relative flex shrink-0" data-no-drag>
            <button
              onClick={(e) => onMenu?.(e.currentTarget)}
              className="tap flex shrink-0"
              style={{ color: ink }}
              aria-label={`Options for ${folder.name}`}
            >
              <MoreVertical size={17} />
            </button>
            {colorEditor}
          </div>
          <span
            {...gripProps}
            role="button"
            aria-label={`Drag ${folder.name}`}
            className="hit flex shrink-0"
            style={{ color: ink, ...(gripProps?.style as React.CSSProperties | undefined) }}
          >
            <GripVertical size={17} />
          </span>
        </>
      )}
    </div>
  );
};
