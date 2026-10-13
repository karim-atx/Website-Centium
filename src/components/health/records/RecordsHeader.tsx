import React, { useRef, useState } from "react";
import { ChevronLeft, MoreVertical } from "lucide-react";
import { FixedHeader } from "../../ui/FixedHeader";
import { PopupMenu } from "../../ui/PopupMenu";
import { textPx, linePx } from "../../../theme/textSize";
import { INK } from "./kit";

export interface HeaderMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}

/**
 * HE1.9 #1-#4 / HE1.9.1 #1-#3: the fixed area (pad 24 16 14 16, white, dark
 * #1C1F28 once content passes under, with the hairline, HE1.2.s), back 36
 * r9999 with ChevronLeft 20 #5B5349 (dark #B8B3C7), gap 6, title 24/30 700
 * ls-0.5, and the second 36 button on the right edge (⋮, MoreVertical 20) with
 * its menu (OURS-biomarkers-menu: the HE1.9.b dropdown, 172 wide r14 pad 8,
 * rows 36 r8, 0.5px borders).
 */
export const RecordsHeader: React.FC<{
  title: string;
  onBack: () => void;
  menu?: HeaderMenuItem[];
  children?: React.ReactNode;
}> = ({ title, onBack, menu, children }) => {
  const menuBtn = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <FixedHeader paddingBottom={14} fillClassName="bg-cream dark:bg-[#1C1F28]">
      <div className="flex items-center" style={{ gap: 6, minHeight: 36, marginLeft: -8 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
          style={{ width: 36, height: 36 }}
        >
          <ChevronLeft size={20} style={{ color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
        </button>
        <h1 className="flex-1 min-w-0 line-clamp-2" style={{ fontSize: textPx(24), lineHeight: linePx(30), fontWeight: 700, letterSpacing: -0.5, color: INK }}>
          {title}
        </h1>
        {menu && menu.length > 0 && (
          <button
            ref={menuBtn}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="More options"
            aria-haspopup="menu"
            className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
            style={{ width: 36, height: 36, marginRight: -8 }}
          >
            <MoreVertical size={20} style={{ color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
          </button>
        )}
      </div>
      {children}
      {menu && menu.length > 0 && (
        <PopupMenu
          open={open}
          onClose={() => setOpen(false)}
          anchor={menuBtn.current}
          options={menu.map((m) => ({ value: m.key, label: m.label, icon: m.icon, destructive: m.destructive }))}
          onSelect={(v) => menu.find((m) => m.key === v)?.onSelect()}
          width={155}
          align="right"
          hairline
          rowLineHeight={18}
        />
      )}
    </FixedHeader>
  );
};
